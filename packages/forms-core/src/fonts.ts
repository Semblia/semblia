import type { FormTokens, FormWebFont } from "./types.js";

/**
 * Webfont resolution for the hosted form.
 *
 * Studio presets reference webfont families (Fraunces, Space Grotesk, …) that
 * exist on the designer's machine via web_v2's own font loading, but the
 * hosted page must load them itself or the form silently falls back to system
 * fonts and loses its designed personality.
 *
 * Strategy: take the first family of each token font stack and look it up in
 * a curated Google Fonts map (axis specs differ per family — static families
 * 400-error if you request weight ranges they don't have). Unknown families
 * are skipped; the rest of the stack still applies as fallback.
 */

const GOOGLE_FONT_SPECS: Record<string, string> = {
  Inter: "Inter:wght@100..900",
  Geist: "Geist:wght@100..900",
  "Geist Mono": "Geist+Mono:wght@100..900",
  "DM Sans": "DM+Sans:wght@100..1000",
  "DM Serif Display": "DM+Serif+Display",
  Fraunces: "Fraunces:wght@100..900",
  "Space Grotesk": "Space+Grotesk:wght@300..700",
  "Space Mono": "Space+Mono:wght@400;700",
  "Instrument Serif": "Instrument+Serif",
  "Instrument Sans": "Instrument+Sans:wght@400..700",
  "Playfair Display": "Playfair+Display:wght@400..900",
  Manrope: "Manrope:wght@200..800",
  Sora: "Sora:wght@100..800",
  Outfit: "Outfit:wght@100..900",
  "Plus Jakarta Sans": "Plus+Jakarta+Sans:wght@200..800",
  "IBM Plex Mono": "IBM+Plex+Mono:wght@400;500;600",
  "IBM Plex Sans": "IBM+Plex+Sans:wght@100..700",
  "JetBrains Mono": "JetBrains+Mono:wght@100..800",
  Lora: "Lora:wght@400..700",
  "Crimson Pro": "Crimson+Pro:wght@200..900",
  "Libre Baskerville": "Libre+Baskerville:wght@400;700",
  Newsreader: "Newsreader:wght@200..800",
  Karla: "Karla:wght@200..800",
  "Work Sans": "Work+Sans:wght@100..900",
  Archivo: "Archivo:wght@100..900",
  Syne: "Syne:wght@400..800",
  Unbounded: "Unbounded:wght@200..900",
};

/** First family of a CSS font stack, unquoted: `"DM Sans", system-ui` → `DM Sans`. */
export function firstFamily(stack: string): string {
  const head = stack.split(",")[0] ?? "";
  return head.trim().replace(/^["']|["']$/g, "");
}

export function resolveWebFonts(
  tokens: Pick<FormTokens, "fontHead" | "fontBody" | "fontMono">,
): FormWebFont[] {
  const families = new Map<string, FormWebFont>();
  for (const stack of [tokens.fontHead, tokens.fontBody, tokens.fontMono]) {
    const family = firstFamily(stack);
    const spec = GOOGLE_FONT_SPECS[family];
    if (spec && !families.has(family)) {
      families.set(family, { family, spec });
    }
  }
  return [...families.values()];
}

/** Stylesheet URL loading every resolved family in one request. */
export function googleFontsHref(fonts: FormWebFont[]): string | null {
  if (fonts.length === 0) return null;
  const params = fonts.map((f) => `family=${f.spec}`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
