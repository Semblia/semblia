/**
 * The shared Semblia brand derivation engine — the only appearance surface for
 * parametric customer-facing experiences.
 *
 * Users set a handful of constrained `BrandThemeInputs`; every visual token is
 * derived from them and clamped to WCAG AA, so no combination of inputs can
 * produce an incoherent or inaccessible form. Callers never set dependent
 * tokens directly. See docs/DESIGN.md §2 and
 * docs/plans/2026-06-11-forms-v4-parametric-theming.md.
 *
 * Derivation is pure and deterministic: the studio preview, the publish-time
 * snapshot, and the renderers all call the same functions and can never
 * disagree. The legacy `FormTheme*` names remain as compatibility aliases.
 */

import {
  ensureContrast,
  hexToOklch,
  normalizeHex,
  oklchToHex,
  onColor,
  withAlpha,
} from "./color.js";
export {
  contrastRatio,
  ensureContrast,
  hexToOklch,
  hexToRgb,
  normalizeHex,
  oklchToHex,
  onColor,
  relativeLuminance,
  rgbToHex,
  rgbToOklch,
  withAlpha,
} from "./color.js";
export type { Oklch } from "./color.js";

// ── Knob surface (the entire user-facing appearance API) ────────────────────

export type Appearance = "light" | "dark" | "system";
export type RadiusScale = 0 | 1 | 2 | 3 | 4;
export type Density = "compact" | "cozy" | "spacious";
export type SurfaceStyle = "flat" | "bordered" | "elevated";
export type AccentIntensity = "subtle" | "balanced" | "bold";
export type NeutralTone = "auto" | "pure" | "warm" | "cool";
export type ButtonStyle = "solid" | "soft" | "outline";
export type TypePairingId =
  | "inherit"
  | "inter"
  | "geist"
  | "system"
  | "serif-editorial";

export interface FormThemeInputs {
  /** The single brand identity color. Everything accent-related derives from it. */
  brandColor: string;
  appearance: Appearance;
  radius: RadiusScale;
  density: Density;
  /** `inherit` lets an embed adopt the host page's font stack. */
  typePairing: TypePairingId;
  surfaceStyle: SurfaceStyle;
  accentIntensity: AccentIntensity;
  /** Neutral surface undertone. `auto` tints toward the brand hue. */
  neutralTone: NeutralTone;
  buttonStyle: ButtonStyle;
}

/**
 * Owner-facing finish overrides (2026-07-17). A template's recipe stays the
 * source of taste; the owner may override the non-structural tokens — shape,
 * density, surface treatment — without touching template structure. `null`
 * means "template default".
 */
export interface ThemeTuning {
  radius: RadiusScale | null;
  density: Density | null;
  surfaceStyle: SurfaceStyle | null;
}

export function applyThemeTuning(
  inputs: FormThemeInputs,
  tuning: Partial<ThemeTuning> | null | undefined,
): FormThemeInputs {
  if (!tuning) return inputs;
  return {
    ...inputs,
    radius: tuning.radius ?? inputs.radius,
    density: tuning.density ?? inputs.density,
    surfaceStyle: tuning.surfaceStyle ?? inputs.surfaceStyle,
  };
}

// ── Derived theme (computed, never user-set) ────────────────────────────────

export interface DerivedFormTheme {
  colorScheme: "light" | "dark";
  // Accent system
  accent: string;
  accentText: string;
  accentHover: string;
  accentActive: string;
  accentSoft: string;
  accentSoftText: string;
  focusRing: string;
  // Neutrals
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  mutedText: string;
  border: string;
  borderStrong: string;
  // Geometry & feel
  radius: number;
  radiusField: number;
  borderWidth: number;
  shadow: string;
  buttonStyle: ButtonStyle;
  // Spacing (density scale)
  spaceUnit: number;
  fieldPadY: number;
  fieldPadX: number;
  fieldGap: number;
  sectionGap: number;
  // Type
  fontFamily: string;
}

/**
 * The publish-time artifact: one derived theme per color scheme the form can
 * render in. `system` resolves both so the embed can switch on
 * `prefers-color-scheme` without any client-side derivation.
 */
export interface ResolvedThemeSnapshot {
  appearance: Appearance;
  schemes: {
    light?: DerivedFormTheme;
    dark?: DerivedFormTheme;
  };
}

// ── Scales ───────────────────────────────────────────────────────────────────

const RADIUS_PX: Record<RadiusScale, number> = {
  0: 0,
  1: 8,
  2: 14,
  3: 20,
  4: 28,
};

/** Fields cap lower than containers so high radius never makes inputs pill-shaped. */
const RADIUS_FIELD_PX: Record<RadiusScale, number> = {
  0: 0,
  1: 7,
  2: 10,
  3: 13,
  4: 16,
};

const TYPE_PAIRINGS: Record<TypePairingId, string> = {
  inherit: "inherit",
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  geist: '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  "serif-editorial": '"Fraunces", Georgia, "Times New Roman", serif',
};

