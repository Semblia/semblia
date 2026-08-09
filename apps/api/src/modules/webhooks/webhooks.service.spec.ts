import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebhooksService } from "./webhooks.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { UsersService } from "../users/users.service.js";
import type { EmailDeliveryService } from "../email/email-delivery.service.js";
import type {
  ClerkEmailPayloadDto,
  ClerkWebhookEventDto,
  ClerkUserPayloadDto,
} from "../users/users.dto.js";

const mockTransaction = vi.fn();
const mockPaymentWebhookCreate = vi.fn();
const mockPaymentWebhookFindUnique = vi.fn();
const mockPaymentWebhookUpdate = vi.fn();
const mockClerkWebhookCreate = vi.fn();
const mockClerkWebhookFindUnique = vi.fn();
const mockClerkWebhookUpdate = vi.fn();
const mockUserUpsertFromClerk = vi.fn();
const mockCreateClerkEmailDelivery = vi.fn();
const mockSubscriptionFindUnique = vi.fn();
const mockSubscriptionUpdate = vi.fn();
const mockSubscriptionPaymentUpsert = vi.fn();
const mockPaymentMethodCount = vi.fn();
const mockPaymentMethodUpsert = vi.fn();
const mockInvoiceUpsert = vi.fn();
const mockPlanFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    paymentWebhookEvent: {
      create: mockPaymentWebhookCreate,
      findUnique: mockPaymentWebhookFindUnique,
      update: mockPaymentWebhookUpdate,
    },
    clerkWebhookEvent: {
      create: mockClerkWebhookCreate,
      findUnique: mockClerkWebhookFindUnique,
      update: mockClerkWebhookUpdate,
    },
    subscription: {
      findUnique: mockSubscriptionFindUnique,
      update: mockSubscriptionUpdate,
    },
    subscriptionPayment: {
      upsert: mockSubscriptionPaymentUpsert,
    },
    paymentMethod: {
      count: mockPaymentMethodCount,
      upsert: mockPaymentMethodUpsert,
    },
    invoice: {
      upsert: mockInvoiceUpsert,
    },
    plan: {
      findUnique: mockPlanFindUnique,
    },
    user: {
      update: mockUserUpdate,
    },
  },
} as unknown as PrismaService;

const usersServiceMock = {
  upsertFromClerk: mockUserUpsertFromClerk,
} as unknown as UsersService;

const emailDeliveryServiceMock = {
  createClerkEmailDelivery: mockCreateClerkEmailDelivery,
} as unknown as EmailDeliveryService;

const clerkUserPayload: ClerkUserPayloadDto = {
  id: "user_123",
  emailAddresses: [{ emailAddress: "test@example.com" }],
  firstName: "Test",
  lastName: "User",
  imageUrl: "https://example.com/avatar.png",
};

const clerkUserCreatedEvent: ClerkWebhookEventDto = {
  type: "user.created",
  data: clerkUserPayload,
};

const clerkEmailPayload: ClerkEmailPayloadDto = {
  id: "email_123",
  slug: "verification_code",
  status: "queued",
  toEmailAddress: "invitee@example.com",
  subject: "424242 is your Semblia verification code",
  body: "<p>Your code is 424242.</p>",
  bodyPlain: "Your code is 424242.",
  otpCode: "424242",
};

const clerkEmailCreatedEvent: ClerkWebhookEventDto = {
  type: "email.created",
  data: clerkEmailPayload,
};

const subscriptionRecord = {
  id: "sub_local_1",
  userId: "user_1",
  status: "ACTIVE",
  userPlan: "FREE",
  planId: null,
  externalSubscriptionId: "sub_rzp_123",
  scheduledRazorpaySubscriptionId: null,
  scheduledPlanId: null,
  scheduledStartAt: null,
};

const proPlanRecord = {
  id: "plan_pro",
  type: "PRO",
  price: 79900,
  currency: "INR",
  interval: "month",
};

function getCreatedRazorpayProviderEventId() {
  return mockPaymentWebhookCreate.mock.calls[0]?.[0]?.data.providerEventId;
}

function expectProcessedLedger(subscriptionId: string | null = "sub_local_1") {
  const providerEventId = getCreatedRazorpayProviderEventId();

  expect(mockPaymentWebhookUpdate).toHaveBeenCalledWith({
    where: { providerEventId },
    data: expect.objectContaining({
      status: "processed",
      error: null,
      processedAt: new Date("2026-05-25T10:30:00.000Z"),
      subscriptionId,
    }),
  });
}

function makeRazorpayRawBody(body: unknown) {
  return JSON.stringify(body);
}

