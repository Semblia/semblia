import { describe, expect, it } from "vitest";
import { renderFormToStaticMarkup, renderFormToString } from "./server.js";
import { makeSnapshot } from "./test-utils.js";

describe("server rendering", () => {
  it("renders each intent through its own template pack", () => {
    const cases = [
      { intent: "TESTIMONIAL", template: "aperture", marker: "apt-stage" },
      { intent: "REVIEW", template: "parcel", marker: "pcl-card" },
      { intent: "PRODUCT_FEEDBACK", template: "terminal", marker: "trm-panel" },
      { intent: "CUSTOMER_STORY", template: "ledger", marker: "ldg-sheet" },
      { intent: "CUSTOM", template: "meridian", marker: "mrd-hosted" },
    ] as const;
    for (const c of cases) {
      const html = renderFormToStaticMarkup(makeSnapshot(c.intent));
      expect(html).toContain(`data-tf-template="${c.template}"`);
      expect(html).toContain(c.marker);
    }
  });

  it("renders the title on a calm template", () => {
    const snap = makeSnapshot("REVIEW"); // parcel: calm pacing
    const html = renderFormToStaticMarkup(snap);
    expect(html).toContain(snap.content.title);
    expect(html).toContain("Rate your experience");
  });

  it("unknown template ids fall back to Meridian instead of breaking", () => {
    const snap = makeSnapshot("CUSTOM", (d) => ({
      ...d,
      templateId: "retired-template",
    }));
    const html = renderFormToStaticMarkup(snap);
    expect(html).toContain('data-tf-template="meridian"');
  });

  it("never leaks server-only settings into the markup (spec §26)", () => {
    const snap = makeSnapshot("REVIEW", (d) => ({
      ...d,
      settings: { ...d.settings, blockedWords: ["spammyword"], honeypot: true },
    }));
    const html = renderFormToStaticMarkup(snap);
    expect(html).not.toContain("spammyword");
  });

  it("renders the template's closed moment when forced closed", () => {
    const snap = makeSnapshot("REVIEW");
    const html = renderFormToStaticMarkup(snap, { forceClosed: true });
    expect(html).toContain(snap.content.closedMessage);
    expect(html).not.toContain("Rate your experience");
  });

  it("staged templates render a progress contract", () => {
    const snap = makeSnapshot("CUSTOMER_STORY"); // ledger: staged
    const html = renderFormToStaticMarkup(snap);
    // Screen readers always get the step contract; Ledger also paginates.
    expect(html).toContain("Step 1 of");
    expect(html).toContain("Page 1 of");
  });

  it("compositions differ by delivery surface", () => {
    const snap = makeSnapshot("CUSTOM"); // meridian
    const hosted = renderFormToStaticMarkup(snap);
    expect(hosted).toContain('data-tf-surface="hosted"');
    expect(hosted).toContain('class="mrd-brand"'); // the split's brand pane

    const embed = renderFormToStaticMarkup(snap, { surface: "embed" });
    expect(embed).toContain('data-tf-surface="embed"');
    expect(embed).toContain('class="mrd-embed-head"'); // the earned-card header
    expect(embed).not.toContain('class="mrd-brand"');
  });

  it("produces hydratable markup via renderToString", () => {
    const html = renderFormToString(makeSnapshot());
    expect(html).toContain("tf-root");
    expect(html).toContain("<style");
  });
});
