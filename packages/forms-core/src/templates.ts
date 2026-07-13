import type { Appearance, FormThemeInputs } from "@workspace/brand-theme";
import type { FormIntent } from "./schema/definition.js";

/**
 * The template registry (rebuild 2026-07-13, decision doc
 * `docs/ui-rework/2026-07-13-forms-widgets-template-rebuild/decision.md`).
 *
 * A template is a self-contained design project. This module owns the pure
 * *contract* half of a template pack — identity, niche fit, pacing, the
 * finite accent decisions it exposes, and its brand-theme recipe — so the
 * snapshot compiler (API), the studio, and the runtime agree without any of
 * them importing render code. The visual half (composition, stylesheet,
 * motion, loader) lives beside the renderer in `@workspace/forms-renderer`,
 * keyed by the same id.
 *
 * Owners choose a template and answer its accent decisions; they never touch
 * raw design knobs. Every option below is art-directed and safe: brand color
 * still enters exclusively through the AA-clamping brand-theme engine.
 */

export interface TemplateAccentOption {
  value: string;
  label: string;
}

/** One named, finite accent decision a template exposes (≤3 per template). */
export interface TemplateAccentSpec {
  key: string;
  label: string;
  options: readonly TemplateAccentOption[];
  defaultValue: string;
}

/**
 * How the template paces the respondent (principle P6 — layout is a function
 * of the ask, never an owner knob):
 * - "calm"   — one quiet surface, however many asks.
 * - "staged" — one thing at a time with an honest progress contract.
 * - "auto"   — calm up to AUTO_PACING_THRESHOLD visible asks, staged beyond.
 */
export type TemplatePacing = "calm" | "staged" | "auto";

export const AUTO_PACING_THRESHOLD = 4;

export type TemplateAssetSlot = "logo" | "hero";

export interface FormTemplateManifest {
  id: string;
  /** Bumped when the pack's composition/contract changes meaningfully. */
  version: number;
  name: string;
  tagline: string;
  /** The feedback rituals this template is designed for. */
  niches: readonly FormIntent[];
  pacing: TemplatePacing;
  accents: readonly TemplateAccentSpec[];
  /** Owner-suppliable imagery slots beyond words + brand facts. */
  assetSlots: readonly TemplateAssetSlot[];
  /** Appearances the template supports; `brand.appearance` clamps into this. */
  appearances: readonly Appearance[];
  /** The template's brand-theme recipe. Accents arrive already normalized. */
  themeInputs: (
    brandColor: string,
    appearance: Appearance,
    accents: Record<string, string>,
  ) => FormThemeInputs;
}

// ── The launch roster ─────────────────────────────────────────────────────────

/** Meridian — the quiet universal default. At home with any brand. */
const meridian: FormTemplateManifest = {
  id: "meridian",
  version: 1,
  name: "Meridian",
  tagline: "Quiet, precise, at home with any brand.",
  niches: ["CUSTOM"],
  pacing: "auto",
  accents: [
    {
      key: "tone",
      label: "Surface tone",
      options: [
        { value: "paper", label: "Paper" },
        { value: "mist", label: "Mist" },
        { value: "slate", label: "Slate" },
      ],
      defaultValue: "paper",
    },
    {
      key: "emphasis",
      label: "Brand emphasis",
      options: [
        { value: "quiet", label: "Quiet" },
        { value: "confident", label: "Confident" },
      ],
      defaultValue: "confident",
    },
  ],
  assetSlots: ["logo"],
  appearances: ["light", "dark", "system"],
  themeInputs: (brandColor, appearance, accents) => ({
    brandColor,
    appearance,
    radius: 2,
    density: "cozy",
    typePairing: "inter",
    surfaceStyle: "elevated",
    accentIntensity: accents.emphasis === "quiet" ? "subtle" : "balanced",
    neutralTone:
      accents.tone === "mist" ? "cool" : accents.tone === "slate" ? "pure" : "warm",
    buttonStyle: "solid",
  }),
};

/** Aperture — a dark stage built for video praise. */
const aperture: FormTemplateManifest = {
  id: "aperture",
  version: 1,
  name: "Aperture",
  tagline: "A stage for video testimonials — one prompt at a time.",
  niches: ["TESTIMONIAL"],
  pacing: "staged",
  accents: [
    {
      key: "stage",
      label: "Stage",
      options: [
        { value: "noir", label: "Noir" },
        { value: "dusk", label: "Dusk" },
        { value: "ember", label: "Ember" },
      ],
      defaultValue: "dusk",
    },
  ],
  assetSlots: ["logo"],
  appearances: ["dark"],
  themeInputs: (brandColor, appearance, accents) => ({
    brandColor,
    appearance,
    radius: 3,
    density: "spacious",
    typePairing: "geist",
    surfaceStyle: "flat",
    accentIntensity: "bold",
    neutralTone:
      accents.stage === "noir" ? "pure" : accents.stage === "ember" ? "warm" : "cool",
    buttonStyle: "solid",
  }),
};

