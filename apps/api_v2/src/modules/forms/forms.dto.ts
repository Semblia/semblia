import { z } from "zod";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";

const FORM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const opaqueJsonObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Array.isArray(value), {
    message: "Expected a JSON object",
  });

const formIdSchema = z.string().trim().min(1);
const snapshotIdSchema = z.string().trim().min(1);
const formSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(
    FORM_SLUG_PATTERN,
    "Form slug must be 3-64 chars and use lowercase letters, numbers, and hyphens",
  );

export const formIntentSchema = z.enum([
  "TESTIMONIAL",
  "REVIEW",
  "PRODUCT_FEEDBACK",
  "CUSTOMER_STORY",
  "CUSTOM",
]);

export const projectFormsParamsSchema = projectSlugParamsSchema;

export const formParamsSchema = projectSlugParamsSchema.extend({
  formId: formIdSchema,
});

export const formVersionParamsSchema = formParamsSchema.extend({
  version: z.coerce.number().int().min(1),
});

export const runtimeFormSnapshotParamsSchema = z.object({
  slug: formSlugSchema,
});

export const runtimeFormSnapshotQuerySchema = z.object({
  // Phase 7: replace with host-based project resolution.
  projectId: z.string().trim().min(1),
});

export const runtimeSnapshotParamsSchema = z.object({
  snapshotId: snapshotIdSchema,
});

export const formDeliverySchema = z.enum(["hosted", "embed"]);

export const createFormBodySchema = z
  .object({
    intent: formIntentSchema,
    delivery: formDeliverySchema.optional(),
    name: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const updateFormBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    slug: formSlugSchema.optional(),
    open: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Update body cannot be empty",
  });

export const saveFormDraftBodySchema = z
  .object({
    draft: opaqueJsonObjectSchema,
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export type ProjectFormsParamsDto = z.infer<typeof projectFormsParamsSchema>;
export type FormParamsDto = z.infer<typeof formParamsSchema>;
export type FormVersionParamsDto = z.infer<typeof formVersionParamsSchema>;
export type RuntimeFormSnapshotParamsDto = z.infer<
  typeof runtimeFormSnapshotParamsSchema
>;
export type RuntimeFormSnapshotQueryDto = z.infer<
  typeof runtimeFormSnapshotQuerySchema
>;
export type RuntimeSnapshotParamsDto = z.infer<
  typeof runtimeSnapshotParamsSchema
>;
export type CreateFormBodyDto = z.infer<typeof createFormBodySchema>;
export type UpdateFormBodyDto = z.infer<typeof updateFormBodySchema>;
export type SaveFormDraftBodyDto = z.infer<typeof saveFormDraftBodySchema>;
