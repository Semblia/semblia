import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createPublicTestimonialBodySchema,
  moderationActionParamsSchema,
  publicProjectSlugParamsSchema,
  publishTestimonialBodySchema,
  testimonialDetailParamsSchema,
  testimonialDetailQuerySchema,
  testimonialsListQuerySchema,
  type CreatePublicTestimonialBodyDto,
  type ModerationActionParamsDto,
  type PublicProjectSlugParamsDto,
  type PublishTestimonialBodyDto,
  type TestimonialDetailParamsDto,
  type TestimonialDetailQueryDto,
  type TestimonialsListQueryDto,
} from "./testimonials.dto.js";
import { TestimonialsService } from "./testimonials.service.js";

@Controller("testimonials")
export class TestimonialsController {
  constructor(
    @Inject(TestimonialsService)
    private readonly testimonialsService: TestimonialsService,
  ) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(testimonialsListQuerySchema))
    query: TestimonialsListQueryDto,
  ) {
    return this.testimonialsService.list(userId, query);
  }

  @Get(":testimonialId")
  getById(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(testimonialDetailParamsSchema))
    params: TestimonialDetailParamsDto,
    @Query(new ZodValidationPipe(testimonialDetailQuerySchema))
    query: TestimonialDetailQueryDto,
  ) {
    return this.testimonialsService.getById(userId, params, query);
  }

  @Patch(":testimonialId/approve")
  approve(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(moderationActionParamsSchema))
    params: ModerationActionParamsDto,
  ) {
    return this.testimonialsService.approve(userId, params);
  }

  @Patch(":testimonialId/reject")
  reject(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(moderationActionParamsSchema))
    params: ModerationActionParamsDto,
  ) {
    return this.testimonialsService.reject(userId, params);
  }

  @Patch(":testimonialId/publish")
  publish(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(moderationActionParamsSchema))
    params: ModerationActionParamsDto,
    @Body(new ZodValidationPipe(publishTestimonialBodySchema))
    body: PublishTestimonialBodyDto,
  ) {
    return this.testimonialsService.publish(userId, params, body);
  }

  @Public()
  @Post("public/projects/:slug")
  createPublic(
    @Param(new ZodValidationPipe(publicProjectSlugParamsSchema))
    params: PublicProjectSlugParamsDto,
    @Body(new ZodValidationPipe(createPublicTestimonialBodySchema))
    body: CreatePublicTestimonialBodyDto,
  ) {
    return this.testimonialsService.createPublic(params, body);
  }

  @Public()
  @Get("public/projects/:slug")
  listPublic(
    @Param(new ZodValidationPipe(publicProjectSlugParamsSchema))
    params: PublicProjectSlugParamsDto,
  ) {
    return this.testimonialsService.listPublic(params);
  }
}
