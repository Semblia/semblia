import { createHash } from "node:crypto";
import { z } from "zod";
import { paginationQuerySchema } from "../../common/dto/pagination.dto.js";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";

const trimmedNullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const testimonialsListQuerySchema = z.object({
  status: z
    .enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED", "ALL"])
    .default("ALL"),
  type: z.enum(["TEXT", "VIDEO", "AUDIO", "ALL"]).default("ALL"),
  search: z.string().trim().max(255).optional(),
  sort: z
    .enum(["newest", "oldest", "rating_desc", "rating_asc"])
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const testimonialParamsSchema = projectSlugParamsSchema.extend({
  testimonialId: z.string().trim().min(1),
});

export const displayRevisionParamsSchema = testimonialParamsSchema.extend({
  revisionId: z.string().trim().min(1),
});

export const publishTestimonialBodySchema = z.object({
  published: z.boolean(),
});

export const createDisplaySuggestionBodySchema = z.object({
  headline: trimmedNullableString(255),
  displayText: z.string().trim().min(1),
  reason: trimmedNullableString(2_000),
});

export const displayRevisionDecisionBodySchema = z.object({
  reason: trimmedNullableString(2_000),
});

export const publicProjectSlugParamsSchema = projectSlugParamsSchema;

export const publicTestimonialsListQuerySchema = paginationQuerySchema;

export const publicSubmitHeadersSchema = z.object({
  "x-tresta-signature": z.string().trim().min(1).optional(),
  "x-tresta-timestamp": z.string().trim().min(1).optional(),
  "idempotency-key": z.string().trim().min(1).max(255).optional(),
  origin: z.string().trim().min(1).optional(),
  "user-agent": z.string().optional(),
  "x-forwarded-for": z.string().optional(),
});

export const createPublicTestimonialBodySchema = z.object({
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

export type TestimonialsListQueryDto = z.infer<
  typeof testimonialsListQuerySchema
>;
export type TestimonialParamsDto = z.infer<typeof testimonialParamsSchema>;
export type DisplayRevisionParamsDto = z.infer<
  typeof displayRevisionParamsSchema
>;
export type PublishTestimonialBodyDto = z.infer<
  typeof publishTestimonialBodySchema
>;
export type CreateDisplaySuggestionBodyDto = z.infer<
  typeof createDisplaySuggestionBodySchema
>;
export type DisplayRevisionDecisionBodyDto = z.infer<
  typeof displayRevisionDecisionBodySchema
>;
export type PublicProjectSlugParamsDto = z.infer<
  typeof publicProjectSlugParamsSchema
>;
export type PublicTestimonialsListQueryDto = z.infer<
  typeof publicTestimonialsListQuerySchema
>;
export type CreatePublicTestimonialBodyDto = z.infer<
  typeof createPublicTestimonialBodySchema
>;
