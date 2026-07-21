import { z } from "zod";
import { paginationQuerySchema } from "../../common/dto/pagination.dto.js";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";
import { canonicalizePersistedImportSourceUrl } from "./import-source-url.js";

const boundedText = z.string().trim().min(1).max(10_000);
const canonicalManualSourceUrl = z
  .string()
  .trim()
  .max(1000)
  .transform((value, context) => {
    try {
      return canonicalizePersistedImportSourceUrl(value);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sourceUrl must be a valid URL",
      });
      return z.NEVER;
    }
  });

export const createManualImportBodySchema = z
  .object({
    sourceKey: z.string().trim().min(1).max(120).default("manual"),
    text: boundedText,
    authorName: z.string().trim().max(255).optional(),
    authorRole: z.string().trim().max(255).optional(),
    authorCompany: z.string().trim().max(255).optional(),
    ratingValue: z.number().int().min(1).max(10).optional(),
    ratingScale: z.number().int().min(1).max(10).optional(),
    sourceUrl: canonicalManualSourceUrl.optional(),
    rightsConfirmed: z.literal(true),
  })
  .superRefine((value, context) => {
    if (
      value.ratingValue !== undefined &&
      value.ratingScale !== undefined &&
      value.ratingValue > value.ratingScale
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ratingValue cannot exceed ratingScale",
        path: ["ratingValue"],
      });
  });
export const importJobsQuerySchema = paginationQuerySchema;
export const importJobParamsSchema = projectSlugParamsSchema.extend({
  jobId: z.string().trim().min(1).max(255),
});
export type CreateManualImportBodyDto = z.infer<
  typeof createManualImportBodySchema
>;
export type ImportJobsQueryDto = z.infer<typeof importJobsQuerySchema>;
export type ImportJobParamsDto = z.infer<typeof importJobParamsSchema>;
