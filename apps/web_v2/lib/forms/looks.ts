/**
 * Starting looks — curated FormDesign seeds applied at creation, so a new form
 * opens already looking like *something* instead of the same indigo default.
 *
 * The names deliberately mirror the widget style presets (Clean / Editorial /
 * Launch / Soft / Mono / Noir) so the two studios speak one visual language.
 * A look is only a starting point: every knob remains editable in the studio,
 * and the AA-clamped brand-theme engine keeps any combination legible.
 */

import type { FormDesign } from "@workspace/forms-core";

export interface FormLook {
  id: string;
  label: string;
  sub: string;
  design: Partial<FormDesign>;
}

export const FORM_LOOKS: readonly FormLook[] = [
  {
    id: "brand",
    label: "Your brand",
    sub: "Project colour, quiet chrome",
    // brandColor is filled from the project at pick time.
    design: { themeId: "brand" },
  },
  {
    id: "clean",
    label: "Clean",
    sub: "Neutral, crisp, easy to scan",
    design: {
      themeId: "clean",
      brandColor: "#0f172a",
      radius: "soft",
      buttonStyle: "filled",
      fieldStyle: "outlined",
      backgroundStyle: "plain",
      fontPairing: "inter",
    },
  },
  {
    id: "editorial",
    label: "Editorial",
    sub: "Warm serif voice",
    design: {
      themeId: "editorial",
      brandColor: "#b5441f",
      radius: "sharp",
      density: "spacious",
      buttonStyle: "soft",
      fieldStyle: "underline",
      backgroundStyle: "plain",
      fontPairing: "serifEditorial",
    },
  },
  {
    id: "launch",
    label: "Launch",
    sub: "High-signal blue, lifted",
    design: {
      themeId: "launch",
      brandColor: "#1d4ed8",
      radius: "rounded",
      buttonStyle: "filled",
      fieldStyle: "outlined",
      backgroundStyle: "gradient",
      fontPairing: "geist",
    },
  },
  {
    id: "soft",
    label: "Soft",
    sub: "Rounded, friendly, warm",
    design: {
      themeId: "soft",
      brandColor: "#f97316",
      radius: "rounded",
      density: "spacious",
      buttonStyle: "soft",
      fieldStyle: "filled",
      backgroundStyle: "plain",
      fontPairing: "inter",
    },
  },
  {
    id: "mono",
    label: "Mono",
    sub: "Minimal black on white",
    design: {
      themeId: "mono",
      brandColor: "#111111",
      radius: "sharp",
      density: "compact",
      buttonStyle: "outline",
      fieldStyle: "underline",
      backgroundStyle: "plain",
      fontPairing: "system",
    },
  },
  {
    id: "noir",
    label: "Noir",
    sub: "Dark, vivid, confident",
    design: {
      themeId: "noir",
      brandColor: "#84cc16",
      mode: "dark",
      radius: "soft",
      buttonStyle: "filled",
      backgroundStyle: "gradient",
      fontPairing: "geist",
    },
  },
];

/** Resolve a look's design patch, substituting the project brand colour. */
export function lookDesign(
  look: FormLook,
  projectBrandColor?: string | null,
): Partial<FormDesign> {
  if (look.id !== "brand") return look.design;
  return {
    ...look.design,
    brandColor: projectBrandColor ?? "#6366f1",
  };
}

/** The swatch colour a look chip shows. */
export function lookSwatchColor(
  look: FormLook,
  projectBrandColor?: string | null,
): string {
  return lookDesign(look, projectBrandColor).brandColor ?? "#6366f1";
}
