import { z } from "zod";
import { SCHEMA_VERSION } from "../version.js";
import { formFieldSchema } from "./fields.js";

const httpUrl = z
  .string()
  .refine((s) => /^https?:\/\//i.test(s), "must be an http(s) URL");

/**
 * Form intent (spec §4). Mirrors the DB `FormIntent` enum so `Form.intent` and
 * the doc's intent stay in lockstep. Each intent seeds different default
 * fields, copy, consent behavior, and a designed default template.
 */
export const formIntentSchema = z.enum([
  "TESTIMONIAL",
  "REVIEW",
  "PRODUCT_FEEDBACK",
  "CUSTOMER_STORY",
  "CUSTOM",
]);
export type FormIntent = z.infer<typeof formIntentSchema>;

/**
 * Where the form lives (2026-07-17 product split). A hosted form owns a full
 * page at `/f/:slug` with the template's full capability set. An embedded form
 * is a genuinely smaller product — a constrained field palette
 * (`EMBED_CAPABLE_TYPES`), a field cap (`EMBED_MAX_FIELDS`), and the
 * template's embed composition — served only via `/embed/:slug`. Not a
 * cropped hosted form; the two routes reject each other's delivery.
 */
export const formDeliverySchema = z.enum(["hosted", "embed"]);
export type FormDelivery = z.infer<typeof formDeliverySchema>;

// ── Conditional flow ──────────────────────────────────────────────────────────

export const conditionOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "contains",
  "notContains",
]);
export type ConditionOperator = z.infer<typeof conditionOperatorSchema>;

export const conditionSchema = z.object({
  fieldId: z.string().min(1),
  operator: conditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean()]),
});
export type Condition = z.infer<typeof conditionSchema>;

/** Show/hide `targetFieldId` when the conditions match (AND/OR via `match`). */
export const conditionalRuleSchema = z.object({
  targetFieldId: z.string().min(1),
  action: z.enum(["show", "hide"]).default("show"),
  match: z.enum(["all", "any"]).default("all"),
  conditions: z.array(conditionSchema).min(1),
});
export type ConditionalRule = z.infer<typeof conditionalRuleSchema>;

/**
 * Flow is conditional logic only (v6). Pacing (single surface vs staged),
 * progress indication, and consent placement are template decisions — layout
 * is a function of the ask, never an owner knob (rebuild principle P6).
 */
export const flowSchema = z.object({
  conditionalRules: z.array(conditionalRuleSchema).default([]),
});
export type FormFlow = z.infer<typeof flowSchema>;

// ── Brand facts (v6) ──────────────────────────────────────────────────────────
//
// The owner contributes brand *facts*; the template supplies all taste. The
// brand color still enters exclusively through the AA-clamping
// @workspace/brand-theme engine via the template's recipe (templates.ts).

export const appearanceSchema = z.enum(["light", "dark", "system"]);
export type FormAppearance = z.infer<typeof appearanceSchema>;

/**
 * Owner finish overrides (2026-07-17): non-structural token control on top of
 * the template recipe. `null` = template default. These feed the same
 * AA-clamped brand-theme engine — no override can break contrast.
 */
export const radiusScaleSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export const tuningSchema = z
  .object({
    radius: radiusScaleSchema.nullable().default(null),
    density: z.enum(["compact", "cozy", "spacious"]).nullable().default(null),
    surfaceStyle: z
      .enum(["flat", "bordered", "elevated"])
      .nullable()
      .default(null),
  })
  .prefault({});
export type FormTuning = z.infer<typeof tuningSchema>;

export const brandSchema = z.object({
  color: z.string().default("#4338ca"),
  /** The business name — templates use it in copy and attribution moments. */
  name: z.string().default(""),
  appearance: appearanceSchema.default("system"),
  logoAssetId: z.string().nullable().default(null),
  logoUrl: z.string().nullable().default(null),
});
export type FormBrand = z.infer<typeof brandSchema>;

/**
 * Template-declared imagery slots (only slots the manifest declares are
 * honored at compile time; others normalize away).
 */
export const docAssetsSchema = z.object({
  heroImageAssetId: z.string().nullable().default(null),
  heroImageUrl: z.string().nullable().default(null),
});
export type FormDocAssets = z.infer<typeof docAssetsSchema>;

// ── Content ───────────────────────────────────────────────────────────────────

export const contentSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  introText: z.string().default(""),
  submitButtonText: z.string().default("Submit"),
  successMessage: z.string().default("Thanks for your response!"),
  successAction: z.enum(["message", "redirect"]).default("message"),
  redirectUrl: httpUrl.nullable().default(null),
  closedMessage: z
    .string()
    .default("This form is no longer accepting responses."),
});
export type FormContent = z.infer<typeof contentSchema>;

// ── Settings (trust/protection spine — unchanged by the rebuild) ─────────────

export const captchaModeSchema = z.enum(["off", "suspicious", "always"]);
export type CaptchaMode = z.infer<typeof captchaModeSchema>;

export const settingsSchema = z.object({
  attribution: z.boolean().default(true),
  allowAnonymous: z.boolean().default(true),
  requireConsent: z.boolean().default(false),
  // Protection is platform-owned (no studio UI since 2026-07-17); the
  // platform default leans protective.
  captchaMode: captchaModeSchema.default("suspicious"),
  uploadsAllowed: z.boolean().default(true),
  embedAllowed: z.boolean().default(true),
  allowedOrigins: z.array(z.string()).default([]),
  /** Minimum completion time (ms) before a submission is accepted — anti-bot. */
  minCompletionMs: z.number().int().nonnegative().default(2000),
  honeypot: z.boolean().default(true),
  blockedWords: z.array(z.string()).default([]),
});
export type FormSettings = z.infer<typeof settingsSchema>;

/**
 * The editable source object. `Form.draft` stores exactly this. Versioned by
 * `schemaVersion`; `migrateFormDoc` projects older docs forward.
 *
 * v6 (template system rebuild): `layoutPreset` and the 9-knob `design` object
 * are gone. The owner picks a `templateId` (the big knob), supplies `brand`
 * facts, answers the template's finite `accents`, and fills declared `assets`
 * slots. Everything visual beyond that belongs to the template pack.
 */
export const formDefinitionDocSchema = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  intent: formIntentSchema.default("CUSTOM"),
  delivery: formDeliverySchema.default("hosted"),
  templateId: z.string().default("meridian"),
  fields: z.array(formFieldSchema).default([]),
  // `.prefault` (not `.default`) so an empty/partial object is fed *through*
  // parsing and each nested schema applies its own field defaults. In Zod v4
  // `.default(value)` short-circuits parsing and requires the full output shape.
  flow: flowSchema.prefault({}),
  brand: brandSchema.prefault({}),
  /** Per-template accent picks; normalized against the manifest at compile. */
  accents: z.record(z.string(), z.string()).default({}),
  tuning: tuningSchema,
  assets: docAssetsSchema.prefault({}),
  content: contentSchema.prefault({}),
  settings: settingsSchema.prefault({}),
});
export type FormDefinitionDoc = z.infer<typeof formDefinitionDocSchema>;
