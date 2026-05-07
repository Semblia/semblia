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
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createSubmissionAnnotationBodySchema,
  moderateSubmissionBodySchema,
  submissionParamsSchema,
  submissionsListQuerySchema,
  type CreateSubmissionAnnotationBodyDto,
  type ModerateSubmissionBodyDto,
  type SubmissionParamsDto,
  type SubmissionsListQueryDto,
} from "./submissions.dto.js";
import { SubmissionsService } from "./submissions.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/submissions")
@UseGuards(CapabilityGuard)
export class SubmissionsController {
  constructor(
    @Inject(SubmissionsService)
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Get()
  @RequireCapability(Capability.VIEW_PROJECT)
  list(
    @Query(new ZodValidationPipe(submissionsListQuerySchema))
    query: SubmissionsListQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.submissionsService.list(query, request);
  }

  @Get(":submissionId")
  @RequireCapability(Capability.VIEW_PROJECT)
  getById(
    @Param(new ZodValidationPipe(submissionParamsSchema))
    params: SubmissionParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.submissionsService.getById(params, request);
  }

  @Post(":submissionId/annotations")
  @RequireCapability(Capability.REVIEW_TESTIMONIALS)
  createAnnotation(
    @Param(new ZodValidationPipe(submissionParamsSchema))
    params: SubmissionParamsDto,
    @Body(new ZodValidationPipe(createSubmissionAnnotationBodySchema))
    body: CreateSubmissionAnnotationBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.submissionsService.createAnnotation(
      params,
      body,
      request,
      actor,
    );
  }

  @Post(":submissionId/moderation")
  @RequireCapability(Capability.REVIEW_TESTIMONIALS)
  moderate(
    @Param(new ZodValidationPipe(submissionParamsSchema))
    params: SubmissionParamsDto,
    @Body(new ZodValidationPipe(moderateSubmissionBodySchema))
    body: ModerateSubmissionBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.submissionsService.moderate(params, body, request, actor);
  }
}