/** Ledger — an editorial letter for written customer stories. */
const ledger: FormTemplateManifest = {
  id: "ledger",
  version: 1,
  name: "Ledger",
  tagline: "An editorial letter — stories written, not filled in.",
  niches: ["CUSTOMER_STORY"],
  pacing: "staged",
  accents: [
    {
      key: "paper",
      label: "Paper",
      options: [
        { value: "cream", label: "Cream" },
        { value: "crisp", label: "Crisp white" },
      ],
      defaultValue: "cream",
    },
    {
      key: "voice",
      label: "Ink voice",
      options: [
        { value: "ink", label: "Ink" },
        { value: "brand", label: "Brand" },
      ],
      defaultValue: "ink",
    },
  ],
  assetSlots: ["logo"],
  appearances: ["light"],
  themeInputs: (brandColor, appearance, accents) => ({
    brandColor,
    appearance,
    radius: 1,
    density: "spacious",
    typePairing: "serif-editorial",
    surfaceStyle: "flat",
    accentIntensity: accents.voice === "brand" ? "balanced" : "subtle",
    neutralTone: accents.paper === "crisp" ? "pure" : "warm",
    buttonStyle: "solid",
  }),
};

/** Parcel — post-purchase show-and-tell for commerce. */
const parcel: FormTemplateManifest = {
  id: "parcel",
  version: 1,
  name: "Parcel",
  tagline: "Star-first post-purchase reviews, made for show-and-tell.",
  niches: ["REVIEW"],
  pacing: "calm",
  accents: [
    {
      key: "mood",
      label: "Mood",
      options: [
        { value: "warm", label: "Warm" },
        { value: "fresh", label: "Fresh" },
      ],
      defaultValue: "warm",
    },
    {
      key: "frame",
      label: "Frame",
      options: [
        { value: "soft", label: "Soft" },
        { value: "crisp", label: "Crisp" },
      ],
      defaultValue: "soft",
    },
  ],
  assetSlots: ["logo", "hero"],
  appearances: ["light", "dark", "system"],
  themeInputs: (brandColor, appearance, accents) => ({
    brandColor,
    appearance,
    radius: accents.frame === "crisp" ? 1 : 3,
    density: "cozy",
    typePairing: "inter",
    surfaceStyle: "elevated",
    accentIntensity: "balanced",
    neutralTone: accents.mood === "fresh" ? "cool" : "warm",
    buttonStyle: "solid",
  }),
};

/** Terminal — a precise instrument for developer-tool feedback. */
const terminal: FormTemplateManifest = {
  id: "terminal",
  version: 1,
  name: "Terminal",
  tagline: "Keyboard-first product feedback for technical audiences.",
  niches: ["PRODUCT_FEEDBACK"],
  pacing: "staged",
  accents: [
    {
      key: "grid",
      label: "Grid paper",
      options: [
        { value: "on", label: "On" },
        { value: "off", label: "Off" },
      ],
      defaultValue: "on",
    },
    {
      key: "density",
      label: "Density",
      options: [
        { value: "tight", label: "Tight" },
        { value: "relaxed", label: "Relaxed" },
      ],
      defaultValue: "tight",
    },
  ],
  assetSlots: ["logo"],
  appearances: ["light", "dark", "system"],
  themeInputs: (brandColor, appearance, accents) => ({
    brandColor,
    appearance,
    radius: 1,
    density: accents.density === "relaxed" ? "cozy" : "compact",
    typePairing: "geist",
    surfaceStyle: "bordered",
    accentIntensity: "balanced",
    neutralTone: "pure",
    buttonStyle: "outline",
  }),
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const FORM_TEMPLATES: readonly FormTemplateManifest[] = [
  meridian,
  aperture,
  ledger,
  parcel,
  terminal,
];

const BY_ID = new Map(FORM_TEMPLATES.map((t) => [t.id, t]));

export const DEFAULT_TEMPLATE_ID = meridian.id;

/**
 * Resolve a manifest, falling back to Meridian for unknown ids so roster
 * changes can never brick a stored doc.
 */
export function resolveTemplateManifest(
  templateId: string | null | undefined,
): FormTemplateManifest {
  return (templateId && BY_ID.get(templateId)) || meridian;
}

/** The designed default template for an intent (first roster niche match). */
export function defaultTemplateForIntent(intent: FormIntent): string {
  return (
    FORM_TEMPLATES.find((t) => t.niches.includes(intent))?.id ??
    DEFAULT_TEMPLATE_ID
  );
}

/**
 * Normalize stored accent picks against the manifest's spec: unknown keys are
 * dropped, unknown/missing values fall back to the accent's default. Stored
 * docs stay forward-compatible with roster updates.
 */
export function normalizeAccents(
  manifest: FormTemplateManifest,
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

/** Clamp the owner's appearance preference into what the template supports. */
export function clampAppearance(
  manifest: FormTemplateManifest,
  requested: Appearance,
): Appearance {
  if (manifest.appearances.includes(requested)) return requested;
  return manifest.appearances[0] ?? "light";
}
