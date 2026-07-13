import { describe, expect, it } from "vitest";
import { contrastRatio } from "@workspace/brand-theme";
import { compileTemplate } from "./design.js";
import { FORM_TEMPLATES } from "./templates.js";

/**
 * The accessibility gate (rebuild principle P9): every template × a hostile
 * spread of brand colors must produce AA-passing derived tokens. Owners can
 * pick any brand color; templates must never let it break readability.
 */

const HOSTILE_BRAND_COLORS = [
  "#000000", // pure black
  "#ffffff", // pure white
  "#f5c518", // IMDb yellow — classic low-contrast accent
  "#4338ca", // indigo
  "#e11d48", // saturated red
  "#00ff88", // neon green
  "#7f7f7f", // dead mid-gray
];

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

describe("template contrast gate (AA)", () => {
  for (const manifest of FORM_TEMPLATES) {
    for (const brandColor of HOSTILE_BRAND_COLORS) {
      it(`${manifest.id} stays AA with brand ${brandColor}`, () => {
        const compiled = compileTemplate({
          templateId: manifest.id,
          accents: {},
          brand: { color: brandColor, appearance: "system" },
        });
        const schemes = Object.values(compiled.theme.schemes);
        expect(schemes.length).toBeGreaterThan(0);
        for (const scheme of schemes) {
          if (!scheme) continue;
          expect(
            contrastRatio(scheme.text, scheme.background),
            `text on background (${manifest.id}, ${brandColor}, ${scheme.colorScheme})`,
          ).toBeGreaterThanOrEqual(AA_BODY);
          expect(
            contrastRatio(scheme.text, scheme.surface),
            `text on surface (${manifest.id}, ${brandColor}, ${scheme.colorScheme})`,
          ).toBeGreaterThanOrEqual(AA_BODY);
          expect(
            contrastRatio(scheme.mutedText, scheme.surface),
            `muted text on surface (${manifest.id}, ${brandColor}, ${scheme.colorScheme})`,
          ).toBeGreaterThanOrEqual(AA_BODY);
          expect(
            contrastRatio(scheme.accentText, scheme.accent),
            `accent text on accent (${manifest.id}, ${brandColor}, ${scheme.colorScheme})`,
          ).toBeGreaterThanOrEqual(AA_BODY);
          expect(
            contrastRatio(scheme.accentSoftText, scheme.accentSoft),
            `soft accent text (${manifest.id}, ${brandColor}, ${scheme.colorScheme})`,
          ).toBeGreaterThanOrEqual(AA_BODY);
          expect(
            contrastRatio(scheme.accent, scheme.background),
            `accent as large-UI on background (${manifest.id}, ${brandColor}, ${scheme.colorScheme})`,
          ).toBeGreaterThanOrEqual(AA_LARGE);
        }
      });
    }
  }
});
