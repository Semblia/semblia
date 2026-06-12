import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerException } from "@nestjs/throttler";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSubmitThrottlerGuard } from "./public-submit-throttler.guard.js";
import type { PublicSubmitTrustService } from "./public-submit-trust.service.js";

const mockStorageIncrement = vi.fn();
const mockEvaluate = vi.fn();
const mockGetClientIp = vi.fn();

const storageMock = {
  increment: mockStorageIncrement,
};

const trustServiceMock = {
  evaluate: mockEvaluate,
  getClientIp: mockGetClientIp,
} as unknown as PublicSubmitTrustService;

function makeGuard() {
  return new PublicSubmitThrottlerGuard(
    [
      {
        name: "default",
        ttl: 60,
        limit: 120,
      },
      {
        name: "public-submit-browser",
        ttl: 60,
        limit: 10,
      },
      {
        name: "public-submit-hmac",
        ttl: 60,
        limit: 120,
      },
      {
        name: "public-list",
        ttl: 60,
        limit: 120,
      },
    ],
    storageMock,
    new Reflector(),
    trustServiceMock,
  );
}

function makeHttpContext(request: Record<string, unknown>) {
  const response = { header: vi.fn() };
  return {
    getHandler: () => makeHttpContext,
    getClass: () => PublicSubmitThrottlerGuard,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };
}

describe("PublicSubmitThrottlerGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue("203.0.113.10");
    mockStorageIncrement.mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it("counts invalid public submit attempts before rethrowing the trust error", async () => {
    const trustError = new UnauthorizedException("Invalid public submit trust");
    mockEvaluate.mockRejectedValue(trustError);
    const guard = makeGuard();
    await guard.onModuleInit();

    await expect(
      guard.canActivate(
        makeHttpContext({
          method: "POST",
          params: { slug: "acme" },
          headers: {},
          rawBody: "{}",
          ip: "203.0.113.10",
        }) as never,
      ),
    ).rejects.toBe(trustError);

    expect(mockStorageIncrement).toHaveBeenCalledTimes(1);
    expect(mockStorageIncrement.mock.calls[0]?.[4]).toBe(
      "public-submit-browser",
    );
  });

  it("returns the throttling error instead of the trust error after the invalid bucket is blocked", async () => {
    mockEvaluate.mockRejectedValue(
      new UnauthorizedException("Invalid public submit trust"),
    );
    mockStorageIncrement.mockResolvedValue({
      totalHits: 11,
      timeToExpire: 60,
      isBlocked: true,
      timeToBlockExpire: 60,
    });
    const guard = makeGuard();
    await guard.onModuleInit();

    await expect(
      guard.canActivate(
        makeHttpContext({
          method: "POST",
          params: { slug: "acme" },
          headers: {},
          rawBody: "{}",
          ip: "203.0.113.10",
        }) as never,
      ),
    ).rejects.toThrow(ThrottlerException);
  });

  it("uses only the HMAC submit bucket for trusted server submits", async () => {
    mockEvaluate.mockResolvedValue({
      projectId: "project_1",
      slug: "acme",
      trust: "hmac",
      principal: "project:project_1",
      rateLimitTracker: "project_1:hmac:project:project_1",
    });
    const guard = makeGuard();
    await guard.onModuleInit();

    await expect(
      guard.canActivate(
        makeHttpContext({
          method: "POST",
          params: { slug: "acme" },
          headers: { "x-semblia-signature": "signed" },
          rawBody: "{}",
          ip: "203.0.113.10",
        }) as never,
      ),
    ).resolves.toBe(true);

    expect(mockStorageIncrement).toHaveBeenCalledTimes(1);
    expect(mockStorageIncrement.mock.calls[0]?.[4]).toBe("public-submit-hmac");
  });

  it("uses only the public-list bucket for public GET requests", async () => {
    const guard = makeGuard();
    await guard.onModuleInit();

    await expect(
      guard.canActivate(
        makeHttpContext({
          method: "GET",
          params: { slug: "acme" },
          headers: {},
          ip: "203.0.113.10",
        }) as never,
      ),
    ).resolves.toBe(true);

    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(mockStorageIncrement).toHaveBeenCalledTimes(1);
    expect(mockStorageIncrement.mock.calls[0]?.[4]).toBe("public-list");
  });
});
