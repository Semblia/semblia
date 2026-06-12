/**
 * forms-core — the single owner of the Semblia Forms v4 contract.
 *
 * Three separated concerns (docs/plans/2026-06-11-forms-v4-parametric-theming.md):
 *   structure  — what's asked (./schema)
 *   layout     — which hand-designed preset (./schema)
 *   appearance — constrained knobs → derivation engine (./theme)
 *
 * Subpath entrypoints (`/schema`, `/theme`, `/telemetry`, `/render`) are the
 * preferred imports — they tree-shake to exactly what a consumer uses. The
 * root barrel re-exports the same v4 surface for convenience.
 */

export * from "./schema/index.js";
export {
  derivedThemeToCssVars,
  resolveTheme,
  resolveThemeSnapshot,
} from "./theme.js";
export type {
  Appearance,
  AccentIntensity,
  ButtonStyle,
  Density,
  DerivedFormTheme,
  FormThemeInputs,
  NeutralTone,
  RadiusScale,
  ResolvedThemeSnapshot,
  SurfaceStyle,
  TypePairingId,
} from "./theme.js";
export {
  DEFAULT_PRESET_ID,
  PRESETS,
  resolvePreset,
} from "./presets.js";
export type { FormPreset, PresetId, PresetTier } from "./presets.js";
export {
  FormsV4NotImplementedError,
  renderFormStubFragmentHtml,
  renderFormStubPageHtml,
  renderPublishedFormHtml,
} from "./render/index.js";
export * from "./telemetry.js";
