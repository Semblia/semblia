import { z } from "zod";
import { paginationQuerySchema } from "../../common/dto/pagination.dto.js";
import { formConfigSchema } from "../account-defaults/account-defaults.dto.js";

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

const LOCALHOST_HTTP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
]);

export const allowedOriginSchema = z
  .string()
  .trim()
  .min(1)
  .superRefine((value, ctx) => {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed origin must be a valid absolute URL",
      });
      return;
    }

    if (url.username || url.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed origin must not include credentials",
      });
    }

    if (value.includes("*")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed origin must not include wildcards",
      });
    }

    if (url.search) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed origin must not include a query string",
      });
    }

    if (url.hash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed origin must not include a fragment",
      });
    }

    const hasTrailingSlashOrPath =
      value.startsWith(`${url.origin}/`) && !url.search && !url.hash;
    if (hasTrailingSlashOrPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed origin must not include a trailing slash or path",
      });
    }

    if (value !== url.origin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed origin must be stored as exact scheme://host[:port]",
      });
    }

    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const isLocalHttp =
      protocol === "http:" && LOCALHOST_HTTP_HOSTS.has(hostname);

    if (protocol === "https:") {
      return;
    }

    if (isLocalHttp && process.env.NODE_ENV !== "production") {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Allowed origin must use https://, except http://localhost, http://127.0.0.1, and http://[::1] outside production",
    });
  });

export const replaceAllowedOriginsBodySchema = z.object({
  origins: z.array(allowedOriginSchema).max(50),
});

export const projectSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export const memberRoleSchema = z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]);

export const projectMemberParamsSchema = projectSlugParamsSchema.extend({
  userId: z.string().trim().min(1),
});

export const projectInviteParamsSchema = z.object({
  inviteId: z.string().trim().min(1),
});

export const projectMemberInviteParamsSchema = projectSlugParamsSchema.extend({
  inviteId: z.string().trim().min(1),
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
  isActive: z.boolean().optional(),
  autoModeration: z.boolean().optional(),
  autoApproveVerified: z.boolean().optional(),
  profanityFilterLevel: z.string().trim().nullable().optional(),
  formConfig: formConfigSchema.nullable().optional(),
});

export const updateProjectBodySchema = createProjectBodySchema.partial();

export const addProjectMemberBodySchema = z.object({
  userId: z.string().trim().min(1),
  role: memberRoleSchema.default("VIEWER"),
});

export const updateProjectMemberBodySchema = z.object({
  role: memberRoleSchema,
});

export const createProjectMemberInviteBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1)
    .max(320)
    .email()
    .transform((email) => email.toLowerCase()),
  role: memberRoleSchema.default("VIEWER"),
});

export type ProjectSlugParamsDto = z.infer<typeof projectSlugParamsSchema>;
export type MemberRoleDto = z.infer<typeof memberRoleSchema>;
export type ProjectMemberParamsDto = z.infer<typeof projectMemberParamsSchema>;
export type ProjectInviteParamsDto = z.infer<typeof projectInviteParamsSchema>;
export type ProjectMemberInviteParamsDto = z.infer<
  typeof projectMemberInviteParamsSchema
>;
export type ListProjectsQueryDto = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectBodyDto = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBodyDto = z.infer<typeof updateProjectBodySchema>;
export type AddProjectMemberBodyDto = z.infer<
  typeof addProjectMemberBodySchema
>;
export type UpdateProjectMemberBodyDto = z.infer<
  typeof updateProjectMemberBodySchema
>;
export type CreateProjectMemberInviteBodyDto = z.infer<
  typeof createProjectMemberInviteBodySchema
>;
export type ReplaceAllowedOriginsBodyDto = z.infer<
  typeof replaceAllowedOriginsBodySchema
>;
