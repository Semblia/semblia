import { describe, expect, it } from "vitest";
import { migrateFormDoc, parseFormDoc } from "./migrate.js";
import { SCHEMA_VERSION } from "./version.js";

describe("parseFormDoc", () => {
  it("applies defaults to an empty doc", () => {
    const doc = parseFormDoc({});
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.intent).toBe("CUSTOM");
    expect(doc.templateId).toBe("meridian");
    expect(doc.brand.appearance).toBe("system");
    expect(doc.content.submitButtonText).toBe("Submit");
  });
});

describe("migrateFormDoc", () => {
  it("projects a pre-v6 knob doc onto the template contract", () => {
    const doc = migrateFormDoc({
      schemaVersion: "5.0.0",
      intent: "REVIEW",
      layoutPreset: "splitHero",
      design: {
        brandColor: "#0ea5e9",
        mode: "dark",
        radius: "sharp",
        density: "compact",
        buttonStyle: "outline",
        fieldStyle: "underline",
        backgroundStyle: "gradient",
        fontPairing: "serifEditorial",
        logoAssetId: "asset_logo",
        logoUrl: "https://x.test/logo.png",
        backgroundImageUrl: "https://x.test/bg.jpg",
      },
      flow: {
        mode: "step",
        progressIndicator: true,
        conditionalRules: [
          {
            targetFieldId: "f2",
            action: "show",
            match: "all",
            conditions: [{ fieldId: "f1", operator: "equals", value: "yes" }],
          },
        ],
      },
      content: { title: "Old title" },
    });

    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.intent).toBe("REVIEW");
    // Brand facts survive; knob picks are template taste now and drop.
    expect(doc.brand.color).toBe("#0ea5e9");
    expect(doc.brand.appearance).toBe("dark");
    expect(doc.brand.logoAssetId).toBe("asset_logo");
    expect(doc.brand.logoUrl).toBe("https://x.test/logo.png");
    expect(doc.assets.heroImageUrl).toBe("https://x.test/bg.jpg");
    // Intent lands on its designed default template with default accents.
    expect(doc.templateId).toBe("parcel");
    expect(doc.accents).toEqual({});
    // Conditional logic survives; pacing knobs do not.
    expect(doc.flow.conditionalRules).toHaveLength(1);
    expect(doc.content.title).toBe("Old title");
    expect(doc).not.toHaveProperty("layoutPreset");
    expect(doc).not.toHaveProperty("design");
  });

  it("stamps the current schema version onto an older doc", () => {
    const doc = migrateFormDoc({ schemaVersion: "4.2.0", intent: "REVIEW" });
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.intent).toBe("REVIEW");
  });

  it("tolerates junk input by falling back to defaults", () => {
    expect(migrateFormDoc(null).schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrateFormDoc("nonsense").schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("projects a version-less legacy blob that still carries the old design shape", () => {
    const doc = migrateFormDoc({
      design: { brandColor: "#123456", mode: "dark" },
      layoutPreset: "centered",
    });
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.templateId).toBe("meridian");
    expect(doc.brand.color).toBe("#123456");
    expect(doc.brand.appearance).toBe("dark");
    expect(doc).not.toHaveProperty("design");
  });

  it("does not project a doc whose schemaVersion is unparsable", () => {
    const doc = migrateFormDoc({
      schemaVersion: "garbage",
      design: { brandColor: "#123456" },
    });
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.brand.color).not.toBe("#123456");
  });

  it("treats an empty schemaVersion as version-less legacy input", () => {
    const doc = migrateFormDoc({
      schemaVersion: "",
      design: { brandColor: "#123456" },
    });
    expect(doc.brand.color).toBe("#123456");
  });

  it("throws on a doc from a newer major than this package understands", () => {
    const nextMajor = `${Number(SCHEMA_VERSION.split(".")[0]) + 1}.0.0`;
    expect(() => migrateFormDoc({ schemaVersion: nextMajor })).toThrow(
      /Unsupported form schemaVersion/,
    );
  });
});
