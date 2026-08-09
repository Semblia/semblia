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

const THROTTLER_LIMIT = "THROTTLER:LIMIT";
const THROTTLER_TTL = "THROTTLER:TTL";

const delegatedRouteScopedBuckets = new Set([
  "public-submit-browser",
  "public-submit-hmac",
  "public-media-intent",
  "forms-runtime-resolve",
  "forms-runtime-submit",
]);

@Injectable()
export class ApiV2ThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async handleRequest(requestProps: ThrottlerRequest) {
    if (this.shouldSkipGlobalNamedBucket(requestProps)) {
      return true;
    }

    return super.handleRequest(requestProps);
  }

  private shouldSkipGlobalNamedBucket(requestProps: ThrottlerRequest) {
    const throttlerName = requestProps.throttler.name ?? "default";
    if (throttlerName === "default") {
      return false;
    }

    if (delegatedRouteScopedBuckets.has(throttlerName)) {
      return true;
    }

    return !this.hasRouteThrottleMetadata(requestProps.context, throttlerName);
  }

  private hasRouteThrottleMetadata(
    context: ExecutionContext,
    throttlerName: string,
  ) {
    const targets = [context.getHandler(), context.getClass()];

    return (
      this.reflector.getAllAndOverride(
        THROTTLER_LIMIT + throttlerName,
        targets,
      ) !== undefined ||
      this.reflector.getAllAndOverride(
        THROTTLER_TTL + throttlerName,
        targets,
      ) !== undefined
    );
  }
}