interface DensitySpec {
  spaceUnit: number;
  fieldPadY: number;
  fieldPadX: number;
  fieldGap: number;
  sectionGap: number;
}

const DENSITY: Record<Density, DensitySpec> = {
  compact: { spaceUnit: 8, fieldPadY: 9, fieldPadX: 12, fieldGap: 16, sectionGap: 24 },
  cozy: { spaceUnit: 12, fieldPadY: 12, fieldPadX: 14, fieldGap: 22, sectionGap: 32 },
  spacious: { spaceUnit: 16, fieldPadY: 15, fieldPadX: 18, fieldGap: 28, sectionGap: 44 },
};

// WCAG AA thresholds.
const AA_TEXT = 4.5; // body / labels / muted text
const AA_LARGE = 3; // large or bold text — e.g. the submit-button label on the accent fill

// ── Neutral surfaces ─────────────────────────────────────────────────────────

interface Surfaces {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  mutedText: string;
  border: string;
  borderStrong: string;
}

/** Resolve the neutral undertone: hue + how strongly surfaces lean toward it. */
function neutralBasis(
  tone: NeutralTone,
  brandHue: number,
): { hue: number; cScale: number } {
  switch (tone) {
    case "pure":
      return { hue: brandHue, cScale: 0 };
    case "warm":
      return { hue: 75, cScale: 1 };
    case "cool":
      return { hue: 255, cScale: 1 };
    default:
      return { hue: brandHue, cScale: 1 };
  }
}

function lightSurfaces(hue: number, cScale: number): Surfaces {
  const c = (x: number) => x * cScale;
  return {
    // The page is a soft, brand-tinted canvas a step below the card, so an
    // elevated or bordered card visibly lifts off it instead of floating on white.
    background: oklchToHex({ l: 0.974, c: c(0.008), h: hue }),
    surface: oklchToHex({ l: 0.995, c: c(0.004), h: hue }),
    surfaceRaised: "#ffffff",
    text: oklchToHex({ l: 0.21, c: c(0.014), h: hue }),
    mutedText: oklchToHex({ l: 0.47, c: c(0.016), h: hue }),
    border: oklchToHex({ l: 0.915, c: c(0.01), h: hue }),
    borderStrong: oklchToHex({ l: 0.84, c: c(0.014), h: hue }),
  };
}

function darkSurfaces(hue: number, cScale: number): Surfaces {
  const c = (x: number) => x * cScale;
  return {
    background: oklchToHex({ l: 0.165, c: c(0.014), h: hue }),
    surface: oklchToHex({ l: 0.205, c: c(0.015), h: hue }),
    surfaceRaised: oklchToHex({ l: 0.245, c: c(0.016), h: hue }),
    text: oklchToHex({ l: 0.965, c: c(0.006), h: hue }),
    mutedText: oklchToHex({ l: 0.74, c: c(0.014), h: hue }),
    border: oklchToHex({ l: 0.305, c: c(0.014), h: hue }),
    borderStrong: oklchToHex({ l: 0.4, c: c(0.018), h: hue }),
  };
}

// ── Accent system ────────────────────────────────────────────────────────────

function applyIntensity(brandHex: string, intensity: AccentIntensity): string {
  if (intensity === "balanced") return brandHex;
  const o = hexToOklch(brandHex);
  const c = intensity === "subtle" ? o.c * 0.78 : Math.min(o.c * 1.12, 0.37);
  const l =
    intensity === "subtle" ? Math.min(o.l + 0.02, 1) : Math.max(o.l - 0.02, 0);
  return oklchToHex({ l, c, h: o.h });
}

function shiftL(hex: string, delta: number): string {
  const o = hexToOklch(hex);
  return oklchToHex({ ...o, l: Math.min(1, Math.max(0, o.l + delta)) });
}

function surfaceShadow(style: SurfaceStyle, scheme: "light" | "dark"): string {
  if (style !== "elevated") return "none";
  // A soft, multi-layer shadow reads as a single physical lift rather than a
  // hard drop — the difference between "designed" and "rounded rectangle".
  return scheme === "dark"
    ? "0 1px 2px rgba(0,0,0,.5), 0 8px 22px rgba(0,0,0,.5), 0 24px 56px rgba(0,0,0,.42)"
    : "0 1px 2px rgba(17,20,45,.05), 0 5px 14px rgba(17,20,45,.06), 0 18px 42px rgba(17,20,45,.07)";
}

// ── Resolution ───────────────────────────────────────────────────────────────