describe("WebhooksService", () => {
  let service: WebhooksService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T10:30:00.000Z"));
    service = new WebhooksService(
      prismaMock,
      usersServiceMock,
      emailDeliveryServiceMock,
    );
    vi.clearAllMocks();

    mockTransaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback !== "function") {
        return Promise.all(callback as Array<Promise<unknown>>);
      }

      return callback(prismaMock.client);
    });
    mockPaymentWebhookCreate.mockResolvedValue({ id: "pwe_123" });
    mockPaymentWebhookUpdate.mockResolvedValue({ id: "pwe_123" });
    mockSubscriptionFindUnique.mockResolvedValue(null);
    mockSubscriptionUpdate.mockResolvedValue(subscriptionRecord);
    mockSubscriptionPaymentUpsert.mockResolvedValue({ id: "payment_1" });
    mockPaymentMethodCount.mockResolvedValue(0);
    mockPaymentMethodUpsert.mockResolvedValue({ id: "pm_1" });
    mockInvoiceUpsert.mockResolvedValue({ id: "invoice_1" });
    mockPlanFindUnique.mockResolvedValue(null);
    mockUserUpdate.mockResolvedValue({ id: "user_1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records the first Razorpay delivery in the payment webhook ledger", async () => {
    mockPaymentWebhookCreate.mockResolvedValue({ id: "pwe_123" });

    await expect(
      service.handleRazorpayWebhook({
        body: {
          event: "payment.captured",
          created_at: 1710000000,
          payload: { payment: { entity: { id: "pay_123" } } },
        },
        rawBody: '{"event":"payment.captured","created_at":1710000000}',
      }),
    ).resolves.toEqual({ received: true, replayed: false });

    expect(mockPaymentWebhookCreate).toHaveBeenCalledTimes(1);
    expect(mockPaymentWebhookCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "razorpay",
        eventType: "payment.captured",
        status: "received",
        processedAt: null,
        payload: {
          event: "payment.captured",
          created_at: 1710000000,
          payload: { payment: { entity: { id: "pay_123" } } },
        },
      }),
    });
    expect(
      mockPaymentWebhookCreate.mock.calls[0]?.[0]?.data.providerEventId,
    ).toHaveLength(64);
  });

  it("returns replayed for a duplicate Razorpay delivery", async () => {
    mockPaymentWebhookCreate.mockRejectedValue({ code: "P2002" });
    mockPaymentWebhookFindUnique.mockResolvedValue({
      id: "pwe_existing",
      providerEventId: "existing_provider_event_id",
    });

    await expect(
      service.handleRazorpayWebhook({
        body: {
          event: "payment.captured",
          created_at: 1710000000,
          payload: { payment: { entity: { id: "pay_123" } } },
        },
        rawBody: '{"event":"payment.captured","created_at":1710000000}',
      }),
    ).resolves.toEqual({ received: true, replayed: true });

    expect(mockPaymentWebhookCreate).toHaveBeenCalledTimes(1);
    expect(mockPaymentWebhookFindUnique).toHaveBeenCalledTimes(1);
  });

  it("derives a deterministic Razorpay providerEventId from event, created_at, and raw body", async () => {
    mockPaymentWebhookCreate.mockResolvedValue({ id: "pwe_123" });

    await service.handleRazorpayWebhook({
      body: {
        event: "payment.captured",
        created_at: 1710000000,
        payload: { payment: { entity: { id: "pay_123" } } },
      },
      rawBody:
        '{"event":"payment.captured","created_at":1710000000,"payload":{"payment":{"entity":{"id":"pay_123"}}}}',
    });
    const firstProviderEventId =
      mockPaymentWebhookCreate.mock.calls[0]?.[0]?.data.providerEventId;

    vi.clearAllMocks();
    mockPaymentWebhookCreate.mockResolvedValue({ id: "pwe_456" });

    await service.handleRazorpayWebhook({
      body: {
        event: "payment.captured",
        created_at: 1710000000,
        payload: { payment: { entity: { id: "pay_123" } } },
      },
      rawBody:
        '{"event":"payment.captured","created_at":1710000000,"payload":{"payment":{"entity":{"id":"pay_123"}}}}',
    });
    const secondProviderEventId =
      mockPaymentWebhookCreate.mock.calls[0]?.[0]?.data.providerEventId;

    vi.clearAllMocks();
    mockPaymentWebhookCreate.mockResolvedValue({ id: "pwe_789" });

    await service.handleRazorpayWebhook({
      body: {
        event: "payment.captured",
        created_at: 1710000000,
        payload: { payment: { entity: { id: "pay_123" } } },
      },
      rawBody:
        '{"event":"payment.captured","created_at":1710000000,"payload":{"payment":{"entity":{"id":"pay_456"}}}}',
    });
    const thirdProviderEventId =
      mockPaymentWebhookCreate.mock.calls[0]?.[0]?.data.providerEventId;

    expect(firstProviderEventId).toBe(secondProviderEventId);
    expect(firstProviderEventId).not.toBe(thirdProviderEventId);
  });

  it("records the first Clerk user.created delivery, upserts the user, and marks the ledger row processed", async () => {
    mockClerkWebhookCreate.mockResolvedValue({ id: "cwe_123" });
    mockUserUpsertFromClerk.mockResolvedValue(undefined);
    mockClerkWebhookUpdate.mockResolvedValue({ id: "cwe_123" });

    await expect(
      service.handleClerkEvent(clerkUserCreatedEvent, "msg_123"),
    ).resolves.toEqual({ received: true, replayed: false });

    expect(mockClerkWebhookCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerEventId: "msg_123",
        eventType: "user.created",
        status: "received",
        processedAt: null,
        payload: clerkUserCreatedEvent,
      }),
    });
    expect(mockUserUpsertFromClerk).toHaveBeenCalledWith(clerkUserPayload);
    expect(mockClerkWebhookUpdate).toHaveBeenCalledWith({
      where: { providerEventId: "msg_123" },
      data: expect.objectContaining({
        status: "processed",
        error: null,
      }),
    });
  });

  it("records Clerk email.created deliveries, creates a Resend email delivery, and marks the ledger processed", async () => {
    mockClerkWebhookCreate.mockResolvedValue({ id: "cwe_email" });
    mockCreateClerkEmailDelivery.mockResolvedValue({ id: "email_1" });
    mockClerkWebhookUpdate.mockResolvedValue({ id: "cwe_email" });

    await expect(
      service.handleClerkEvent(clerkEmailCreatedEvent, "msg_email_123"),
    ).resolves.toEqual({ received: true, replayed: false });

    expect(mockClerkWebhookCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerEventId: "msg_email_123",
        eventType: "email.created",
        status: "received",
        processedAt: null,
        payload: clerkEmailCreatedEvent,
      }),
    });
    expect(mockUserUpsertFromClerk).not.toHaveBeenCalled();
    expect(mockCreateClerkEmailDelivery).toHaveBeenCalledWith(
      clerkEmailPayload,
      "msg_email_123",
    );
    expect(mockClerkWebhookUpdate).toHaveBeenCalledWith({
      where: { providerEventId: "msg_email_123" },
      data: expect.objectContaining({
        status: "processed",
        error: null,
      }),
    });
  });

  it("marks Clerk sms.created deliveries ignored until an SMS provider is configured", async () => {
    mockClerkWebhookCreate.mockResolvedValue({ id: "cwe_sms" });
    mockClerkWebhookUpdate.mockResolvedValue({ id: "cwe_sms" });

    await expect(
      service.handleClerkEvent(
        {
          type: "sms.created",
          data: {
            id: "sms_123",
            slug: "phone_code",
            status: "queued",
            toPhoneNumber: "+15555550123",
            body: "Your Semblia code is 424242.",
            otpCode: "424242",
          },
        },
        "msg_sms_123",
      ),
    ).resolves.toEqual({ received: true, replayed: false });

    expect(mockUserUpsertFromClerk).not.toHaveBeenCalled();
    expect(mockCreateClerkEmailDelivery).not.toHaveBeenCalled();
    expect(mockClerkWebhookUpdate).toHaveBeenCalledWith({
      where: { providerEventId: "msg_sms_123" },
      data: expect.objectContaining({
        status: "ignored",
        error: null,
      }),
    });
  });

  it("short-circuits a replayed Clerk event when the existing row is already processed", async () => {
    mockClerkWebhookCreate.mockRejectedValue({ code: "P2002" });
    mockClerkWebhookFindUnique.mockResolvedValue({
      providerEventId: "msg_123",
      status: "processed",
    });

    await expect(
      service.handleClerkEvent(clerkUserCreatedEvent, "msg_123"),
    ).resolves.toEqual({ received: true, replayed: true });

    expect(mockUserUpsertFromClerk).not.toHaveBeenCalled();
    expect(mockClerkWebhookUpdate).not.toHaveBeenCalled();
  });

  it("retries a Clerk delivery after a previously failed ledger row", async () => {
    mockClerkWebhookCreate.mockRejectedValue({ code: "P2002" });
    mockClerkWebhookFindUnique.mockResolvedValue({
      providerEventId: "msg_123",
      status: "failed",
    });
    mockUserUpsertFromClerk.mockResolvedValue(undefined);
    mockClerkWebhookUpdate.mockResolvedValue({ providerEventId: "msg_123" });

    await expect(
      service.handleClerkEvent(clerkUserCreatedEvent, "msg_123"),
    ).resolves.toEqual({ received: true, replayed: false });

    expect(mockUserUpsertFromClerk).toHaveBeenCalledWith(clerkUserPayload);
    expect(mockClerkWebhookUpdate).toHaveBeenCalledWith({
      where: { providerEventId: "msg_123" },
      data: expect.objectContaining({
        status: "processed",
        error: null,
      }),
    });
  });

  it("marks non-user Clerk events as ignored", async () => {
    mockClerkWebhookCreate.mockResolvedValue({ id: "cwe_456" });
    mockClerkWebhookUpdate.mockResolvedValue({ id: "cwe_456" });

    await expect(
      service.handleClerkEvent(
        {
          type: "session.created",
          data: clerkUserPayload,
        },
        "msg_456",
      ),
    ).resolves.toEqual({ received: true, replayed: false });

    expect(mockUserUpsertFromClerk).not.toHaveBeenCalled();
    expect(mockClerkWebhookUpdate).toHaveBeenCalledWith({
      where: { providerEventId: "msg_456" },
      data: expect.objectContaining({
        status: "ignored",
        error: null,
      }),
    });
  });

  it("marks the Clerk ledger row failed and rethrows when upsertFromClerk fails", async () => {
    const error = new Error("temporary outage");

    mockClerkWebhookCreate.mockResolvedValue({ id: "cwe_789" });
    mockUserUpsertFromClerk.mockRejectedValue(error);
    mockClerkWebhookUpdate.mockResolvedValue({ id: "cwe_789" });

    await expect(
      service.handleClerkEvent(clerkUserCreatedEvent, "msg_789"),
    ).rejects.toThrow("temporary outage");

    expect(mockClerkWebhookUpdate).toHaveBeenCalledWith({
      where: { providerEventId: "msg_789" },
      data: expect.objectContaining({
        status: "failed",
        error: "temporary outage",
      }),
    });
  });

  describe("Razorpay webhook processing", () => {
    it("subscription.activated promotes subscription and user plans, snapshots periods and amount, stamps webhook metadata, and marks the ledger processed", async () => {
      const body = {
        event: "subscription.activated",
        created_at: 1779700000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "active",
              current_start: 1779700000,
              current_end: 1782292000,
              plan_id: "plan_rzp_pro",
              notes: {
                semblia_user_id: "user_1",
                semblia_plan: "PRO",
              },
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue(subscriptionRecord);
      mockPlanFindUnique.mockResolvedValue(proPlanRecord);

      await expect(
        service.handleRazorpayWebhook({
          body,
          rawBody: makeRazorpayRawBody(body),
        }),
      ).resolves.toEqual({ received: true, replayed: false });

      const providerEventId = getCreatedRazorpayProviderEventId();
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          status: "ACTIVE",
          providerStatus: "active",
          currentPeriodStart: new Date("2026-05-25T09:06:40.000Z"),
          currentPeriodEnd: new Date("2026-06-24T09:06:40.000Z"),
          amount: 79900,
          currency: "INR",
          interval: "month",
          planId: "plan_pro",
          userPlan: "PRO",
          cancelAtPeriodEnd: false,
          lastWebhookEventId: providerEventId,
          lastWebhookEventType: "subscription.activated",
          lastWebhookAt: new Date("2026-05-25T10:30:00.000Z"),
        }),
      });
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { plan: "PRO" },
        select: { id: true },
      });
      expectProcessedLedger();
    });

    it("subscription.activated for a scheduled id promotes the scheduled subscription and clears the schedule", async () => {
      const body = {
        event: "subscription.activated",
        created_at: 1779700000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_next",
              status: "active",
              current_start: 1779700000,
              current_end: 1782292000,
              plan_id: "plan_rzp_business",
              notes: {
                semblia_user_id: "user_1",
                semblia_plan: "BUSINESS",
              },
            },
          },
        },
      };
      const scheduledSubscription = {
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
        externalSubscriptionId: "sub_rzp_current",
        scheduledRazorpaySubscriptionId: "sub_rzp_next",
        scheduledPlanId: "plan_business",
        scheduledStartAt: new Date("2026-06-24T09:06:40.000Z"),
      };
      mockSubscriptionFindUnique.mockImplementation(
        ({ where }: { where: Record<string, string> }) => {
          if (where.scheduledRazorpaySubscriptionId === "sub_rzp_next") {
            return Promise.resolve(scheduledSubscription);
          }
          return Promise.resolve(null);
        },
      );
      mockPlanFindUnique.mockResolvedValue({
        id: "plan_business",
        type: "BUSINESS",
        price: 249900,
        currency: "INR",
        interval: "month",
      });

      await expect(
        service.handleRazorpayWebhook({
          body,
          rawBody: makeRazorpayRawBody(body),
        }),
      ).resolves.toEqual({ received: true, replayed: false });

      expect(mockSubscriptionFindUnique).toHaveBeenCalledWith({
        where: { externalSubscriptionId: "sub_rzp_next" },
        select: expect.any(Object),
      });
      expect(mockSubscriptionFindUnique).toHaveBeenCalledWith({
        where: { scheduledRazorpaySubscriptionId: "sub_rzp_next" },
        select: expect.any(Object),
      });
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          externalSubscriptionId: "sub_rzp_next",
          razorpaySubscriptionId: "sub_rzp_next",
          planId: "plan_business",
          userPlan: "BUSINESS",
          scheduledRazorpaySubscriptionId: null,
          scheduledPlanId: null,
          scheduledStartAt: null,
          cancelAtPeriodEnd: false,
          providerStatus: "active",
        }),
      });
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { plan: "BUSINESS" },
        select: { id: true },
      });
      expectProcessedLedger();
    });

    it("subscription.charged refreshes currentPeriodEnd without changing plan or status", async () => {
      const body = {
        event: "subscription.charged",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "active",
              current_start: 1782292000,
              current_end: 1784884000,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        status: "ACTIVE",
        userPlan: "PRO",
        planId: "plan_pro",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          status: "ACTIVE",
          providerStatus: "active",
          currentPeriodStart: new Date("2026-06-24T09:06:40.000Z"),
          currentPeriodEnd: new Date("2026-07-24T09:06:40.000Z"),
        }),
      });
      expect(mockSubscriptionUpdate.mock.calls[0]?.[0]?.data.userPlan).toBe(
        undefined,
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
      expectProcessedLedger();
    });

    it("subscription.charged with a card payload mirrors the saved Razorpay token as the user's default payment method", async () => {
      const body = {
        event: "subscription.charged",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "active",
              current_start: 1782292000,
              current_end: 1784884000,
            },
          },
          payment: {
            entity: {
              id: "pay_card",
              status: "captured",
              subscription_id: "sub_rzp_123",
              invoice_id: "inv_card",
              amount: 79900,
              currency: "INR",
              created_at: 1782291900,
              method: "card",
              token_id: "token_visa_1",
              card: {
                last4: "4242",
                network: "Visa",
                expiry_month: 12,
                expiry_year: 2030,
              },
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockPaymentMethodCount.mockResolvedValue(0);

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockPaymentMethodCount).toHaveBeenCalledWith({
        where: { userId: "user_1", isDefault: true },
      });
      expect(mockPaymentMethodUpsert).toHaveBeenCalledWith({
        where: { razorpayTokenId: "token_visa_1" },
        create: expect.objectContaining({
          userId: "user_1",
          brand: "VISA",
          last4: "4242",
          expMonth: 12,
          expYear: 2030,
          razorpayTokenId: "token_visa_1",
          isDefault: true,
        }),
        update: expect.objectContaining({
          brand: "VISA",
          last4: "4242",
          expMonth: 12,
          expYear: 2030,
        }),
      });
      expectProcessedLedger();
    });

    it("subscription.charged with a non-card payment skips the local payment method mirror", async () => {
      const body = {
        event: "subscription.charged",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "active",
              current_start: 1782292000,
              current_end: 1784884000,
            },
          },
          payment: {
            entity: {
              id: "pay_upi",
              status: "captured",
              subscription_id: "sub_rzp_123",
              invoice_id: "inv_upi",
              amount: 79900,
              currency: "INR",
              method: "upi",
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockPaymentMethodCount).not.toHaveBeenCalled();
      expect(mockPaymentMethodUpsert).not.toHaveBeenCalled();
      expectProcessedLedger();
    });

    it("subscription.charged with an existing Razorpay token refreshes card metadata without changing the default flag", async () => {
      const body = {
        event: "subscription.charged",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "active",
              current_start: 1782292000,
              current_end: 1784884000,
            },
          },
          payment: {
            entity: {
              id: "pay_existing_card",
              status: "captured",
              subscription_id: "sub_rzp_123",
              invoice_id: "inv_existing_card",
              amount: 79900,
              currency: "INR",
              method: "card",
              token_id: "token_existing",
              card: {
                last4: "9999",
                network: "MasterCard",
                expiry_month: 9,
                expiry_year: 2031,
              },
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockPaymentMethodCount.mockResolvedValue(1);

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      const upsertArgs = mockPaymentMethodUpsert.mock.calls[0]?.[0];
      expect(upsertArgs).toEqual({
        where: { razorpayTokenId: "token_existing" },
        create: expect.objectContaining({
          userId: "user_1",
          brand: "MASTERCARD",
          last4: "9999",
          expMonth: 9,
          expYear: 2031,
          razorpayTokenId: "token_existing",
          isDefault: false,
        }),
        update: expect.objectContaining({
          brand: "MASTERCARD",
          last4: "9999",
          expMonth: 9,
          expYear: 2031,
        }),
      });
      expect(upsertArgs?.update.isDefault).toBeUndefined();
      expectProcessedLedger();
    });

    it("subscription.charged maps American Express card metadata to the AMEX brand", async () => {
      const body = {
        event: "subscription.charged",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "active",
            },
          },
          payment: {
            entity: {
              id: "pay_amex",
              status: "captured",
              subscription_id: "sub_rzp_123",
              method: "card",
              token_id: "token_amex",
              card: {
                last4: "0005",
                network: "American Express",
                expiry_month: 1,
                expiry_year: 2032,
              },
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockPaymentMethodUpsert).toHaveBeenCalledWith({
        where: { razorpayTokenId: "token_amex" },
        create: expect.objectContaining({
          brand: "AMEX",
          last4: "0005",
          expMonth: 1,
          expYear: 2032,
        }),
        update: expect.objectContaining({
          brand: "AMEX",
          last4: "0005",
          expMonth: 1,
          expYear: 2032,
        }),
      });
      expectProcessedLedger();
    });

    it("payment.captured with a card payload mirrors the saved Razorpay token as a payment method", async () => {
      const body = {
        event: "payment.captured",
        created_at: 1782292000,
        payload: {
          payment: {
            entity: {
              id: "pay_rupay",
              status: "captured",
              subscription_id: "sub_rzp_123",
              amount: 79900,
              currency: "INR",
              created_at: 1782291900,
              method: "card",
              token_id: "token_rupay",
              card: {
                last4: "1111",
                network: "RuPay",
                expiry_month: 4,
                expiry_year: 2033,
              },
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockPaymentMethodCount.mockResolvedValue(0);

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockPaymentMethodUpsert).toHaveBeenCalledWith({
        where: { razorpayTokenId: "token_rupay" },
        create: expect.objectContaining({
          userId: "user_1",
          brand: "RUPAY",
          last4: "1111",
          expMonth: 4,
          expYear: 2033,
          razorpayTokenId: "token_rupay",
          isDefault: true,
        }),
        update: expect.objectContaining({
          brand: "RUPAY",
          last4: "1111",
          expMonth: 4,
          expYear: 2033,
        }),
      });
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          lastPaymentStatus: "captured",
        }),
      });
      expectProcessedLedger();
    });

    it("subscription.cancelled marks the provider cancelled but keeps the paid user plan intact", async () => {
      const body = {
        event: "subscription.cancelled",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "cancelled",
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          status: "CANCELED",
          providerStatus: "cancelled",
          cancelAtPeriodEnd: false,
        }),
      });
      expect(mockSubscriptionUpdate.mock.calls[0]?.[0]?.data.userPlan).toBe(
        undefined,
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
      expectProcessedLedger();
    });

    it("subscription.cancelled with a scheduled switch does not downgrade the local user plan", async () => {
      const body = {
        event: "subscription.cancelled",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "cancelled",
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
        scheduledRazorpaySubscriptionId: "sub_rzp_next",
        scheduledPlanId: "plan_business",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          status: "CANCELED",
          providerStatus: "cancelled",
          cancelAtPeriodEnd: false,
        }),
      });
      expect(mockSubscriptionUpdate.mock.calls[0]?.[0]?.data.userPlan).toBe(
        undefined,
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
      expectProcessedLedger();
    });

    it("subscription.completed downgrades subscription and user plans to FREE", async () => {
      const body = {
        event: "subscription.completed",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "completed",
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          status: "CANCELED",
          providerStatus: "completed",
          userPlan: "FREE",
          cancelAtPeriodEnd: false,
        }),
      });
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { plan: "FREE" },
        select: { id: true },
      });
      expectProcessedLedger();
    });

    it("subscription.completed with a scheduled switch does not downgrade the local user plan", async () => {
      const body = {
        event: "subscription.completed",
        created_at: 1782292000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "completed",
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
        scheduledRazorpaySubscriptionId: "sub_rzp_next",
        scheduledPlanId: "plan_business",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          status: "CANCELED",
          providerStatus: "completed",
          cancelAtPeriodEnd: false,
        }),
      });
      expect(mockSubscriptionUpdate.mock.calls[0]?.[0]?.data.userPlan).toBe(
        undefined,
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
      expectProcessedLedger();
    });

    it("payment.captured writes a SubscriptionPayment row idempotently by payment id", async () => {
      const firstBody = {
        event: "payment.captured",
        created_at: 1782292000,
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              status: "captured",
              subscription_id: "sub_rzp_123",
              invoice_id: "inv_123",
              amount: 79900,
              currency: "INR",
              created_at: 1782291900,
            },
          },
        },
      };
      const replayBodyWithSamePayment = {
        ...firstBody,
        created_at: 1782292001,
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });

      await service.handleRazorpayWebhook({
        body: firstBody,
        rawBody: makeRazorpayRawBody(firstBody),
      });
      vi.clearAllMocks();
      mockTransaction.mockImplementation(async (callback: unknown) =>
        typeof callback === "function"
          ? callback(prismaMock.client)
          : Promise.all(callback as Array<Promise<unknown>>),
      );
      mockPaymentWebhookCreate.mockResolvedValue({ id: "pwe_456" });
      mockPaymentWebhookUpdate.mockResolvedValue({ id: "pwe_456" });
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockSubscriptionPaymentUpsert.mockResolvedValue({ id: "payment_1" });

      await service.handleRazorpayWebhook({
        body: replayBodyWithSamePayment,
        rawBody: makeRazorpayRawBody(replayBodyWithSamePayment),
      });

      expect(mockSubscriptionPaymentUpsert).toHaveBeenCalledWith({
        where: {
          provider_externalPaymentId: {
            provider: "razorpay",
            externalPaymentId: "pay_123",
          },
        },
        create: expect.objectContaining({
          provider: "razorpay",
          externalPaymentId: "pay_123",
          externalInvoiceId: "inv_123",
          externalSubscriptionId: "sub_rzp_123",
          subscriptionId: "sub_local_1",
          userId: "user_1",
          planId: "plan_pro",
          paymentStatus: "captured",
          paidAt: new Date("2026-06-24T09:05:00.000Z"),
          amount: 79900,
          currency: "INR",
          eventType: "payment.captured",
        }),
        update: expect.objectContaining({
          paymentStatus: "captured",
          paidAt: new Date("2026-06-24T09:05:00.000Z"),
          amount: 79900,
          currency: "INR",
        }),
      });
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          lastPaymentStatus: "captured",
        }),
      });
      expectProcessedLedger();
    });

    it("payment.failed records failure and updates lastPaymentStatus", async () => {
      const body = {
        event: "payment.failed",
        created_at: 1782292000,
        payload: {
          payment: {
            entity: {
              id: "pay_failed",
              status: "failed",
              subscription_id: "sub_rzp_123",
              invoice_id: "inv_failed",
              amount: 79900,
              currency: "INR",
              created_at: 1782291900,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockSubscriptionPaymentUpsert).toHaveBeenCalledWith({
        where: {
          provider_externalPaymentId: {
            provider: "razorpay",
            externalPaymentId: "pay_failed",
          },
        },
        create: expect.objectContaining({
          paymentStatus: "failed",
          failedAt: new Date("2026-06-24T09:05:00.000Z"),
        }),
        update: expect.objectContaining({
          paymentStatus: "failed",
          failedAt: new Date("2026-06-24T09:05:00.000Z"),
        }),
      });
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          lastPaymentStatus: "failed",
        }),
      });
      expectProcessedLedger();
    });

    it("invoice.paid writes or updates SubscriptionPayment by invoice id and updates lastInvoiceStatus", async () => {
      const body = {
        event: "invoice.paid",
        created_at: 1782292000,
        payload: {
          invoice: {
            entity: {
              id: "inv_123",
              status: "paid",
              subscription_id: "sub_rzp_123",
              payment_id: "pay_123",
              amount: 79900,
              currency: "INR",
              created_at: 1782291800,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockSubscriptionPaymentUpsert).toHaveBeenCalledWith({
        where: {
          provider_externalInvoiceId: {
            provider: "razorpay",
            externalInvoiceId: "inv_123",
          },
        },
        create: expect.objectContaining({
          provider: "razorpay",
          externalInvoiceId: "inv_123",
          externalPaymentId: "pay_123",
          externalSubscriptionId: "sub_rzp_123",
          subscriptionId: "sub_local_1",
          userId: "user_1",
          invoiceStatus: "paid",
          eventType: "invoice.paid",
        }),
        update: expect.objectContaining({
          invoiceStatus: "paid",
          externalPaymentId: "pay_123",
        }),
      });
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          lastInvoiceStatus: "paid",
        }),
      });
      expectProcessedLedger();
    });

    it("invoice.paid writes the local Invoice row with its hosted short URL and PAID status", async () => {
      const body = {
        event: "invoice.paid",
        created_at: 1782292000,
        payload: {
          invoice: {
            entity: {
              id: "inv_paid_url",
              status: "paid",
              subscription_id: "sub_rzp_123",
              payment_id: "pay_paid_url",
              invoice_number: "RZP/2026/0001",
              short_url: "https://rzp.io/i/inv_paid_url",
              amount: 79900,
              amount_paid: 79900,
              currency: "INR",
              created_at: 1782291800,
              issued_at: 1782291000,
              paid_at: 1782291900,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockPlanFindUnique.mockResolvedValue({ type: "PRO" });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockInvoiceUpsert).toHaveBeenCalledWith({
        where: { razorpayInvoiceId: "inv_paid_url" },
        create: expect.objectContaining({
          userId: "user_1",
          number: "RZP/2026/0001",
          issuedAt: new Date("2026-06-24T08:50:00.000Z"),
          amount: 79900,
          currency: "INR",
          status: "PAID",
          planName: "Pro",
          razorpayInvoiceId: "inv_paid_url",
          downloadUrl: "https://rzp.io/i/inv_paid_url",
        }),
        update: expect.objectContaining({
          number: "RZP/2026/0001",
          status: "PAID",
          downloadUrl: "https://rzp.io/i/inv_paid_url",
        }),
      });
      expectProcessedLedger();
    });

    it("invoice.paid falls back to invoice id and the subscription user plan when the local Plan row is missing", async () => {
      const body = {
        event: "invoice.paid",
        created_at: 1782292000,
        payload: {
          invoice: {
            entity: {
              id: "inv_business_fallback",
              status: "paid",
              subscription_id: "sub_rzp_123",
              short_url: "https://rzp.io/i/inv_business_fallback",
              amount_paid: 249900,
              currency: "INR",
              created_at: 1782291800,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "BUSINESS",
        planId: "missing_plan",
      });
      mockPlanFindUnique.mockResolvedValue(null);

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockInvoiceUpsert).toHaveBeenCalledWith({
        where: { razorpayInvoiceId: "inv_business_fallback" },
        create: expect.objectContaining({
          number: "inv_business_fallback",
          planName: "Business",
          status: "PAID",
          downloadUrl: "https://rzp.io/i/inv_business_fallback",
        }),
        update: expect.objectContaining({
          number: "inv_business_fallback",
          planName: "Business",
          status: "PAID",
        }),
      });
      expectProcessedLedger();
    });

    it("invoice.paid truncates long provider invoice numbers to the local column limit", async () => {
      const longInvoiceNumber = `RZP-${"A".repeat(160)}`;
      const body = {
        event: "invoice.paid",
        created_at: 1782292000,
        payload: {
          invoice: {
            entity: {
              id: "inv_long_number",
              status: "paid",
              subscription_id: "sub_rzp_123",
              invoice_number: longInvoiceNumber,
              amount_paid: 79900,
              currency: "INR",
              created_at: 1782291800,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockPlanFindUnique.mockResolvedValue({ type: "PRO" });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockInvoiceUpsert).toHaveBeenCalledWith({
        where: { razorpayInvoiceId: "inv_long_number" },
        create: expect.objectContaining({
          number: longInvoiceNumber.slice(0, 120),
        }),
        update: expect.objectContaining({
          number: longInvoiceNumber.slice(0, 120),
        }),
      });
      expectProcessedLedger();
    });

    it("invoice.paid defaults missing amount and currency for the local Invoice row", async () => {
      const body = {
        event: "invoice.paid",
        created_at: 1782292000,
        payload: {
          invoice: {
            entity: {
              id: "inv_missing_amount",
              status: "paid",
              subscription_id: "sub_rzp_123",
              created_at: 1782291800,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockPlanFindUnique.mockResolvedValue({ type: "PRO" });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockInvoiceUpsert).toHaveBeenCalledWith({
        where: { razorpayInvoiceId: "inv_missing_amount" },
        create: expect.objectContaining({
          amount: 0,
          currency: "INR",
          status: "PAID",
        }),
        update: expect.objectContaining({
          amount: 0,
          currency: "INR",
          status: "PAID",
        }),
      });
      expectProcessedLedger();
    });

    it("invoice.payment_failed writes the local Invoice row as OPEN and records the failed invoice status", async () => {
      const body = {
        event: "invoice.payment_failed",
        created_at: 1782292000,
        payload: {
          invoice: {
            entity: {
              id: "inv_failed_url",
              status: "issued",
              subscription_id: "sub_rzp_123",
              payment_id: "pay_failed_url",
              invoice_number: "RZP/2026/0002",
              short_url: "https://rzp.io/i/inv_failed_url",
              amount: 79900,
              currency: "INR",
              created_at: 1782291800,
              issued_at: 1782291000,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockPlanFindUnique.mockResolvedValue({ type: "PRO" });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockSubscriptionPaymentUpsert).not.toHaveBeenCalled();
      expect(mockInvoiceUpsert).toHaveBeenCalledWith({
        where: { razorpayInvoiceId: "inv_failed_url" },
        create: expect.objectContaining({
          userId: "user_1",
          number: "RZP/2026/0002",
          issuedAt: new Date("2026-06-24T08:50:00.000Z"),
          amount: 79900,
          currency: "INR",
          status: "OPEN",
          planName: "Pro",
          razorpayInvoiceId: "inv_failed_url",
          downloadUrl: "https://rzp.io/i/inv_failed_url",
        }),
        update: expect.objectContaining({
          status: "OPEN",
          downloadUrl: "https://rzp.io/i/inv_failed_url",
        }),
      });
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          lastInvoiceStatus: "failed",
        }),
      });
      expectProcessedLedger();
    });

    it("invoice.payment_failed writes expired Razorpay invoices as VOID locally", async () => {
      const body = {
        event: "invoice.payment_failed",
        created_at: 1782292000,
        payload: {
          invoice: {
            entity: {
              id: "inv_expired_url",
              status: "expired",
              subscription_id: "sub_rzp_123",
              invoice_number: "RZP/2026/0003",
              short_url: "https://rzp.io/i/inv_expired_url",
              amount: 79900,
              currency: "INR",
              created_at: 1782291800,
              issued_at: 1782291000,
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue({
        ...subscriptionRecord,
        userPlan: "PRO",
        planId: "plan_pro",
      });
      mockPlanFindUnique.mockResolvedValue({ type: "PRO" });

      await service.handleRazorpayWebhook({
        body,
        rawBody: makeRazorpayRawBody(body),
      });

      expect(mockInvoiceUpsert).toHaveBeenCalledWith({
        where: { razorpayInvoiceId: "inv_expired_url" },
        create: expect.objectContaining({
          status: "VOID",
          downloadUrl: "https://rzp.io/i/inv_expired_url",
        }),
        update: expect.objectContaining({
          status: "VOID",
          downloadUrl: "https://rzp.io/i/inv_expired_url",
        }),
      });
      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_local_1" },
        data: expect.objectContaining({
          lastInvoiceStatus: "failed",
        }),
      });
      expectProcessedLedger();
    });

    it("marks an unknown Razorpay event ignored and does not throw", async () => {
      const body = {
        event: "customer.created",
        created_at: 1782292000,
        payload: {},
      };

      await expect(
        service.handleRazorpayWebhook({
          body,
          rawBody: makeRazorpayRawBody(body),
        }),
      ).resolves.toEqual({ received: true, replayed: false });

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockPaymentWebhookUpdate).toHaveBeenCalledWith({
        where: { providerEventId: getCreatedRazorpayProviderEventId() },
        data: expect.objectContaining({
          status: "ignored",
          error: null,
          processedAt: new Date("2026-05-25T10:30:00.000Z"),
        }),
      });
    });

    it("marks the Razorpay ledger failed with the error message and rethrows processing errors", async () => {
      const body = {
        event: "subscription.activated",
        created_at: 1779700000,
        payload: {
          subscription: {
            entity: {
              id: "sub_rzp_123",
              status: "active",
              current_start: 1779700000,
              current_end: 1782292000,
              notes: {
                semblia_plan: "PRO",
              },
            },
          },
        },
      };
      mockSubscriptionFindUnique.mockResolvedValue(subscriptionRecord);
      mockSubscriptionUpdate.mockRejectedValue(new Error("database outage"));

      await expect(
        service.handleRazorpayWebhook({
          body,
          rawBody: makeRazorpayRawBody(body),
        }),
      ).rejects.toThrow("database outage");

      expect(mockPaymentWebhookUpdate).toHaveBeenLastCalledWith({
        where: { providerEventId: getCreatedRazorpayProviderEventId() },
        data: expect.objectContaining({
          status: "failed",
          error: "database outage",
          processedAt: new Date("2026-05-25T10:30:00.000Z"),
        }),
      });
    });
  });
});
