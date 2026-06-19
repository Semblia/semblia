import { describe, expect, it } from "vitest";
import type { LayoutPreset } from "@workspace/forms-core";
import { renderFormToStaticMarkup, renderFormToString } from "./server.js";
import { makeSnapshot } from "./test-utils.js";

describe("server rendering", () => {
  it("renders the title and primary field for the centered-card preset", () => {
    const snap = makeSnapshot("TESTIMONIAL");
    const html = renderFormToStaticMarkup(snap);
    expect(html).toContain(snap.content.title);
    expect(html).toContain("Your testimonial");
    expect(html).toContain("tf-card");
    expect(html).toContain('data-layout="centeredCard"');
  });

  it("renders every layout preset's structural wrapper", () => {
    const presets: LayoutPreset[] = [
      "centeredCard",
      "fullPage",
      "splitHero",
      "oneQuestion",
    ];
    for (const layout of presets) {
      const snap = makeSnapshot("CUSTOM", (d) => ({ ...d, layoutPreset: layout }));
      expect(renderFormToStaticMarkup(snap)).toContain(`data-layout="${layout}"`);
    }
    const split = makeSnapshot("CUSTOM", (d) => ({ ...d, layoutPreset: "splitHero" }));
    expect(renderFormToStaticMarkup(split)).toContain("tf-hero");
  });

  it("never leaks server-only settings into the markup (spec §26)", () => {
    const snap = makeSnapshot("REVIEW", (d) => ({
      ...d,
      settings: { ...d.settings, blockedWords: ["spammyword"], honeypot: true },
    }));
    const html = renderFormToStaticMarkup(snap);
    expect(html).not.toContain("spammyword");
  });

  it("renders the closed-form notice when forced closed", () => {
    const snap = makeSnapshot();
    const html = renderFormToStaticMarkup(snap, { forceClosed: true });
    expect(html).toContain(snap.content.closedMessage);
    expect(html).not.toContain("Your testimonial");
  });

  it("renders a progress indicator for a stepped flow", () => {
    const snap = makeSnapshot("CUSTOMER_STORY");
    const html = renderFormToStaticMarkup(snap);
    expect(html).toContain("tf-progress");
    expect(html).toContain("Step 1 of");
  });

  it("produces hydratable markup via renderToString", () => {
    const html = renderFormToString(makeSnapshot());
    expect(html).toContain("tf-root");
    expect(html).toContain("<style");
  });
});
