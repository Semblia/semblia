import { describe, expect, it } from "vitest";
import { createFormTemplate, FORM_INTENTS } from "./intents.js";
import { formDefinitionDocSchema } from "./schema/definition.js";

describe("createFormTemplate", () => {
  it("seeds a valid, fully-defaulted doc for every intent", () => {
    for (const intent of FORM_INTENTS) {
      const doc = createFormTemplate(intent);
      // Re-parsing must be a no-op — the template is already canonical.
      expect(() => formDefinitionDocSchema.parse(doc)).not.toThrow();
      expect(doc.intent).toBe(intent);
      expect(doc.fields.length).toBeGreaterThan(0);
      // Every field carries a stable id (snapshot/normalize key on it).
      expect(new Set(doc.fields.map((f) => f.id)).size).toBe(doc.fields.length);
    }
  });

  it("TESTIMONIAL seeds the video-or-write ritual on Aperture with consent", () => {
    const doc = createFormTemplate("TESTIMONIAL");
    expect(doc.templateId).toBe("aperture");
    expect(doc.settings.requireConsent).toBe(true);

    // The record-or-write pair: both publishable, neither schema-required —
    // the template's composition enforces one-of before submit.
    const video = doc.fields.find((f) => f.type === "videoUpload");
    expect(video?.publishable).toBe(true);
    expect(video?.maxDurationSec).toBeGreaterThan(0);
    const body = doc.fields.find((f) => f.role === "primaryText");
    expect(body?.publishable).toBe(true);

    const consent = doc.fields.find((f) => f.type === "consent");
    expect(consent?.required).toBe(true);
    expect(consent?.private).toBe(true);
  });

  it("every intent lands on its designed default template", () => {
    expect(createFormTemplate("TESTIMONIAL").templateId).toBe("aperture");
    expect(createFormTemplate("REVIEW").templateId).toBe("parcel");
    expect(createFormTemplate("PRODUCT_FEEDBACK").templateId).toBe("terminal");
    expect(createFormTemplate("CUSTOMER_STORY").templateId).toBe("ledger");
    expect(createFormTemplate("CUSTOM").templateId).toBe("meridian");
  });

  it("PRODUCT_FEEDBACK carries a conditional rule and a private email field", () => {
    const doc = createFormTemplate("PRODUCT_FEEDBACK");
    expect(doc.flow.conditionalRules.length).toBeGreaterThan(0);

    const email = doc.fields.find((f) => f.type === "email");
    expect(email?.private).toBe(true);
    expect(email?.publishable).toBe(false);
  });

  it("CUSTOM is a minimal, consent-free starting point", () => {
    const doc = createFormTemplate("CUSTOM");
    expect(doc.settings.requireConsent).toBe(false);
    expect(doc.fields.some((f) => f.role === "primaryText")).toBe(true);
  });
});
