import { z } from "zod";

export const billingPlanSchema = z.enum(["FREE", "PRO", "BUSINESS"]);

export const switchSubscriptionBodySchema = z
  .object({
    planId: billingPlanSchema,
  })
  .strict();

export const paymentMethodParamsSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

const optionalText = z.string().trim().max(500).optional();

export const updateBillingProfileBodySchema = z
  .object({
    name: z.string().trim().max(255).optional(),
    line1: z.string().trim().max(500).optional(),
    line2: optionalText,
    city: z.string().trim().max(255).optional(),
    state: z.string().trim().max(255).optional(),
    postalCode: z.string().trim().max(32).optional(),
    country: z.string().trim().length(2).optional(),
    gstin: z.string().trim().max(32).optional(),
  })
  .strict();

export type SwitchSubscriptionBodyDto = z.infer<
  typeof switchSubscriptionBodySchema
>;
export type PaymentMethodParamsDto = z.infer<typeof paymentMethodParamsSchema>;
export type UpdateBillingProfileBodyDto = z.infer<
  typeof updateBillingProfileBodySchema
>;
