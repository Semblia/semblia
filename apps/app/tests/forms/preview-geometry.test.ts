import { describe, expect, it } from "vitest";
import { previewGeometry } from "@/components/forms/form-preview";

/**
 * A list thumbnail must be the whole page, never a slice of one — that is the
 * entire point of the component. These pin the two ways it could go back to
 * cropping.
 */
const PAGE = 1180;

describe("previewGeometry", () => {
  it("matches the logical window to the frame, so nothing is cut", () => {
    // A 16:10 grid tile.
    const g = previewGeometry({ width: 296, height: 185 }, PAGE);
    expect(g.pageHeight / PAGE).toBeCloseTo(185 / 296, 5);
    // Width alone fits both axes, so there is nothing to letterbox.
    expect(g.scale).toBeCloseTo(296 / PAGE, 5);
    expect(g.offsetX).toBe(0);
    expect(g.offsetY).toBe(0);
  });

  it("contains rather than crops when the frame is flatter than any window", () => {
    // Ratio 0.2 — below MIN_PAGE_RATIO, so the window can no longer match the
    // frame and fitting by width would push the page's foot off the bottom.
    const frame = { width: 1000, height: 200 };
    const g = previewGeometry(frame, PAGE);

    expect(g.pageHeight * g.scale).toBeLessThanOrEqual(frame.height + 0.001);
    expect(PAGE * g.scale).toBeLessThanOrEqual(frame.width + 0.001);
    // The leftover space is split, not dumped on one edge.
    expect(g.offsetX).toBeGreaterThan(0);
    expect(g.offsetY).toBe(0);
  });

  it("contains a frame taller than any window too", () => {
    const frame = { width: 200, height: 900 }; // ratio 4.5, above the max
    const g = previewGeometry(frame, PAGE);

    expect(g.pageHeight * g.scale).toBeLessThanOrEqual(frame.height + 0.001);
    expect(PAGE * g.scale).toBeLessThanOrEqual(frame.width + 0.001);
    expect(g.offsetY).toBeGreaterThan(0);
  });

  it("draws nothing until the frame has been measured", () => {
    expect(previewGeometry({ width: 0, height: 0 }, PAGE).scale).toBe(0);
    expect(previewGeometry({ width: 300, height: 0 }, PAGE).scale).toBe(0);
  });

  it("refuses a zero page width rather than dividing to Infinity", () => {
    const g = previewGeometry({ width: 300, height: 200 }, 0);
    expect(g.scale).toBe(0);
    expect(Number.isFinite(g.pageHeight)).toBe(true);
  });
});
