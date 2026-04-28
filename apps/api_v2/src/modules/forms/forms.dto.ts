import { z } from "zod";

export const formIdParamsSchema = z.object({
  formId: z.string().trim().min(1),
});

export const projectFormsParamsSchema = z.object({
  projectId: z.string().trim().min(1),
});

export const createFormBodySchema = z.object({
  projectId: z.string().trim().min(1),
  name: z.string().trim().min(1).default("Default Form"),
  description: z.string().trim().default(""),
  isActive: z.boolean().optional(),
  abWeight: z.number().int().min(0).optional(),
  config: z.record(z.string(), z.unknown()),
});

export const updateFormBodySchema = createFormBodySchema.partial();

export const publicFormSubmissionBodySchema = z.record(z.string(), z.unknown());

export type FormIdParamsDto = z.infer<typeof formIdParamsSchema>;
export type ProjectFormsParamsDto = z.infer<typeof projectFormsParamsSchema>;
export type CreateFormBodyDto = z.infer<typeof createFormBodySchema>;
export type UpdateFormBodyDto = z.infer<typeof updateFormBodySchema>;
export type PublicFormSubmissionBodyDto = z.infer<
  typeof publicFormSubmissionBodySchema
>;
