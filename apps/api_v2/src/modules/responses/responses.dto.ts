import { createHash } from "node:crypto";
import { z } from "zod";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";
import { runtimeFormSnapshotParamsSchema } from "../forms/forms.dto.js";

const opaqueJsonObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Array.isArray(value), {
    message: "Expected a JSON object",
  });

const trimmedNullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const responsesListQuerySchema = z.object({
  reviewStatus: z
    .enum(["PENDING", "APPROVED", "REJECTED", "SPAM", "ARCHIVED", "ALL"])
    .default("ALL"),
  publishStatus: z
    .enum(["PRIVATE", "PUBLISHABLE", "PUBLISHED", "UNPUBLISHED", "ALL"])
    .default("ALL"),
  search: z.string().trim().max(255).optional(),
  sort: z
    .enum(["newest", "oldest", "rating_desc", "rating_asc"])
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const responseParamsSchema = projectSlugParamsSchema.extend({
  responseId: z.string().trim().min(1),
});

export const createResponseAnnotationBodySchema = z
  .object({
    note: trimmedNullableString(2_000),
    labels: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
    sentiment: trimmedNullableString(64),
    metadata: opaqueJsonObjectSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      Boolean(value.note) ||
      Boolean(value.sentiment) ||
      Boolean(value.metadata) ||
      Boolean(value.labels?.length),
    {
      message: "At least one annotation field must be provided",
    },
  );

export const updateResponseStatusBodySchema = z
  .object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "SPAM", "ARCHIVED"]),
    reason: trimmedNullableString(2_000),
    metadata: opaqueJsonObjectSchema.nullable().optional(),
  })
  .strict();

export const updateResponsePublishBodySchema = z
  .object({
    status: z.enum(["PRIVATE", "PUBLISHABLE", "PUBLISHED", "UNPUBLISHED"]),
    metadata: opaqueJsonObjectSchema.nullable().optional(),
  })
  .strict();

export const runtimeFormSubmitParamsSchema = runtimeFormSnapshotParamsSchema;
export const runtimeFormSubmitQuerySchema = z.object({
  projectId: z.string().trim().min(1),
});
export const runtimeFormUploadParamsSchema = runtimeFormSnapshotParamsSchema;
export const runtimeFormUploadQuerySchema = runtimeFormSubmitQuerySchema;

export const runtimeFormSubmitBodySchema = z
  .object({
    answers: opaqueJsonObjectSchema,
    consent: opaqueJsonObjectSchema.optional(),
    elapsedMs: z.number().int().nonnegative().optional(),
    honeypot: z.string().max(1_000).optional(),
    sourceMetadata: opaqueJsonObjectSchema.optional(),
  })
  .strict();

export const runtimeFormUploadBodySchema = z
  .object({
    purpose: z.literal("SUBMISSION_ATTACHMENT"),
    contentType: z.string().trim().min(1).max(255),
    byteSize: z.number().int().positive(),
    checksumSha256: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

export const publicSubmitHeadersSchema = z.object({
  "x-semblia-signature": z.string().trim().min(1).optional(),
  "x-semblia-timestamp": z.string().trim().min(1).optional(),
  "idempotency-key": z.string().trim().min(1).max(255).optional(),
  origin: z.string().trim().min(1).optional(),
  "user-agent": z.string().optional(),
  "x-forwarded-for": z.string().optional(),
});

export function hashIdempotencyPayload(
  rawBody: Buffer | string | undefined,
  fallbackBody?: unknown,
) {
  const payload =
    typeof rawBody === "string"
      ? rawBody
      : Buffer.isBuffer(rawBody)
        ? rawBody.toString("utf8")
        : JSON.stringify(fallbackBody ?? {});

  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export type ResponsesListQueryDto = z.infer<typeof responsesListQuerySchema>;
export type ResponseParamsDto = z.infer<typeof responseParamsSchema>;
export type CreateResponseAnnotationBodyDto = z.infer<
  typeof createResponseAnnotationBodySchema
>;
export type UpdateResponseStatusBodyDto = z.infer<
  typeof updateResponseStatusBodySchema
>;
export type UpdateResponsePublishBodyDto = z.infer<
  typeof updateResponsePublishBodySchema
>;
export type RuntimeFormSubmitParamsDto = z.infer<
  typeof runtimeFormSubmitParamsSchema
>;
export type RuntimeFormSubmitQueryDto = z.infer<
  typeof runtimeFormSubmitQuerySchema
>;
export type RuntimeFormSubmitBodyDto = z.infer<
  typeof runtimeFormSubmitBodySchema
>;
export type RuntimeFormUploadParamsDto = z.infer<
  typeof runtimeFormUploadParamsSchema
>;
export type RuntimeFormUploadQueryDto = z.infer<
  typeof runtimeFormUploadQuerySchema
>;
export type RuntimeFormUploadBodyDto = z.infer<
  typeof runtimeFormUploadBodySchema
>;
