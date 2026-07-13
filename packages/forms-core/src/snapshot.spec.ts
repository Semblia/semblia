import { describe, expect, it } from "vitest";
import { createFormTemplate } from "./intents.js";
import {
  compileSnapshot,
  computeChecksum,
  toPublicSnapshot,
  type SnapshotMeta,
} from "./snapshot.js";

const meta: SnapshotMeta = {
  snapshotId: "ver_1",
  formId: "form_1",
  projectId: "project_1",
  slug: "acme-testimonials",
  version: 1,
  publishedAt: "2026-06-19T00:00:00.000Z",
};

describe("compileSnapshot", () => {
  const doc = createFormTemplate("TESTIMONIAL");

  it("produces an AA-clamped derived theme + css vars for the template", () => {
    const snap = compileSnapshot(doc, meta);
    // TESTIMONIAL seeds Aperture, a dark-native stage: appearance clamps to dark.
    expect(snap.template.templateId).toBe("aperture");
    expect(snap.template.appearance).toBe("dark");
    expect(snap.template.theme.schemes.dark).toBeTruthy();
    expect(snap.template.cssVars.dark?.["--tf-accent"]).toMatch(/^#/);
    expect(snap.template.cssVars.dark?.["--tf-bg"]).toMatch(/^#/);
  });

  it("resolves both schemes for system appearance on a template that allows it", () => {
    const custom = createFormTemplate("CUSTOM");
    const snap = compileSnapshot(
      { ...custom, brand: { ...custom.brand, appearance: "system" } },
      meta,
    );
    expect(snap.template.templateId).toBe("meridian");
    expect(snap.template.cssVars.light).toBeTruthy();
    expect(snap.template.cssVars.dark).toBeTruthy();
  });

  it("normalizes unknown accent picks to the template's defaults", () => {
    const snap = compileSnapshot(
      { ...doc, accents: { stage: "not-a-stage", bogus: "x" } },
      meta,
    );
    expect(snap.template.accents).toEqual({ stage: "dusk" });
  });

  it("compiles away imagery slots the template does not declare", () => {
    const custom = createFormTemplate("CUSTOM"); // meridian: logo slot only
    const snap = compileSnapshot(
      {
        ...custom,
        assets: { ...custom.assets, heroImageUrl: "https://x.test/hero.jpg" },
      },
      meta,
    );
    expect(snap.assets.heroImageUrl).toBeNull();

    const review = createFormTemplate("REVIEW"); // parcel declares hero
    const withHero = compileSnapshot(
      {
        ...review,
        assets: { ...review.assets, heroImageUrl: "https://x.test/hero.jpg" },
      },
      meta,
    );
    expect(withHero.assets.heroImageUrl).toBe("https://x.test/hero.jpg");
  });

  it("is deterministic — identical content yields a stable checksum", () => {
    const a = compileSnapshot(doc, meta);
    const b = compileSnapshot(doc, { ...meta, publishedAt: "2030-01-01T00:00:00.000Z" });
    expect(a.checksum).toBe(b.checksum); // publishedAt excluded from the fingerprint
    expect(a.checksum.length).toBeGreaterThan(8);
  });

  it("changes the checksum when content changes", () => {
    const a = compileSnapshot(doc, meta);
    const edited = {
      ...doc,
      content: { ...doc.content, title: "A different title" },
    };
    const b = compileSnapshot(edited, meta);
    expect(a.checksum).not.toBe(b.checksum);
  });
});

describe("toPublicSnapshot", () => {
  it("strips server-only settings (blocked words, anti-abuse internals)", () => {
    const doc = createFormTemplate("REVIEW");
    doc.settings.blockedWords = ["spammyword"];
    const full = compileSnapshot(doc, meta);
    expect(full.serverSettings.blockedWords).toContain("spammyword");

    const pub = toPublicSnapshot(full);
    expect(pub).not.toHaveProperty("serverSettings");
    // The blocked words must never appear anywhere in the public payload.
    expect(JSON.stringify(pub)).not.toContain("spammyword");
  });
});

describe("computeChecksum", () => {
  it("is stable across key ordering", () => {
    expect(computeChecksum({ a: 1, b: 2 })).toBe(computeChecksum({ b: 2, a: 1 }));
  });
});
