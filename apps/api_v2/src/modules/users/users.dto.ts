import { z } from "zod";

export const clerkEmailAddressSchema = z.object({
  emailAddress: z.string().email(),
});

export const clerkUserPayloadSchema = z.object({
  id: z.string().min(1),
  emailAddresses: z.array(clerkEmailAddressSchema),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
});

export const clerkWebhookEventSchema = z.object({
  type: z.string().min(1),
  data: clerkUserPayloadSchema,
});

export const updateUserProfileBodySchema = z.object({
  firstName: z.string().trim().min(1).max(255).nullable().optional(),
  lastName: z.string().trim().min(1).max(255).nullable().optional(),
  avatar: z.string().url().nullable().optional(),
});

export type ClerkUserPayloadDto = z.infer<typeof clerkUserPayloadSchema>;
export type ClerkWebhookEventDto = z.infer<typeof clerkWebhookEventSchema>;
export type UpdateUserProfileBodyDto = z.infer<
  typeof updateUserProfileBodySchema
>;
