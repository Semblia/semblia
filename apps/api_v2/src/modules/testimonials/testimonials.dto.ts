import { z } from "zod";
import { paginationQuerySchema } from "../../common/dto/pagination.dto.js";

export const testimonialsListQuerySchema = paginationQuerySchema.extend({
  projectId: z.string().trim().min(1),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED", "ALL"]).optional(),
  type: z.enum(["TEXT", "VIDEO", "AUDIO", "ALL"]).optional(),
  search: z.string().trim().optional(),
  sort: z.enum(["newest", "oldest", "rating_desc", "rating_asc"]).optional(),
});

export const testimonialDetailParamsSchema = z.object({
  testimonialId: z.string().trim().min(1),
});

export const testimonialDetailQuerySchema = z.object({
  projectId: z.string().trim().min(1),
});

export const moderationActionParamsSchema = z.object({
  testimonialId: z.string().trim().min(1),
});

export const publishTestimonialBodySchema = z.object({
  published: z.boolean(),
});

export const publicProjectSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export const createPublicTestimonialBodySchema = z.object({
  authorName: z.string().trim().min(1).max(255),
  authorEmail: z.string().email().nullable().optional(),
  authorRole: z.string().trim().nullable().optional(),
  authorCompany: z.string().trim().nullable().optional(),
  authorAvatar: z.string().url().nullable().optional(),
  content: z.string().trim().min(1),
  type: z.enum(["TEXT", "VIDEO", "AUDIO"]).optional(),
  videoUrl: z.string().url().nullable().optional(),
  mediaUrl: z.string().url().nullable().optional(),
  source: z.string().trim().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
});

export type TestimonialsListQueryDto = z.infer<typeof testimonialsListQuerySchema>;
export type TestimonialDetailParamsDto = z.infer<typeof testimonialDetailParamsSchema>;
export type TestimonialDetailQueryDto = z.infer<typeof testimonialDetailQuerySchema>;
export type ModerationActionParamsDto = z.infer<typeof moderationActionParamsSchema>;
export type PublishTestimonialBodyDto = z.infer<typeof publishTestimonialBodySchema>;
export type PublicProjectSlugParamsDto = z.infer<typeof publicProjectSlugParamsSchema>;
export type CreatePublicTestimonialBodyDto = z.infer<
  typeof createPublicTestimonialBodySchema
>;
