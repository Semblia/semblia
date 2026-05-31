import { describe, expect, it } from "vitest";
import { DEFAULT_FORM_CONFIG } from "./defaults.js";
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
});
