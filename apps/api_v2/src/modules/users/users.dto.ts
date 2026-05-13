import { z } from "zod";

export const clerkEmailAddressSchema = z.object({
  id: z.string().optional(),
  email_address: z.string().email(),
})
  .passthrough()
  .transform((emailAddress) => ({
    ...(emailAddress.id ? { id: emailAddress.id } : {}),
    emailAddress: emailAddress.email_address,
  }));

export const clerkUserPayloadSchema = z.object({
  id: z.string().min(1),
  email_addresses: z.array(clerkEmailAddressSchema),
  primary_email_address_id: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  profile_image_url: z.string().url().nullable().optional(),
})
  .passthrough()
  .transform((payload) => ({
    id: payload.id,
    emailAddresses: payload.email_addresses,
    ...(payload.primary_email_address_id
      ? { primaryEmailAddressId: payload.primary_email_address_id }
      : {}),
    firstName: payload.first_name ?? null,
    lastName: payload.last_name ?? null,
    imageUrl: payload.image_url ?? payload.profile_image_url ?? null,
  }));

export const clerkWebhookEventSchema = z.object({
  type: z.string().min(1),
  data: clerkUserPayloadSchema,
}).passthrough();

export const updateUserProfileBodySchema = z.object({
  firstName: z.string().trim().min(1).max(255).nullable().optional(),
  lastName: z.string().trim().min(1).max(255).nullable().optional(),
  avatar: z.string().url().nullable().optional(),
});

export const onboardingStepSchema = z.enum([
  "PROFILE",
  "REFERRAL",
  "INTENT",
  "PROJECT",
  "COLLECTION",
]);

const optionalTrimmedText = z.string().trim().min(1).max(255).optional();

export const onboardingDataPatchSchema = z
  .object({
    profile: z
      .object({
        firstName: optionalTrimmedText,
        lastName: optionalTrimmedText,
        jobTitle: optionalTrimmedText,
      })
      .optional(),
    referral: z
      .object({
        source: optionalTrimmedText,
        other: optionalTrimmedText,
      })
      .optional(),
    intent: z
      .object({
        intents: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
        other: optionalTrimmedText,
      })
      .optional(),
    project: z
      .object({
        id: optionalTrimmedText,
        name: optionalTrimmedText,
        slug: optionalTrimmedText,
        collectionUrl: z.string().url().optional(),
      })
      .optional(),
  })
  .strict();

export const updateOnboardingProgressBodySchema = z.object({
  step: onboardingStepSchema,
  data: onboardingDataPatchSchema.optional(),
});

export type ClerkUserPayloadDto = z.infer<typeof clerkUserPayloadSchema>;
export type ClerkWebhookEventDto = z.infer<typeof clerkWebhookEventSchema>;
export type UpdateUserProfileBodyDto = z.infer<
  typeof updateUserProfileBodySchema
>;
export type OnboardingDataPatchDto = z.infer<typeof onboardingDataPatchSchema>;
export type UpdateOnboardingProgressBodyDto = z.infer<
  typeof updateOnboardingProgressBodySchema
>;
