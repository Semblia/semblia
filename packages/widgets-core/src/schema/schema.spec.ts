import { describe, expect, it } from "vitest";
import {
  defaultWidgetDefinition,
  migrateWidgetDoc,
  projectFlatWidgetToV2,
  publishWidgetDefinition,
  widgetDefinitionDocSchema,
} from "./index.js";

describe("widget definition schema", () => {
  it("builds a valid default embed definition on the template contract", () => {
    const doc = defaultWidgetDefinition({ brandColor: "#0f172a" });

    expect(widgetDefinitionDocSchema.parse(doc).templateId).toBe("marquee");
    expect(doc.brand.color).toBe("#0f172a");
  });

  it("requires wall config for wall widgets", () => {
    expect(() =>
      widgetDefinitionDocSchema.parse({
        ...defaultWidgetDefinition({ kind: "wall" }),
        wall: null,
      }),
    ).toThrow();
  });

  it("projects the legacy flat config straight onto v2", () => {
    const doc = projectFlatWidgetToV2({
      kind: "WALL_OF_LOVE",
      layout: "WALL",
      theme: "AUTO",
      accent: "#111111",
      maxItems: 12,
      wallSlug: "acme-love",
      wallTitle: "Loved by Acme",
      showBranding: false,
    });

    expect(doc.kind).toBe("wall");
    expect(doc.templateId).toBe("editorial");
    expect(doc.brand.color).toBe("#111111");
    expect(doc.brand.appearance).toBe("system");
    expect(doc.wall?.slug).toBe("acme-love");
    expect(doc.branding.watermark).toBe(false);
  });

  it("projects a v1 doc: preset/variant → template + accents, theme → brand", () => {
    const doc = migrateWidgetDoc({
      schemaVersion: 1,
      kind: "embed",
      layout: { preset: "list", variant: "quotes" },
      content: { mode: "all", pickedIds: [], order: "recent", minRating: null, maxItems: 5 },
      display: { showRating: true, showAvatar: true, showCompany: true, showDate: false, showSource: false },
      behavior: { autoRotate: false, rotateInterval: 5000 },
      theme: {
        brandColor: "#0ea5e9",
        appearance: "dark",
        radius: 4,
        density: "spacious",
        typePairing: "serif-editorial",
        surfaceStyle: "flat",
        accentIntensity: "bold",
        neutralTone: "warm",
        buttonStyle: "outline",
      },
      branding: { logoUrl: null, watermark: true },
      wall: null,
    });

    expect(doc.schemaVersion).toBe(2);
    expect(doc.templateId).toBe("column");
    expect(doc.accents).toEqual({ voice: "quotes" });
    expect(doc.brand).toEqual({ color: "#0ea5e9", appearance: "dark" });
    expect(doc).not.toHaveProperty("layout");
    expect(doc).not.toHaveProperty("theme");
    expect(doc.content.maxItems).toBe(5);
  });

  it("migrates current documents strictly", () => {
    const doc = defaultWidgetDefinition();

    expect(migrateWidgetDoc(doc)).toEqual(doc);
  });

  it("publishes a derived theme snapshot via the template recipe", () => {
    const snapshot = publishWidgetDefinition(defaultWidgetDefinition(), {
      resolvedAt: new Date("2026-06-14T00:00:00.000Z"),
    });

    expect(snapshot.version).toBe("widgets-v2");
    expect(snapshot.derivedTheme.schemes.light?.accent).toMatch(/^#/);
    expect(snapshot.resolvedAt).toBe("2026-06-14T00:00:00.000Z");
  });
});
