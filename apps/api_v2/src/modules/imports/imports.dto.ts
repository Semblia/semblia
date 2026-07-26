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
const spreadsheetMappingSchema = z.object({
  sheetName: z.string().trim().min(1).max(255),
  text: z.string().trim().min(1).max(255),
  authorName: z.string().trim().max(255).optional(),
  authorRole: z.string().trim().max(255).optional(),
  authorCompany: z.string().trim().max(255).optional(),
  ratingValue: z.string().trim().max(255).optional(),
  ratingScale: z.string().trim().max(255).optional(),
  sourceUrl: z.string().trim().max(255).optional(),
  sourceCreatedAt: z.string().trim().max(255).optional(),
  tags: z.string().trim().max(255).optional(),
});
export const spreadsheetPreviewBodySchema = z.object({
  assetId: z.string().trim().min(1),
  sheetName: z.string().trim().min(1).max(255).optional(),
});
export const createSpreadsheetImportBodySchema = z
  .object({
    assetId: z.string().trim().min(1),
    sourceKey: z.string().trim().min(1).max(120).default("spreadsheet"),
    mapping: spreadsheetMappingSchema,
    rightsConfirmed: z.literal(true),
  })
  .strict();
const publicSourceUrlInput = z.string().trim().max(1000);

function assertPublicHttpsSource(url: URL) {
  if (url.protocol !== "https:") throw new Error("not public https");
  if (url.username) throw new Error("not public https");
  if (url.password) throw new Error("not public https");
}

function canonicalizePublicSourceBody<
  T extends { sourceKey: string; sourceUrl: string },
>(value: T, context: z.RefinementCtx): T {
  try {
    const canonical = canonicalizePersistedImportSourceUrl(
      value.sourceUrl,
      value.sourceKey,
    );
    const url = new URL(canonical);
    assertPublicHttpsSource(url);
    return { ...value, sourceUrl: canonical };
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceUrl"],
      message: "sourceUrl must be a public HTTPS URL",
    });
    return z.NEVER;
  }
}
export const createPublicImportBodySchema = z
  .object({
    sourceKey: z.string().trim().min(1).max(120),
    sourceUrl: publicSourceUrlInput,
    rightsConfirmed: z.literal(true),
  })
  .strict()
  .transform(canonicalizePublicSourceBody);
export const importJobParamsSchema = projectSlugParamsSchema.extend({
  jobId: z.string().trim().min(1).max(255),
});
export const connectedImportProviderSchema = z.enum([
  "x",
  "linkedin",
  "youtube",
  "google-business",
  "google-play",
]);
export const connectedProviderParamsSchema = projectSlugParamsSchema.extend({
  provider: connectedImportProviderSchema,
});
export const importConnectionParamsSchema = projectSlugParamsSchema.extend({
  connectionId: z.string().trim().min(1).max(255),
});
export const listImportProviderResourcesQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(512).optional(),
});
const connectedImportConnectionBodySchema = z
  .object({
    sourceKey: connectedImportProviderSchema,
    resourceId: z.string().trim().min(1).max(512),
    rightsConfirmed: z.literal(true),
    autoSyncEnabled: z.boolean().optional(),
  })
  .strict();
const publicImportConnectionBodySchema = z
  .object({
    sourceKey: z.string().trim().min(1).max(120),
    sourceUrl: publicSourceUrlInput,
    mode: z.enum(["PUBLIC_URL", "MIGRATION"]),
    rightsConfirmed: z.literal(true),
    autoSyncEnabled: z.boolean().optional(),
  })
  .strict()
  .transform(canonicalizePublicSourceBody);
export const createImportConnectionBodySchema = z.union([
  connectedImportConnectionBodySchema,
  publicImportConnectionBodySchema,
]);
export const updateImportConnectionBodySchema = z.object({
  autoSyncEnabled: z.boolean(),
});
export type CreateManualImportBodyDto = z.infer<
  typeof createManualImportBodySchema
>;
export type ImportJobsQueryDto = z.infer<typeof importJobsQuerySchema>;
export type SpreadsheetPreviewBodyDto = z.infer<
  typeof spreadsheetPreviewBodySchema
>;
export type CreateSpreadsheetImportBodyDto = z.infer<
  typeof createSpreadsheetImportBodySchema
>;
export type CreatePublicImportBodyDto = z.infer<
  typeof createPublicImportBodySchema
>;
export type ImportJobParamsDto = z.infer<typeof importJobParamsSchema>;
export type ConnectedProviderParamsDto = z.infer<
  typeof connectedProviderParamsSchema
>;
export type ImportConnectionParamsDto = z.infer<
  typeof importConnectionParamsSchema
>;
export type ListImportProviderResourcesQueryDto = z.infer<
  typeof listImportProviderResourcesQuerySchema
>;
export type CreateImportConnectionBodyDto = z.infer<
  typeof createImportConnectionBodySchema
>;
export type UpdateImportConnectionBodyDto = z.infer<
  typeof updateImportConnectionBodySchema
>;
