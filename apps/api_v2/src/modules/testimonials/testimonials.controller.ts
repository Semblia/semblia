import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle, Throttle, seconds } from "@nestjs/throttler";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { PublicSubmitThrottlerGuard } from "./public-submit-throttler.guard.js";
import {
  createPublicTestimonialBodySchema,
  publicProjectSlugParamsSchema,
  publicTestimonialsListQuerySchema,
  publishTestimonialBodySchema,
  testimonialParamsSchema,
  testimonialsListQuerySchema,
  type CreatePublicTestimonialBodyDto,
  type PublicProjectSlugParamsDto,
  type PublicTestimonialsListQueryDto,
  type PublishTestimonialBodyDto,
  type TestimonialParamsDto,
  type TestimonialsListQueryDto,
} from "./testimonials.dto.js";
import { TestimonialsService } from "./testimonials.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

type PublicSubmitRequest = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

@Controller("projects/:slug/testimonials")
export class TestimonialsController {
  constructor(
    @Inject(TestimonialsService)
    private readonly testimonialsService: TestimonialsService,
  ) {}

  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.REVIEW_TESTIMONIALS)
  list(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(publicProjectSlugParamsSchema))
    _params: PublicProjectSlugParamsDto,
    @Query(new ZodValidationPipe(testimonialsListQuerySchema))
    query: TestimonialsListQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.testimonialsService.list(query, request);
  }

  @Get(":submissionId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.REVIEW_TESTIMONIALS)
  getById(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(testimonialParamsSchema))
    params: TestimonialParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.testimonialsService.getById(params, request);
  }

  @Patch(":submissionId/approve")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.REVIEW_TESTIMONIALS)
  approve(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(testimonialParamsSchema))
    params: TestimonialParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.testimonialsService.approve(params, request, actor);
  }

  @Patch(":submissionId/reject")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.REVIEW_TESTIMONIALS)
  reject(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(testimonialParamsSchema))
    params: TestimonialParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.testimonialsService.reject(params, request, actor);
  }

  @Patch(":submissionId/publish")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.PUBLISH_TESTIMONIALS)
  publish(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(testimonialParamsSchema))
    params: TestimonialParamsDto,
    @Body(new ZodValidationPipe(publishTestimonialBodySchema))
    body: PublishTestimonialBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.testimonialsService.publish(params, body, request, actor);
  }

}

@Controller("testimonials")
export class PublicTestimonialsController {
  constructor(
    @Inject(TestimonialsService)
    private readonly testimonialsService: TestimonialsService,
  ) {}

  @Public()
  @SkipThrottle()
  @UseGuards(PublicSubmitThrottlerGuard)
  @Throttle({
    "public-submit-browser": { limit: 10, ttl: seconds(60) },
    "public-submit-hmac": { limit: 120, ttl: seconds(60) },
  })
  @Post("/public/projects/:slug")
  createPublic(
    @Param(new ZodValidationPipe(publicProjectSlugParamsSchema))
    params: PublicProjectSlugParamsDto,
    @Body(new ZodValidationPipe(createPublicTestimonialBodySchema))
    body: CreatePublicTestimonialBodyDto,
    @Req() request: PublicSubmitRequest,
  ) {
    return this.testimonialsService.createPublic(params, body, request);
  }

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get("/public/projects/:slug")
  listPublic(
    @Param(new ZodValidationPipe(publicProjectSlugParamsSchema))
    params: PublicProjectSlugParamsDto,
    @Query(new ZodValidationPipe(publicTestimonialsListQuerySchema))
    query: PublicTestimonialsListQueryDto,
  ) {
    return this.testimonialsService.listPublic(params, query);
  }
}
