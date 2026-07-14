import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { PublicSurfaceFeature } from "@workspace/database/prisma";
import {
  canonicalizeRuntimeRequest,
  normalizePublicHostname,
  parseRuntimeSignature,
  SEMBLIA_RUNTIME_HEADERS,
} from "@workspace/types";
import type { ApiV2Env } from "../../config/env.js";
import { PublicHostingObservabilityService } from "./public-hosting-observability.service.js";
import { PublicSurfacesService } from "./public-surfaces.service.js";

export type FormsRuntimeOperation =
  | "HOSTED_PAGE"
  | "EMBED_PAGE"
  | "SUBMISSION"
  | "UPLOAD_PRESIGN";

type RuntimeRequest = {
  method: string;
  originalUrl: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
};

const MAX_SIGNATURE_AGE_SECONDS = 300;
const OPAQUE_UNAUTHORIZED_MESSAGE = "Unauthorized runtime request";

@Injectable()
export class FormsRuntimeTrustService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<ApiV2Env>,
    @Inject(PublicSurfacesService)
    private readonly publicSurfacesService: PublicSurfacesService,
    @Inject(PublicHostingObservabilityService)
    private readonly observability: PublicHostingObservabilityService,
    private readonly now: () => number = Date.now,
  ) {}

  static hasRuntimeHeaders(request: Pick<RuntimeRequest, "headers">): boolean {
    return Object.values(SEMBLIA_RUNTIME_HEADERS).some(
      (header) => request.headers[header] !== undefined,
    );
  }

  async verifyAndResolve(
    request: RuntimeRequest,
    input: {
      operation: FormsRuntimeOperation;
      legacyProjectId?: string;
    },
  ): Promise<{
    hostname: string;
    projectId: string;
    canonicalHostname: string;
    isLegacyExactHost: boolean;
    principal: string;
  }> {
    const requestId = this.requestId(request.headers);
    const hostHeader = this.singleHeader(
      request.headers,
      SEMBLIA_RUNTIME_HEADERS.host,
    );
    const timestampHeader = this.singleHeader(
      request.headers,
      SEMBLIA_RUNTIME_HEADERS.timestamp,
    );
    const signatureHeader = this.singleHeader(
      request.headers,
      SEMBLIA_RUNTIME_HEADERS.signature,
    );
    const hostname = hostHeader ? normalizePublicHostname(hostHeader) : null;
    const timestampSeconds = timestampHeader ? Number(timestampHeader) : NaN;
    const signature = signatureHeader
      ? parseRuntimeSignature(signatureHeader)
      : null;
    const secret = this.configService.get<string>(
      "FORMS_RUNTIME_SIGNING_SECRET",
    );

    if (
      !hostname ||
      !timestampHeader ||
      !/^(?:0|[1-9]\d*)$/.test(timestampHeader) ||
      !Number.isSafeInteger(timestampSeconds) ||
      Math.abs(Math.floor(this.now() / 1000) - timestampSeconds) >
        MAX_SIGNATURE_AGE_SECONDS ||
      !signature ||
      !secret
    ) {
      return this.reject(
        requestId,
        hostname ?? undefined,
        "invalid_runtime_signature",
      );
    }

    if (!this.isOperationRequest(request, input.operation)) {
      return this.reject(requestId, hostname, "invalid_runtime_operation");
    }
    const body = this.toRawBody(request.rawBody);
    let canonical: string;
    try {
      canonical = canonicalizeRuntimeRequest({
        timestampSeconds,
        method: request.method,
        requestTarget: request.originalUrl,
        hostname,
        bodySha256: createHash("sha256").update(body).digest("hex"),
      });
    } catch {
      return this.reject(requestId, hostname, "invalid_runtime_signature");
    }
    const expected = createHmac("sha256", secret).update(canonical).digest();
    const actual = Buffer.from(signature);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return this.reject(requestId, hostname, "invalid_runtime_signature");
    }

    const configuredHost = normalizePublicHostname(
      this.configService.get<string>("FORMS_RUNTIME_PUBLIC_BASE_DOMAIN") ?? "",
    );
    if (!configuredHost) {
      return this.reject(requestId, hostname, "invalid_runtime_signature");
    }

    if (hostname === configuredHost) {
      if (!input.legacyProjectId) {
        return this.reject(
          requestId,
          hostname,
          "invalid_legacy_runtime_request",
        );
      }
      this.observability.record({
        event: "forms_runtime_legacy_use",
        outcome: "used",
        reason: "legacy_exact_host",
        hostname,
        projectId: input.legacyProjectId,
        feature: PublicSurfaceFeature.COLLECTION,
        requestId,
      });
      return {
        hostname,
        projectId: input.legacyProjectId,
        canonicalHostname: configuredHost,
        isLegacyExactHost: true,
        principal: `forms-runtime:${hostname}`,
      };
    }

    if (input.legacyProjectId) {
      return this.reject(
        requestId,
        hostname,
        "legacy_project_on_wildcard_host",
      );
    }

    try {
      const resolved = await this.publicSurfacesService.resolveHost({
        hostname,
        feature: PublicSurfaceFeature.COLLECTION,
      });
      return {
        hostname,
        projectId: resolved.projectId,
        canonicalHostname: resolved.canonicalHostname,
        isLegacyExactHost: false,
        principal: `forms-runtime:${hostname}`,
      };
    } catch {
      return this.reject(requestId, hostname, "host_resolution_failed");
    }
  }

  private isOperationRequest(
    request: Pick<RuntimeRequest, "method" | "originalUrl">,
    operation: FormsRuntimeOperation,
  ) {
    let target: URL;
    try {
      target = new URL(request.originalUrl, "http://runtime.invalid");
    } catch {
      return false;
    }
    if (operation === "HOSTED_PAGE" || operation === "EMBED_PAGE") {
      return (
        request.method.toUpperCase() === "GET" &&
        target.pathname.endsWith("/snapshot") &&
        target.searchParams.get("surface") ===
          (operation === "HOSTED_PAGE" ? "hosted" : "embed")
      );
    }
    if (operation === "SUBMISSION") {
      return (
        request.method.toUpperCase() === "POST" &&
        target.pathname.endsWith("/submissions")
      );
    }
    return (
      request.method.toUpperCase() === "POST" &&
      target.pathname.endsWith("/uploads/presign")
    );
  }

  private singleHeader(
    headers: RuntimeRequest["headers"],
    name: string,
  ): string | undefined {
    const value = headers[name];
    return typeof value === "string" ? value : undefined;
  }

  private toRawBody(rawBody: RuntimeRequest["rawBody"]): Buffer {
    if (Buffer.isBuffer(rawBody)) return rawBody;
    return typeof rawBody === "string"
      ? Buffer.from(rawBody, "utf8")
      : Buffer.alloc(0);
  }

  private requestId(headers: RuntimeRequest["headers"]) {
    const candidate = this.singleHeader(headers, "x-request-id");
    return candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)
      ? candidate
      : randomUUID();
  }

  private reject(
    requestId: string,
    hostname: string | undefined,
    reason:
      | "invalid_runtime_signature"
      | "invalid_runtime_operation"
      | "invalid_legacy_runtime_request"
      | "legacy_project_on_wildcard_host"
      | "host_resolution_failed",
  ): never {
    this.observability.record({
      event: "forms_runtime_signature_rejection",
      outcome: "rejected",
      reason,
      hostname,
      feature: PublicSurfaceFeature.COLLECTION,
      requestId,
    });
    throw new UnauthorizedException(OPAQUE_UNAUTHORIZED_MESSAGE);
  }
}
