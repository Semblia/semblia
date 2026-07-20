import {
  applyThemeTuning,
  derivedThemeToCssVars,
  resolveThemeSnapshot,
} from "@workspace/brand-theme";
import type { FormBrand, FormDefinitionDoc } from "./schema/definition.js";
import type { CompiledTemplate } from "./schema/snapshot.js";
import {
  clampAppearance,
  normalizeAccents,
  resolveTemplateManifest,
} from "./templates.js";

/**
 * The template design compiler (v6). Resolves a doc's template reference into
 * the immutable `CompiledTemplate` stamped into snapshots: manifest identity,
 * normalized accents, clamped appearance, and the AA-clamped theme derived by
 * the template's own brand-theme recipe. The owner's only color input is
 * `brand.color`; every dependent visual token is derived and clamped by the
 * shared engine — a template recipe cannot opt out of contrast safety.
 */
export function compileTemplate(
  doc: Pick<FormDefinitionDoc, "templateId" | "accents"> & {
    brand: Pick<FormBrand, "color" | "appearance">;
    tuning?: FormDefinitionDoc["tuning"];
  },
): CompiledTemplate {
  const manifest = resolveTemplateManifest(doc.templateId);
  const accents = normalizeAccents(manifest, doc.accents);
  const appearance = clampAppearance(manifest, doc.brand.appearance);
  const theme = resolveThemeSnapshot(
    applyThemeTuning(
      manifest.themeInputs(doc.brand.color, appearance, accents),
      doc.tuning,
    ),
  );

  const cssVars: CompiledTemplate["cssVars"] = {};
  if (theme.schemes.light) {
    cssVars.light = derivedThemeToCssVars(theme.schemes.light);
  }
  if (theme.schemes.dark) {
    cssVars.dark = derivedThemeToCssVars(theme.schemes.dark);
  }

  return {
    templateId: manifest.id,
    templateVersion: manifest.version,
    pacing: manifest.pacing,
    appearance,
    accents,
    theme,
    cssVars,
  };
}
