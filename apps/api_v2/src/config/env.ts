import { z } from "zod";

const envBoolean = z.union([z.boolean(), z.stringbool()]);

export const apiV2EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_V2_PORT: z.coerce.number().int().positive().default(8100),
  API_V2_CORS_ORIGINS: z.string().optional(),
  API_V2_RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  API_V2_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_AUTHORIZED_PARTIES: z.string().optional(),
  CLERK_JWT_AUDIENCE: z.string().optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  ADMIN_CLERK_SECRET_KEY: z.string().optional(),
  ADMIN_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  ADMIN_CLERK_AUTHORIZED_PARTIES: z.string().optional(),
  ADMIN_CLERK_JWT_AUDIENCE: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID_PRO_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_ID_BUSINESS_MONTHLY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),
  EMAIL_ENABLED: envBoolean.default(false),
  EMAIL_DAILY_LIMIT: z.coerce.number().int().positive().default(1000),
  APP_PUBLIC_URL: z.string().url().optional(),
  FORMS_RUNTIME_SIGNING_SECRET: z.string().min(32).optional(),
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: z.string().default("forms.semblia.com"),
  WORKER_CONCURRENCY_EMAIL: z.coerce.number().int().positive().default(5),
  SLACK_WEBHOOK_URL: z.string().optional(),
  API_V2_SECRET_ENCRYPTION_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_S3_FORCE_PATH_STYLE: z.string().optional(),
  S3_PUBLIC_CDN_BASE_URL: z.string().optional(),
  S3_PRESIGN_PUT_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  S3_PRESIGN_GET_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  S3_MAX_IMAGE_BYTES: z.coerce.number().int().positive().optional(),
  S3_MAX_VIDEO_BYTES: z.coerce.number().int().positive().optional(),
  S3_MAX_EXPORT_BYTES: z.coerce.number().int().positive().optional(),
  MODERATION_AWS_ENABLED: envBoolean.default(false),
  MODERATION_AWS_REGION: z.string().default("us-east-1"),
  MODERATION_AWS_DAILY_BUDGET_CENTS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(500),
  MODERATION_AWS_MONTHLY_BUDGET_CENTS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(5000),
  MODERATION_IMAGE_MIN_CONFIDENCE: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(70),
  MODERATION_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(3),
  MODERATION_FULL_VIDEO_ENABLED: envBoolean.default(false),
  MODERATION_FULL_VIDEO_MIN_PLAN: z
    .enum(["FREE", "PRO", "BUSINESS"])
    .default("BUSINESS"),
});

export type ApiV2Env = z.infer<typeof apiV2EnvSchema>;

export function decodeSecretEncryptionKey(
  value: string | undefined,
): Buffer | null {
  if (!value) return null;

  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length !== 32) return null;

    if (decoded.toString("base64") !== value) return null;

    return decoded;
  } catch {
    return null;
  }
}

function requireProductionVars(
  config: ApiV2Env,
  group: string,
  keys: Array<keyof ApiV2Env>,
) {
  const missing = keys.filter((key) => !String(config[key] ?? "").trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required production ${group} env vars: ${missing.join(", ")}`,
    );
  }
}

function validateProductionEnv(config: ApiV2Env) {
  requireProductionVars(config, "Razorpay", [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
  ]);
  requireProductionVars(config, "admin Clerk", [
    "ADMIN_CLERK_SECRET_KEY",
    "ADMIN_CLERK_PUBLISHABLE_KEY",
    "ADMIN_CLERK_AUTHORIZED_PARTIES",
  ]);
  requireProductionVars(config, "forms runtime", [
    "FORMS_RUNTIME_SIGNING_SECRET",
  ]);

  if (config.EMAIL_ENABLED) {
    requireProductionVars(config, "email", [
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "APP_PUBLIC_URL",
    ]);
  }

  requireProductionVars(config, "S3", [
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ]);

  if (!decodeSecretEncryptionKey(config.API_V2_SECRET_ENCRYPTION_KEY)) {
    throw new Error(
      "API_V2_SECRET_ENCRYPTION_KEY must be a base64-encoded 32-byte key in production",
    );
  }
}

export function validateApiV2Env(config: Record<string, unknown>): ApiV2Env {
  const parsed = apiV2EnvSchema.parse(config);

  if (parsed.NODE_ENV === "production") validateProductionEnv(parsed);

  return parsed;
}
