import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createFormBodySchema,
  formParamsSchema,
  formVersionParamsSchema,
  projectFormsParamsSchema,
  saveFormDraftBodySchema,
  updateFormBodySchema,
  type CreateFormBodyDto,
  type FormParamsDto,
  type FormVersionParamsDto,
  type ProjectFormsParamsDto,
  type SaveFormDraftBodyDto,
  type UpdateFormBodyDto,
} from "./forms.dto.js";
import { FormsService } from "./forms.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/forms")
export class FormsController {
  constructor(@Inject(FormsService) private readonly formsService: FormsService) {}

  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
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
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  create(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectFormsParamsSchema))
    params: ProjectFormsParamsDto,
    @Body(new ZodValidationPipe(createFormBodySchema))
    body: CreateFormBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.create(params, body, request, userId);
  }

  @Get(":formId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  getById(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.getById(params, request);
  }

  @Patch(":formId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  update(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Body(new ZodValidationPipe(updateFormBodySchema))
    body: UpdateFormBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.update(params, body, request);
  }

  @Delete(":formId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  delete(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.delete(params, request);
  }

  @Get(":formId/draft")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  getDraft(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.getDraft(params, request);
  }

  @Patch(":formId/draft")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  saveDraft(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Body(new ZodValidationPipe(saveFormDraftBodySchema))
    body: SaveFormDraftBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.saveDraft(params, body, request, userId);
  }

  @Post(":formId/publish")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  publish(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.publish(params, request);
  }

  @Get(":formId/versions")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  listVersions(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formParamsSchema)) params: FormParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.listVersions(params, request);
  }

  @Get(":formId/versions/:version")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  getVersion(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(formVersionParamsSchema))
    params: FormVersionParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.formsService.getVersion(params, request);
  }
}
