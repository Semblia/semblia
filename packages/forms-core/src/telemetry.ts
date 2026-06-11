/**
 * Theme-interaction telemetry — the validation plan for the parametric bet.
 *
 * The freeform builder was dropped, not disproven. These events measure which
 * knobs users actually touch, where they stop customizing, and where they
 * reset — the evidence that either confirms the constraint is the product or
 * justifies a deeper builder tier (and tells us which granularity it needs).
 *
 * Event *types* live here so studio, API, and analysis agree on one contract;
 * capture is an authenticated project-scoped API endpoint.
 */

import { z } from "zod";

export const THEME_TELEMETRY_EVENT_TYPES = [
  "forms_theme.knob_changed",
  "forms_theme.preset_selected",
  "forms_theme.reset_to_preset",
  "forms_theme.published",
] as const;

export type ThemeTelemetryEventType =
  (typeof THEME_TELEMETRY_EVENT_TYPES)[number];

/** Every adjustable surface we want divergence data on. */
export const THEME_KNOBS = [
  "brandColor",
  "appearance",
  "radius",
  "density",
  "typePairing",
  "surfaceStyle",
  "accentIntensity",
  "neutralTone",
  "buttonStyle",
  "layoutPreset",
] as const;

export type ThemeKnob = (typeof THEME_KNOBS)[number];

const knobValue = z.union([z.string().max(64), z.number()]);

export const themeKnobChangedSchema = z.object({
  type: z.literal("forms_theme.knob_changed"),
  formId: z.string().min(1).max(64),
  presetId: z.string().min(1).max(64),
  knob: z.enum(THEME_KNOBS),
  from: knobValue,
  to: knobValue,
});

export const themePresetSelectedSchema = z.object({
  type: z.literal("forms_theme.preset_selected"),
  formId: z.string().min(1).max(64),
  presetId: z.string().min(1).max(64),
  previousPresetId: z.string().max(64).nullable(),
});

export const themeResetToPresetSchema = z.object({
  type: z.literal("forms_theme.reset_to_preset"),
  formId: z.string().min(1).max(64),
  presetId: z.string().min(1).max(64),
  /** How many knobs the user walked away from — high counts = friction signal. */
  changedKnobCount: z.number().int().min(0).max(THEME_KNOBS.length),
});

export const themePublishedSchema = z.object({
  type: z.literal("forms_theme.published"),
  formId: z.string().min(1).max(64),
  presetId: z.string().min(1).max(64),
  /** Knobs that differ from the preset seed at publish — the headline metric. */
  knobsDiverged: z.array(z.enum(THEME_KNOBS)).max(THEME_KNOBS.length),
});

export const themeTelemetryEventSchema = z.discriminatedUnion("type", [
  themeKnobChangedSchema,
  themePresetSelectedSchema,
  themeResetToPresetSchema,
  themePublishedSchema,
]);

/** Capture endpoint body: small client-side batches, hard-capped. */
export const themeTelemetryBatchSchema = z.object({
  events: z.array(themeTelemetryEventSchema).min(1).max(50),
});

export type ThemeTelemetryEvent = z.infer<typeof themeTelemetryEventSchema>;
export type ThemeTelemetryBatch = z.infer<typeof themeTelemetryBatchSchema>;
