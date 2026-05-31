/**
 * Presets are remixable *seeds* for the theme engine, not locked bundles. A
 * preset supplies every `FormThemeInputs` value except `brandColor`, which the
 * customer always provides. Picking a preset is just a starting point; any input
 * can then be changed and the resolver keeps the result coherent.
 *
 * See docs/DESIGN.md §3. More presets (minimal/bold/editorial) land in a later
 * phase; the slice ships Default + Clean.
 */

import type { FormThemeInputs } from "./theme.js";

export type PresetId = "default" | "clean";
export type PresetTier = "free" | "paid";

export interface FormPreset {
  id: PresetId;
  name: string;
  tier: PresetTier;
  /** Internal note on where the look came from — never shown to end users. */
  inspiration?: string;
  seed: Omit<FormThemeInputs, "brandColor">;
}

export const PRESETS: Record<PresetId, FormPreset> = {
  default: {
    id: "default",
    name: "Default",
    tier: "free",
    inspiration: "Tresta — Quiet Precision",
    seed: {
      appearance: "light",
      radius: 2,
      density: "cozy",
      typePairing: "geist",
      surfaceStyle: "bordered",
      accentIntensity: "balanced",
    },
  },
  clean: {
    id: "clean",
    name: "Clean",
    tier: "free",
    inspiration: "Cal.com",
    seed: {
      appearance: "light",
      radius: 3,
      density: "cozy",
      typePairing: "inter",
      surfaceStyle: "elevated",
      accentIntensity: "balanced",
    },
  },
};

export const DEFAULT_PRESET_ID: PresetId = "clean";

/** Combine a preset's seed with a brand color into resolvable theme inputs. */
export function resolvePreset(
  id: PresetId,
  brandColor: string,
): FormThemeInputs {
  const preset = PRESETS[id] ?? PRESETS[DEFAULT_PRESET_ID];
  return { brandColor, ...preset.seed };
}
