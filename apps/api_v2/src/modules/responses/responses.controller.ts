import {
  Body,
  Controller,
  Delete,
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
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { PublicSubmitThrottlerGuard } from "./public-submit-throttler.guard.js";
import {
  createResponseAnnotationBodySchema,
  responseParamsSchema,
  responsesListQuerySchema,
  runtimeFormSubmitBodySchema,
  runtimeFormSubmitParamsSchema,
  runtimeFormSubmitQuerySchema,
  runtimeFormUploadBodySchema,
  runtimeFormUploadParamsSchema,
  runtimeFormUploadQuerySchema,
  updateResponsePublishBodySchema,
  updateResponseStatusBodySchema,
  type CreateResponseAnnotationBodyDto,
  type ResponseParamsDto,
  type ResponsesListQueryDto,
  type RuntimeFormSubmitBodyDto,
  type RuntimeFormSubmitParamsDto,
  type RuntimeFormSubmitQueryDto,
  type RuntimeFormUploadBodyDto,
  type RuntimeFormUploadParamsDto,
  type RuntimeFormUploadQueryDto,
  type UpdateResponsePublishBodyDto,
  type UpdateResponseStatusBodyDto,
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

  @Patch(":responseId/status")
  @RequireCapability(Capability.REVIEW_RESPONSES)
  updateStatus(
    @Param(new ZodValidationPipe(responseParamsSchema))
    params: ResponseParamsDto,
    @Body(new ZodValidationPipe(updateResponseStatusBodySchema))
    body: UpdateResponseStatusBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.responsesService.updateStatus(params, body, request, actor);
  }

  @Patch(":responseId/publish")
  @RequireCapability(Capability.PUBLISH_RESPONSES)
  updatePublish(
    @Param(new ZodValidationPipe(responseParamsSchema))
    params: ResponseParamsDto,
    @Body(new ZodValidationPipe(updateResponsePublishBodySchema))
    body: UpdateResponsePublishBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.responsesService.updatePublish(params, body, request, actor);
  }

  @Delete(":responseId")
  @RequireCapability(Capability.REVIEW_RESPONSES)
  delete(
    @Param(new ZodValidationPipe(responseParamsSchema))
    params: ResponseParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.responsesService.delete(params, request, actor);
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
}

@Controller("runtime/forms")
export class RuntimeFormSubmissionsController {
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
  @Post(":slug/submissions")
  submit(
    @Param(new ZodValidationPipe(runtimeFormSubmitParamsSchema))
    params: RuntimeFormSubmitParamsDto,
    @Query(new ZodValidationPipe(runtimeFormSubmitQuerySchema))
    query: RuntimeFormSubmitQueryDto,
    @Body(new ZodValidationPipe(runtimeFormSubmitBodySchema))
    body: RuntimeFormSubmitBodyDto,
    @Req() request: PublicSubmitRequest,
  ) {
    return this.responsesService.submitRuntimeForm(params, query, body, request);
  }

  @Public()
  @SkipThrottle()
  @UseGuards(PublicSubmitThrottlerGuard)
  @Throttle({
    "public-media-intent": { limit: 20, ttl: seconds(60) },
    "public-submit-hmac": { limit: 120, ttl: seconds(60) },
  })
  @Post(":slug/uploads/presign")
  presignUpload(
    @Param(new ZodValidationPipe(runtimeFormUploadParamsSchema))
    params: RuntimeFormUploadParamsDto,
    @Query(new ZodValidationPipe(runtimeFormUploadQuerySchema))
    query: RuntimeFormUploadQueryDto,
    @Body(new ZodValidationPipe(runtimeFormUploadBodySchema))
    body: RuntimeFormUploadBodyDto,
    @Req() request: PublicSubmitRequest,
  ) {
    return this.responsesService.presignRuntimeUpload(
      params,
      query,
      body,
      request,
    );
  }
}
