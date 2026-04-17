import type { FormConfig } from "./types";

export interface FormPreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
  branding: Omit<FormConfig["branding"], "logoUrl">;
}

/**
 * Check whether a config's branding (excluding logoUrl) matches a known preset.
 * Returns the preset id or `null` if customized.
 */
export function detectActivePreset(config: FormConfig): string | null {
  for (const preset of FORM_PRESETS) {
    const match = (Object.keys(preset.branding) as Array<keyof typeof preset.branding>).every(
      (k) => {
        const pv = preset.branding[k];
        const cv = config.branding[k];
        if (typeof pv === "object" && pv !== null) {
          return JSON.stringify(pv) === JSON.stringify(cv);
        }
        return pv === cv;
      }
    );
    if (match) return preset.id;
  }
  return null;
}

/**
 * Apply a preset to a config. Replaces all branding properties except `logoUrl`
 * (which is the user's own brand asset and should survive preset changes).
 */
export function applyPreset(
  current: FormConfig,
  presetId: string
): FormConfig {
  const preset = FORM_PRESETS.find((p) => p.id === presetId);
  if (!preset) return current;
  return {
    ...current,
    branding: {
      ...preset.branding,
      logoUrl: current.branding.logoUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const FORM_PRESETS: FormPreset[] = [
  // -----------------------------------------------------------------------
  // 1. Tresta — Warm Editorial
  //    Based on Tresta's own design system (oklch warm palette)
  // -----------------------------------------------------------------------
  {
    id: "tresta",
    name: "Tresta",
    description: "Warm & editorial — our signature look",
    tags: ["warm", "professional", "default"],
    branding: {
      colors: {
        primary: "#C4956A",
        background: "#FDFCFA",
        foreground: "#1C1917",
        accent: "#F5F1EB",
      },
      fontFamily: "inter",
      cornerRadius: "rounded",
      mode: "light",
      inputStyle: "outlined",
      buttonStyle: "solid",
      shadow: "subtle",
      density: "default",
      headerAlignment: "left",
      headingWeight: "semibold",
    },
  },

  // -----------------------------------------------------------------------
  // 2. Monochrome — Dark Precision
  //    Inspired by Linear.app's design system
  // -----------------------------------------------------------------------
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Dark & precise — for modern SaaS",
    tags: ["dark", "minimal", "tech"],
    branding: {
      colors: {
        primary: "#5E5CE6",
        background: "#15131D",
        foreground: "#EDEDEF",
        accent: "#1E1C28",
      },
      fontFamily: "mono",
      cornerRadius: "subtle",
      mode: "dark",
      inputStyle: "filled",
      buttonStyle: "solid",
      shadow: "none",
      density: "compact",
      headerAlignment: "left",
      headingWeight: "normal",
    },
  },

  // -----------------------------------------------------------------------
  // 3. Elevated — Premium Trust
  //    Inspired by Stripe Checkout's design system
  // -----------------------------------------------------------------------
  {
    id: "elevated",
    name: "Elevated",
    description: "Polished & premium — inspires trust",
    tags: ["clean", "enterprise", "professional"],
    branding: {
      colors: {
        primary: "#635BFF",
        background: "#FFFFFF",
        foreground: "#30313D",
        accent: "#F6F8FA",
      },
      fontFamily: "system",
      cornerRadius: "rounded",
      mode: "light",
      inputStyle: "outlined",
      buttonStyle: "solid",
      shadow: "medium",
      density: "default",
      headerAlignment: "center",
      headingWeight: "semibold",
    },
  },

  // -----------------------------------------------------------------------
  // 4. Organic — Warm & Human
  //    Inspired by Notion.so's design system
  // -----------------------------------------------------------------------
  {
    id: "organic",
    name: "Organic",
    description: "Warm & human — content-first feel",
    tags: ["friendly", "creative", "approachable"],
    branding: {
      colors: {
        primary: "#EB5757",
        background: "#FFFFFF",
        foreground: "#37352F",
        accent: "#F7F6F3",
      },
      fontFamily: "serif",
      cornerRadius: "subtle",
      mode: "light",
      inputStyle: "minimal",
      buttonStyle: "soft",
      shadow: "none",
      density: "spacious",
      headerAlignment: "center",
      headingWeight: "bold",
    },
  },
];
