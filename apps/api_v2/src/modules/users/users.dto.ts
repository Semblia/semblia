import { z } from "zod";

export const clerkEmailAddressSchema = z
  .object({
    id: z.string().optional(),
    email_address: z.string().email(),
  })
  .passthrough()
  .transform((emailAddress) => ({
    ...(emailAddress.id ? { id: emailAddress.id } : {}),
    emailAddress: emailAddress.email_address,
  }));

export const clerkUserPayloadSchema = z
  .object({
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

export const clerkEmailPayloadSchema = z
  .object({
    id: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    to_email_address: z.string().email().optional(),
    email_address: z.string().email().optional(),
    recipient_email_address: z.string().email().optional(),
    subject: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    html: z.string().min(1).optional(),
    body_plain: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    otp_code: z.string().min(1).optional(),
    magic_link: z.string().min(1).optional(),
    action_url: z.string().min(1).optional(),
  })
  .passthrough()
  .superRefine((payload, ctx) => {
    if (
      !payload.to_email_address &&
      !payload.email_address &&
      !payload.recipient_email_address
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Clerk email payload is missing a recipient email address",
        path: ["to_email_address"],
      });
    }
  })
  .transform((payload) => ({
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.slug ? { slug: payload.slug } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    toEmailAddress:
      payload.to_email_address ??
      payload.email_address ??
      payload.recipient_email_address!,
    ...(payload.subject ? { subject: payload.subject } : {}),
    ...((payload.body ?? payload.html)
      ? { body: payload.body ?? payload.html }
      : {}),
    ...((payload.body_plain ?? payload.text)
      ? { bodyPlain: payload.body_plain ?? payload.text }
      : {}),
    ...(payload.otp_code ? { otpCode: payload.otp_code } : {}),
    ...(payload.magic_link ? { magicLink: payload.magic_link } : {}),
    ...(payload.action_url ? { actionUrl: payload.action_url } : {}),
  }));

export const clerkSmsPayloadSchema = z
  .object({
    id: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    to_phone_number: z.string().min(1).optional(),
    phone_number: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    otp_code: z.string().min(1).optional(),
  })
  .passthrough()
  .transform((payload) => ({
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.slug ? { slug: payload.slug } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...((payload.to_phone_number ?? payload.phone_number)
      ? { toPhoneNumber: payload.to_phone_number ?? payload.phone_number }
      : {}),
    ...(payload.body ? { body: payload.body } : {}),
    ...(payload.otp_code ? { otpCode: payload.otp_code } : {}),
  }));

const clerkGenericPayloadSchema = z.object({}).passthrough();

type ClerkWebhookBaseDto = {
  type: string;
  data: unknown;
  [key: string]: unknown;
};

type ClerkWebhookPassthroughDto = Omit<ClerkWebhookBaseDto, "data">;

export type ClerkUserWebhookEventDto = ClerkWebhookPassthroughDto & {
  type: "user.created" | "user.updated";
  data: ClerkUserPayloadDto;
};

export type ClerkEmailWebhookEventDto = ClerkWebhookPassthroughDto & {
  type: "email.created";
  data: ClerkEmailPayloadDto;
};

export type ClerkSmsWebhookEventDto = ClerkWebhookPassthroughDto & {
  type: "sms.created";
  data: ClerkSmsPayloadDto;
};

export type ClerkGenericWebhookEventDto = ClerkWebhookPassthroughDto & {
  type: string;
  data: Record<string, unknown>;
};

export type ClerkWebhookEventDto =
  | ClerkUserWebhookEventDto
  | ClerkEmailWebhookEventDto
  | ClerkSmsWebhookEventDto
  | ClerkGenericWebhookEventDto;

export const clerkWebhookEventSchema: z.ZodType<ClerkWebhookEventDto> = z
  .object({
    type: z.string().min(1),
    data: z.unknown(),
  })
  .passthrough()
  .transform((event, ctx): ClerkWebhookEventDto => {
    if (event.type === "user.created" || event.type === "user.updated") {
      const parsed = clerkUserPayloadSchema.safeParse(event.data);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid Clerk user payload",
        });
        return z.NEVER;
      }

      return {
        ...event,
        type: event.type,
        data: parsed.data,
      };
    }

    if (event.type === "email.created") {
      const parsed = clerkEmailPayloadSchema.safeParse(event.data);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid Clerk email payload",
        });
        return z.NEVER;
      }

      return {
        ...event,
        type: "email.created",
        data: parsed.data,
      };
    }

    if (event.type === "sms.created") {
      const parsed = clerkSmsPayloadSchema.safeParse(event.data);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid Clerk SMS payload",
        });
        return z.NEVER;
      }

      return {
        ...event,
        type: "sms.created",
        data: parsed.data,
      };
    }

    const parsed = clerkGenericPayloadSchema.safeParse(event.data);
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid Clerk webhook payload data",
      });
      return z.NEVER;
    }

    return {
      ...event,
      data: parsed.data,
    };
  });

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
export type ClerkEmailPayloadDto = z.infer<typeof clerkEmailPayloadSchema>;
export type ClerkSmsPayloadDto = z.infer<typeof clerkSmsPayloadSchema>;
export type UpdateUserProfileBodyDto = z.infer<
  typeof updateUserProfileBodySchema
>;
export type OnboardingDataPatchDto = z.infer<typeof onboardingDataPatchSchema>;
export type UpdateOnboardingProgressBodyDto = z.infer<
  typeof updateOnboardingProgressBodySchema
>;
