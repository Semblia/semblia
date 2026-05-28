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

  it("requires Resend email configuration in production when email sending is enabled", () => {
    expect(() =>
      validateApiV2Env({
        ...productionBaseEnv,
        RAZORPAY_KEY_ID: "rzp_test_key",
        RAZORPAY_KEY_SECRET: "rzp_test_secret",
        RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret",
        ADMIN_CLERK_SECRET_KEY: "sk_admin",
        ADMIN_CLERK_PUBLISHABLE_KEY: "pk_admin",
        ADMIN_CLERK_AUTHORIZED_PARTIES: "https://admin.tresta.app",
        EMAIL_ENABLED: true,
        RESEND_API_KEY: "re_test",
      }),
    ).toThrow(
      "Missing required production email env vars: EMAIL_FROM, APP_PUBLIC_URL",
    );
  });
});
