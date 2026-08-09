import { describe, expect, it } from "vitest";
import {
  ABSENT,
  orDash,
  fmtRange,
  fmtRating,
  timeAgo,
  fmtDate,
} from "@/lib/format";

/**
 * P3: every value on screen is accounted for, including its absence. The two
 * failures these pin are the ones that actively mislead — a real `0` shown as
 * "unknown", and an unknown shown as `0`.
 */

describe("absent values", () => {
  it("renders a legitimate zero as zero, never as a dash", () => {
    expect(orDash(0)).toBe("0");
    expect(orDash("0")).toBe("0");
  });

  it("renders genuinely missing values as an em dash", () => {
    expect(orDash(null)).toBe(ABSENT);
    expect(orDash(undefined)).toBe(ABSENT);
    expect(orDash("")).toBe(ABSENT);
    expect(orDash("   ")).toBe(ABSENT);
  });

  it("never lets NaN or Infinity reach the DOM", () => {
    expect(orDash(Number.NaN)).toBe(ABSENT);
    expect(orDash(Number.POSITIVE_INFINITY)).toBe(ABSENT);
  });
});

describe("timeAgo", () => {
  it("never renders Invalid Date", () => {
    expect(timeAgo("not-a-date")).toBe(ABSENT);
    expect(timeAgo(null)).toBe(ABSENT);
    expect(timeAgo(undefined)).toBe(ABSENT);
  });

  it("stays relative within a week and carries the year beyond it", () => {
    const twoHours = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(timeAgo(twoHours)).toBe("2h ago");

    const longAgo = new Date("2024-03-14T00:00:00Z");
    expect(timeAgo(longAgo)).toMatch(/2024/);
  });

  it("formats absolute dates with the year, so old data is unambiguous", () => {
    expect(fmtDate("2026-03-14T12:00:00Z")).toMatch(/2026/);
  });
});

describe("fmtRating", () => {
  it("refuses to render a rating without its scale", () => {
    // "4" is a lie when the scale is 10.
    expect(fmtRating(4, null)).toBeNull();
    expect(fmtRating(4, undefined)).toBeNull();
  });

  it("renders the value with its scale when both are known", () => {
    expect(fmtRating(4, 5)).toBe("4/5");
    expect(fmtRating(4, 10)).toBe("4/10");
  });

  it("renders nothing when there is no rating", () => {
    expect(fmtRating(null, 5)).toBeNull();
  });
});

describe("fmtRange", () => {
  it("describes the visible window of a paginated list", () => {
    expect(fmtRange(2, 20, 142)).toBe("21–40 of 142");
  });

  it("clamps the final page to the true total", () => {
    expect(fmtRange(8, 20, 142)).toBe("141–142 of 142");
  });

  it("collapses a single-item window", () => {
    expect(fmtRange(1, 20, 1)).toBe("1 of 1");
  });
});
