import { z } from "zod";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";

const opaqueJsonObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Array.isArray(value), {
    message: "Expected a JSON object",
  });

const trimmedNullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const submissionsListQuerySchema = z.object({
  status: z
    .enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED", "ALL"])
    .default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const submissionParamsSchema = projectSlugParamsSchema.extend({
  submissionId: z.string().trim().min(1),
});

export const createSubmissionAnnotationBodySchema = z
  .object({
    note: trimmedNullableString(2_000),
    labels: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
    sentiment: trimmedNullableString(64),
    metadata: opaqueJsonObjectSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.note) ||
      Boolean(value.sentiment) ||
      Boolean(value.metadata) ||
      Boolean(value.labels?.length),
    {
      message: "At least one annotation field must be provided",
    },
  );

export const moderateSubmissionBodySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]),
  reason: trimmedNullableString(2_000),
  metadata: opaqueJsonObjectSchema.nullable().optional(),
});

export type SubmissionsListQueryDto = z.infer<
  typeof submissionsListQuerySchema
>;
export type SubmissionParamsDto = z.infer<typeof submissionParamsSchema>;
export type CreateSubmissionAnnotationBodyDto = z.infer<
  typeof createSubmissionAnnotationBodySchema
>;
export type ModerateSubmissionBodyDto = z.infer<
  typeof moderateSubmissionBodySchema
>;
