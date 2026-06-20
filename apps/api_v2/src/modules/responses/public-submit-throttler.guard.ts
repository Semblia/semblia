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

type PublicSubmitThrottlerRequest = {
  method?: string;
  params?: { slug?: string };
  route?: { path?: string };
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

// Approach A: register named throttlers globally, then use one route-scoped guard
// that picks the route/signature bucket. Trust is validated in ResponsesService
// after resolving the published form and full server-side snapshot.
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
    return super.canActivate(context);
  }

  protected async shouldSkip(context: ExecutionContext) {
    // Trust is validated in ResponsesService after the published form and full
    // server-side snapshot are resolved; this guard only selects the rate-limit
    // bucket (see handleRequest/shouldSkipPublicBucket), so there is nothing to
    // pre-compute here beyond the framework's @SkipThrottle handling.
    return super.shouldSkip(context);
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
    const slug = req.params?.slug ?? "unknown";
    const clientIp = this.publicSubmitTrustService.getClientIp(req);
    return `${slug}:${this.hasSignature(req) ? "hmac" : "browser"}:${clientIp}`;
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

    if (this.hasSignature(request)) {
      return bucket !== "public-submit-hmac";
    }

    return bucket !== "public-submit-browser";
  }

  private hasSignature(request: PublicSubmitThrottlerRequest) {
    const value = request.headers["x-semblia-signature"];
    return Array.isArray(value) ? Boolean(value[0]) : Boolean(value);
  }
}
