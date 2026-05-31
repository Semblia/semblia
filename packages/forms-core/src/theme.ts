/**
 * The theme engine: a small set of `FormThemeInputs` resolved into the full
 * `FormDesignTokens` set. Callers never set dependent tokens directly, so no
 * combination of inputs can produce an incoherent or inaccessible form —
 * `resolveTheme` derives everything and clamps to WCAG AA.
 *
 * See docs/DESIGN.md §2.
 */

import {
  ensureContrast,
  hexToOklch,
  normalizeHex,
  oklchToHex,
  onColor,
} from "./color.js";
import type { FormDesignTokens } from "./types.js";

export type Appearance = "light" | "dark" | "system";
export type RadiusScale = 0 | 1 | 2 | 3 | 4;
export type Density = "compact" | "cozy" | "spacious";
export type SurfaceStyle = "flat" | "bordered" | "elevated";
export type AccentIntensity = "subtle" | "balanced" | "bold";
export type TypePairingId = "inter" | "geist" | "system" | "serif-editorial";

export interface FormThemeInputs {
  /** The single brand identity color. Everything accent-related derives from it. */
  brandColor: string;
  appearance: Appearance;
  radius: RadiusScale;
  /** Reserved — not yet consumed by the MVP renderer (spacing scale, later phase). */
  density: Density;
  typePairing: TypePairingId;
  /** Reserved — not yet consumed by the MVP renderer (border/shadow logic, later phase). */
  surfaceStyle: SurfaceStyle;
  accentIntensity: AccentIntensity;
}

const RADIUS_PX: Record<RadiusScale, number> = { 0: 0, 1: 6, 2: 12, 3: 18, 4: 26 };

const TYPE_PAIRINGS: Record<TypePairingId, string> = {
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  geist: '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  "serif-editorial": '"Fraunces", Georgia, "Times New Roman", serif',
};

// WCAG AA thresholds.
const AA_TEXT = 4.5; // body / labels / muted text
const AA_LARGE = 3; // large or bold text — e.g. the submit-button label on the accent fill

interface Surfaces {
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
}

/** Neutral surfaces, faintly tinted toward the brand hue for cohesion. */
function lightSurfaces(hue: number): Surfaces {
  return {
    background: oklchToHex({ l: 0.985, c: 0.006, h: hue }),
    surface: oklchToHex({ l: 0.998, c: 0.003, h: hue }),
    text: oklchToHex({ l: 0.22, c: 0.01, h: hue }),
    mutedText: oklchToHex({ l: 0.5, c: 0.012, h: hue }),
    border: oklchToHex({ l: 0.9, c: 0.008, h: hue }),
  };
}

function darkSurfaces(hue: number): Surfaces {
  return {
    background: oklchToHex({ l: 0.17, c: 0.012, h: hue }),
    surface: oklchToHex({ l: 0.215, c: 0.012, h: hue }),
    text: oklchToHex({ l: 0.96, c: 0.006, h: hue }),
    mutedText: oklchToHex({ l: 0.72, c: 0.012, h: hue }),
    border: oklchToHex({ l: 0.32, c: 0.012, h: hue }),
  };
}

function applyIntensity(brandHex: string, intensity: AccentIntensity): string {
  if (intensity === "balanced") return brandHex;
  const o = hexToOklch(brandHex);
  const c = intensity === "subtle" ? o.c * 0.78 : Math.min(o.c * 1.12, 0.37);
  const l =
    intensity === "subtle" ? Math.min(o.l + 0.02, 1) : Math.max(o.l - 0.02, 0);
  return oklchToHex({ l, c, h: o.h });
}

export function resolveTheme(inputs: FormThemeInputs): FormDesignTokens {
  const appearance = inputs.appearance === "system" ? "light" : inputs.appearance;
  // Sanitize at the boundary so a malformed brand color can never leak into a token.
  const brandHex = normalizeHex(inputs.brandColor);
  const brand = hexToOklch(brandHex);
  const accent = applyIntensity(brandHex, inputs.accentIntensity);

  const base =
    appearance === "dark" ? darkSurfaces(brand.h) : lightSurfaces(brand.h);

  // AA enforcement — text stays readable on its surface regardless of hue tint,
  // and the button label stays readable on the accent fill regardless of brand.
  const text = ensureContrast(base.text, base.surface, AA_TEXT);
  const mutedText = ensureContrast(base.mutedText, base.surface, AA_TEXT);
  const accentText = ensureContrast(
    onColor(accent),
    accent,
    AA_LARGE,
    appearance === "dark" ? "lighten" : "auto",
  );

  return {
    accent,
    accentText,
    background: base.background,
    surface: base.surface,
    text,
    mutedText,
    border: base.border,
    radius: RADIUS_PX[inputs.radius],
    fontFamily: TYPE_PAIRINGS[inputs.typePairing],
  };
}
