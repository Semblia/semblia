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

  it("maps design tokens to CSS variables", () => {
    const model = createFormViewModel(DEFAULT_FORM_CONFIG);

    expect(model.cssVars["--tresta-form-accent"]).toBe(
      DEFAULT_FORM_CONFIG.tokens.accent,
    );
    expect(model.cssVars["--tresta-form-radius"]).toBe(
      `${DEFAULT_FORM_CONFIG.tokens.radius}px`,
    );
  });
});
