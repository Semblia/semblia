import { z } from "zod";

const purposeSchema = z.enum([
  "PROJECT_LOGO",
  "ACCOUNT_DEFAULTS_LOGO",
  "FORM_BRANDING_LOGO",
  "SUBMISSION_ATTACHMENT",
  "EXPORT_ARTIFACT",
]);

const baseIntentSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  byteSize: z.number().int().positive(),
  checksumSha256: z.string().trim().min(1).max(128).optional(),
});

export const createUploadIntentBodySchema = z.discriminatedUnion("purpose", [
  baseIntentSchema.extend({
    purpose: z.literal("PROJECT_LOGO"),
    projectSlug: z.string().trim().min(1),
  }),
  baseIntentSchema.extend({
    purpose: z.literal("ACCOUNT_DEFAULTS_LOGO"),
  }),
  baseIntentSchema.extend({
    purpose: z.literal("FORM_BRANDING_LOGO"),
    projectSlug: z.string().trim().min(1),
    formId: z.string().trim().min(1),
  }),
  baseIntentSchema.extend({
    purpose: z.literal("EXPORT_ARTIFACT"),
    projectSlug: z.string().trim().min(1),
  }),
  baseIntentSchema.extend({
    purpose: z.literal("SUBMISSION_ATTACHMENT"),
    projectSlug: z.string().trim().min(1),
    formId: z.string().trim().min(1).optional(),
  }),
]);

export const publicCreateUploadIntentBodySchema = z.discriminatedUnion(
  "purpose",
  [
    baseIntentSchema.extend({
      purpose: z.literal("SUBMISSION_ATTACHMENT"),
    }),
  ],
);

export const confirmUploadBodySchema = z.object({
  byteSize: z.number().int().positive(),
  checksumSha256: z.string().trim().min(1).max(128).optional(),
});

export const mediaAssetParamsSchema = z.object({
  assetId: z.string().trim().min(1),
});

export const mediaPurposeSchema = purposeSchema;

export type CreateUploadIntentBodyDto = z.infer<
  typeof createUploadIntentBodySchema
>;
export type PublicCreateUploadIntentBodyDto = z.infer<
  typeof publicCreateUploadIntentBodySchema
>;
export type ConfirmUploadBodyDto = z.infer<typeof confirmUploadBodySchema>;
export type MediaAssetParamsDto = z.infer<typeof mediaAssetParamsSchema>;
