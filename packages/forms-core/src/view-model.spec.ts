import { describe, expect, it } from "vitest";
import { DEFAULT_FORM_CONFIG } from "./defaults.js";
import { normalizeFormConfig } from "./normalize.js";
import { createFormViewModel } from "./view-model.js";

describe("createFormViewModel", () => {
  it("creates stable answer input names from question ids", () => {
    const model = createFormViewModel(DEFAULT_FORM_CONFIG);

    expect(model.questions.map((question) => question.inputName)).toContain(
      "answers[content]",
    );
  });

  it("maps design tokens to --f-* CSS variables", () => {
    const model = createFormViewModel(DEFAULT_FORM_CONFIG);

    expect(model.cssVars["--f-accent"]).toBe(DEFAULT_FORM_CONFIG.tokens.accent);
    expect(model.cssVars["--f-radius"]).toBe(
      `${DEFAULT_FORM_CONFIG.tokens.radius}px`,
    );
  });

  it("reports the color scheme from the dark token", () => {
    expect(createFormViewModel(DEFAULT_FORM_CONFIG).colorScheme).toBe("light");
    const dark = createFormViewModel({
      ...DEFAULT_FORM_CONFIG,
      tokens: { ...DEFAULT_FORM_CONFIG.tokens, dark: true },
    });
    expect(dark.colorScheme).toBe("dark");
  });

  it("carries layout, loader, success, and submitLabel through", () => {
    const model = createFormViewModel(
      normalizeFormConfig({
        submitLabel: "Send feedback",
        layout: { flow: "stepped", container: "centered", hero: "floating" },
        loader: { enabled: true, durationMs: 900 },
        success: { title: "Cheers!", action: "cta", ctaUrl: "/done" },
      }),
    );

    expect(model.submitLabel).toBe("Send feedback");
    expect(model.layout.flow).toBe("stepped");
    expect(model.layout.container).toBe("centered");
    expect(model.layout.hero).toBe("floating");
    expect(model.loader.enabled).toBe(true);
    expect(model.loader.durationMs).toBe(900);
    expect(model.success.title).toBe("Cheers!");
    expect(model.success.ctaUrl).toBe("/done");
  });

  it("exposes showIf rules and descriptions on questions", () => {
    const model = createFormViewModel(
      normalizeFormConfig({
        questions: [
          { id: "rating", type: "stars", label: "Rate", required: true },
          {
            id: "why",
            type: "longtext",
            label: "Why?",
            description: "Optional detail",
            required: false,
            showIf: { questionId: "rating", op: "lte", value: 2 },
          },
        ],
      }),
    );

    expect(model.questions[1]?.description).toBe("Optional detail");
    expect(model.questions[1]?.showIf?.questionId).toBe("rating");
  });

  it("resolves known Google webfonts from token font stacks", () => {
    const model = createFormViewModel(
      normalizeFormConfig({
        tokens: {
          fontHead: '"Fraunces", "Playfair Display", Georgia, serif',
          fontBody: '"Inter", system-ui, sans-serif',
          fontMono: "ui-monospace, monospace",
        },
      }),
    );

    expect(model.webFonts.map((f) => f.family)).toEqual(["Fraunces", "Inter"]);
  });

  it("skips unknown / system font families", () => {
    const model = createFormViewModel(
      normalizeFormConfig({
        tokens: {
          fontHead: "Georgia, serif",
          fontBody: "system-ui, sans-serif",
        },
      }),
    );

    expect(model.webFonts).toEqual([]);
  });
});
