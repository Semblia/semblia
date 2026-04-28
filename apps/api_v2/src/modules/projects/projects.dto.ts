import { z } from "zod";
import { paginationQuerySchema } from "../../common/dto/pagination.dto.js";

const socialLinkSchema = z.object({
  platformName: z.string().trim().min(1),
  platformUrl: z.string().url(),
  profileUrl: z.string().url(),
});

const socialLinksSchema = z.object({
  twitter: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  youtube: z.string().url().optional(),
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  custom: z.array(socialLinkSchema).optional(),
});

const formConfigSchema = z.object({
  headerTitle: z.string(),
  headerDescription: z.string(),
  thankYouMessage: z.string(),
  enableRating: z.boolean(),
  enableJobTitle: z.boolean(),
  enableCompany: z.boolean(),
  enableAvatar: z.boolean(),
  enableVideoUrl: z.boolean(),
  enableGoogleVerification: z.boolean(),
  requireRating: z.boolean(),
  requireJobTitle: z.boolean(),
  requireCompany: z.boolean(),
  requireAvatar: z.boolean(),
  requireVideoUrl: z.boolean(),
  requireGoogleVerification: z.boolean(),
  allowAnonymousSubmissions: z.boolean(),
  notifyOnSubmission: z.boolean(),
  allowFingerprintOptOut: z.boolean(),
});

export const projectSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export const listProjectsQuerySchema = paginationQuerySchema;

export const createProjectBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  projectType: z
    .enum([
      "SAAS_APP",
      "PORTFOLIO",
      "MOBILE_APP",
      "CONSULTING_SERVICE",
      "E_COMMERCE",
      "AGENCY",
      "FREELANCE",
      "PRODUCT",
      "COURSE",
      "COMMUNITY",
      "OTHER",
    ])
    .nullable()
    .optional(),
  websiteUrl: z.string().url().nullable().optional(),
  collectionFormUrl: z.string().url().nullable().optional(),
  brandColorPrimary: z.string().trim().nullable().optional(),
  brandColorSecondary: z.string().trim().nullable().optional(),
  socialLinks: socialLinksSchema.nullable().optional(),
  tags: z.array(z.string().trim()).default([]),
  visibility: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY"]).optional(),
  autoModeration: z.boolean().optional(),
  autoApproveVerified: z.boolean().optional(),
  profanityFilterLevel: z.string().trim().nullable().optional(),
  formConfig: formConfigSchema.nullable().optional(),
});

export const updateProjectBodySchema = createProjectBodySchema.partial();

export type ProjectSlugParamsDto = z.infer<typeof projectSlugParamsSchema>;
export type ListProjectsQueryDto = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectBodyDto = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBodyDto = z.infer<typeof updateProjectBodySchema>;
