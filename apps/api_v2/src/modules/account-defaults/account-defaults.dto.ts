import { z } from "zod";

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Must be a 3- or 6-digit hex color");

const urlOrNullSchema = z.string().trim().url().nullable();

export const formConfigSchema = z.object({
  content: z.object({
    headerTitle: z.string().trim().min(1).max(120),
    headerDescription: z.string().trim().max(500),
    submitButtonLabel: z.string().trim().min(1).max(80),
    thankYouTitle: z.string().trim().min(1).max(120),
    thankYouMessage: z.string().trim().max(500),
    successAction: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("message") }),
      z.object({ kind: z.literal("redirect"), url: z.string().trim().url() }),
    ]),
  }),
  fields: z.object({
    email: z.object({ enabled: z.boolean(), required: z.boolean() }),
    rating: z.object({
      enabled: z.boolean(),
      required: z.boolean(),
      scale: z.union([z.literal(5), z.literal(10)]),
    }),
    jobTitle: z.object({ enabled: z.boolean(), required: z.boolean() }),
    company: z.object({ enabled: z.boolean(), required: z.boolean() }),
    avatar: z.object({ enabled: z.boolean(), required: z.boolean() }),
    videoUrl: z.object({ enabled: z.boolean(), required: z.boolean() }),
    consent: z.object({
      enabled: z.boolean(),
      mode: z.enum(["declaration", "checkbox"]),
      label: z.string().trim().min(1).max(240),
    }),
  }),
  branding: z.object({
    logoUrl: urlOrNullSchema,
    colors: z.object({
      primary: hexColorSchema,
      background: hexColorSchema,
      foreground: hexColorSchema,
      accent: hexColorSchema,
    }),
    fontFamily: z.enum(["inter", "geist", "system", "serif", "mono"]),
    cornerRadius: z.enum(["sharp", "subtle", "rounded", "pill"]),
    mode: z.enum(["light", "dark", "system"]),
    inputStyle: z.enum(["outlined", "filled", "underlined", "minimal"]),
    buttonStyle: z.enum(["solid", "outline", "soft", "ghost"]),
    shadow: z.enum(["none", "subtle", "medium"]),
    density: z.enum(["compact", "default", "spacious"]),
    headerAlignment: z.enum(["left", "center"]),
    headingWeight: z.enum(["light", "normal", "semibold", "bold"]),
  }),
  behavior: z.object({
    allowAnonymous: z.boolean(),
    oauthProviders: z.array(z.enum(["google", "github"])).max(2),
    notifyOnSubmission: z.boolean(),
    moderation: z.enum(["auto", "manual"]),
    allowFingerprintOptOut: z.boolean(),
  }),
  watermark: z.object({
    show: z.boolean(),
    position: z.enum(["bottom-left", "bottom-right", "bottom-center"]),
  }),
  delivery: z.object({
    customDomain: z.string().trim().min(1).nullable(),
    pathSuffix: z.string().trim().max(120),
    embedScriptEnabled: z.boolean(),
  }),
});

export const moderationDefaultsSchema = z.object({
  autoModeration: z.boolean(),
  autoApproveVerified: z.boolean(),
  profanityFilterLevel: z.string().trim().min(1).nullable(),
});

export const visibilityAccessDefaultsSchema = z.object({
  visibility: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY"]),
  isActive: z.boolean(),
});

export const brandDefaultsSchema = z.object({
  brandColorPrimary: hexColorSchema.nullable(),
  brandColorSecondary: hexColorSchema.nullable(),
  logoUrl: urlOrNullSchema,
});

export const accountDefaultsSchema = z.object({
  form: formConfigSchema.nullable(),
  moderation: moderationDefaultsSchema.nullable(),
  visibilityAccess: visibilityAccessDefaultsSchema.nullable(),
  brand: brandDefaultsSchema.nullable(),
});

const partialFormConfigSchema = z.object({
  content: formConfigSchema.shape.content.partial().optional(),
  fields: z
    .object({
      email: formConfigSchema.shape.fields.shape.email.partial().optional(),
      rating: formConfigSchema.shape.fields.shape.rating.partial().optional(),
      jobTitle: formConfigSchema.shape.fields.shape.jobTitle
        .partial()
        .optional(),
      company: formConfigSchema.shape.fields.shape.company.partial().optional(),
      avatar: formConfigSchema.shape.fields.shape.avatar.partial().optional(),
      videoUrl: formConfigSchema.shape.fields.shape.videoUrl
        .partial()
        .optional(),
      consent: formConfigSchema.shape.fields.shape.consent.partial().optional(),
    })
    .optional(),
  branding: z
    .object({
      logoUrl: formConfigSchema.shape.branding.shape.logoUrl.optional(),
      colors: formConfigSchema.shape.branding.shape.colors.partial().optional(),
      fontFamily: formConfigSchema.shape.branding.shape.fontFamily.optional(),
      cornerRadius:
        formConfigSchema.shape.branding.shape.cornerRadius.optional(),
      mode: formConfigSchema.shape.branding.shape.mode.optional(),
      inputStyle: formConfigSchema.shape.branding.shape.inputStyle.optional(),
      buttonStyle: formConfigSchema.shape.branding.shape.buttonStyle.optional(),
      shadow: formConfigSchema.shape.branding.shape.shadow.optional(),
      density: formConfigSchema.shape.branding.shape.density.optional(),
      headerAlignment:
        formConfigSchema.shape.branding.shape.headerAlignment.optional(),
      headingWeight:
        formConfigSchema.shape.branding.shape.headingWeight.optional(),
    })
    .optional(),
  behavior: formConfigSchema.shape.behavior.partial().optional(),
  watermark: formConfigSchema.shape.watermark.partial().optional(),
  delivery: formConfigSchema.shape.delivery.partial().optional(),
});

export const updateAccountDefaultsBodySchema = z.object({
  form: partialFormConfigSchema.nullable().optional(),
  moderation: moderationDefaultsSchema.partial().nullable().optional(),
  visibilityAccess: visibilityAccessDefaultsSchema
    .partial()
    .nullable()
    .optional(),
  brand: brandDefaultsSchema.partial().nullable().optional(),
});

export type AccountDefaultsDto = z.infer<typeof accountDefaultsSchema>;
export type UpdateAccountDefaultsBodyDto = z.infer<
  typeof updateAccountDefaultsBodySchema
>;
