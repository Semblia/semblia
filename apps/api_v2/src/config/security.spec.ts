import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import * as security from "./security.js";
import {
  buildApiV2CorsOptions,
  buildClerkVerifyOptions,
  extractPublicProjectSlugFromPath,
  parseCommaSeparatedEnvList,
  verifyRazorpayWebhookSignature,
  isExplicitPublicProjectOriginAllowed,
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
        authorizedParties: "https://app.semblia.test,http://localhost:3002",
        audience: "semblia-api-v2",
      }),
    ).toEqual({
      secretKey: "sk_test_123",
      authorizedParties: ["https://app.semblia.test", "http://localhost:3002"],
      audience: "semblia-api-v2",
    });
  });

  it("builds CORS options with a default local V2 web origin", () => {
    expect(buildApiV2CorsOptions(undefined).origin).toEqual([
      "http://localhost:3002",
    ]);
    expect(buildApiV2CorsOptions(undefined).allowedHeaders).toEqual(
      expect.arrayContaining([
        "X-Semblia-Signature",
        "X-Semblia-Timestamp",
        "Idempotency-Key",
      ]),
    );
    // PUT routes exist (notification preferences, form drafts/publish) —
    // dropping PUT here breaks every browser preflight against them.
    expect(buildApiV2CorsOptions(undefined).methods).toEqual(
      expect.arrayContaining(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    );
  });

  it("extracts project slugs from public project routes only", () => {
    expect(
      extractPublicProjectSlugFromPath("/v2/responses/public/projects/acme"),
    ).toBe("acme");
    expect(
      extractPublicProjectSlugFromPath(
        "/v2/forms/public/projects/acme/form_1/submissions",
      ),
    ).toBe("acme");
    expect(
      extractPublicProjectSlugFromPath(
        "/v2/widget-embeds/projects/acme/widget_1/fragment",
      ),
    ).toBe("acme");
    expect(extractPublicProjectSlugFromPath("/v2/projects/acme")).toBeNull();
  });

  it("does not expose a slug-derived hosted-origin CORS allowlist", () => {
    expect("isDefaultHostedPublicOrigin" in security).toBe(false);
  });

  it("allows only persisted public project origins", async () => {
    const project = { findUnique: vi.fn().mockResolvedValue({ id: "p1", allowedOrigins: [] }) };
    const projectTrustedOrigin = { findFirst: vi.fn().mockResolvedValue(null) };
    expect(await isExplicitPublicProjectOriginAllowed({ project, projectTrustedOrigin }, "acme", "https://acme.collect.semblia.com")).toBe(false);
    project.findUnique.mockResolvedValue({ id: "p1", allowedOrigins: ["https://allowed.example"] });
    expect(await isExplicitPublicProjectOriginAllowed({ project, projectTrustedOrigin }, "acme", "https://allowed.example")).toBe(true);
    project.findUnique.mockResolvedValue({ id: "p1", allowedOrigins: [] });
    projectTrustedOrigin.findFirst.mockResolvedValue({ id: "origin_1" });
    expect(await isExplicitPublicProjectOriginAllowed({ project, projectTrustedOrigin }, "acme", "https://trusted.example")).toBe(true);
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
