import { describe, expect, it } from "vitest";
import { DEFAULT_FORM_CONFIG } from "./defaults.js";
import { normalizeFormConfig } from "./normalize.js";

describe("normalizeFormConfig", () => {
  it("returns defaults for malformed input", () => {
    expect(normalizeFormConfig(null)).toEqual(DEFAULT_FORM_CONFIG);
  });

  it("preserves valid question ids and fills missing token defaults", () => {
    const config = normalizeFormConfig({
      brandName: "Acme",
      headline: "Tell us",
      subhead: "One minute",
      questions: [
        {
          id: "content",
          type: "textarea",
          label: "Feedback",
          required: true,
        },
      ],
      tokens: { accent: "#000000" },
    });

    expect(config.brandName).toBe("Acme");
    expect(config.questions[0]?.id).toBe("content");
    expect(config.tokens.accent).toBe("#000000");
    expect(config.tokens.background).toBe(
      DEFAULT_FORM_CONFIG.tokens.background,
    );
  });
});
