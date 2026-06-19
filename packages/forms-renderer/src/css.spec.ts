import { describe, expect, it } from "vitest";
import { buildFormStylesheet, rootDataAttributes } from "./css.js";
import { makeSnapshot } from "./test-utils.js";

describe("buildFormStylesheet", () => {
  it("emits the scheme variable block and core skin rules", () => {
    const snap = makeSnapshot("TESTIMONIAL", (d) => ({
      ...d,
      design: { ...d.design, mode: "light" },
    }));
    const css = buildFormStylesheet(snap);
    expect(css).toContain('[data-scheme="light"]');
    expect(css).toContain("--tf-accent");
    expect(css).toContain(".tf-card");
    expect(css).toContain(".tf-btn-primary");
  });

  it("adds a dark media-query block for system appearance", () => {
    const snap = makeSnapshot("TESTIMONIAL", (d) => ({
      ...d,
      design: { ...d.design, mode: "system" },
    }));
    const css = buildFormStylesheet(snap);
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain('[data-scheme="dark"]');
  });

  it("honours a custom scope selector", () => {
    const css = buildFormStylesheet(makeSnapshot(), { scopeSelector: ".x" });
    expect(css).toContain(".x .tf-card");
    expect(css).not.toContain(".tf-root .tf-card");
  });

  it("respects reduced motion", () => {
    expect(buildFormStylesheet(makeSnapshot())).toContain(
      "prefers-reduced-motion: reduce",
    );
  });
});

describe("rootDataAttributes", () => {
  it("reflects the layout and design choices", () => {
    const snap = makeSnapshot("PRODUCT_FEEDBACK");
    const attrs = rootDataAttributes(snap, "light");
    expect(attrs["data-scheme"]).toBe("light");
    expect(attrs["data-layout"]).toBe(snap.layoutPreset);
    expect(attrs["data-field-style"]).toBe(snap.design.fieldStyle);
    expect(attrs["data-bg-style"]).toBe(snap.design.backgroundStyle);
    expect(["solid", "soft", "outline"]).toContain(attrs["data-button-style"]);
  });
});
