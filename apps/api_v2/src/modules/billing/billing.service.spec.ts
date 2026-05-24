import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { BillingService } from "./billing.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RazorpayService } from "./razorpay.service.js";

type BillingPlan = "FREE" | "PRO" | "BUSINESS";

type SubscriptionRecord = {
  id: string;
  userId: string;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";
  userPlan: BillingPlan;
  planId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  amount: number | null;
  currency: string | null;
  interval: string | null;
  externalCustomerId: string | null;
  externalSubscriptionId: string | null;
  razorpaySubscriptionId: string | null;
  providerStatus: string | null;
  plan?: PlanRecord | null;
};

type PaymentMethodRecord = {
  id: string;
  userId: string;
  brand: "VISA" | "MASTERCARD" | "RUPAY" | "AMEX";
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: Date;
};

type UserRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type PlanRecord = {
  id: string;
  type: BillingPlan;
  isActive: boolean;
  razorpayPlanId: string | null;
  price: number;
  currency: string;
  interval: string;
  limits: {
    testimonials: number;
    widgets: number;
    projects: number;
  };
  createdAt: Date;
};

const state: {
  subscriptions: SubscriptionRecord[];
  paymentMethods: PaymentMethodRecord[];
  users: UserRecord[];
  plans: PlanRecord[];
} = {
  subscriptions: [],
  paymentMethods: [],
  users: [],
  plans: [],
};

const prismaMock = {
  client: {
    $transaction: vi.fn((operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    ),
    subscription: {
      findUnique: vi.fn(
        ({ where }: { where: { userId: string } }) =>
          state.subscriptions.find((row) => row.userId === where.userId) ??
          null,
      ),
      create: vi.fn(({ data }: { data: Partial<SubscriptionRecord> }) => {
        const row: SubscriptionRecord = {
          id: "sub_1",
          userId: data.userId ?? "user_1",
          status: data.status ?? "ACTIVE",
          userPlan: data.userPlan ?? "FREE",
          planId: data.planId ?? null,
          currentPeriodStart: data.currentPeriodStart ?? null,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
          amount: data.amount ?? null,
          currency: data.currency ?? null,
          interval: data.interval ?? null,
          externalCustomerId: data.externalCustomerId ?? null,
          externalSubscriptionId: data.externalSubscriptionId ?? null,
          razorpaySubscriptionId: data.razorpaySubscriptionId ?? null,
          providerStatus: data.providerStatus ?? null,
        };
        state.subscriptions.push(row);
        return row;
      }),
      update: vi.fn(
        ({
          where,
          data,
        }: {
          where: { userId: string };
          data: Partial<SubscriptionRecord>;
        }) => {
          const row = state.subscriptions.find(
            (entry) => entry.userId === where.userId,
          );
          if (!row) throw new Error("missing subscription");
          Object.assign(row, data);
          return row;
        },
      ),
    },
    plan: {
      findFirst: vi.fn(
        ({
          where,
        }: {
          where: { type?: BillingPlan; isActive?: boolean };
        }) => {
          const plan =
            state.plans.find((row) => {
              if (where.type && row.type !== where.type) return false;
              if (
                typeof where.isActive === "boolean" &&
                row.isActive !== where.isActive
              ) {
                return false;
              }
              return true;
            }) ?? null;

          return plan;
        },
      ),
    },
    user: {
      update: vi.fn(() => ({ id: "user_1" })),
      findUnique: vi.fn(
        ({ where }: { where: { id: string } }) =>
          state.users.find((row) => row.id === where.id) ?? null,
      ),
    },
    paymentMethod: {
      findMany: vi.fn(({ where }: { where: { userId: string } }) =>
        state.paymentMethods
          .filter((row) => row.userId === where.userId)
          .sort((left, right) => {
            if (left.isDefault !== right.isDefault) {
              return left.isDefault ? -1 : 1;
            }

            return right.createdAt.getTime() - left.createdAt.getTime();
          }),
      ),
      findFirst: vi.fn(
        ({ where }: { where: { id: string; userId: string } }) =>
          state.paymentMethods.find(
            (row) => row.id === where.id && row.userId === where.userId,
          ) ?? null,
      ),
      updateMany: vi.fn(
        ({
          where,
          data,
        }: {
          where: { userId: string };
          data: Partial<PaymentMethodRecord>;
        }) => {
          let count = 0;
          for (const row of state.paymentMethods) {
            if (row.userId !== where.userId) continue;
            Object.assign(row, data);
            count += 1;
          }
          return { count };
        },
      ),
      update: vi.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<PaymentMethodRecord>;
        }) => {
          const row = state.paymentMethods.find(
            (entry) => entry.id === where.id,
          );
          if (!row) throw new Error("missing payment method");
          Object.assign(row, data);
          return row;
        },
      ),
    },
    project: {
      count: vi.fn(() => 0),
    },
    widget: {
      count: vi.fn(() => 0),
    },
    testimonial: {
      count: vi.fn(() => 0),
    },
    invoice: {
      findMany: vi.fn(() => []),
    },
    billingProfile: {
      upsert: vi.fn(),
    },
  },
} as unknown as PrismaService;

