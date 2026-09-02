import { describe, expect, it } from "vitest";

import nextConfig, {
  contentSecurityPolicy,
  resolveApiOrigin,
} from "../../next.config";

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

  it("fails a production build when NEXT_PUBLIC_API_URL is missing or malformed", () => {
    expect(() => resolveApiOrigin(undefined, true)).toThrow(
      "NEXT_PUBLIC_API_URL is required for a production build",
    );
    expect(() => resolveApiOrigin("not a url", true)).toThrow(
      "NEXT_PUBLIC_API_URL is not a valid https URL",
    );
    // Production requires TLS and a scheme with a real origin.
    expect(() => resolveApiOrigin("http://api.semblia.com", true)).toThrow(
      "NEXT_PUBLIC_API_URL is not a valid https URL",
    );
    expect(() => resolveApiOrigin("mailto:x@y.z", true)).toThrow(
      "NEXT_PUBLIC_API_URL is not a valid https URL",
    );
    expect(resolveApiOrigin("https://api.semblia.com/v2", true)).toBe(
      "https://api.semblia.com",
    );
  });

  it("keeps the localhost fallback for dev and CI builds", () => {
    expect(resolveApiOrigin(undefined, false)).toBe("http://localhost:8100");
    expect(resolveApiOrigin("not a url", false)).toBe("http://localhost:8100");
    expect(resolveApiOrigin("mailto:x@y.z", false)).toBe(
      "http://localhost:8100",
    );
    expect(resolveApiOrigin("http://localhost:8100", false)).toBe(
      "http://localhost:8100",
    );
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
