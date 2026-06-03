import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
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
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { PublicSubmitThrottlerGuard } from "./public-submit-throttler.guard.js";
import {
  createPublicResponseBodySchema,
  createResponseAnnotationBodySchema,
  moderateResponseBodySchema,
  publicProjectSlugParamsSchema,
  publicResponsesListQuerySchema,
  responseParamsSchema,
  responsesListQuerySchema,
  type CreatePublicResponseBodyDto,
  type CreateResponseAnnotationBodyDto,
  type ModerateResponseBodyDto,
  type PublicProjectSlugParamsDto,
  type PublicResponsesListQueryDto,
  type ResponseParamsDto,
  type ResponsesListQueryDto,
} from "./responses.dto.js";
import { ResponsesService } from "./responses.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

type PublicSubmitRequest = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

@Controller("projects/:slug/responses")
@UseGuards(CapabilityGuard)
export class ResponsesController {
  constructor(
    @Inject(ResponsesService)
    private readonly responsesService: ResponsesService,
  ) {}

  @Get()
  @RequireCapability(Capability.VIEW_PROJECT)
  list(
    @Query(new ZodValidationPipe(responsesListQuerySchema))
    query: ResponsesListQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.responsesService.list(query, request);
  }

  @Get(":responseId")
  @RequireCapability(Capability.VIEW_PROJECT)
  getById(
    @Param(new ZodValidationPipe(responseParamsSchema))
    params: ResponseParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.responsesService.getById(params, request);
  }

  @Post(":responseId/annotations")
  @RequireCapability(Capability.REVIEW_RESPONSES)
  createAnnotation(
    @Param(new ZodValidationPipe(responseParamsSchema))
    params: ResponseParamsDto,
    @Body(new ZodValidationPipe(createResponseAnnotationBodySchema))
    body: CreateResponseAnnotationBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.responsesService.createAnnotation(params, body, request, actor);
  }

  @Post(":responseId/moderation")
  @RequireCapability(Capability.REVIEW_RESPONSES)
  moderate(
    @Param(new ZodValidationPipe(responseParamsSchema))
    params: ResponseParamsDto,
    @Body(new ZodValidationPipe(moderateResponseBodySchema))
    body: ModerateResponseBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.responsesService.moderate(params, body, request, actor);
  }
}

@Controller("responses")
export class PublicResponsesController {
  constructor(
    @Inject(ResponsesService)
    private readonly responsesService: ResponsesService,
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
    @Body(new ZodValidationPipe(createPublicResponseBodySchema))
    body: CreatePublicResponseBodyDto,
    @Req() request: PublicSubmitRequest,
  ) {
    return this.responsesService.createPublic(params, body, request);
  }

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get("/public/projects/:slug")
  listPublic(
    @Param(new ZodValidationPipe(publicProjectSlugParamsSchema))
    params: PublicProjectSlugParamsDto,
    @Query(new ZodValidationPipe(publicResponsesListQuerySchema))
    query: PublicResponsesListQueryDto,
  ) {
    return this.responsesService.listPublic(params, query);
  }
}
