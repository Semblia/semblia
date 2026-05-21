import { Inject, Injectable, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ThrottlerGuard,
  ThrottlerStorage,
  getOptionsToken,
  getStorageToken,
  type ThrottlerModuleOptions,
  type ThrottlerRequest,
} from "@nestjs/throttler";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";

type PublicSubmitTrust = Awaited<
  ReturnType<PublicSubmitTrustService["evaluate"]>
>;

type PublicSubmitThrottlerRequest = {
  method?: string;
  params?: { slug?: string };
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
  trestaPublicSubmitTrust?: PublicSubmitTrust;
  trestaPublicSubmitTrustError?: unknown;
  trestaPublicSubmitRateLimitTracker?: string;
};

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

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<PublicSubmitThrottlerRequest>();
    this.clearPublicSubmitState(request);

    const allowed = await super.canActivate(context);
    if (request.trestaPublicSubmitTrustError) {
      throw request.trestaPublicSubmitTrustError;
    }

    return allowed;
  }

  protected async shouldSkip(context: ExecutionContext) {
    const skip = await super.shouldSkip(context);
    if (skip) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<PublicSubmitThrottlerRequest>();

    if (request.method === "GET") {
      return false;
    }

    const slug = request.params?.slug;
    if (!slug) {
      return false;
    }

    try {
      request.trestaPublicSubmitTrust =
        await this.publicSubmitTrustService.evaluate(request, slug);
    } catch (error: unknown) {
      request.trestaPublicSubmitTrustError = error;
      request.trestaPublicSubmitRateLimitTracker = this.getInvalidSubmitTracker(
        request,
        slug,
      );
    }

    return false;
  }

  protected async handleRequest(requestProps: ThrottlerRequest) {
    const request = requestProps.context
      .switchToHttp()
      .getRequest<PublicSubmitThrottlerRequest>();

    if (this.shouldSkipPublicBucket(request, requestProps.throttler.name)) {
      return true;
    }

    return super.handleRequest(requestProps);
  }

  protected async getTracker(req: PublicSubmitThrottlerRequest) {
    if (req.method === "GET") {
      const slug = req.params?.slug ?? "unknown";
      return `${slug}:${this.publicSubmitTrustService.getClientIp(req)}`;
    }

    if (req.trestaPublicSubmitTrustError) {
      return (
        req.trestaPublicSubmitRateLimitTracker ??
        this.getInvalidSubmitTracker(req, req.params?.slug ?? "unknown")
      );
    }

    if (!req.trestaPublicSubmitTrust && req.params?.slug) {
      try {
        req.trestaPublicSubmitTrust =
          await this.publicSubmitTrustService.evaluate(req, req.params.slug);
      } catch (error: unknown) {
        req.trestaPublicSubmitTrustError = error;
        req.trestaPublicSubmitRateLimitTracker = this.getInvalidSubmitTracker(
          req,
          req.params.slug,
        );
        return req.trestaPublicSubmitRateLimitTracker;
      }
    }

    return req.trestaPublicSubmitTrust?.rateLimitTracker ?? "unknown";
  }

  private clearPublicSubmitState(request: PublicSubmitThrottlerRequest) {
    delete request.trestaPublicSubmitTrust;
    delete request.trestaPublicSubmitTrustError;
    delete request.trestaPublicSubmitRateLimitTracker;
  }

  private getInvalidSubmitTracker(
    request: PublicSubmitThrottlerRequest,
    slug: string,
  ) {
    return `${slug}:invalid:${this.publicSubmitTrustService.getClientIp(
      request,
    )}`;
  }

  private shouldSkipPublicBucket(
    request: PublicSubmitThrottlerRequest,
    throttlerName?: string,
  ) {
    const bucket = throttlerName ?? "default";

    if (bucket === "default") {
      return true;
    }

    if (request.method === "GET") {
      return bucket !== "public-list";
    }

    if (bucket === "public-list") {
      return true;
    }

    if (bucket === "public-media-intent") {
      return false;
    }

    if (request.trestaPublicSubmitTrustError) {
      return bucket !== "public-submit-browser";
    }

    if (request.trestaPublicSubmitTrust?.trust === "hmac") {
      return bucket !== "public-submit-hmac";
    }

    return bucket !== "public-submit-browser";
  }
}