const razorpayMock = {
  getClient: vi.fn(() => null),
  ensureCustomer: vi.fn(async () => ({ id: "cust_new" })),
  createSubscription: vi.fn(async () => ({
    id: "rzp_sub_new",
    status: "created",
    short_url: "https://rzp.io/i/new",
    customer_id: "cust_new",
    plan_id: "plan_rzp_pro",
    notes: {
      tresta_user_id: "user_1",
      tresta_plan: "PRO",
    },
  })),
  getPublishableKeyId: vi.fn(() => "rzp_test_key"),
};

function makeSubscription(
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  return {
    id: "sub_1",
    userId: "user_1",
    status: "ACTIVE",
    userPlan: "FREE",
    planId: null,
    currentPeriodStart: new Date("2026-05-20T10:00:00.000Z"),
    currentPeriodEnd: new Date("2026-06-20T10:00:00.000Z"),
    cancelAtPeriodEnd: false,
    amount: 0,
    currency: "INR",
    interval: "month",
    externalCustomerId: null,
    externalSubscriptionId: null,
    razorpaySubscriptionId: null,
    providerStatus: null,
    ...overrides,
  };
}

function makePlan(overrides: Partial<PlanRecord> = {}): PlanRecord {
  return {
    id: "plan_pro",
    type: "PRO",
    isActive: true,
    razorpayPlanId: "plan_rzp_pro",
    price: 79900,
    currency: "INR",
    interval: "month",
    limits: {
      testimonials: 1000,
      widgets: 10,
      projects: 5,
    },
    createdAt: new Date("2026-05-20T10:00:00.000Z"),
    ...overrides,
  };
}

function ensureRazorpayCustomer(service: BillingService, userId: string) {
  return (
    service as unknown as {
      ensureRazorpayCustomer(userId: string): Promise<string>;
    }
  ).ensureRazorpayCustomer(userId);
}

