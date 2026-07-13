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
    expect(css).toContain(".mrd-card");
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
    expect(css).toContain('.x[data-tf-template="meridian"] .mrd-card');
    expect(css).not.toContain(".tf-root .mrd-card");
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
      CUSTOM: ".mrd-card",
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
