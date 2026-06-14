import { describe, expect, it } from "vitest";
import {
  defaultWidgetDefinition,
  migrateWidgetDoc,
  projectFlatWidgetToV1,
  publishWidgetDefinition,
  widgetDefinitionDocSchema,
} from "./index.js";

describe("widget definition schema", () => {
  it("builds a valid default embed definition", () => {
    const doc = defaultWidgetDefinition({ brandColor: "#0f172a" });

    expect(widgetDefinitionDocSchema.parse(doc).layout.preset).toBe("carousel");
    expect(doc.theme.brandColor).toBe("#0f172a");
  });

  it("requires wall config for wall layout", () => {
    expect(() =>
      widgetDefinitionDocSchema.parse({
        ...defaultWidgetDefinition(),
        layout: { preset: "wall" },
        wall: null,
      }),
    ).toThrow();
  });

  it("projects the legacy flat config into a v1 document", () => {
    const doc = projectFlatWidgetToV1({
      kind: "WALL_OF_LOVE",
      layout: "WALL",
      theme: "AUTO",
      accent: "#111111",
      cardStyle: "ELEVATED",
      density: "COZY",
      radius: 18,
      maxItems: 12,
      wallSlug: "acme-love",
      wallTitle: "Loved by Acme",
      showBranding: false,
    });

    expect(doc.kind).toBe("wall");
    expect(doc.theme.appearance).toBe("system");
    expect(doc.theme.surfaceStyle).toBe("elevated");
    expect(doc.theme.density).toBe("spacious");
    expect(doc.wall?.slug).toBe("acme-love");
    expect(doc.branding.watermark).toBe(false);
  });

  it("migrates current documents strictly", () => {
    const doc = defaultWidgetDefinition();

    expect(migrateWidgetDoc(doc)).toEqual(doc);
  });

  it("publishes a derived theme snapshot", () => {
    const snapshot = publishWidgetDefinition(defaultWidgetDefinition(), {
      resolvedAt: new Date("2026-06-14T00:00:00.000Z"),
    });

    expect(snapshot.version).toBe("widgets-v1");
    expect(snapshot.derivedTheme.schemes.light?.accent).toMatch(/^#/);
    expect(snapshot.resolvedAt).toBe("2026-06-14T00:00:00.000Z");
  });
});
