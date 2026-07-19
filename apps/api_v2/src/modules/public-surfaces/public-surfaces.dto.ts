import { z } from "zod";

export const publicSurfaceFeatureSchema = z.enum(["COLLECTION", "WALL"]);

export const publicSurfaceResolveQuerySchema = z
  .object({
    hostname: z.string().trim().min(1).max(255),
    feature: publicSurfaceFeatureSchema,
  })
  .strict();

export type PublicSurfaceResolveQueryDto = z.infer<
  typeof publicSurfaceResolveQuerySchema
>;
