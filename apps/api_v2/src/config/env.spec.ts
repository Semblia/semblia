import { describe, expect, it } from "vitest";
import { validateApiV2Env } from "./env.js";

const productionBaseEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://appuser:apppassword@localhost:5432/appdb",
  REDIS_URL: "redis://localhost:6379",
  API_V2_SECRET_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
};

describe("validateApiV2Env", () => {
  it("requires Razorpay credentials in production", () => {
    expect(() =>
      validateApiV2Env({
        ...productionBaseEnv,
        RAZORPAY_KEY_ID: "rzp_test_key",
      }),
    ).toThrow(
      "Missing required production Razorpay env vars: RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET",
    );
  });

  it("keeps Razorpay credentials optional outside production", () => {
    const parsed = validateApiV2Env({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://appuser:apppassword@localhost:5432/appdb",
      REDIS_URL: "redis://localhost:6379",
      RAZORPAY_PLAN_ID_PRO_MONTHLY: "plan_pro",
      RAZORPAY_PLAN_ID_BUSINESS_MONTHLY: "plan_business",
    });

    expect(parsed.RAZORPAY_KEY_ID).toBeUndefined();
    expect(parsed.RAZORPAY_PLAN_ID_PRO_MONTHLY).toBe("plan_pro");
    expect(parsed.RAZORPAY_PLAN_ID_BUSINESS_MONTHLY).toBe("plan_business");
  });

  it("requires admin Clerk credentials in production", () => {
    expect(() =>
      validateApiV2Env({
        ...productionBaseEnv,
        RAZORPAY_KEY_ID: "rzp_test_key",
        RAZORPAY_KEY_SECRET: "rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret",
        ADMIN_CLERK_SECRET_KEY: "sk_admin",
      }),
    ).toThrow(
      "Missing required production admin Clerk env vars: ADMIN_CLERK_PUBLISHABLE_KEY, ADMIN_CLERK_AUTHORIZED_PARTIES",
    );
  });

  it("requires forms runtime signing in production", () => {
    expect(() =>
      validateApiV2Env({
        ...productionBaseEnv,
        RAZORPAY_KEY_ID: "rzp_test_key",
        RAZORPAY_KEY_SECRET: "rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret",
        ADMIN_CLERK_SECRET_KEY: "sk_admin",
        ADMIN_CLERK_PUBLISHABLE_KEY: "pk_admin",
        ADMIN_CLERK_AUTHORIZED_PARTIES: "https://admin.semblia.com",
      }),
    ).toThrow(
      "Missing required production forms runtime env vars: FORMS_RUNTIME_SIGNING_SECRET",
    );
  });

  it("requires Resend email configuration in production when email sending is enabled", () => {
    expect(() =>
      validateApiV2Env({
        ...productionBaseEnv,
        RAZORPAY_KEY_ID: "rzp_test_key",
        RAZORPAY_KEY_SECRET: "rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret",
        ADMIN_CLERK_SECRET_KEY: "sk_admin",
        ADMIN_CLERK_PUBLISHABLE_KEY: "pk_admin",
        ADMIN_CLERK_AUTHORIZED_PARTIES: "https://admin.semblia.com",
        FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
        EMAIL_ENABLED: true,
        RESEND_API_KEY: "re_test",
      }),
    ).toThrow(
      "Missing required production email env vars: EMAIL_FROM, APP_PUBLIC_URL",
    );
  });

  it("requires the S3 storage configuration used during production bootstrap", () => {
    expect(() =>
      validateApiV2Env({
        ...productionBaseEnv,
        RAZORPAY_KEY_ID: "rzp_test_key",
        RAZORPAY_KEY_SECRET: "rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret",
        ADMIN_CLERK_SECRET_KEY: "sk_admin",
        ADMIN_CLERK_PUBLISHABLE_KEY: "pk_admin",
        ADMIN_CLERK_AUTHORIZED_PARTIES: "https://admin.semblia.com",
        FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
      }),
    ).toThrow(
      "Missing required production S3 env vars: AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY",
    );
  });

  it("defaults AWS moderation to a disabled cost-capped local posture", () => {
    const parsed = validateApiV2Env({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://appuser:apppassword@localhost:5432/appdb",
      REDIS_URL: "redis://localhost:6379",
    });

    expect(parsed.MODERATION_AWS_ENABLED).toBe(false);
    expect(parsed.MODERATION_AWS_REGION).toBe("us-east-1");
    expect(parsed.MODERATION_AWS_DAILY_BUDGET_CENTS).toBe(500);
    expect(parsed.MODERATION_AWS_MONTHLY_BUDGET_CENTS).toBe(5000);
    expect(parsed.MODERATION_IMAGE_MIN_CONFIDENCE).toBe(70);
    expect(parsed.MODERATION_QUEUE_CONCURRENCY).toBe(3);
    expect(parsed.MODERATION_FULL_VIDEO_ENABLED).toBe(false);
    expect(parsed.MODERATION_FULL_VIDEO_MIN_PLAN).toBe("BUSINESS");
  });

  it("parses explicit environment boolean strings without truthy coercion", () => {
    const parsed = validateApiV2Env({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://appuser:apppassword@localhost:5432/appdb",
      REDIS_URL: "redis://localhost:6379",
      EMAIL_ENABLED: "false",
      MODERATION_AWS_ENABLED: "false",
      MODERATION_FULL_VIDEO_ENABLED: "false",
    });

    expect(parsed.EMAIL_ENABLED).toBe(false);
    expect(parsed.MODERATION_AWS_ENABLED).toBe(false);
    expect(parsed.MODERATION_FULL_VIDEO_ENABLED).toBe(false);

    const enabled = validateApiV2Env({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://appuser:apppassword@localhost:5432/appdb",
      REDIS_URL: "redis://localhost:6379",
      EMAIL_ENABLED: "true",
      MODERATION_AWS_ENABLED: "true",
      MODERATION_FULL_VIDEO_ENABLED: "true",
    });

    expect(enabled.EMAIL_ENABLED).toBe(true);
    expect(enabled.MODERATION_AWS_ENABLED).toBe(true);
    expect(enabled.MODERATION_FULL_VIDEO_ENABLED).toBe(true);
  });
});
