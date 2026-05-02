import { z } from "zod";
import { slugify } from "../../common/utils/slugify.js";
import {
  studioDraftBodySchema,
  type StudioDraftBodyDto,
} from "../studio-drafts/studio-drafts.dto.js";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";

const WALL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_WALL_SLUGS = new Set([
  "admin",
  "api",
  "www",
  "app",
  "dashboard",
  "login",
  "signup",
  "settings",
  "embed",
  "public",
  "walls",
  "widgets",
  "forms",
  "testimonials",
  "account",
  "billing",
  "support",
  "status",
  "docs",
  "blog",
]);

const widgetIdSchema = z.string().trim().min(1);
const shortColorSchema = z.string().trim().min(1).max(64);
const fontFamilySchema = z.string().trim().min(1).max(255);

function validateWallSlug(slug: string, ctx: z.RefinementCtx) {
  if (slug.length < 3 || slug.length > 64 || !WALL_SLUG_PATTERN.test(slug)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Wall slug must be 3-64 chars and use lowercase letters, numbers, and hyphens",
    });
  }

  if (RESERVED_WALL_SLUGS.has(slug)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Wall slug is reserved",
    });
  }
}

export function normalizeWallSlugValue(input: string): string {
  return slugify(input).slice(0, 64).replace(/-+$/g, "");
}

export function isReservedWallSlugValue(input: string): boolean {
  return RESERVED_WALL_SLUGS.has(input);
}

const normalizedWallSlugSchema = z
  .string()
  .trim()
  .min(1)
  .transform(normalizeWallSlugValue)
  .superRefine(validateWallSlug);

export const projectWidgetsParamsSchema = projectSlugParamsSchema;

export const widgetParamsSchema = projectSlugParamsSchema.extend({
  widgetId: widgetIdSchema,
});

export const publicWidgetParamsSchema = z.object({
  widgetId: widgetIdSchema,
});

export const wallSlugParamsSchema = z.object({
  wallSlug: normalizedWallSlugSchema,
});

export const createWidgetBodySchema = z.object({
  name: z.string().trim().min(1).max(255).default("Untitled widget"),
  kind: z.enum(["embed", "wall"]).default("embed"),
  layout: z
    .enum(["carousel", "grid", "masonry", "list", "wall"])
    .default("carousel"),
  theme: z.enum(["light", "dark", "auto"]).default("light"),
  preset: z.string().trim().min(1).max(64).default("clean"),
  accent: shortColorSchema.default("#0f172a"),
  text: shortColorSchema.default("#0a0a0b"),
  bg: shortColorSchema.default("#ffffff"),
  line: shortColorSchema.default("#e5e7eb"),
  surface: shortColorSchema.default("#f7f7f8"),
  radius: z.number().int().min(0).max(999).default(12),
  fontFamily: fontFamilySchema.default('"Geist", system-ui, sans-serif'),
  fontHead: fontFamilySchema.default('"Geist", system-ui, sans-serif'),
  cardStyle: z
    .enum(["shadow", "bordered", "flat", "elevated"])
    .default("bordered"),
  density: z.enum(["compact", "default", "cozy"]).default("default"),
  showRating: z.boolean().default(true),
  showAvatar: z.boolean().default(true),
  showCompany: z.boolean().default(true),
  showDate: z.boolean().default(false),
  showSource: z.boolean().default(false),
  maxItems: z.number().int().min(1).max(100).default(9),
  autoRotate: z.boolean().default(true),
  rotateInterval: z.number().int().min(1000).max(60000).default(5000),
  showBranding: z.boolean().default(true),
  contentMode: z.enum(["all", "handpicked"]).default("all"),
  pickedIds: z.array(widgetIdSchema).default([]),
  wallSlug: normalizedWallSlugSchema.optional(),
  wallTitle: z.string().trim().min(1).max(500).optional(),
  wallSubhead: z.string().trim().min(1).max(5000).optional(),
  isActive: z.boolean().default(true),
});

export const updateWidgetBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    kind: z.enum(["embed", "wall"]).optional(),
    layout: z.enum(["carousel", "grid", "masonry", "list", "wall"]).optional(),
    theme: z.enum(["light", "dark", "auto"]).optional(),
    preset: z.string().trim().min(1).max(64).optional(),
    accent: shortColorSchema.optional(),
    text: shortColorSchema.optional(),
    bg: shortColorSchema.optional(),
    line: shortColorSchema.optional(),
    surface: shortColorSchema.optional(),
    radius: z.number().int().min(0).max(999).optional(),
    fontFamily: fontFamilySchema.optional(),
    fontHead: fontFamilySchema.optional(),
    cardStyle: z.enum(["shadow", "bordered", "flat", "elevated"]).optional(),
    density: z.enum(["compact", "default", "cozy"]).optional(),
    showRating: z.boolean().optional(),
    showAvatar: z.boolean().optional(),
    showCompany: z.boolean().optional(),
    showDate: z.boolean().optional(),
    showSource: z.boolean().optional(),
    maxItems: z.number().int().min(1).max(100).optional(),
    autoRotate: z.boolean().optional(),
    rotateInterval: z.number().int().min(1000).max(60000).optional(),
    showBranding: z.boolean().optional(),
    contentMode: z.enum(["all", "handpicked"]).optional(),
    pickedIds: z.array(widgetIdSchema).optional(),
    wallSlug: normalizedWallSlugSchema.optional(),
    wallTitle: z.string().trim().min(1).max(500).optional(),
    wallSubhead: z.string().trim().min(1).max(5000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Update body cannot be empty",
  });

export type ProjectWidgetsParamsDto = z.infer<
  typeof projectWidgetsParamsSchema
>;
export type WidgetParamsDto = z.infer<typeof widgetParamsSchema>;
export type PublicWidgetParamsDto = z.infer<typeof publicWidgetParamsSchema>;
export type WallSlugParamsDto = z.infer<typeof wallSlugParamsSchema>;
export type CreateWidgetBodyDto = z.infer<typeof createWidgetBodySchema>;
export type UpdateWidgetBodyDto = z.infer<typeof updateWidgetBodySchema>;
export { studioDraftBodySchema, type StudioDraftBodyDto };
