import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildApiV2CorsOptions,
  buildClerkVerifyOptions,
  parseCommaSeparatedEnvList,
  verifyRazorpayWebhookSignature,
} from "./security.js";

describe("security config helpers", () => {
  it("parses comma-separated env lists and drops empty entries", () => {
    expect(
      parseCommaSeparatedEnvList(" https://app.test, ,http://localhost:3002 "),
    ).toEqual(["https://app.test", "http://localhost:3002"]);
  });

  it("builds Clerk token verification options with authorized parties and audience", () => {
    expect(
      buildClerkVerifyOptions({
        secretKey: "sk_test_123",
        authorizedParties: "https://app.tresta.test,http://localhost:3002",
        audience: "tresta-api-v2",
      }),
    ).toEqual({
      secretKey: "sk_test_123",
      authorizedParties: ["https://app.tresta.test", "http://localhost:3002"],
      audience: "tresta-api-v2",
    });
  });

  it("builds CORS options with a default local V2 web origin", () => {
    expect(buildApiV2CorsOptions(undefined).origin).toEqual([
      "http://localhost:3002",
    ]);
  });

  it("validates Razorpay webhook signatures using the raw body", () => {
    const rawBody = Buffer.from(JSON.stringify({ a: 1, b: { c: 2 } }));
    const secret = "webhook-secret";
    const signature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    expect(verifyRazorpayWebhookSignature(rawBody, signature, secret)).toBe(
      true,
    );
    const alteredSignature =
      signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0");
    expect(
      verifyRazorpayWebhookSignature(rawBody, alteredSignature, secret),
    ).toBe(false);
  });
});
