import type { BrandThemeInputs } from "@workspace/brand-theme";

/**
 * Widget template registry (template system rebuild 2026-07-13, decision doc
 * `docs/ui-rework/2026-07-13-forms-widgets-template-rebuild/decision.md`).
 *
 * A widget template is a self-contained display design — composition, card
 * personality, and theme recipe — mirroring the forms template contract.
 * Owners pick a template, answer its finite accent decisions, and contribute
 * brand facts; the raw brand-theme knobs are no longer an owner surface.
 */

export interface WidgetAccentOption {
  value: string;
  label: string;
}

export interface WidgetAccentSpec {
  key: string;
  label: string;
  options: readonly WidgetAccentOption[];
  defaultValue: string;
}

export interface WidgetTemplateManifest {
  id: string;
  version: number;
  name: string;
  tagline: string;
  accents: readonly WidgetAccentSpec[];
  themeInputs: (
    brandColor: string,
    appearance: BrandThemeInputs["appearance"],
    accents: Record<string, string>,
  ) => BrandThemeInputs;
}

/** The accent-independent half of a recipe: every token except brand facts. */
type ThemeRecipeTokens = Omit<BrandThemeInputs, "brandColor" | "appearance">;

/**
 * Build a manifest's `themeInputs` from a data recipe: the template's base
 * tokens plus per-accent-value overrides (`overrides[accentKey][accentValue]`).
 * Accent values without an override keep the base token.
 */
function themeRecipe(
  base: ThemeRecipeTokens,
  overrides?: Record<string, Record<string, Partial<ThemeRecipeTokens>>>,
): WidgetTemplateManifest["themeInputs"] {
  return (brandColor, appearance, accents) => {
    const tokens = { ...base };
    for (const [accentKey, byValue] of Object.entries(overrides ?? {})) {
      const override = byValue[accents[accentKey] ?? ""];
      if (override) Object.assign(tokens, override);
    }
    return { brandColor, appearance, ...tokens };
  };
}

/** Marquee — a cinematic rail; testimonials take the stage one beat at a time. */
const marquee: WidgetTemplateManifest = {
  id: "marquee",
  version: 1,
  name: "Marquee",
  tagline: "A cinematic rail — one story at a time.",
  accents: [
    {
      key: "mode",
      label: "Mode",
      options: [
        { value: "cards", label: "Cards" },
        { value: "spotlight", label: "Spotlight" },
      ],
      defaultValue: "cards",
    },
  ],
  themeInputs: themeRecipe({
    radius: 3,
    density: "cozy",
    typePairing: "inherit",
    surfaceStyle: "elevated",
    accentIntensity: "balanced",
    neutralTone: "auto",
    buttonStyle: "solid",
  }),
};

/** Gallery — a crisp, even grid of proof. */
const gallery: WidgetTemplateManifest = {
  id: "gallery",
  version: 1,
  name: "Gallery",
  tagline: "A crisp grid of proof.",
  accents: [
    {
      key: "lead",
      label: "Lead story",
      options: [
        { value: "uniform", label: "Uniform" },
        { value: "featured", label: "Featured" },
      ],
      defaultValue: "uniform",
    },
  ],
  themeInputs: themeRecipe({
    radius: 2,
    density: "cozy",
    typePairing: "inherit",
    surfaceStyle: "bordered",
    accentIntensity: "balanced",
    neutralTone: "auto",
    buttonStyle: "solid",
  }),
};

/** Mosaic — a dense masonry wall for volume. */
const mosaic: WidgetTemplateManifest = {
  id: "mosaic",
  version: 1,
  name: "Mosaic",
  tagline: "Volume as design — a living wall of voices.",
  accents: [
    {
      key: "weave",
      label: "Weave",
      options: [
        { value: "airy", label: "Airy" },
        { value: "dense", label: "Dense" },
      ],
      defaultValue: "airy",
    },
  ],
  themeInputs: themeRecipe(
    {
      radius: 2,
      density: "cozy",
      typePairing: "inherit",
      surfaceStyle: "bordered",
      accentIntensity: "subtle",
      neutralTone: "auto",
      buttonStyle: "solid",
    },
    {
      weave: { dense: { density: "compact" } },
    },
  ),
};

/** Column — a magazine praise column: hanging quotes, signatures, hairlines. */
const column: WidgetTemplateManifest = {
  id: "column",
  version: 2,
  name: "Column",
  tagline: "A praise column — quotes read like an article.",
  accents: [
    {
      key: "flourish",
      label: "Flourish",
      options: [
        { value: "marks", label: "Quotation marks" },
        { value: "plain", label: "Plain" },
      ],
      defaultValue: "marks",
    },
  ],
  themeInputs: themeRecipe({
    radius: 1,
    density: "spacious",
    typePairing: "serif-editorial",
    surfaceStyle: "flat",
    accentIntensity: "subtle",
    neutralTone: "warm",
    buttonStyle: "solid",
  }),
};

/** Editorial — the front page: one lead story, a deck of supporting voices. */
const editorial: WidgetTemplateManifest = {
  id: "editorial",
  version: 2,
  name: "Editorial",
  tagline: "A front page for your best story.",
  accents: [
    {
      key: "edition",
      label: "Edition",
      options: [
        { value: "modern", label: "Modern" },
        { value: "classic", label: "Classic serif" },
      ],
      defaultValue: "modern",
    },
  ],
  themeInputs: themeRecipe(
    {
      radius: 2,
      density: "spacious",
      typePairing: "inherit",
      surfaceStyle: "flat",
      accentIntensity: "subtle",
      neutralTone: "auto",
      buttonStyle: "solid",
    },
    {
      edition: { classic: { typePairing: "serif-editorial", neutralTone: "warm" } },
    },
  ),
};

export const WIDGET_TEMPLATES: readonly WidgetTemplateManifest[] = [
  marquee,
  gallery,
  mosaic,
  column,
  editorial,
];

const BY_ID = new Map(WIDGET_TEMPLATES.map((t) => [t.id, t]));

export const DEFAULT_WIDGET_TEMPLATE_ID = marquee.id;
export const DEFAULT_WALL_TEMPLATE_ID = editorial.id;

/** Unknown ids fall back to Marquee — roster changes can never brick a widget. */
export function resolveWidgetTemplateManifest(
  templateId: string | null | undefined,
): WidgetTemplateManifest {
  return (templateId && BY_ID.get(templateId)) || marquee;
}

export function normalizeWidgetAccents(
  manifest: WidgetTemplateManifest,
  raw: Record<string, string> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of manifest.accents) {
    const candidate = raw?.[spec.key];
    out[spec.key] =
      candidate && spec.options.some((o) => o.value === candidate)
        ? candidate
        : spec.defaultValue;
  }
  return out;
}