/** Resolve one concrete color scheme. `system` inputs must pick a scheme here. */
export function resolveTheme(
  inputs: FormThemeInputs,
  scheme?: "light" | "dark",
): DerivedFormTheme {
  const colorScheme =
    scheme ?? (inputs.appearance === "dark" ? "dark" : "light");
  // Sanitize at the boundary so a malformed brand color can never leak into a token.
  const brandHex = normalizeHex(inputs.brandColor);
  const brand = hexToOklch(brandHex);

  const { hue, cScale } = neutralBasis(inputs.neutralTone, brand.h);
  const base =
    colorScheme === "dark"
      ? darkSurfaces(hue, cScale)
      : lightSurfaces(hue, cScale);

  // Non-text UI contrast (WCAG 1.4.11): the accent must read as a shape
  // against the page — a white-brand button on a white page is invisible no
  // matter how readable its label is. Hue/chroma survive; lightness yields.
  const accent = ensureContrast(
    applyIntensity(brandHex, inputs.accentIntensity),
    base.background,
    AA_LARGE,
  );

  // Interactive accent states walk lightness away from the resting state, in
  // the direction that reads as "pressed" for the scheme.
  const dir = colorScheme === "dark" ? 1 : -1;
  const accentHover = shiftL(accent, dir * 0.05);
  const accentActive = shiftL(accent, dir * 0.09);
  const accentSoft =
    colorScheme === "dark"
      ? oklchToHex({ l: 0.3, c: brand.c * 0.35, h: brand.h })
      : oklchToHex({ l: 0.94, c: brand.c * 0.22, h: brand.h });

  // AA enforcement — text stays readable on its surface regardless of hue tint,
  // and labels stay readable on every accent fill regardless of brand.
  const text = ensureContrast(base.text, base.surface, AA_TEXT);
  const mutedText = ensureContrast(base.mutedText, base.surface, AA_TEXT);
  const accentText = ensureContrast(
    onColor(accent),
    accent,
    AA_LARGE,
    colorScheme === "dark" ? "lighten" : "auto",
  );
  const accentSoftText = ensureContrast(accent, accentSoft, AA_TEXT);

  const density = DENSITY[inputs.density];

  return {
    colorScheme,
    accent,
    accentText,
    accentHover,
    accentActive,
    accentSoft,
    accentSoftText,
    focusRing: withAlpha(accent, 0.35),
    background: base.background,
    surface: base.surface,
    surfaceRaised: base.surfaceRaised,
    text,
    mutedText,
    border: base.border,
    borderStrong: base.borderStrong,
    radius: RADIUS_PX[inputs.radius],
    radiusField: RADIUS_FIELD_PX[inputs.radius],
    borderWidth: inputs.surfaceStyle === "flat" ? 0 : 1,
    shadow: surfaceShadow(inputs.surfaceStyle, colorScheme),
    buttonStyle: inputs.buttonStyle,
    spaceUnit: density.spaceUnit,
    fieldPadY: density.fieldPadY,
    fieldPadX: density.fieldPadX,
    fieldGap: density.fieldGap,
    sectionGap: density.sectionGap,
    fontFamily: TYPE_PAIRINGS[inputs.typePairing],
  };
}

/**
 * Resolve every scheme the form can render in. This is what publish stamps
 * into the stored config — the embed path never derives at request time.
 */
export function resolveThemeSnapshot(
  inputs: FormThemeInputs,
): ResolvedThemeSnapshot {
  const schemes: ResolvedThemeSnapshot["schemes"] = {};
  if (inputs.appearance !== "dark") {
    schemes.light = resolveTheme(inputs, "light");
  }
  if (inputs.appearance !== "light") {
    schemes.dark = resolveTheme(inputs, "dark");
  }
  return { appearance: inputs.appearance, schemes };
}

/**
 * Map a derived theme to the `--tf-*` custom properties the v4 renderer and
 * embed CSS read. Pure string building — zero runtime cost.
 */
export function derivedThemeToCssVars(
  t: DerivedFormTheme,
): Record<string, string> {
  return {
    "--tf-accent": t.accent,
    "--tf-accent-text": t.accentText,
    "--tf-accent-hover": t.accentHover,
    "--tf-accent-active": t.accentActive,
    "--tf-accent-soft": t.accentSoft,
    "--tf-accent-soft-text": t.accentSoftText,
    "--tf-focus-ring": t.focusRing,
    "--tf-bg": t.background,
    "--tf-surface": t.surface,
    "--tf-surface-raised": t.surfaceRaised,
    "--tf-text": t.text,
    "--tf-text-muted": t.mutedText,
    "--tf-border": t.border,
    "--tf-border-strong": t.borderStrong,
    "--tf-radius": `${t.radius}px`,
    "--tf-radius-field": `${t.radiusField}px`,
    "--tf-border-width": `${t.borderWidth}px`,
    "--tf-shadow": t.shadow,
    "--tf-space": `${t.spaceUnit}px`,
    "--tf-field-pad": `${t.fieldPadY}px ${t.fieldPadX}px`,
    "--tf-field-gap": `${t.fieldGap}px`,
    "--tf-section-gap": `${t.sectionGap}px`,
    "--tf-font": t.fontFamily,
  };
}

// Canonical cross-surface names. Forms-core re-exports these under its legacy
// `FormTheme*` API; widgets import these directly.
export type BrandThemeInputs = FormThemeInputs;
export type DerivedTheme = DerivedFormTheme;
export type ResolvedBrandThemeSnapshot = ResolvedThemeSnapshot;
export const resolveBrandTheme = resolveTheme;
export const resolveBrandThemeSnapshot = resolveThemeSnapshot;
