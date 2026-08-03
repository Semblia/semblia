import { describe, expect, it } from "vitest";
import { parseLocalDay, resolveRange } from "@/lib/analytics/range";

/**
 * `?from=` and `?to=` are user-supplied. `new Date(2026, 1, 31)` does not throw
 * — it rolls forward into March — so a well-formed but impossible day would
 * silently resolve to a range nobody asked for.
 */
describe("parseLocalDay", () => {
  it("reads a real calendar day as that local day", () => {
    const day = parseLocalDay("2026-02-28");

    expect(day).not.toBeNull();
    expect(day?.getFullYear()).toBe(2026);
    expect(day?.getMonth()).toBe(1);
    expect(day?.getDate()).toBe(28);
  });

  it("accepts February 29 in a leap year", () => {
    expect(parseLocalDay("2024-02-29")?.getDate()).toBe(29);
  });

  it.each([
    "2026-02-31",
    "2026-02-30",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
  ])(
    "rejects the impossible date %s instead of rolling it forward",
    (value) => {
      expect(parseLocalDay(value)).toBeNull();
    },
  );

  it("rejects input that is not a YYYY-MM-DD day", () => {
    expect(parseLocalDay("2026-2-8")).toBeNull();
    expect(parseLocalDay("yesterday")).toBeNull();
  });
});

describe("resolveRange", () => {
  it("falls back to a real range when a custom bound is impossible", () => {
    const resolved = resolveRange("custom", "2026-02-31", "2026-03-05");

    // An unparseable bound must not produce a range derived from March 3rd.
    expect(resolved.from.getTime()).toBeLessThanOrEqual(resolved.to.getTime());
    expect(Number.isNaN(resolved.from.getTime())).toBe(false);
  });
});
