import { z } from "zod";
import { DEFAULT_FORM_CONFIG } from "./defaults.js";
import type { FormConfig } from "./types.js";

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "textarea", "email", "rating"]),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
});

const tokenSchema = z.object({
  accent: z.string().default(DEFAULT_FORM_CONFIG.tokens.accent),
  background: z.string().default(DEFAULT_FORM_CONFIG.tokens.background),
  text: z.string().default(DEFAULT_FORM_CONFIG.tokens.text),
  mutedText: z.string().default(DEFAULT_FORM_CONFIG.tokens.mutedText),
  surface: z.string().default(DEFAULT_FORM_CONFIG.tokens.surface),
  border: z.string().default(DEFAULT_FORM_CONFIG.tokens.border),
  radius: z.coerce
    .number()
    .min(0)
    .max(40)
    .default(DEFAULT_FORM_CONFIG.tokens.radius),
  fontFamily: z.string().default(DEFAULT_FORM_CONFIG.tokens.fontFamily),
});

const formConfigSchema = z.object({
  brandName: z.string().default(DEFAULT_FORM_CONFIG.brandName),
  headline: z.string().default(DEFAULT_FORM_CONFIG.headline),
  subhead: z.string().default(DEFAULT_FORM_CONFIG.subhead),
  questions: z
    .array(questionSchema)
    .min(1)
    .default(DEFAULT_FORM_CONFIG.questions),
  tokens: tokenSchema.default(DEFAULT_FORM_CONFIG.tokens),
});

export function normalizeFormConfig(input: unknown): FormConfig {
  const parsed = formConfigSchema.safeParse(input);
  if (!parsed.success) return structuredClone(DEFAULT_FORM_CONFIG);
  return parsed.data;
}
