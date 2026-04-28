import { z } from "zod";

export const razorpayWebhookBodySchema = z.record(z.string(), z.unknown());

export type RazorpayWebhookBodyDto = z.infer<typeof razorpayWebhookBodySchema>;
