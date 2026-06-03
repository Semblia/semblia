import { describe, expect, it, vi } from "vitest";
import { UserPlan } from "../dist/prisma.js";
import { buildBillingPlans, seedBillingPlans } from "./seed.js";

const expectedModerationLimits = {
  FREE: {
    imagesPerMonth: 10,
    audioSecondsPerMonth: 600,
    videoSecondsPerMonth: 120,
    maxMediaAssetsPerSubmission: 1,
    maxImageBytes: 4_000_000,
    maxAudioSeconds: 60,
    maxVideoSeconds: 30,
    fullVideoModeration: false,
  },
  PRO: {
    imagesPerMonth: 1_000,
    audioSecondsPerMonth: 14_400,
    videoSecondsPerMonth: 3_600,
    maxMediaAssetsPerSubmission: 5,
    maxImageBytes: 8_000_000,
    maxAudioSeconds: 600,
    maxVideoSeconds: 180,
    fullVideoModeration: false,
  },
  BUSINESS: {
    imagesPerMonth: 10_000,
    audioSecondsPerMonth: 72_000,
    videoSecondsPerMonth: 18_000,
    maxMediaAssetsPerSubmission: 10,
    maxImageBytes: 16_000_000,
    maxAudioSeconds: 1_800,
    maxVideoSeconds: 600,
    fullVideoModeration: true,
  },
} as const;

describe("billing plan seed", () => {
  it("builds the three launch plans with Razorpay IDs from env", () => {
    const plans = buildBillingPlans({
      RAZORPAY_PLAN_ID_PRO_MONTHLY: "plan_pro_monthly",
      RAZORPAY_PLAN_ID_BUSINESS_MONTHLY: "plan_business_monthly",
    });

    expect(plans).toEqual([
      expect.objectContaining({
        type: UserPlan.FREE,
        price: 0,
        currency: "INR",
        interval: "month",
        limits: {
          responses: 25,
          widgets: 1,
          projects: 1,
          moderation: expectedModerationLimits.FREE,
        },
        razorpayPlanId: null,
      }),
      expect.objectContaining({
        type: UserPlan.PRO,
        price: 79900,
        currency: "INR",
        interval: "month",
        limits: {
          responses: 1000,
          widgets: 10,
          projects: 5,
          moderation: expectedModerationLimits.PRO,
        },
        razorpayPlanId: "plan_pro_monthly",
      }),
      expect.objectContaining({
        type: UserPlan.BUSINESS,
        price: 249900,
        currency: "INR",
        interval: "month",
        limits: {
          responses: 10000,
          widgets: 100,
          projects: 25,
          moderation: expectedModerationLimits.BUSINESS,
        },
        razorpayPlanId: "plan_business_monthly",
      }),
    ]);
  });

  it("upserts plans by type", async () => {
    const upsert = vi.fn(async ({ create }) => create);
    const prisma = {
      plan: { upsert },
    };

    const rows = await seedBillingPlans(prisma, {
      RAZORPAY_PLAN_ID_PRO_MONTHLY: "plan_pro_monthly",
      RAZORPAY_PLAN_ID_BUSINESS_MONTHLY: "plan_business_monthly",
    });

    expect(rows).toHaveLength(3);
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { type: UserPlan.PRO },
        create: expect.objectContaining({
          type: UserPlan.PRO,
          razorpayPlanId: "plan_pro_monthly",
        }),
        update: expect.objectContaining({
          price: 79900,
          razorpayPlanId: "plan_pro_monthly",
        }),
      }),
    );
    expect(upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: { type: UserPlan.BUSINESS },
        create: expect.objectContaining({
          type: UserPlan.BUSINESS,
          razorpayPlanId: "plan_business_monthly",
        }),
      }),
    );
  });
});
