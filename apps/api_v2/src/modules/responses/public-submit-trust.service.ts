import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import { SigningSecretService } from "../projects/signing-secret.service.js";

export type PublicSubmitTrustMode = "origin" | "hmac";

export type PublicSubmitTrustProject = {
  id: string;
  slug: string;
  allowedOrigins: string[];
};

export type PublicSubmitTrustResult = {
  projectId: string;
  trust: PublicSubmitTrustMode;
  principal: string;
  rateLimitTracker: string;
  trustedOriginId?: string;
  signingSecretId?: string;
};

export type PublicSubmitRequestLike = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

@Injectable()
export class PublicSubmitTrustService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SigningSecretService)
    private readonly signingSecretService: SigningSecretService,
  ) {}

  async evaluate(
    request: PublicSubmitRequestLike,
    project: PublicSubmitTrustProject,
    snapshotAllowedOrigins: string[] = [],
  ): Promise<PublicSubmitTrustResult> {
    const signature = this.readHeader(request, "x-semblia-signature");
    if (signature) {
      return this.evaluateHmac(request, project.id, signature);
    }

    const origin = this.readHeader(request, "origin");
    const trustedOrigin = origin
      ? await this.resolveTrustedOrigin(origin, project, snapshotAllowedOrigins)
      : { allowed: false };

    if (origin && trustedOrigin.allowed) {
      const ip = this.getClientIp(request);
      return {
        projectId: project.id,
        trust: "origin",
        principal: ip,
        rateLimitTracker: `${project.id}:browser:${ip}`,
        ...(trustedOrigin.id ? { trustedOriginId: trustedOrigin.id } : {}),
      };
    }

    throw new UnauthorizedException("Public submit origin is not authorized");
  }

  computePayloadHash(rawBody: Buffer | string | undefined): string {
    return createHash("sha256")
      .update(this.getRawBodyString(rawBody), "utf8")
      .digest("hex");
  }

  getClientIp(request: PublicSubmitRequestLike): string {
    const directIp = request.ip?.trim();
    if (directIp) {
      return directIp.slice(0, 45);
    }

    const forwardedFor = this.readHeader(request, "x-forwarded-for");
    const forwardedIp = forwardedFor?.split(",")[0]?.trim();
    if (forwardedIp) {
      return forwardedIp.slice(0, 45);
    }

    return (request.socket?.remoteAddress ?? "unknown").slice(0, 45);
  }

  private async evaluateHmac(
    request: PublicSubmitRequestLike,
    projectId: string,
    signatureHeader: string,
  ): Promise<PublicSubmitTrustResult> {
    const timestampHeader = this.readHeader(request, "x-semblia-timestamp");
    if (!timestampHeader) {
      throw new UnauthorizedException("Missing X-Semblia-Timestamp header");
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isInteger(timestamp)) {
      throw new BadRequestException("Malformed X-Semblia-Timestamp header");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > 300) {
      throw new UnauthorizedException(
        "Signed request timestamp is outside the freshness window",
      );
    }

    const activeSecret =
      await this.signingSecretService.getActiveDecrypted(projectId);
    const signingSecret = activeSecret?.plaintext;
    if (!signingSecret) {
      throw new UnauthorizedException(
        "Project does not accept signed submissions",
      );
    }

    const normalizedSignature = this.normalizeSignature(signatureHeader);
    const expectedSignature = createHmac("sha256", signingSecret)
      .update(
        `v1.${timestampHeader}.${this.getRawBodyString(request.rawBody)}`,
        "utf8",
      )
      .digest();

    if (
      normalizedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(normalizedSignature, expectedSignature)
    ) {
      throw new UnauthorizedException("Invalid Semblia signature");
    }

    const clientIp = this.getClientIp(request);
    await this.signingSecretService.markUsed(activeSecret.id, clientIp);

    return {
      projectId,
      trust: "hmac",
      principal: `project:${projectId}`,
      rateLimitTracker: `${projectId}:hmac:project:${projectId}`,
      signingSecretId: activeSecret.id,
    };
  }

  private normalizeSignature(signatureHeader: string): Buffer {
    const normalized = signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice("sha256=".length)
      : signatureHeader;

    try {
      const decoded = Buffer.from(normalized, "base64");
      if (!normalized || decoded.toString("base64") !== normalized) {
        throw new Error("invalid");
      }

      return decoded;
    } catch {
      throw new BadRequestException("Malformed X-Semblia-Signature header");
    }
  }

  private getRawBodyString(rawBody: Buffer | string | undefined): string {
    if (Buffer.isBuffer(rawBody)) {
      return rawBody.toString("utf8");
    }

    if (typeof rawBody === "string") {
      return rawBody;
    }

    return "";
  }

  private async resolveTrustedOrigin(
    origin: string,
    project: PublicSubmitTrustProject,
    snapshotAllowedOrigins: string[],
  ): Promise<{ allowed: boolean; id?: string }> {
    const normalizedOrigin = this.normalizeOrigin(origin);
    const trustedOrigin =
      await this.prisma.client.projectTrustedOrigin.findFirst({
        where: {
          projectId: project.id,
          origin: normalizedOrigin,
          status: "ACTIVE",
        },
        select: { id: true, origin: true },
      });

    if (trustedOrigin) {
      return { allowed: true, id: trustedOrigin.id };
    }

    return {
      allowed: [...project.allowedOrigins, ...snapshotAllowedOrigins].includes(
        normalizedOrigin,
      ),
    };
  }

  private normalizeOrigin(origin: string): string {
    try {
      return new URL(origin).origin;
    } catch {
      return origin;
    }
  }

  private readHeader(
    request: PublicSubmitRequestLike,
    name: string,
  ): string | undefined {
    const value = request.headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
