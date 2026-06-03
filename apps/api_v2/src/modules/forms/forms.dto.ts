import { z } from "zod";
import {
  studioDraftBodySchema,
  type StudioDraftBodyDto,
} from "../studio-drafts/studio-drafts.dto.js";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";
import { createPublicResponseBodySchema } from "../responses/responses.dto.js";

const opaqueJsonObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Array.isArray(value), {
    message: "Expected a JSON object",
  });
const collectionFormSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: "Expected a URL-safe slug",
  });

export const projectFormsParamsSchema = projectSlugParamsSchema;

export const formParamsSchema = projectSlugParamsSchema.extend({
  formId: z.string().trim().min(1),
});

export const createFormBodySchema = z.object({
  name: z.string().trim().min(1).max(255).default("Default Form"),
  slug: collectionFormSlugSchema.optional(),
  description: z.string().trim().max(500).default(""),
  isActive: z.boolean().default(false),
  abWeight: z.number().int().min(0).default(0),
  config: opaqueJsonObjectSchema,
});

export const updateFormBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    slug: collectionFormSlugSchema.optional(),
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
  createPublicResponseBodySchema.extend({
    rating: z.number().int().min(1).max(10).nullable().optional(),
    answers: z.record(z.string(), z.unknown()).optional(),
    mediaAssetIds: z.array(z.string().trim().min(1)).max(10).optional(),
  });

export const hostedFormRequestContextSchema = z
  .object({
    projectPublicSlug: collectionFormSlugSchema,
    formSlug: collectionFormSlugSchema.nullable().optional(),
    path: z.string().trim().min(1).max(1000),
  })
  .strict();

export const runtimeFormsSubmitBodySchema = z
  .object({
    context: hostedFormRequestContextSchema,
    contentType: z.string().trim().max(255).default(""),
    body: z.string().max(64 * 1024),
  })
  .strict();

export const publishStudioDraftBodySchema = z
  .object({
    expectedVersion: z.number().int().min(1),
  })
  .strict();

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
export type HostedFormRequestContextDto = z.infer<
  typeof hostedFormRequestContextSchema
>;
export type RuntimeFormsSubmitBodyDto = z.infer<
  typeof runtimeFormsSubmitBodySchema
>;
export type PublishStudioDraftBodyDto = z.infer<
  typeof publishStudioDraftBodySchema
>;
export { studioDraftBodySchema, type StudioDraftBodyDto };
