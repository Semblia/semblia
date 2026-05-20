import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BillingService } from "./billing.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { RazorpayService } from "./razorpay.service.js";

type SubscriptionRecord = {
  id: string;
  userId: string;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";
  userPlan: "FREE" | "PRO" | "BUSINESS";
  planId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  amount: number | null;
  currency: string | null;
  interval: string | null;
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

const state: {
  subscriptions: SubscriptionRecord[];
  paymentMethods: PaymentMethodRecord[];
} = {
  subscriptions: [],
  paymentMethods: [],
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
      findFirst: vi.fn(() => null),
    },
    user: {
      update: vi.fn(() => ({ id: "user_1" })),
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
} as unknown as RazorpayService;

describe("BillingService", () => {
  let service: BillingService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T10:00:00.000Z"));
    vi.clearAllMocks();
    state.subscriptions = [];
    state.paymentMethods = [];
    service = new BillingService(prismaMock, razorpayMock);
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
});
