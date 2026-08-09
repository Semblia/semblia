import { z } from "zod";

export const createAdminUserBodySchema = z
  .object({
    email: z.string().trim().email().max(320),
    clerkUserId: z.string().trim().min(1).max(255),
    notes: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const adminUserParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export type CreateAdminUserBodyDto = z.infer<
  typeof createAdminUserBodySchema
>;
export type AdminUserParamsDto = z.infer<typeof adminUserParamsSchema>;
