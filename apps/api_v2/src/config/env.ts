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
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

export type ApiV2Env = z.infer<typeof apiV2EnvSchema>;

export function validateApiV2Env(config: Record<string, unknown>): ApiV2Env {
  return apiV2EnvSchema.parse(config);
}
