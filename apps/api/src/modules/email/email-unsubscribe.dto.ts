import { z } from "zod";

export const emailUnsubscribeQuerySchema = z.object({
  token: z.string().trim().min(3).max(512),
});

export type EmailUnsubscribeQueryDto = z.infer<
  typeof emailUnsubscribeQuerySchema
>;
