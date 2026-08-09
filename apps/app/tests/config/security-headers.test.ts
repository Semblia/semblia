import { describe, expect, it } from "vitest";

import nextConfig, { contentSecurityPolicy } from "../../next.config";

describe("app security headers", () => {
  it("allows Razorpay Checkout in the CSP", async () => {
    expect(contentSecurityPolicy).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    expect(contentSecurityPolicy).toContain("https://checkout.razorpay.com");
    expect(contentSecurityPolicy).toContain(
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    );
  });

  it("allows Google Fonts for the studio live previews", async () => {
    expect(contentSecurityPolicy).toContain("https://fonts.googleapis.com");
    expect(contentSecurityPolicy).toContain("https://fonts.gstatic.com");
  });

  it("registers app-wide security headers", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/(.*)",
          headers: expect.arrayContaining([
            expect.objectContaining({
              key: "Content-Security-Policy",
              value: contentSecurityPolicy,
            }),
            expect.objectContaining({
              key: "X-Content-Type-Options",
              value: "nosniff",
            }),
          ]),
        }),
      ]),
    );
  });
});
