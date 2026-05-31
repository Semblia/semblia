import { describe, expect, it } from "vitest";
import { DEFAULT_FORM_CONFIG, DEFAULT_FORM_TOKENS } from "./defaults.js";
import { normalizeFormConfig } from "./normalize.js";

describe("normalizeFormConfig", () => {
  it("returns defaults for malformed input", () => {
    expect(normalizeFormConfig(null)).toEqual(DEFAULT_FORM_CONFIG);
  });

  it("preserves rich studio tokens and fills the rest with defaults", () => {
    const config = normalizeFormConfig({
      brandName: "Acme",
      headline: "Tell us",
      subhead: "One minute",
      questions: [
        { id: "content", type: "longtext", label: "Feedback", required: true },
      ],
      tokens: { accent: "#000000", bg: "#101010", dark: true },
    });

    expect(config.brandName).toBe("Acme");
    expect(config.questions[0]?.id).toBe("content");
    expect(config.tokens.accent).toBe("#000000");
    expect(config.tokens.bg).toBe("#101010");
    expect(config.tokens.dark).toBe(true);
    expect(config.tokens.surface).toBe(DEFAULT_FORM_TOKENS.surface);
  });

  it("maps legacy flat tokens onto the rich model", () => {
    const config = normalizeFormConfig({
      tokens: {
        accent: "#112233",
        background: "#fafafa",
        text: "#0a0a0a",
        mutedText: "#777777",
        border: "#cccccc",
        radius: 8,
        fontFamily: '"Georgia", serif',
      },
    });

    expect(config.tokens.accent).toBe("#112233");
    expect(config.tokens.bg).toBe("#fafafa");
    expect(config.tokens.ink).toBe("#0a0a0a");
    expect(config.tokens.inkSoft).toBe("#777777");
    expect(config.tokens.line).toBe("#cccccc");
    expect(config.tokens.radius).toBe(8);
    expect(config.tokens.fontHead).toBe('"Georgia", serif');
  });

  it("falls back to default questions when none are valid", () => {
    const config = normalizeFormConfig({ brandName: "X", questions: [] });
    expect(config.questions.length).toBeGreaterThan(0);
    expect(config.questions).toEqual(DEFAULT_FORM_CONFIG.questions);
  });
});
