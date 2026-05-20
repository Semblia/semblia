import { z } from "zod";

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
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
  API_V2_SECRET_ENCRYPTION_KEY: z.string().optional(),
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

export function validateApiV2Env(config: Record<string, unknown>): ApiV2Env {
  const parsed = apiV2EnvSchema.parse(config);

  if (
    parsed.NODE_ENV === "production" &&
    !decodeSecretEncryptionKey(parsed.API_V2_SECRET_ENCRYPTION_KEY)
  ) {
    throw new Error(
      "API_V2_SECRET_ENCRYPTION_KEY must be a base64-encoded 32-byte key in production",
    );
  }

  return parsed;
}
