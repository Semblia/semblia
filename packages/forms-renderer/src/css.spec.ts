import { describe, expect, it } from "vitest";
import { buildFormStylesheet, rootDataAttributes } from "./css.js";
import { makeSnapshot } from "./test-utils.js";

describe("buildFormStylesheet", () => {
  it("emits scheme variables, base bones, and the pack's personality layer", () => {
    const snap = makeSnapshot("CUSTOM"); // meridian
    const css = buildFormStylesheet(snap);
    expect(css).toContain("--tf-accent");
    expect(css).toContain(".tf-btn-primary");
    expect(css).toContain('[data-tf-template="meridian"]');
    expect(css).toContain(".mrd-hosted");
  });

  it("adds a dark media-query block for system appearance", () => {
    const snap = makeSnapshot("CUSTOM", (d) => ({
      ...d,
      brand: { ...d.brand, appearance: "system" },
    }));
    const css = buildFormStylesheet(snap);
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain('[data-scheme="dark"]');
  });

  it("applies a dark-native template's only scheme to every requested scheme", () => {
    const snap = makeSnapshot("TESTIMONIAL"); // aperture is dark-only
    const css = buildFormStylesheet(snap);
    expect(css).toContain('[data-scheme="light"]'); // dark vars under the light attr
    expect(css).toContain(".apt-stage");
  });

  it("honours a custom scope selector", () => {
    const css = buildFormStylesheet(makeSnapshot("CUSTOM"), {
      scopeSelector: ".x",
    });
    expect(css).toContain('.x[data-tf-template="meridian"]');
    expect(css).toContain(".mrd-hosted");
    expect(css).not.toContain(".tf-root[data-tf-template");
  });

  it("draws the checkbox and radio rather than tinting the platform's", () => {
    const css = buildFormStylesheet(makeSnapshot("CUSTOM"));
    // accent-color only nudges the hue of an OS control: wrong size, wrong
    // corners, wrong everywhere. These are drawn from the theme's own tokens.
    expect(css).not.toContain("accent-color");
    expect(css).toContain(".tf-consent input");
    expect(css).toContain("appearance: none");
  });

  it("sizes rating marks by a variable, so packs never restyle them by font", () => {
    const css = buildFormStylesheet(makeSnapshot("CUSTOM"));
    expect(css).toContain("--tf-rating-size");
    expect(css).toContain(".tf-rating-glyph");
    // The fill-up-to-here hook, not the invalid aria-pressed it replaced.
    expect(css).toContain('.tf-rating-btn[data-on="true"]');
    expect(css).not.toContain("aria-pressed");
  });

  it("respects reduced motion", () => {
    expect(buildFormStylesheet(makeSnapshot())).toContain(
      "prefers-reduced-motion: reduce",
    );
  });

  it("gives each template its own personality layer", () => {
    const byIntent = {
      TESTIMONIAL: ".apt-stage",
      REVIEW: ".pcl-card",
      PRODUCT_FEEDBACK: ".trm-panel",
      CUSTOMER_STORY: ".ldg-sheet",
      CUSTOM: ".mrd-hosted",
    } as const;
    for (const [intent, marker] of Object.entries(byIntent)) {
      const css = buildFormStylesheet(
        makeSnapshot(intent as keyof typeof byIntent),
      );
      expect(css).toContain(marker);
    }
  });
});

describe("rootDataAttributes", () => {
  it("carries the template id, scheme, and normalized accent picks", () => {
    const snap = makeSnapshot("PRODUCT_FEEDBACK"); // terminal
    const attrs = rootDataAttributes(snap, "dark");
    expect(attrs["data-scheme"]).toBe("dark");
    expect(attrs["data-tf-template"]).toBe("terminal");
    expect(attrs["data-a-grid"]).toBe("on");
    expect(attrs["data-a-density"]).toBe("tight");
  });
});
