import { Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ThrottlerGuard,
  ThrottlerStorage,
  getOptionsToken,
  getStorageToken,
  type ThrottlerModuleOptions,
} from "@nestjs/throttler";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";

// Approach A: register named throttlers globally, then use one route-scoped guard
// that resolves trust once per request and skips the bucket that does not apply.
// This keeps the slug-aware public-submit rate logic local to testimonials.
@Injectable()
export class PublicSubmitThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
    @Inject(PublicSubmitTrustService)
    private readonly publicSubmitTrustService: PublicSubmitTrustService,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(
    context: Parameters<ThrottlerGuard["canActivate"]>[0],
  ) {
    const skip = await super.shouldSkip(context);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      params?: { slug?: string };
      method?: string;
      headers: Record<string, string | string[] | undefined>;
      rawBody?: Buffer | string;
      ip?: string;
      socket?: { remoteAddress?: string | null };
      trestaPublicSubmitTrust?: Awaited<
        ReturnType<PublicSubmitTrustService["evaluate"]>
      >;
    }>();

    if (request.method === "GET") {
      return false;
    }

    const slug = request.params?.slug;
    if (!slug) {
      return false;
    }

    request.trestaPublicSubmitTrust =
      await this.publicSubmitTrustService.evaluate(request, slug);

    return false;
  }

  protected async getTracker(req: {
    method?: string;
    params?: { slug?: string };
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
    rawBody?: Buffer | string;
    socket?: { remoteAddress?: string | null };
    trestaPublicSubmitTrust?: Awaited<
      ReturnType<PublicSubmitTrustService["evaluate"]>
    >;
  }) {
    if (req.method === "GET") {
      const slug = req.params?.slug ?? "unknown";
      return `${slug}:${this.publicSubmitTrustService.getClientIp(req)}`;
    }

    if (!req.trestaPublicSubmitTrust && req.params?.slug) {
      req.trestaPublicSubmitTrust =
        await this.publicSubmitTrustService.evaluate(req, req.params.slug);
    }

    return req.trestaPublicSubmitTrust?.rateLimitTracker ?? "unknown";
  }
}
