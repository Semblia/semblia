import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color.js";
import { PRESETS, resolvePreset } from "./presets.js";
import { resolveTheme, type FormThemeInputs } from "./theme.js";

// A spread of brand colors including pathological cases (very light yellow,
// near-black) that naively break contrast.
const BRANDS = [
  "#4f46e5", // indigo
  "#d97706", // amber (Tresta)
  "#fde047", // light yellow — white-on-accent would be unreadable
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#111111", // near black
  "#ec4899", // pink
  "#84cc16", // lime
];

describe("resolveTheme — accessibility invariants", () => {
  for (const id of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
    for (const brand of BRANDS) {
      it(`${id} + ${brand}: text, muted text and accent label all meet AA`, () => {
        const t = resolveTheme(resolvePreset(id, brand));
        expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t.mutedText, t.surface)).toBeGreaterThanOrEqual(
          4.5,
        );
        expect(contrastRatio(t.accentText, t.accent)).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it("is deterministic for the same inputs", () => {
    const a = resolveTheme(resolvePreset("clean", "#4f46e5"));
    const b = resolveTheme(resolvePreset("clean", "#4f46e5"));
    expect(a).toEqual(b);
  });

  it("keeps text readable in dark appearance", () => {
    const inputs: FormThemeInputs = {
      brandColor: "#4f46e5",
      appearance: "dark",
      radius: 3,
      density: "cozy",
      typePairing: "inter",
      surfaceStyle: "elevated",
      accentIntensity: "balanced",
    };
    const t = resolveTheme(inputs);
    expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.mutedText, t.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("never emits a malformed brand color as raw output", () => {
    const t = resolveTheme(resolvePreset("clean", "not-a-color"));
    expect(t.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
