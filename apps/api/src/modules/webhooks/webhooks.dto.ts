import { z } from "zod";

const razorpayNotesSchema = z.record(z.string(), z.unknown()).optional();

export const razorpaySubscriptionEntitySchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    current_start: z.number().int().optional(),
    current_end: z.number().int().optional(),
    plan_id: z.string().optional(),
    customer_id: z.string().optional(),
    amount: z.number().int().optional(),
    currency: z.string().optional(),
    interval: z.string().optional(),
    period: z.string().optional(),
    notes: razorpayNotesSchema,
  })
  .passthrough();

export const razorpayPaymentEntitySchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    subscription_id: z.string().optional(),
    invoice_id: z.string().optional(),
    token_id: z.string().optional(),
    card_id: z.string().optional(),
    method: z.string().optional(),
    card: z
      .object({
        last4: z.string().optional(),
        network: z.string().optional(),
        expiry_month: z.number().int().optional(),
        expiry_year: z.number().int().optional(),
      })
      .passthrough()
      .optional(),
    amount: z.number().int().optional(),
    currency: z.string().optional(),
    created_at: z.number().int().optional(),
    notes: razorpayNotesSchema,
  })
  .passthrough();

export const razorpayInvoiceEntitySchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    subscription_id: z.string().optional(),
    payment_id: z.string().optional(),
    amount: z.number().int().optional(),
    amount_paid: z.number().int().optional(),
    currency: z.string().optional(),
    short_url: z.string().url().optional(),
    invoice_number: z.string().optional(),
    description: z.string().optional(),
    customer_id: z.string().optional(),
    created_at: z.number().int().optional(),
    issued_at: z.number().int().optional(),
    paid_at: z.number().int().optional(),
    notes: razorpayNotesSchema,
  })
  .passthrough();

export const razorpayPlanEntitySchema = z
  .object({
    id: z.string().optional(),
    period: z.string().optional(),
    interval: z.string().optional(),
    amount: z.number().int().optional(),
    currency: z.string().optional(),
    item: z
      .object({
        amount: z.number().int().optional(),
        currency: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const razorpaySubscriptionPayloadSchema = z
  .object({
    entity: razorpaySubscriptionEntitySchema.optional(),
  })
  .passthrough();

export const razorpayPaymentPayloadSchema = z
  .object({
    entity: razorpayPaymentEntitySchema.optional(),
  })
  .passthrough();

export const razorpayInvoicePayloadSchema = z
  .object({
    entity: razorpayInvoiceEntitySchema.optional(),
  })
  .passthrough();

export const razorpayPlanPayloadSchema = z
  .object({
    entity: razorpayPlanEntitySchema.optional(),
  })
  .passthrough();

export const razorpayWebhookBodySchema = z
  .object({
    event: z.string().min(1),
    account_id: z.string().optional(),
    payload: z
      .object({
        subscription: razorpaySubscriptionPayloadSchema.optional(),
        payment: razorpayPaymentPayloadSchema.optional(),
        invoice: razorpayInvoicePayloadSchema.optional(),
        plan: razorpayPlanPayloadSchema.optional(),
      })
      .passthrough()
      .optional(),
    created_at: z.number().int().optional(),
  })
  .passthrough();

export type RazorpaySubscriptionEntityDto = z.infer<
  typeof razorpaySubscriptionEntitySchema
>;
export type RazorpayPaymentEntityDto = z.infer<
  typeof razorpayPaymentEntitySchema
>;
export type RazorpayInvoiceEntityDto = z.infer<
  typeof razorpayInvoiceEntitySchema
>;
export type RazorpayPlanEntityDto = z.infer<typeof razorpayPlanEntitySchema>;
export type RazorpayWebhookBodyDto = z.infer<typeof razorpayWebhookBodySchema>;
