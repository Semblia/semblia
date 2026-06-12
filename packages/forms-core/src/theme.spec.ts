import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color.js";
import { PRESETS, resolvePreset } from "./presets.js";
import {
  derivedThemeToCssVars,
  resolveTheme,
  resolveThemeSnapshot,
  type FormThemeInputs,
} from "./theme.js";

// A spread of brand colors including pathological cases (very light yellow,
// near-black) that naively break contrast.
const BRANDS = [
  "#4f46e5", // indigo
  "#d97706", // amber (Semblia)
  "#fde047", // light yellow — white-on-accent would be unreadable
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#111111", // near black
  "#ec4899", // pink
  "#84cc16", // lime
];

const BASE: FormThemeInputs = {
  brandColor: "#4f46e5",
  appearance: "light",
  radius: 3,
  density: "cozy",
  typePairing: "inter",
  surfaceStyle: "elevated",
  accentIntensity: "balanced",
  neutralTone: "auto",
  buttonStyle: "solid",
};

describe("resolveTheme — accessibility invariants", () => {
  for (const id of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
    for (const brand of BRANDS) {
      for (const scheme of ["light", "dark"] as const) {
        it(`${id} + ${brand} (${scheme}): text, muted, accent label and soft label all meet AA`, () => {
          const t = resolveTheme(resolvePreset(id, brand), scheme);
          expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(t.mutedText, t.surface)).toBeGreaterThanOrEqual(
            4.5,
          );
          expect(contrastRatio(t.accentText, t.accent)).toBeGreaterThanOrEqual(
            3,
          );
          expect(
            contrastRatio(t.accentSoftText, t.accentSoft),
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }

  it("is deterministic for the same inputs", () => {
    const a = resolveTheme(resolvePreset("clean", "#4f46e5"));
    const b = resolveTheme(resolvePreset("clean", "#4f46e5"));
    expect(a).toEqual(b);
  });

  it("keeps text readable in dark appearance", () => {
    const t = resolveTheme({ ...BASE, appearance: "dark" });
    expect(t.colorScheme).toBe("dark");
    expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.mutedText, t.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("never emits a malformed brand color as raw output", () => {
    const t = resolveTheme(resolvePreset("clean", "not-a-color"));
    expect(t.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("resolveTheme — derived ramp", () => {
  it("derives distinct interactive accent states", () => {
    const t = resolveTheme(BASE);
    expect(t.accentHover).not.toBe(t.accent);
    expect(t.accentActive).not.toBe(t.accent);
    expect(t.accentActive).not.toBe(t.accentHover);
  });

  it("focus ring is the accent with alpha", () => {
    const t = resolveTheme(BASE);
    expect(t.focusRing).toMatch(/^#[0-9a-f]{8}$/);
    expect(t.focusRing.startsWith(t.accent)).toBe(true);
  });

  it("neutralTone: pure produces untinted greys", () => {
    const t = resolveTheme({ ...BASE, neutralTone: "pure" });
    // Zero chroma → r === g === b for every neutral surface.
    for (const hex of [t.background, t.surface, t.border]) {
      const [r, g, b] = [1, 3, 5].map((i) => hex.slice(i, i + 2));
      expect(r).toBe(g);
      expect(g).toBe(b);
    }
  });

  it("density maps to the vetted spacing scale", () => {
    const compact = resolveTheme({ ...BASE, density: "compact" });
    const spacious = resolveTheme({ ...BASE, density: "spacious" });
    expect(compact.fieldGap).toBeLessThan(spacious.fieldGap);
    expect(compact.sectionGap).toBeLessThan(spacious.sectionGap);
  });

  it("surfaceStyle drives border/shadow, never both raw", () => {
    const flat = resolveTheme({ ...BASE, surfaceStyle: "flat" });
    const bordered = resolveTheme({ ...BASE, surfaceStyle: "bordered" });
    const elevated = resolveTheme({ ...BASE, surfaceStyle: "elevated" });
    expect(flat.borderWidth).toBe(0);
    expect(flat.shadow).toBe("none");
    expect(bordered.borderWidth).toBe(1);
    expect(bordered.shadow).toBe("none");
    expect(elevated.shadow).not.toBe("none");
  });

  it("field radius caps below container radius at high scales", () => {
    const t = resolveTheme({ ...BASE, radius: 4 });
    expect(t.radiusField).toBeLessThan(t.radius);
  });

  it("typePairing inherit passes through for host-font embeds", () => {
    const t = resolveTheme({ ...BASE, typePairing: "inherit" });
    expect(t.fontFamily).toBe("inherit");
  });
});

describe("resolveThemeSnapshot", () => {
  it("light appearance resolves only the light scheme", () => {
    const s = resolveThemeSnapshot(BASE);
    expect(s.schemes.light).toBeDefined();
    expect(s.schemes.dark).toBeUndefined();
  });

  it("system appearance resolves both schemes at publish time", () => {
    const s = resolveThemeSnapshot({ ...BASE, appearance: "system" });
    expect(s.schemes.light?.colorScheme).toBe("light");
    expect(s.schemes.dark?.colorScheme).toBe("dark");
  });
});

describe("derivedThemeToCssVars", () => {
  it("emits every token as a --tf-* var with px units on lengths", () => {
    const vars = derivedThemeToCssVars(resolveTheme(BASE));
    expect(vars["--tf-accent"]).toMatch(/^#/);
    expect(vars["--tf-radius"]).toMatch(/px$/);
    expect(vars["--tf-field-pad"]).toMatch(/px \d+px$/);
    expect(Object.keys(vars).every((k) => k.startsWith("--tf-"))).toBe(true);
  });
});
