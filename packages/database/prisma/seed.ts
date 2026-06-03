import { pathToFileURL } from "node:url";
import { PrismaClient, UserPlan } from "../dist/prisma.js";

type BillingPlanSeedEnv = {
  RAZORPAY_PLAN_ID_PRO_MONTHLY?: string;
  RAZORPAY_PLAN_ID_BUSINESS_MONTHLY?: string;
};

type BillingPlanSeedRow = {
  name: string;
  description: string;
  price: number;
  currency: "INR";
  interval: "month";
  type: UserPlan;
  isActive: true;
  limits: {
    responses: number;
    widgets: number;
    projects: number;
    moderation: {
      imagesPerMonth: number;
      audioSecondsPerMonth: number;
      videoSecondsPerMonth: number;
      maxMediaAssetsPerSubmission: number;
      maxImageBytes: number;
      maxAudioSeconds: number;
      maxVideoSeconds: number;
      fullVideoModeration: boolean;
    };
  };
  razorpayPlanId: string | null;
};

type BillingPlanSeedPrisma = {
  plan: {
    upsert(input: {
      where: { type: UserPlan };
      create: BillingPlanSeedRow;
      update: BillingPlanSeedRow;
    }): Promise<unknown>;
  };
};

const moderationLimits = {
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

export function buildBillingPlans(
  env: BillingPlanSeedEnv = process.env,
): BillingPlanSeedRow[] {
  return [
    {
      name: "Free",
      description: "Baseline plan for getting started",
      price: 0,
      currency: "INR",
      interval: "month",
      type: UserPlan.FREE,
      isActive: true,
      limits: {
        responses: 25,
        widgets: 1,
        projects: 1,
        moderation: moderationLimits.FREE,
      },
      razorpayPlanId: null,
    },
    {
      name: "Pro",
      description: "For growing teams collecting more responses",
      price: 79900,
      currency: "INR",
      interval: "month",
      type: UserPlan.PRO,
      isActive: true,
      limits: {
        responses: 1000,
        widgets: 10,
        projects: 5,
        moderation: moderationLimits.PRO,
      },
      razorpayPlanId: env.RAZORPAY_PLAN_ID_PRO_MONTHLY?.trim() || null,
    },
    {
      name: "Business",
      description: "For high-volume teams and agencies",
      price: 249900,
      currency: "INR",
      interval: "month",
      type: UserPlan.BUSINESS,
      isActive: true,
      limits: {
        responses: 10000,
        widgets: 100,
        projects: 25,
        moderation: moderationLimits.BUSINESS,
      },
      razorpayPlanId: env.RAZORPAY_PLAN_ID_BUSINESS_MONTHLY?.trim() || null,
    },
  ];
}

export async function seedBillingPlans(
  prisma: BillingPlanSeedPrisma,
  env: BillingPlanSeedEnv = process.env,
) {
  const plans = buildBillingPlans(env);
  const rows = [];

  for (const plan of plans) {
    const row = await prisma.plan.upsert({
      where: { type: plan.type },
      create: plan,
      update: plan,
    });
    rows.push(row);
  }

  return rows;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Start seeding ...");
    const plans = await seedBillingPlans(prisma);
    console.log(`Seeded ${plans.length} billing plans.`);
    console.log("Seeding finished.");
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
