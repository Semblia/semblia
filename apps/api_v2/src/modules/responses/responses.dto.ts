import { createHash } from "node:crypto";
import { z } from "zod";
import { paginationQuerySchema } from "../../common/dto/pagination.dto.js";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";

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
  status: z
    .enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED", "ALL"])
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

export const moderateResponseBodySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]),
  reason: trimmedNullableString(2_000),
  metadata: opaqueJsonObjectSchema.nullable().optional(),
});

export const publicProjectSlugParamsSchema = projectSlugParamsSchema;

export const publicResponsesListQuerySchema = paginationQuerySchema;

export const publicSubmitHeadersSchema = z.object({
  "x-tresta-signature": z.string().trim().min(1).optional(),
  "x-tresta-timestamp": z.string().trim().min(1).optional(),
  "idempotency-key": z.string().trim().min(1).max(255).optional(),
  origin: z.string().trim().min(1).optional(),
  "user-agent": z.string().optional(),
  "x-forwarded-for": z.string().optional(),
});

export const createPublicResponseBodySchema = z.object({
  authorName: z.string().trim().min(1).max(255),
  authorEmail: z.string().email().nullable().optional(),
  authorRole: trimmedNullableString(255),
  authorCompany: trimmedNullableString(255),
  authorAvatarAssetId: z.string().trim().min(1).nullable().optional(),
  content: z.string().trim().min(1),
  type: z.enum(["TEXT", "VIDEO", "AUDIO"]).optional(),
  videoAssetId: z.string().trim().min(1).nullable().optional(),
  mediaAssetId: z.string().trim().min(1).nullable().optional(),
  source: trimmedNullableString(100),
  sourceUrl: z.string().url().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  isOAuthVerified: z.boolean().optional(),
  oauthProvider: trimmedNullableString(50),
});

export function hashIdempotencyPayload(rawBody: Buffer | string | undefined) {
  const payload =
    typeof rawBody === "string"
      ? rawBody
      : Buffer.isBuffer(rawBody)
        ? rawBody.toString("utf8")
        : "";

  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export type ResponsesListQueryDto = z.infer<typeof responsesListQuerySchema>;
export type ResponseParamsDto = z.infer<typeof responseParamsSchema>;
export type CreateResponseAnnotationBodyDto = z.infer<
  typeof createResponseAnnotationBodySchema
>;
export type ModerateResponseBodyDto = z.infer<
  typeof moderateResponseBodySchema
>;
export type PublicProjectSlugParamsDto = z.infer<
  typeof publicProjectSlugParamsSchema
>;
export type PublicResponsesListQueryDto = z.infer<
  typeof publicResponsesListQuerySchema
>;
export type CreatePublicResponseBodyDto = z.infer<
  typeof createPublicResponseBodySchema
>;
