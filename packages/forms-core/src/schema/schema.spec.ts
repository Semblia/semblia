import { describe, expect, it } from "vitest";
import type { FormThemeInputs } from "../theme.js";
import {
  FORM_SCHEMA_VERSION,
  formDefinitionDocSchema,
  formThemeInputsSchema,
} from "./definition.js";
import { migrateFormDoc, projectV1ToV2 } from "./migrate.js";
import { defaultFormDefinition, publishFormDefinition } from "./publish.js";

describe("schema — wire/engine alignment", () => {
  it("formThemeInputsSchema parses straight into the derivation engine's input type", () => {
    const parsed: FormThemeInputs = formThemeInputsSchema.parse({
      brandColor: "#d97706",
      appearance: "system",
      radius: 2,
      density: "cozy",
      typePairing: "geist",
      surfaceStyle: "bordered",
      accentIntensity: "balanced",
      neutralTone: "auto",
      buttonStyle: "solid",
    });
    expect(parsed.brandColor).toBe("#d97706");
  });
});

describe("formDefinitionDocSchema — write-time validation", () => {
  it("accepts the default document", () => {
    const doc = defaultFormDefinition({ brandName: "Acme" });
    expect(doc.schemaVersion).toBe(FORM_SCHEMA_VERSION);
    expect(formDefinitionDocSchema.parse(doc)).toEqual(doc);
  });

  it("rejects duplicate question ids", () => {
    const doc = defaultFormDefinition();
    doc.structure.questions.push({ ...doc.structure.questions[0]! });
    expect(() => formDefinitionDocSchema.parse(doc)).toThrow(/duplicate/);
  });

  it("rejects choice questions with fewer than 2 options", () => {
    const doc = defaultFormDefinition();
    doc.structure.questions[0] = {
      ...doc.structure.questions[0]!,
      type: "radio",
      options: ["only-one"],
    };
    expect(() => formDefinitionDocSchema.parse(doc)).toThrow(/options/);
  });

  it("rejects showIf rules pointing at unknown or self questions", () => {
    const doc = defaultFormDefinition();
    doc.structure.questions[0] = {
      ...doc.structure.questions[0]!,
      showIf: { questionId: "ghost", op: "eq", value: "x" },
    };
    expect(() => formDefinitionDocSchema.parse(doc)).toThrow(/unknown/);

    const self = defaultFormDefinition();
    self.structure.questions[0] = {
      ...self.structure.questions[0]!,
      showIf: { questionId: self.structure.questions[0]!.id, op: "eq", value: 1 },
    };
    expect(() => formDefinitionDocSchema.parse(self)).toThrow(/own answer/);
  });

  it("rejects out-of-range theme knobs — the freeform escape hatch is closed", () => {
    const doc = defaultFormDefinition();
    expect(() =>
      formDefinitionDocSchema.parse({
        ...doc,
        theme: {
          ...doc.theme,
          inputs: { ...doc.theme.inputs, radius: 99 },
        },
      }),
    ).toThrow();
    expect(() =>
      formDefinitionDocSchema.parse({
        ...doc,
        theme: {
          ...doc.theme,
          inputs: { ...doc.theme.inputs, brandColor: "tomato" },
        },
      }),
    ).toThrow();
  });
});

describe("publishFormDefinition", () => {
  it("stamps a derived snapshot covering every renderable scheme", () => {
    const doc = defaultFormDefinition();
    doc.theme.inputs.appearance = "system";
    const published = publishFormDefinition(doc);
    expect(published.derived.schemes.light?.accent).toMatch(/^#/);
    expect(published.derived.schemes.dark?.accent).toMatch(/^#/);
  });

  it("refuses to publish an invalid doc", () => {
    expect(() => publishFormDefinition({ schemaVersion: 2 })).toThrow();
  });
});

describe("migrateFormDoc — v1 projection", () => {
  // A representative slice of the old freeform config model.
  const V1_CONFIG = {
    brandName: "Acme",
    headline: "Tell us!",
    subhead: "Two minutes.",
    submitLabel: "Send",
    logoUrl: "https://cdn.example.com/logo.svg",
    questions: [
      { id: "fb", type: "textarea", label: "Feedback", required: true },
      { id: "rate", type: "rating", label: "Rating", required: false },
      {
        id: "why",
        type: "shorttext",
        label: "Why that score?",
        required: false,
        showIf: { questionId: "rate", op: "lte", value: 3 },
      },
      { id: "pick", type: "radio", label: "Team", options: ["A"] },
    ],
    tokens: {
      accent: "#0ea5e9",
      dark: true,
      radius: 20,
      density: "airy",
      fontBody: '"Fraunces", Georgia, serif',
      shadow: "soft",
      buttonStyle: "ghost",
      fieldShape: "pill",
      texture: "grain",
    },
    layout: { flow: "conversational", container: "boxed", hero: "side" },
    loader: { enabled: true, message: "Loading…", style: "logo-draw" },
    success: {
      title: "Thanks!",
      message: "Much appreciated.",
      action: "redirect",
      redirectUrl: "https://acme.com/thanks",
      showConfetti: true,
    },
  };

  it("projects the freeform config onto the constrained v2 document", () => {
    const doc = migrateFormDoc(V1_CONFIG);
    expect(doc.schemaVersion).toBe(2);
    // Layout: conversational flow wins.
    expect(doc.layout.preset).toBe("conversational");
    // Theme: lossy but in-range.
    expect(doc.theme.inputs).toMatchObject({
      brandColor: "#0ea5e9",
      appearance: "dark",
      radius: 3, // 20px → nearest stop 18
      density: "spacious",
      typePairing: "serif-editorial",
      surfaceStyle: "elevated",
      buttonStyle: "outline",
    });
    // Structure: legacy kinds mapped, showIf preserved, bad radio demoted.
    const types = Object.fromEntries(
      doc.structure.questions.map((q) => [q.id, q.type]),
    );
    expect(types).toMatchObject({
      fb: "longtext",
      rate: "stars",
      why: "shorttext",
      pick: "shorttext",
    });
    expect(
      doc.structure.questions.find((q) => q.id === "why")?.showIf,
    ).toEqual({ questionId: "rate", op: "lte", value: 3 });
    // Content: copy survives, style knobs (confetti, loader style) do not.
    expect(doc.content.success.action).toBe("redirect");
    expect(doc.content.loaderMessage).toBe("Loading…");
  });

  it("v2 envelopes pass through strict validation untouched", () => {
    const doc = defaultFormDefinition();
    expect(migrateFormDoc(doc)).toEqual(doc);
  });

  it("future schema versions throw instead of silently projecting", () => {
    expect(() => migrateFormDoc({ schemaVersion: 3 })).toThrow(/no migration/);
  });

  it("garbage input still yields a valid renderable document", () => {
    const doc = migrateFormDoc({ tokens: { accent: "noop" }, questions: "x" });
    expect(formDefinitionDocSchema.parse(doc)).toEqual(doc);
    expect(doc.structure.questions.length).toBeGreaterThan(0);
  });

  it("projection output always re-validates (publishable)", () => {
    expect(() => publishFormDefinition(projectV1ToV2(V1_CONFIG))).not.toThrow();
  });
});
