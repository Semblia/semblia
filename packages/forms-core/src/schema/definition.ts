/**
 * The versioned form document — the single persisted contract for forms v4.
 *
 * `FormDefinitionDoc` is what the studio edits and the API stores in
 * `CollectionForm.config`. `PublishedFormDoc` is the publish-time artifact:
 * the same doc plus a derived theme snapshot, so the serving path never
 * derives or validates at request time. Write-time validation guarantees a
 * saved doc is renderable.
 */

import { z } from "zod";
import { PRESETS } from "../presets.js";
import { formStructureSchema } from "./structure.js";

export const FORM_SCHEMA_VERSION = 2 as const;

// ── Layout: pick a preset, never rearrange ───────────────────────────────────

export const LAYOUT_PRESETS = [
  "card",
  "inline",
  "split",
  "conversational",
] as const;

export type LayoutPresetId = (typeof LAYOUT_PRESETS)[number];

export const layoutSelectionSchema = z.object({
  preset: z.enum(LAYOUT_PRESETS),
});

// ── Appearance: preset seed + constrained knobs ──────────────────────────────

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const formThemeInputsSchema = z.object({
  brandColor: z.string().regex(HEX_COLOR),
  appearance: z.enum(["light", "dark", "system"]),
  radius: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  density: z.enum(["compact", "cozy", "spacious"]),
  typePairing: z.enum([
    "inherit",
    "inter",
    "geist",
    "system",
    "serif-editorial",
  ]),
  surfaceStyle: z.enum(["flat", "bordered", "elevated"]),
  accentIntensity: z.enum(["subtle", "balanced", "bold"]),
  neutralTone: z.enum(["auto", "pure", "warm", "cool"]),
  buttonStyle: z.enum(["solid", "soft", "outline"]),
});

export const themeDocSchema = z.object({
  /** The seed the inputs started from — kept for telemetry and "reset to preset". */
  preset: z.enum(Object.keys(PRESETS) as [string, ...string[]]),
  inputs: formThemeInputsSchema,
});

// ── Content: copy and small behavioral knobs (never style) ───────────────────

export const successContentSchema = z.object({
  title: z.string().max(120).default("Thank you!"),
  message: z.string().max(400).default("Your feedback has been received."),
  action: z.enum(["message", "redirect", "cta"]).default("message"),
  /** Used when action === "redirect" (the API enforces same-host/https). */
  redirectUrl: z.string().max(2000).default(""),
  ctaLabel: z.string().max(60).default(""),
  ctaUrl: z.string().max(2000).default(""),
});

export const formContentSchema = z.object({
  brandName: z.string().max(120).default(""),
  headline: z.string().max(200).default(""),
  subhead: z.string().max(400).default(""),
  submitLabel: z.string().max(60).default("Send feedback"),
  logoUrl: z.string().max(2000).nullable().default(null),
  loaderMessage: z.string().max(120).default(""),
  success: successContentSchema.default(successContentSchema.parse({})),
});

// ── The envelope ─────────────────────────────────────────────────────────────

export const formDefinitionDocSchema = z.object({
  schemaVersion: z.literal(FORM_SCHEMA_VERSION),
  structure: formStructureSchema,
  layout: layoutSelectionSchema,
  theme: themeDocSchema,
  content: formContentSchema,
});

// ── Publish-time derived snapshot ────────────────────────────────────────────

const HEX_OR_ALPHA = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const hexToken = z.string().regex(HEX_OR_ALPHA);

export const derivedFormThemeSchema = z.object({
  colorScheme: z.enum(["light", "dark"]),
  accent: hexToken,
  accentText: hexToken,
  accentHover: hexToken,
  accentActive: hexToken,
  accentSoft: hexToken,
  accentSoftText: hexToken,
  focusRing: hexToken,
  background: hexToken,
  surface: hexToken,
  surfaceRaised: hexToken,
  text: hexToken,
  mutedText: hexToken,
  border: hexToken,
  borderStrong: hexToken,
  radius: z.number().min(0),
  radiusField: z.number().min(0),
  borderWidth: z.number().min(0),
  shadow: z.string().max(300),
  buttonStyle: z.enum(["solid", "soft", "outline"]),
  spaceUnit: z.number().positive(),
  fieldPadY: z.number().positive(),
  fieldPadX: z.number().positive(),
  fieldGap: z.number().positive(),
  sectionGap: z.number().positive(),
  fontFamily: z.string().max(300),
});

export const resolvedThemeSnapshotSchema = z.object({
  appearance: z.enum(["light", "dark", "system"]),
  schemes: z.object({
    light: derivedFormThemeSchema.optional(),
    dark: derivedFormThemeSchema.optional(),
  }),
});

export const publishedFormDocSchema = formDefinitionDocSchema.extend({
  derived: resolvedThemeSnapshotSchema,
});

export type LayoutSelection = z.infer<typeof layoutSelectionSchema>;
export type ThemeDoc = z.infer<typeof themeDocSchema>;
export type SuccessContent = z.infer<typeof successContentSchema>;
export type FormContent = z.infer<typeof formContentSchema>;
export type FormDefinitionDoc = z.infer<typeof formDefinitionDocSchema>;
export type PublishedFormDoc = z.infer<typeof publishedFormDocSchema>;
