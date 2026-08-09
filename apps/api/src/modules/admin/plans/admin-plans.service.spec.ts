import {
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPlansService } from "./admin-plans.service.js";
import { AdminAuditService } from "../admin-audit.service.js";
import { RazorpayService } from "../../billing/razorpay.service.js";
import type { PrismaService } from "../../prisma/prisma.service.js";

type PlanRecord = {
  id: string;
  type: "FREE" | "PRO" | "BUSINESS";
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  isActive: boolean;
  razorpayPlanId: string | null;
  limits: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
};

const createdAt = new Date("2026-05-26T12:00:00.000Z");

function makePlan(overrides: Partial<PlanRecord> = {}): PlanRecord {
  return {
    id: "plan_1",
    type: "PRO",
    name: "Pro Plan",
    description: "For growing teams",
    price: 99900,
    currency: "INR",
    interval: "month",
    isActive: true,
    razorpayPlanId: "plan_rzp_pro",
    limits: { projects: 5, teamMembers: 2 },
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function prismaMock(plans: PlanRecord[]) {
  return {
    client: {
      plan: {
        findMany: vi.fn(async () => plans),
        findUnique: vi.fn(
          async ({ where }: { where: { id: string } }) =>
            plans.find((entry) => entry.id === where.id) ?? null,
        ),
        create: vi.fn(async ({ data }: { data: Partial<PlanRecord> }) => {
          const plan = makePlan({
            id: "plan_new",
            type: data.type,
            name: data.name,
            description: data.description ?? null,
            price: data.price,
            currency: data.currency,
            interval: data.interval,
            limits: data.limits as Record<string, number>,
            razorpayPlanId: data.razorpayPlanId ?? null,
            isActive: true,
          } as Partial<PlanRecord>);
          plans.push(plan);
          return plan;
        }),
        update: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<PlanRecord>;
          }) => {
            const plan = plans.find((entry) => entry.id === where.id);
            if (!plan) throw new Error("missing plan");
            Object.assign(plan, data);
            return plan;
          },
        ),
      },
    },
  } as unknown as PrismaService;
}

describe("AdminPlansService", () => {
  const audit = {
    record: vi.fn(async () => undefined),
  } as unknown as AdminAuditService;
  const razorpayClient = {
    plans: {
      create: vi.fn(async () => ({ id: "plan_rzp_new" })),
    },
  };
  const razorpay = {
    getClient: vi.fn(() => razorpayClient),
  } as unknown as RazorpayService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active and inactive plans", async () => {
    const plans = [
      makePlan({ id: "plan_active", isActive: true }),
      makePlan({ id: "plan_inactive", isActive: false }),
    ];
    const prisma = prismaMock(plans);
    const service = new AdminPlansService(prisma, razorpay, audit);

    await expect(service.listPlans()).resolves.toEqual([
      expect.objectContaining({ id: "plan_active", isActive: true }),
      expect.objectContaining({ id: "plan_inactive", isActive: false }),
    ]);
    expect(prisma.client.plan.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("creates zero-price plans without calling Razorpay", async () => {
    const prisma = prismaMock([]);
    const service = new AdminPlansService(prisma, razorpay, audit);

    const plan = await service.createPlan(
      {
        id: "admin_1",
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
      },
      {
        type: "FREE",
        name: "Free Plan",
        price: 0,
        currency: "INR",
        interval: "monthly",
        limits: { projects: 1, teamMembers: 1 },
      },
    );

    expect(razorpayClient.plans.create).not.toHaveBeenCalled();
    expect(prisma.client.plan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "FREE",
        name: "Free Plan",
        price: 0,
        interval: "month",
        razorpayPlanId: null,
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create_plan",
        targetType: "plan",
        targetId: "plan_new",
        metadata: { razorpayPlanId: null, price: 0, type: "FREE" },
      }),
    );
    expect(plan).toMatchObject({
      type: "FREE",
      interval: "month",
      razorpayPlanId: null,
    });
  });

  it("creates paid Razorpay plans before inserting the local Plan row", async () => {
    const prisma = prismaMock([]);
    const service = new AdminPlansService(prisma, razorpay, audit);

    const plan = await service.createPlan(
      { id: "admin_1" },
      {
        type: "PRO",
        name: "Pro Plan",
        description: "For teams",
        price: 99900,
        currency: "INR",
        interval: "yearly",
        limits: { projects: 5, teamMembers: 3 },
      },
    );

    expect(razorpayClient.plans.create).toHaveBeenCalledWith({
      period: "yearly",
      interval: 1,
      item: {
        name: "Pro Plan",
        amount: 99900,
        currency: "INR",
        description: "For teams",
      },
    });
    expect(prisma.client.plan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "PRO",
        interval: "year",
        razorpayPlanId: "plan_rzp_new",
      }),
    });
    expect(plan).toMatchObject({
      type: "PRO",
      interval: "year",
      razorpayPlanId: "plan_rzp_new",
    });
  });

  it("fails paid plan creation when Razorpay is not configured", async () => {
    const service = new AdminPlansService(
      prismaMock([]),
      { getClient: vi.fn(() => null) } as unknown as RazorpayService,
      audit,
    );

    await expect(
      service.createPlan(
        { id: "admin_1" },
        {
          type: "BUSINESS",
          name: "Business Plan",
          price: 249900,
          currency: "INR",
          interval: "monthly",
          limits: { projects: 25, teamMembers: 10 },
        },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("deactivates plans and records an audit log", async () => {
    const prisma = prismaMock([makePlan({ id: "plan_1", isActive: true })]);
    const service = new AdminPlansService(prisma, razorpay, audit);

    const plan = await service.deactivatePlan(
      { id: "admin_1", ipAddress: "203.0.113.10", userAgent: "vitest" },
      "plan_1",
    );

    expect(plan.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "admin_1",
        action: "deactivate_plan",
        targetType: "plan",
        targetId: "plan_1",
      }),
    );
  });

  it("returns 404 when deactivating an unknown plan", async () => {
    const service = new AdminPlansService(prismaMock([]), razorpay, audit);

    await expect(
      service.deactivatePlan({ id: "admin_1" }, "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
