import { RequestMethod, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard, type ThrottlerStorage } from "@nestjs/throttler";
import { describe, expect, it, vi } from "vitest";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { WebhooksController } from "./webhooks.controller.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

function createThrottleContext(
  handler: (...args: never[]) => unknown,
): ExecutionContext {
  return {
    getClass: () => WebhooksController,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({
        ip: "127.0.0.1",
        headers: {},
      }),
      getResponse: () => ({
        header: vi.fn(),
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("WebhooksController", () => {
  it("declares POST /webhooks/clerk as a public route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, WebhooksController)).toBe(
      "webhooks",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        WebhooksController.prototype.handleClerkWebhook,
      ),
    ).toBe("clerk");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        WebhooksController.prototype.handleClerkWebhook,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        WebhooksController.prototype.handleClerkWebhook,
      ),
    ).toBe(true);
  });

  it("declares POST /webhooks/razorpay as a public route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, WebhooksController)).toBe(
      "webhooks",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        WebhooksController.prototype.handleRazorpayWebhook,
      ),
    ).toBe("razorpay");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        WebhooksController.prototype.handleRazorpayWebhook,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        WebhooksController.prototype.handleRazorpayWebhook,
      ),
    ).toBe(true);
  });

  it("applies the controller-level 60 per minute throttle to both webhook handlers", async () => {
    const increment = vi.fn().mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    const guard = new ThrottlerGuard(
      [{ name: "default", limit: 1000, ttl: 60000 }],
      { increment } as unknown as ThrottlerStorage,
      new Reflector(),
    );
    await guard.onModuleInit();

    await guard.canActivate(
      createThrottleContext(WebhooksController.prototype.handleClerkWebhook),
    );
    await guard.canActivate(
      createThrottleContext(WebhooksController.prototype.handleRazorpayWebhook),
    );

    expect(increment).toHaveBeenCalledTimes(2);
    for (const call of increment.mock.calls) {
      expect(call[1]).toBe(60000);
      expect(call[2]).toBe(60);
      expect(call[3]).toBe(60000);
      expect(call[4]).toBe("default");
    }
  });
});
