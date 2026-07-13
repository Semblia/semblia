import { z } from "zod";

/**
 * The controlled field system (spec §7). Semblia Forms is intentionally NOT a
 * generic form builder: only these field types exist, each with a fixed set of
 * settings. The renderer and validator interpret the type-specific settings per
 * `type`; settings that don't apply to a type are ignored.
 */
export const FIELD_TYPES = [
  "shortText",
  "longText",
  "rating",
  "name",
  "email",
  "company",
  "role",
  "website",
  "singleSelect",
  "multiSelect",
  "imageUpload",
  "videoUpload",
  "audioUpload",
  "fileUpload",
  "consent",
  "hidden",
] as const;

export const fieldTypeSchema = z.enum(FIELD_TYPES);
export type FieldType = z.infer<typeof fieldTypeSchema>;

export const ratingStyleSchema = z.enum(["stars", "numbers", "hearts", "emoji"]);
export type RatingStyle = z.infer<typeof ratingStyleSchema>;

export const selectOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});
export type SelectOption = z.infer<typeof selectOptionSchema>;

/**
 * Semantic role of a field for the publishing/widget pipeline. The author maps
 * a field to a role so consent + widget eligibility can be reasoned about
 * generically (e.g. the "authorName" role is consent-gated by `canPublishName`).
 */
export const fieldRoleSchema = z.enum([
  "primaryText", // testimonial / review / feedback body
  "rating",
  "authorName",
  "authorRole",
  "authorCompany",
  "authorAvatar",
  "authorEmail",
  "consent",
  "custom",
]);
export type FieldRole = z.infer<typeof fieldRoleSchema>;

export const hiddenFieldSourceSchema = z.enum(["query", "static", "utm"]);
export type HiddenFieldSource = z.infer<typeof hiddenFieldSourceSchema>;

/**
 * A single field. Common settings are shared by every type (spec §7); the
 * type-specific settings below are optional and only meaningful for their type.
 */
export const formFieldSchema = z.object({
  // ── Common settings ──────────────────────────────────────────────────────
  id: z.string().min(1),
  type: fieldTypeSchema,
  role: fieldRoleSchema.default("custom"),
  label: z.string().default(""),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  /** Collected but never publishable (e.g. email). Overrides `publishable`. */
  private: z.boolean().default(false),
  /** Eligible to be shown publicly — still gated by consent at serve time. */
  publishable: z.boolean().default(false),
  /** Eligible to appear in widgets/walls. */
  widgetEligible: z.boolean().default(false),
  /** Higher first when projecting to a display card. */
  displayPriority: z.number().int().default(0),
  defaultValue: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),

  // ── Text settings (shortText / longText / name / company / role) ──────────
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),

  // ── Rating settings ───────────────────────────────────────────────────────
  ratingScale: z.number().int().min(2).max(10).optional(),
  ratingStyle: ratingStyleSchema.optional(),

  // ── Select settings (singleSelect / multiSelect) ──────────────────────────
  options: z.array(selectOptionSchema).optional(),
  maxSelections: z.number().int().positive().optional(),

  // ── Upload settings (imageUpload / videoUpload / audioUpload / fileUpload) ─
  fileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().int().positive().optional(), // bytes
  maxFileCount: z.number().int().positive().optional(),
  /** Recording cap for videoUpload / audioUpload capture (seconds). */
  maxDurationSec: z.number().int().positive().optional(),

  // ── Consent settings ──────────────────────────────────────────────────────
  consentCopy: z.string().optional(),

  // ── Hidden field settings ─────────────────────────────────────────────────
  hiddenSource: hiddenFieldSourceSchema.optional(),
  hiddenKey: z.string().optional(),
  hiddenValue: z.string().optional(),
});
export type FormField = z.infer<typeof formFieldSchema>;

/** Field types that always carry private data and can never be made public. */
export const ALWAYS_PRIVATE_TYPES: ReadonlySet<FieldType> = new Set([
  "email",
  "hidden",
]);

/** Field types that accept file uploads. */
export const UPLOAD_TYPES: ReadonlySet<FieldType> = new Set([
  "imageUpload",
  "videoUpload",
  "audioUpload",
  "fileUpload",
]);

/**
 * The stored shape of a single submitted answer (spec §8). Separating
 * `private` / `publishable` / `usedInWidget` at write time prevents a private
 * collection field from ever leaking into a public display surface.
 */
export const storedAnswerSchema = z.object({
  fieldId: z.string(),
  type: fieldTypeSchema,
  role: fieldRoleSchema,
  labelSnapshot: z.string(),
  value: z.unknown(),
  private: z.boolean(),
  publishable: z.boolean(),
  usedInWidget: z.boolean(),
});
export type StoredAnswer = z.infer<typeof storedAnswerSchema>;

/**
 * First-class consent (spec §9). A response cannot be publicly displayed unless
 * the required consent conditions for the fields being shown are satisfied.
 */
export const consentSchema = z.object({
  canPublishText: z.boolean().default(false),
  canPublishName: z.boolean().default(false),
  canPublishCompany: z.boolean().default(false),
  canPublishRole: z.boolean().default(false),
  canPublishAvatar: z.boolean().default(false),
  canEditForClarity: z.boolean().default(false),
});
export type FormResponseConsent = z.infer<typeof consentSchema>;
