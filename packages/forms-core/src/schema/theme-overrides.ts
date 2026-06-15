/**
 * Forms-only "guided custom" color overrides.
 *
 * The shared brand-theme engine derives an entire AA-safe palette from one
 * brand color. Some forms want to nudge a few *base* colors directly — accent,
 * background, surface, text — without losing accessibility. This layer applies
 * those overrides on top of a derived snapshot and re-derives every dependent
 * token with the same rules the engine uses (see `resolveTheme` in
 * `@workspace/brand-theme`), then re-clamps to WCAG AA. The shared engine — and
 * therefore widgets — is untouched.
 */

import {
  ensureContrast,
  hexToOklch,
  normalizeHex,
  oklchToHex,
  onColor,
  withAlpha,
} from "../color.js";
import type { DerivedFormTheme, ResolvedThemeSnapshot } from "../theme.js";
import type { ColorOverrides } from "./definition.js";

const AA_TEXT = 4.5;
const AA_LARGE = 3;

function shiftL(hex: string, delta: number): string {
  const o = hexToOklch(hex);
  return oklchToHex({ ...o, l: Math.min(1, Math.max(0, o.l + delta)) });
}

/** Re-derive the accent system from a new accent, mirroring `resolveTheme`. */
function withAccent(t: DerivedFormTheme, accentHex: string): DerivedFormTheme {
  const accent = normalizeHex(accentHex);
  const brand = hexToOklch(accent);
  const dark = t.colorScheme === "dark";
  const dir = dark ? 1 : -1;
  const accentSoft = dark
    ? oklchToHex({ l: 0.3, c: brand.c * 0.35, h: brand.h })
    : oklchToHex({ l: 0.94, c: brand.c * 0.22, h: brand.h });
  return {
    ...t,
    accent,
    accentHover: shiftL(accent, dir * 0.05),
    accentActive: shiftL(accent, dir * 0.09),
    accentSoft,
    accentText: ensureContrast(
      onColor(accent),
      accent,
      AA_LARGE,
      dark ? "lighten" : "auto",
    ),
    accentSoftText: ensureContrast(accent, accentSoft, AA_TEXT),
    focusRing: withAlpha(accent, 0.35),
  };
}

/** Set a new surface and re-derive the tokens layered on it (raised, borders). */
function withSurface(
  t: DerivedFormTheme,
  surfaceHex: string,
): DerivedFormTheme {
  const surface = normalizeHex(surfaceHex);
  const dark = t.colorScheme === "dark";
  const borderDir = dark ? 1 : -1;
  return {
    ...t,
    surface,
    // Raised surfaces sit one step lighter than the surface in both schemes.
    surfaceRaised: shiftL(surface, 0.03),
    border: shiftL(surface, borderDir * 0.07),
    borderStrong: shiftL(surface, borderDir * 0.15),
    text: ensureContrast(t.text, surface, AA_TEXT),
    mutedText: ensureContrast(t.mutedText, surface, AA_TEXT),
  };
}

/** Set a new text color (clamped to its surface) and re-derive muted text. */
function withText(t: DerivedFormTheme, textHex: string): DerivedFormTheme {
  const dark = t.colorScheme === "dark";
  const mutedDir = dark ? -1 : 1;
  const text = ensureContrast(normalizeHex(textHex), t.surface, AA_TEXT);
  return {
    ...t,
    text,
    mutedText: ensureContrast(shiftL(text, mutedDir * 0.2), t.surface, AA_TEXT),
  };
}

export function applyColorOverridesToScheme(
  scheme: DerivedFormTheme,
  ov: ColorOverrides,
): DerivedFormTheme {
  let t = scheme;
  if (ov.background) t = { ...t, background: normalizeHex(ov.background) };
  if (ov.surface) t = withSurface(t, ov.surface);
  if (ov.accent) t = withAccent(t, ov.accent);
  if (ov.text) t = withText(t, ov.text);
  // Final safety net: text must read on its surface for any combination.
  return {
    ...t,
    text: ensureContrast(t.text, t.surface, AA_TEXT),
    mutedText: ensureContrast(t.mutedText, t.surface, AA_TEXT),
  };
}

function hasOverride(ov: ColorOverrides): boolean {
  return Boolean(ov.accent || ov.background || ov.surface || ov.text);
}

/** Apply overrides to every scheme present in the snapshot. */
export function applyColorOverrides(
  snapshot: ResolvedThemeSnapshot,
  ov: ColorOverrides,
): ResolvedThemeSnapshot {
  if (!hasOverride(ov)) return snapshot;
  const schemes: ResolvedThemeSnapshot["schemes"] = {};
  if (snapshot.schemes.light) {
    schemes.light = applyColorOverridesToScheme(snapshot.schemes.light, ov);
  }
  if (snapshot.schemes.dark) {
    schemes.dark = applyColorOverridesToScheme(snapshot.schemes.dark, ov);
  }
  return { ...snapshot, schemes };
}
