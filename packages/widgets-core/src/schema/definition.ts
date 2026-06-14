import { z } from "zod";

export const WIDGET_SCHEMA_VERSION = 1 as const;

export const WIDGET_KINDS = ["embed", "wall"] as const;
export const WIDGET_LAYOUT_PRESETS = [
  "carousel",
  "grid",
  "masonry",
  "list",
  "wall",
] as const;

export type WidgetKind = (typeof WIDGET_KINDS)[number];
export type WidgetLayoutPresetId = (typeof WIDGET_LAYOUT_PRESETS)[number];

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HTTP_URL_OR_EMPTY = /^$|^https?:\/\//i;

export const brandThemeInputsSchema = z.object({
  brandColor: z.string().regex(HEX_COLOR),
  appearance: z.enum(["light", "dark", "system"]),
  radius: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  density: z.enum(["compact", "cozy", "spacious"]),
  typePairing: z.enum([
    "inherit",
    "inter",
    "geist",
    "system",
    "serif-editorial",
  ]),
  surfaceStyle: z.enum(["flat", "bordered", "elevated"]),
  accentIntensity: z.enum(["subtle", "balanced", "bold"]),
  neutralTone: z.enum(["auto", "pure", "warm", "cool"]),
  buttonStyle: z.enum(["solid", "soft", "outline"]),
});

export const widgetLayoutSelectionSchema = z.object({
  preset: z.enum(WIDGET_LAYOUT_PRESETS),
});

export const widgetContentSchema = z.object({
  mode: z.enum(["all", "handpicked"]).default("all"),
  pickedIds: z.array(z.string().trim().min(1).max(255)).default([]),
  order: z.enum(["recent", "rating", "manual", "shuffle"]).default("recent"),
  minRating: z.number().int().min(1).max(5).nullable().default(null),
  maxItems: z.number().int().min(1).max(100).default(9),
});

export const widgetDisplaySchema = z.object({
  showRating: z.boolean().default(true),
  showAvatar: z.boolean().default(true),
  showCompany: z.boolean().default(true),
  showDate: z.boolean().default(false),
  showSource: z.boolean().default(false),
});

export const widgetBehaviorSchema = z.object({
  autoRotate: z.boolean().default(true),
  rotateInterval: z.number().int().min(1000).max(60000).default(5000),
});

export const widgetBrandingSchema = z.object({
  logoUrl: z.string().trim().max(2000).regex(HTTP_URL_OR_EMPTY).nullable().default(null),
  watermark: z.boolean().default(true),
});

export const widgetWallConfigSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(64),
  title: z.string().trim().min(1).max(500),
  subhead: z.string().trim().max(5000).default(""),
});

export const widgetDefinitionDocSchema = z
  .object({
    schemaVersion: z.literal(WIDGET_SCHEMA_VERSION),
    kind: z.enum(WIDGET_KINDS),
    layout: widgetLayoutSelectionSchema,
    content: widgetContentSchema,
    display: widgetDisplaySchema,
    behavior: widgetBehaviorSchema,
    theme: brandThemeInputsSchema,
    branding: widgetBrandingSchema,
    wall: widgetWallConfigSchema.nullable().default(null),
  })
  .superRefine((doc, ctx) => {
    if (doc.kind === "wall" && doc.wall === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wall"],
        message: "Wall widgets require wall configuration",
      });
    }
    if (doc.kind === "embed" && doc.layout.preset === "wall" && doc.wall === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wall"],
        message: "Wall layout requires reserved wall configuration",
      });
    }
  });

const HEX_OR_ALPHA = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const hexToken = z.string().regex(HEX_OR_ALPHA);

export const derivedWidgetThemeSchema = z.object({
  colorScheme: z.enum(["light", "dark"]),
  accent: hexToken,
  accentText: hexToken,
  accentHover: hexToken,
  accentActive: hexToken,
  accentSoft: hexToken,
  accentSoftText: hexToken,
  focusRing: hexToken,
  background: hexToken,
  surface: hexToken,
  surfaceRaised: hexToken,
  text: hexToken,
  mutedText: hexToken,
  border: hexToken,
  borderStrong: hexToken,
  radius: z.number().min(0),
  radiusField: z.number().min(0),
  borderWidth: z.number().min(0),
  shadow: z.string().max(300),
  buttonStyle: z.enum(["solid", "soft", "outline"]),
  spaceUnit: z.number().positive(),
  fieldPadY: z.number().positive(),
  fieldPadX: z.number().positive(),
  fieldGap: z.number().positive(),
  sectionGap: z.number().positive(),
  fontFamily: z.string().max(300),
});

export const resolvedWidgetThemeSnapshotSchema = z.object({
  appearance: z.enum(["light", "dark", "system"]),
  schemes: z.object({
    light: derivedWidgetThemeSchema.optional(),
    dark: derivedWidgetThemeSchema.optional(),
  }),
});

export const widgetPublishedSnapshotSchema = z.object({
  derivedTheme: resolvedWidgetThemeSnapshotSchema,
  version: z.literal("widgets-v1"),
  resolvedAt: z.string().datetime(),
});

export const publishedWidgetDocSchema = widgetDefinitionDocSchema.extend({
  derived: widgetPublishedSnapshotSchema,
});

export type WidgetBrandThemeInputs = z.infer<typeof brandThemeInputsSchema>;
export type WidgetLayoutSelection = z.infer<typeof widgetLayoutSelectionSchema>;
export type WidgetContent = z.infer<typeof widgetContentSchema>;
export type WidgetDisplay = z.infer<typeof widgetDisplaySchema>;
export type WidgetBehavior = z.infer<typeof widgetBehaviorSchema>;
export type WidgetBranding = z.infer<typeof widgetBrandingSchema>;
export type WidgetWallConfig = z.infer<typeof widgetWallConfigSchema>;
export type WidgetDefinitionDoc = z.infer<typeof widgetDefinitionDocSchema>;
export type WidgetPublishedSnapshot = z.infer<
  typeof widgetPublishedSnapshotSchema
>;
export type PublishedWidgetDoc = z.infer<typeof publishedWidgetDocSchema>;
