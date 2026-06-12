import { Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ThrottlerGuard,
  ThrottlerStorage,
  getOptionsToken,
  getStorageToken,
  type ThrottlerModuleOptions,
} from "@nestjs/throttler";

type RuntimeThrottleRequest = {
  body?: {
    context?: {
      projectPublicSlug?: string;
    };
  };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

export function getRuntimeThrottleTracker(
  request: RuntimeThrottleRequest,
): string {
  const host =
    readHeader(request, "x-semblia-original-host") ??
    request.body?.context?.projectPublicSlug ??
    "unknown-host";
  const viewerIp =
    firstForwardedIp(readHeader(request, "x-semblia-original-forwarded-for")) ??
    firstForwardedIp(readHeader(request, "x-forwarded-for")) ??
    request.ip?.trim() ??
    request.socket?.remoteAddress ??
    "unknown";

  return `${normalizeTrackerPart(host)}:${viewerIp.slice(0, 45)}`;
}

@Injectable()
export class FormsRuntimeThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(request: RuntimeThrottleRequest) {
    return getRuntimeThrottleTracker(request);
  }
}

function readHeader(
  request: RuntimeThrottleRequest,
  key: string,
): string | undefined {
  const direct = request.headers[key];
  const value =
    direct ??
    request.headers[
      Object.keys(request.headers).find(
        (candidate) => candidate.toLowerCase() === key.toLowerCase(),
      ) ?? ""
    ];

  return Array.isArray(value) ? value[0] : value;
}

function firstForwardedIp(value: string | undefined): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

function normalizeTrackerPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "_")
    .slice(0, 255);
}
