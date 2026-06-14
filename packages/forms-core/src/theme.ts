/**
 * Forms-compatible facade for the shared Semblia brand-theme engine.
 *
 * Keep these names stable so forms-core consumers stay green while widgets
 * import the canonical `BrandTheme*` surface from `@workspace/brand-theme`.
 */

export {
  derivedThemeToCssVars,
  resolveBrandTheme as resolveTheme,
  resolveBrandThemeSnapshot as resolveThemeSnapshot,
} from "@workspace/brand-theme";
export type {
  AccentIntensity,
  Appearance,
  BrandThemeInputs as FormThemeInputs,
  ButtonStyle,
  Density,
  DerivedTheme as DerivedFormTheme,
  NeutralTone,
  RadiusScale,
  ResolvedBrandThemeSnapshot as ResolvedThemeSnapshot,
  SurfaceStyle,
  TypePairingId,
} from "@workspace/brand-theme";
