import { describe, expect, it } from "vitest";
import { getRuntimeThrottleTracker } from "./forms-runtime-throttler.guard.js";

describe("getRuntimeThrottleTracker", () => {
  it("keys hosted runtime limits by original host and original viewer ip", () => {
    expect(
      getRuntimeThrottleTracker({
        body: { context: { projectPublicSlug: "fallback" } },
        headers: {
          "x-semblia-original-host": "Feedback.Customer.Example",
          "x-semblia-original-forwarded-for": "203.0.113.10, 10.0.0.5",
        },
        ip: "10.0.0.5",
      }),
    ).toBe("feedback.customer.example:203.0.113.10");
  });
});
