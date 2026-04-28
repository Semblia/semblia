import { z } from "zod";

export const projectWidgetsParamsSchema = z.object({
  projectId: z.string().trim().min(1),
});

export const widgetIdParamsSchema = z.object({
  widgetId: z.string().trim().min(1),
});

export const wallSlugParamsSchema = z.object({
  wallSlug: z.string().trim().min(1),
});

export const createWidgetBodySchema = z.object({
  projectId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(255),
  kind: z.enum(["embed", "wall"]),
  layout: z.enum(["carousel", "grid", "masonry", "list", "wall"]),
  theme: z.enum(["light", "dark", "auto"]),
  preset: z.string().trim().optional(),
  accent: z.string().trim().optional(),
  text: z.string().trim().optional(),
  bg: z.string().trim().optional(),
  line: z.string().trim().optional(),
  surface: z.string().trim().optional(),
  radius: z.number().int().optional(),
  fontHead: z.string().trim().optional(),
  contentMode: z.enum(["all", "handpicked"]).optional(),
  pickedIds: z.array(z.string()).optional(),
  wallSlug: z.string().trim().optional(),
  wallTitle: z.string().trim().optional(),
  wallSubhead: z.string().trim().optional(),
});

export const updateWidgetBodySchema = createWidgetBodySchema.partial();

export type ProjectWidgetsParamsDto = z.infer<typeof projectWidgetsParamsSchema>;
export type WidgetIdParamsDto = z.infer<typeof widgetIdParamsSchema>;
export type WallSlugParamsDto = z.infer<typeof wallSlugParamsSchema>;
export type CreateWidgetBodyDto = z.infer<typeof createWidgetBodySchema>;
export type UpdateWidgetBodyDto = z.infer<typeof updateWidgetBodySchema>;
