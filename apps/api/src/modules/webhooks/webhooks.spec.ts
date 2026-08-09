import {
  BadRequestException,
  RequestMethod,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ConfigService } from "@nestjs/config";
import { ThrottlerGuard, type ThrottlerStorage } from "@nestjs/throttler";
import { Webhook } from "svix";
import { describe, expect, it, vi } from "vitest";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator.js";
import { WebhooksController } from "./webhooks.controller.js";
import type { WebhooksService } from "./webhooks.service.js";

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

function createController(params?: {
  signingSecret?: string;
  handleClerkEvent?: ReturnType<typeof vi.fn>;
}) {
  const webhooksService = {
    handleClerkEvent:
      params?.handleClerkEvent ??
      vi.fn().mockResolvedValue({ received: true, replayed: false }),
  } as unknown as WebhooksService;
  const configService = {
    get: vi.fn((key: string) =>
      key === "CLERK_WEBHOOK_SIGNING_SECRET"
        ? params?.signingSecret
        : undefined,
    ),
  } as unknown as ConfigService;

  return new WebhooksController(webhooksService, configService);
}

function createSignedClerkRequest(payload: unknown, signingSecret: string) {
  const svixId = "msg_123";
  const timestamp = new Date();
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = new Webhook(signingSecret).sign(
    svixId,
    timestamp,
    rawBody.toString("utf8"),
  );

  return {
    rawBody,
    headers: {
      "svix-id": svixId,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
  };
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

  it("accepts Clerk's signed snake_case user payload without bearer auth", async () => {
    const signingSecret = "whsec_test";
    const handleClerkEvent = vi
      .fn()
      .mockResolvedValue({ received: true, replayed: false });
    const controller = createController({ signingSecret, handleClerkEvent });
    const request = createSignedClerkRequest(
      {
        data: {
          id: "user_123",
          email_addresses: [
            {
              id: "idn_secondary",
              email_address: "secondary@example.com",
            },
            {
              id: "idn_primary",
              email_address: "primary@example.com",
            },
          ],
          primary_email_address_id: "idn_primary",
          first_name: "Test",
          last_name: "User",
          image_url: "https://img.clerk.com/avatar.png",
          object: "user",
        },
        object: "event",
        timestamp: 1_654_012_591_835,
        type: "user.created",
      },
      signingSecret,
    );

    await expect(
      controller.handleClerkWebhook(request as never),
    ).resolves.toEqual({ received: true, replayed: false });
    expect(handleClerkEvent).toHaveBeenCalledWith(
      {
        data: {
          id: "user_123",
          emailAddresses: [
            {
              id: "idn_secondary",
              emailAddress: "secondary@example.com",
            },
            {
              id: "idn_primary",
              emailAddress: "primary@example.com",
            },
          ],
          primaryEmailAddressId: "idn_primary",
          firstName: "Test",
          lastName: "User",
          imageUrl: "https://img.clerk.com/avatar.png",
        },
        object: "event",
        timestamp: 1_654_012_591_835,
        type: "user.created",
      },
      "msg_123",
    );
  });

  it("accepts Clerk email.created payloads for custom email delivery", async () => {
    const signingSecret = "whsec_test";
    const handleClerkEvent = vi
      .fn()
      .mockResolvedValue({ received: true, replayed: false });
    const controller = createController({ signingSecret, handleClerkEvent });
    const request = createSignedClerkRequest(
      {
        data: {
          id: "email_123",
          slug: "verification_code",
          status: "queued",
          to_email_address: "Invitee@Example.com",
          subject: "424242 is your Semblia verification code",
          body: "<p>Your code is 424242.</p>",
          body_plain: "Your code is 424242.",
          otp_code: "424242",
        },
        object: "event",
        timestamp: 1_654_012_591_835,
        type: "email.created",
      },
      signingSecret,
    );

    await expect(
      controller.handleClerkWebhook(request as never),
    ).resolves.toEqual({ received: true, replayed: false });
    expect(handleClerkEvent).toHaveBeenCalledWith(
      {
        data: {
          id: "email_123",
          slug: "verification_code",
          status: "queued",
          toEmailAddress: "Invitee@Example.com",
          subject: "424242 is your Semblia verification code",
          body: "<p>Your code is 424242.</p>",
          bodyPlain: "Your code is 424242.",
          otpCode: "424242",
        },
        object: "event",
        timestamp: 1_654_012_591_835,
        type: "email.created",
      },
      "msg_123",
    );
  });

  it("accepts Clerk sms.created payloads without treating them as user-sync events", async () => {
    const signingSecret = "whsec_test";
    const handleClerkEvent = vi
      .fn()
      .mockResolvedValue({ received: true, replayed: false });
    const controller = createController({ signingSecret, handleClerkEvent });
    const request = createSignedClerkRequest(
      {
        data: {
          id: "sms_123",
          slug: "phone_code",
          status: "queued",
          to_phone_number: "+15555550123",
          body: "Your Semblia code is 424242.",
          otp_code: "424242",
        },
        object: "event",
        timestamp: 1_654_012_591_835,
        type: "sms.created",
      },
      signingSecret,
    );

    await expect(
      controller.handleClerkWebhook(request as never),
    ).resolves.toEqual({ received: true, replayed: false });
    expect(handleClerkEvent).toHaveBeenCalledWith(
      {
        data: {
          id: "sms_123",
          slug: "phone_code",
          status: "queued",
          toPhoneNumber: "+15555550123",
          body: "Your Semblia code is 424242.",
          otpCode: "424242",
        },
        object: "event",
        timestamp: 1_654_012_591_835,
        type: "sms.created",
      },
      "msg_123",
    );
  });

  it("accepts Clerk organization invitation events so they can be ledged", async () => {
    const signingSecret = "whsec_test";
    const handleClerkEvent = vi
      .fn()
      .mockResolvedValue({ received: true, replayed: false });
    const controller = createController({ signingSecret, handleClerkEvent });
    const request = createSignedClerkRequest(
      {
        data: {
          id: "orginv_123",
          email_address: "invitee@example.com",
          organization_id: "org_123",
          role: "org:member",
          status: "pending",
          url: "https://accounts.semblia.com/invitations/orginv_123",
        },
        object: "event",
        timestamp: 1_654_012_591_835,
        type: "organization_invitation.created",
      },
      signingSecret,
    );

    await expect(
      controller.handleClerkWebhook(request as never),
    ).resolves.toEqual({ received: true, replayed: false });
    expect(handleClerkEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: "orginv_123",
          email_address: "invitee@example.com",
          url: "https://accounts.semblia.com/invitations/orginv_123",
        }),
        type: "organization_invitation.created",
      }),
      "msg_123",
    );
  });

  it("keeps signature failures as unauthorized", async () => {
    const controller = createController({ signingSecret: "whsec_test" });
    const request = createSignedClerkRequest(
      {
        data: {
          id: "user_123",
          email_addresses: [{ email_address: "test@example.com" }],
          first_name: "Test",
          last_name: "User",
          image_url: "https://img.clerk.com/avatar.png",
        },
        type: "user.created",
      },
      "whsec_other",
    );

    await expect(
      controller.handleClerkWebhook(request as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns a bad request for signed but invalid Clerk payloads", async () => {
    const signingSecret = "whsec_test";
    const controller = createController({ signingSecret });
    const request = createSignedClerkRequest(
      {
        data: {
          id: "user_123",
          first_name: "Test",
        },
        type: "user.created",
      },
      signingSecret,
    );

    await expect(
      controller.handleClerkWebhook(request as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
