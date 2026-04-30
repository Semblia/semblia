import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import { SigningSecretService } from "../projects/signing-secret.service.js";

export type PublicSubmitTrustMode = "origin" | "hmac";

export type PublicSubmitTrustResult = {
  projectId: string;
  slug: string;
  trust: PublicSubmitTrustMode;
  principal: string;
  rateLimitTracker: string;
  allowedOrigins: string[];
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
    slug: string,
  ): Promise<PublicSubmitTrustResult> {
    const project = await this.prisma.client.project.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        allowedOrigins: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const signature = this.readHeader(request, "x-tresta-signature");
    if (signature) {
      return this.evaluateHmac(request, project.id, project.slug, signature);
    }

    const origin = this.readHeader(request, "origin");
    if (
      origin &&
      this.isAllowedOrigin(origin, project.slug, project.allowedOrigins)
    ) {
      const ip = this.getClientIp(request);
      return {
        projectId: project.id,
        slug: project.slug,
        trust: "origin",
        principal: ip,
        rateLimitTracker: `${project.id}:browser:${ip}`,
        allowedOrigins: project.allowedOrigins,
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
    slug: string,
    signatureHeader: string,
  ): Promise<PublicSubmitTrustResult> {
    const timestampHeader = this.readHeader(request, "x-tresta-timestamp");
    if (!timestampHeader) {
      throw new UnauthorizedException("Missing X-Tresta-Timestamp header");
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isInteger(timestamp)) {
      throw new BadRequestException("Malformed X-Tresta-Timestamp header");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > 300) {
      throw new UnauthorizedException(
        "Signed request timestamp is outside the freshness window",
      );
    }

    const signingSecret =
      await this.signingSecretService.getDecrypted(projectId);
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
      throw new UnauthorizedException("Invalid Tresta signature");
    }

    return {
      projectId,
      slug,
      trust: "hmac",
      principal: `project:${projectId}`,
      rateLimitTracker: `${projectId}:hmac:project:${projectId}`,
      allowedOrigins: [],
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
      throw new BadRequestException("Malformed X-Tresta-Signature header");
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

  private isAllowedOrigin(
    origin: string,
    slug: string,
    allowedOrigins: string[],
  ): boolean {
    return (
      origin === `https://${slug}.testimonials.tresta.app` ||
      allowedOrigins.includes(origin)
    );
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
