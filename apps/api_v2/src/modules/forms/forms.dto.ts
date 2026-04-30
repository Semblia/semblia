import { z } from "zod";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";
import { createPublicTestimonialBodySchema } from "../testimonials/testimonials.dto.js";

const opaqueJsonObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Array.isArray(value), {
    message: "Expected a JSON object",
  });

export const projectFormsParamsSchema = projectSlugParamsSchema;

export const formParamsSchema = projectSlugParamsSchema.extend({
  formId: z.string().trim().min(1),
});

export const createFormBodySchema = z.object({
  name: z.string().trim().min(1).max(255).default("Default Form"),
  description: z.string().trim().max(500).default(""),
  isActive: z.boolean().default(false),
  abWeight: z.number().int().min(0).default(0),
  config: opaqueJsonObjectSchema,
});

export const updateFormBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
    abWeight: z.number().int().min(0).optional(),
    config: opaqueJsonObjectSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const publicFormsListQuerySchema = z.object({});

export const createFormSubmissionBodySchema =
  createPublicTestimonialBodySchema.extend({
    rating: z.number().int().min(1).max(10).nullable().optional(),
    answers: z.record(z.string(), z.unknown()).optional(),
  });

export type ProjectFormsParamsDto = z.infer<typeof projectFormsParamsSchema>;
export type FormParamsDto = z.infer<typeof formParamsSchema>;
export type CreateFormBodyDto = z.infer<typeof createFormBodySchema>;
export type UpdateFormBodyDto = z.infer<typeof updateFormBodySchema>;
export type PublicFormsListQueryDto = z.infer<
  typeof publicFormsListQuerySchema
>;
export type CreateFormSubmissionBodyDto = z.infer<
  typeof createFormSubmissionBodySchema
>;
