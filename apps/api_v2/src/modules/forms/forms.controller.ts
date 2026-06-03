import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle, Throttle, seconds } from "@nestjs/throttler";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import { PublicSubmitThrottlerGuard } from "../responses/public-submit-throttler.guard.js";
import {
  createFormBodySchema,
  createFormSubmissionBodySchema,
  formParamsSchema,
  hostedFormRequestContextSchema,
  projectFormsParamsSchema,
  publishStudioDraftBodySchema,
  publicFormsListQuerySchema,
  runtimeFormsSubmitBodySchema,
  studioDraftBodySchema,
  type CreateFormBodyDto,
  type CreateFormSubmissionBodyDto,
  type FormParamsDto,
  type HostedFormRequestContextDto,
  type ProjectFormsParamsDto,
  type PublishStudioDraftBodyDto,
  type PublicFormsListQueryDto,
  type RuntimeFormsSubmitBodyDto,
  type StudioDraftBodyDto,
  type UpdateFormBodyDto,
  updateFormBodySchema,
} from "./forms.dto.js";
import { FormsRuntimeSignatureService } from "./forms-runtime-signature.service.js";
import { FormsRuntimeThrottlerGuard } from "./forms-runtime-throttler.guard.js";
import { FormsService } from "./forms.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

type PublicSubmitRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

@Controller("projects/:slug/forms")
export class FormsController {
  constructor(
    @Inject(FormsService) private readonly formsService: FormsService,
  ) {}

  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  list(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(projectFormsParamsSchema))
    params: ProjectFormsParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.list(params, request);
  }

  @Post()
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  create(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(projectFormsParamsSchema))
    params: ProjectFormsParamsDto,
    @Body(new ZodValidationPipe(createFormBodySchema)) body: CreateFormBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.create(params, body, request);
  }

  @Get(":formId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  getById(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.getById(params, request);
  }

  @Patch(":formId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  update(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Body(new ZodValidationPipe(updateFormBodySchema)) body: UpdateFormBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.update(params, body, request);
  }

  @Post(":formId/duplicate")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  duplicate(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.duplicate(params, request);
  }

  @Delete(":formId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  delete(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.delete(params, request);
  }

  @Get(":formId/draft")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  getDraft(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.getDraft(params, request);
  }

  @Put(":formId/draft")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  saveDraft(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Body(new ZodValidationPipe(studioDraftBodySchema))
    body: StudioDraftBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.saveDraft(params, body, request, userId);
  }

  @Put(":formId/draft/publish")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  publishDraft(
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Body(new ZodValidationPipe(publishStudioDraftBodySchema))
    body: PublishStudioDraftBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.publishDraft(params, body, request);
  }
}

@Controller("forms")
export class PublicFormsController {
  constructor(
    @Inject(FormsService) private readonly formsService: FormsService,
  ) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get("/public/projects/:slug")
  listPublic(
    @Param(new ZodValidationPipe(projectFormsParamsSchema))
    params: ProjectFormsParamsDto,
    @Query(new ZodValidationPipe(publicFormsListQuerySchema))
    query: PublicFormsListQueryDto,
  ) {
    void query;
    return this.formsService.listPublic(params);
  }

  @Public()
  @SkipThrottle()
  @UseGuards(PublicSubmitThrottlerGuard)
  @Throttle({
    "public-submit-browser": { limit: 10, ttl: seconds(60) },
    "public-submit-hmac": { limit: 120, ttl: seconds(60) },
  })
  @Post("/public/projects/:slug/:formId/submissions")
  submitPublic(
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Body(new ZodValidationPipe(createFormSubmissionBodySchema))
    body: CreateFormSubmissionBodyDto,
    @Req() request: PublicSubmitRequest,
  ) {
    return this.formsService.submitPublic(params, body, request);
  }
}

@Controller("runtime/forms")
export class RuntimeFormsController {
  constructor(
    @Inject(FormsService) private readonly formsService: FormsService,
    @Inject(FormsRuntimeSignatureService)
    private readonly signatureService: FormsRuntimeSignatureService,
  ) {}

  @Public()
  @SkipThrottle()
  @UseGuards(FormsRuntimeThrottlerGuard)
  @Throttle({ "forms-runtime-resolve": { limit: 240, ttl: seconds(60) } })
  @Post("resolve")
  resolve(
    @Body(new ZodValidationPipe(hostedFormRequestContextSchema))
    body: HostedFormRequestContextDto,
    @Req() request: PublicSubmitRequest,
  ) {
    this.signatureService.verify(request, "/runtime/forms/resolve");
    return this.formsService.resolveRuntimeForm(body, request);
  }

  @Public()
  @SkipThrottle()
  @UseGuards(FormsRuntimeThrottlerGuard)
  @Throttle({ "forms-runtime-submit": { limit: 30, ttl: seconds(60) } })
  @Post("submit")
  submit(
    @Body(new ZodValidationPipe(runtimeFormsSubmitBodySchema))
    body: RuntimeFormsSubmitBodyDto,
    @Req() request: PublicSubmitRequest,
  ) {
    this.signatureService.verify(request, "/runtime/forms/submit");
    return this.formsService.submitRuntimeForm(body, request);
  }
}