describe("BillingService", () => {
  let service: BillingService;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T10:00:00.000Z"));
    vi.clearAllMocks();
    state.subscriptions = [];
    state.paymentMethods = [];
    state.plans = [];
    state.users = [
      {
        id: "user_1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    ];

    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RazorpayService, useValue: razorpayMock },
      ],
    }).compile();

    service = moduleRef.get(BillingService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-creates a FREE subscription on first read", async () => {
    const subscription = await service.getSubscription("user_1");

    expect(subscription).toMatchObject({
      id: "sub_1",
      userId: "user_1",
      status: "active",
      userPlan: "FREE",
      cancelAtPeriodEnd: false,
      amount: 0,
      currency: "INR",
      interval: "month",
    });
    expect(subscription.currentPeriodStart).toBe("2026-05-20T10:00:00.000Z");
    expect(subscription.currentPeriodEnd).toBe("2026-06-20T10:00:00.000Z");
    expect(state.subscriptions).toHaveLength(1);
  });

  it("persists a plan switch", async () => {
    await service.getSubscription("user_1");

    const subscription = await service.switchSubscriptionPlan("user_1", {
      planId: "PRO",
    });

    expect(subscription).toMatchObject({
      userPlan: "PRO",
      amount: 79900,
      currency: "INR",
      interval: "month",
      cancelAtPeriodEnd: false,
    });
    expect(state.subscriptions[0]?.userPlan).toBe("PRO");
    expect(prismaMock.client.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { plan: "PRO" },
      select: { id: true },
    });
  });

  it("toggles cancelAtPeriodEnd", async () => {
    await service.getSubscription("user_1");

    const canceled = await service.cancelSubscription("user_1");
    const resumed = await service.cancelSubscription("user_1");

    expect(canceled.cancelAtPeriodEnd).toBe(true);
    expect(resumed.cancelAtPeriodEnd).toBe(false);
  });

  it("set-default flips exactly one payment method to default", async () => {
    state.paymentMethods = [
      {
        id: "pm_1",
        userId: "user_1",
        brand: "VISA",
        last4: "4242",
        expMonth: 12,
        expYear: 2027,
        isDefault: true,
        createdAt: new Date("2026-05-19T10:00:00.000Z"),
      },
      {
        id: "pm_2",
        userId: "user_1",
        brand: "MASTERCARD",
        last4: "5454",
        expMonth: 8,
        expYear: 2028,
        isDefault: false,
        createdAt: new Date("2026-05-20T10:00:00.000Z"),
      },
      {
        id: "pm_other",
        userId: "user_2",
        brand: "AMEX",
        last4: "0005",
        expMonth: 1,
        expYear: 2029,
        isDefault: true,
        createdAt: new Date("2026-05-20T10:00:00.000Z"),
      },
    ];

    const methods = await service.setDefaultPaymentMethod("user_1", "pm_2");

    expect(methods).toEqual([
      {
        id: "pm_2",
        brand: "mastercard",
        last4: "5454",
        expMonth: 8,
        expYear: 2028,
        isDefault: true,
      },
      {
        id: "pm_1",
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2027,
        isDefault: false,
      },
    ]);
    expect(
      state.paymentMethods.filter(
        (method) => method.userId === "user_1" && method.isDefault,
      ),
    ).toHaveLength(1);
    expect(
      state.paymentMethods.find((method) => method.id === "pm_other")
        ?.isDefault,
    ).toBe(true);
  });

  it("does not create a Razorpay customer when one is already stored", async () => {
    state.subscriptions = [
      makeSubscription({ externalCustomerId: "cust_existing" }),
    ];

    const customerId = await ensureRazorpayCustomer(service, "user_1");

    expect(customerId).toBe("cust_existing");
    expect(razorpayMock.ensureCustomer).not.toHaveBeenCalled();
    expect(prismaMock.client.subscription.update).not.toHaveBeenCalled();
  });

  it("creates and stores a Razorpay customer when the subscription is missing one", async () => {
    state.subscriptions = [makeSubscription({ externalCustomerId: null })];

    const customerId = await ensureRazorpayCustomer(service, "user_1");

    expect(customerId).toBe("cust_new");
    expect(razorpayMock.ensureCustomer).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    expect(prismaMock.client.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        data: { externalCustomerId: "cust_new" },
      }),
    );
    expect(state.subscriptions[0]?.externalCustomerId).toBe("cust_new");
  });

  describe("createCheckoutSession", () => {
    it("rejects FREE checkout", async () => {
      await expect(
        service.createCheckoutSession("user_1", { planId: "FREE" }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(razorpayMock.createSubscription).not.toHaveBeenCalled();
    });

    it("throws ServiceUnavailableException when the plan is missing a Razorpay plan id", async () => {
      state.plans = [makePlan({ razorpayPlanId: null })];

      await expect(
        service.createCheckoutSession("user_1", { planId: "PRO" }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      expect(razorpayMock.createSubscription).not.toHaveBeenCalled();
    });

    it("creates and stores a Razorpay subscription checkout session", async () => {
      state.plans = [makePlan()];
      state.subscriptions = [makeSubscription({ externalCustomerId: null })];
      const ensureCustomerSpy = vi.spyOn(
        service as unknown as {
          ensureRazorpayCustomer(userId: string): Promise<string>;
        },
        "ensureRazorpayCustomer",
      );

      const checkout = await service.createCheckoutSession("user_1", {
        planId: "PRO",
      });

      expect(ensureCustomerSpy).toHaveBeenCalledWith("user_1");
      expect(razorpayMock.createSubscription).toHaveBeenCalledWith({
        plan_id: "plan_rzp_pro",
        customer_id: "cust_new",
        total_count: 12,
        customer_notify: 1,
        notes: {
          tresta_user_id: "user_1",
          tresta_plan: "PRO",
        },
      });
      expect(prismaMock.client.subscription.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { userId: "user_1" },
          data: {
            externalSubscriptionId: "rzp_sub_new",
            razorpaySubscriptionId: "rzp_sub_new",
            providerStatus: "created",
            planId: "plan_pro",
          },
        }),
      );
      expect(state.subscriptions[0]).toMatchObject({
        externalSubscriptionId: "rzp_sub_new",
        razorpaySubscriptionId: "rzp_sub_new",
        providerStatus: "created",
        planId: "plan_pro",
        userPlan: "FREE",
        status: "ACTIVE",
      });
      expect(checkout).toEqual({
        subscriptionId: "rzp_sub_new",
        shortUrl: "https://rzp.io/i/new",
        razorpayKeyId: "rzp_test_key",
        planId: "PRO",
      });
    });

    it("returns an existing active provider subscription without creating another one", async () => {
      state.plans = [makePlan()];
      state.subscriptions = [
        makeSubscription({
          externalCustomerId: "cust_existing",
          externalSubscriptionId: "rzp_sub_existing",
          razorpaySubscriptionId: "rzp_sub_existing",
          providerStatus: "active",
          planId: "plan_pro",
          plan: makePlan(),
        }),
      ];

      const checkout = await service.createCheckoutSession("user_1", {
        planId: "PRO",
      });

      expect(razorpayMock.ensureCustomer).not.toHaveBeenCalled();
      expect(razorpayMock.createSubscription).not.toHaveBeenCalled();
      expect(checkout).toEqual({
        subscriptionId: "rzp_sub_existing",
        shortUrl: null,
        razorpayKeyId: "rzp_test_key",
        planId: "PRO",
      });
    });
  });
});
