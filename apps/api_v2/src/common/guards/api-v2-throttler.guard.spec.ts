import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  SkipThrottle,
  Throttle,
  seconds,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import { describe, expect, it, vi } from "vitest";
import { ApiV2ThrottlerGuard } from "./api-v2-throttler.guard.js";

class TestThrottledController {
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  health() {
    return "ok";
  }

  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  publicList() {
    return "public";
  }

  @SkipThrottle()
  @Throttle({
    "public-submit-browser": { limit: 10, ttl: seconds(60) },
    "public-submit-hmac": { limit: 120, ttl: seconds(60) },
  })
  publicSubmit() {
    return "submit";
  }
}

function createContext(handler: () => unknown): ExecutionContext {
  const response = {
    header: vi.fn(),
  };

  return {
    getHandler: () => handler,
    getClass: () => TestThrottledController,
    switchToHttp: () => ({
      getRequest: () => ({
        ip: "203.0.113.10",
        headers: { "user-agent": "vitest" },
      }),
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(increment = vi.fn()) {
  const guard = new ApiV2ThrottlerGuard(
    [
      { name: "default", ttl: seconds(60), limit: 120 },
      { name: "public-submit-browser", ttl: seconds(60), limit: 10 },
      { name: "public-submit-hmac", ttl: seconds(60), limit: 120 },
      { name: "public-list", ttl: seconds(60), limit: 120 },
      { name: "analytics-events", ttl: seconds(60), limit: 240 },
    ],
    {
      increment,
    } as unknown as ThrottlerStorage,
    new Reflector(),
  );

  return guard;
}

describe("ApiV2ThrottlerGuard", () => {
  it("does not apply route-scoped named buckets to normal routes", async () => {
    const increment = vi.fn().mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    const guard = createGuard(increment);
    await guard.onModuleInit();

    await guard.canActivate(
      createContext(TestThrottledController.prototype.health),
    );

    expect(increment).toHaveBeenCalledTimes(1);
    expect(increment.mock.calls[0]?.[2]).toBe(30);
    expect(increment.mock.calls[0]?.[4]).toBe("default");
  });

  it("keeps explicit public list throttling opt-in", async () => {
    const increment = vi.fn().mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    const guard = createGuard(increment);
    await guard.onModuleInit();

    await guard.canActivate(
      createContext(TestThrottledController.prototype.publicList),
    );

    expect(increment).toHaveBeenCalledTimes(1);
    expect(increment.mock.calls[0]?.[2]).toBe(120);
    expect(increment.mock.calls[0]?.[4]).toBe("public-list");
  });

  it("leaves public submit buckets to PublicSubmitThrottlerGuard", async () => {
    const increment = vi.fn().mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    const guard = createGuard(increment);
    await guard.onModuleInit();

    await guard.canActivate(
      createContext(TestThrottledController.prototype.publicSubmit),
    );

    expect(increment).not.toHaveBeenCalled();
  });
});
