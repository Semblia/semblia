import { describe, expect, it } from "vitest";
import {
  DEFAULT_FORM_CONFIG,
  DEFAULT_FORM_LAYOUT,
  DEFAULT_FORM_LOADER,
  DEFAULT_FORM_SUCCESS,
  DEFAULT_FORM_TOKENS,
} from "./defaults.js";
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

  it("coerces the studio layout and falls back per-field", () => {
    const config = normalizeFormConfig({
      layout: {
        flow: "conversational",
        container: "split",
        hero: "side",
        mobileFlow: "stepped",
        mobileContainer: "auto",
        stickyProgress: false,
        showBrandPill: false,
      },
    });

    expect(config.layout).toEqual({
      flow: "conversational",
      container: "split",
      hero: "side",
      mobileFlow: "stepped",
      mobileContainer: "auto",
      stickyProgress: false,
      showBrandPill: false,
    });

    const bad = normalizeFormConfig({
      layout: { flow: "diagonal", container: 7, hero: "side" },
    });
    expect(bad.layout.flow).toBe(DEFAULT_FORM_LAYOUT.flow);
    expect(bad.layout.container).toBe(DEFAULT_FORM_LAYOUT.container);
    expect(bad.layout.hero).toBe("side");
  });

  it("coerces loader config and clamps the duration", () => {
    const config = normalizeFormConfig({
      loader: {
        enabled: true,
        style: "logo-draw",
        durationMs: 99999,
        message: "Hold on…",
        useLogo: true,
        tint: "ink",
      },
    });

    expect(config.loader.enabled).toBe(true);
    expect(config.loader.style).toBe("logo-draw");
    expect(config.loader.durationMs).toBe(8000);
    expect(config.loader.tint).toBe("ink");

    expect(normalizeFormConfig({}).loader).toEqual(DEFAULT_FORM_LOADER);
  });

  it("coerces success config and rejects unsafe URLs", () => {
    const config = normalizeFormConfig({
      success: {
        title: "Done!",
        message: "",
        action: "cta",
        ctaLabel: "Back home",
        ctaUrl: "https://example.com/thanks",
        redirectUrl: "javascript:alert(1)",
        emoji: "",
        showConfetti: false,
        useLogo: true,
      },
    });

    expect(config.success.title).toBe("Done!");
    expect(config.success.message).toBe("");
    expect(config.success.action).toBe("cta");
    expect(config.success.ctaUrl).toBe("https://example.com/thanks");
    expect(config.success.redirectUrl).toBe("");
    expect(config.success.emoji).toBe("");
    expect(config.success.showConfetti).toBe(false);

    expect(normalizeFormConfig({}).success).toEqual(DEFAULT_FORM_SUCCESS);
  });

  it("keeps question descriptions and valid showIf rules", () => {
    const config = normalizeFormConfig({
      questions: [
        { id: "rating", type: "stars", label: "Rate us", required: true },
        {
          id: "why",
          type: "longtext",
          label: "What went wrong?",
          description: "Be honest.",
          required: false,
          showIf: { questionId: "rating", op: "lte", value: 2 },
        },
        {
          id: "bad-rule",
          type: "shorttext",
          label: "Other",
          required: false,
          showIf: { op: "eq" },
        },
      ],
    });

    expect(config.questions[1]?.description).toBe("Be honest.");
    expect(config.questions[1]?.showIf).toEqual({
      questionId: "rating",
      op: "lte",
      value: 2,
    });
    expect(config.questions[2]?.showIf).toBeUndefined();
  });

  it("coerces submitLabel and new token atoms", () => {
    const config = normalizeFormConfig({
      submitLabel: "Send it",
      tokens: {
        bodyLineHeight: 1.8,
        fieldBorderWidth: 3,
        labelCasing: "uppercase",
        focusRing: "none",
      },
    });

    expect(config.submitLabel).toBe("Send it");
    expect(config.tokens.bodyLineHeight).toBe(1.8);
    expect(config.tokens.fieldBorderWidth).toBe(3);
    expect(config.tokens.labelCasing).toBe("uppercase");
    expect(config.tokens.focusRing).toBe("none");
  });
});
