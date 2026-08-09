import { z } from "zod";

export const adminPlanTypeSchema = z.enum(["FREE", "PRO", "BUSINESS"]);

export const adminPlanLimitsSchema = z
  .object({
    projects: z.number().int().min(0),
    teamMembers: z.number().int().min(0),
  })
  .catchall(z.number().int().min(0));

export const createAdminPlanBodySchema = z
  .object({
    type: adminPlanTypeSchema,
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).optional(),
    price: z.number().int().min(0),
    currency: z.literal("INR"),
    interval: z.enum(["monthly", "yearly"]),
    limits: adminPlanLimitsSchema,
  })
  .strict();

export const adminPlanParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export type CreateAdminPlanBodyDto = z.infer<
  typeof createAdminPlanBodySchema
>;
export type AdminPlanParamsDto = z.infer<typeof adminPlanParamsSchema>;
