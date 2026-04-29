import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Throttle, seconds } from "@nestjs/throttler";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createFormBodySchema,
  formIdParamsSchema,
  projectFormsParamsSchema,
  publicFormSubmissionBodySchema,
  updateFormBodySchema,
  type CreateFormBodyDto,
  type FormIdParamsDto,
  type ProjectFormsParamsDto,
  type PublicFormSubmissionBodyDto,
  type UpdateFormBodyDto,
} from "./forms.dto.js";
import { FormsService } from "./forms.service.js";

@Controller("forms")
export class FormsController {
  constructor(
    @Inject(FormsService) private readonly formsService: FormsService,
  ) {}

  @Get("project/:projectId")
  list(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectFormsParamsSchema))
    params: ProjectFormsParamsDto,
  ) {
    return this.formsService.list(userId, params);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createFormBodySchema)) body: CreateFormBodyDto,
  ) {
    return this.formsService.create(userId, body);
  }

  @Get(":formId")
  getById(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(formIdParamsSchema)) params: FormIdParamsDto,
  ) {
    return this.formsService.getById(userId, params);
  }

  @Patch(":formId")
  update(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(formIdParamsSchema)) params: FormIdParamsDto,
    @Body(new ZodValidationPipe(updateFormBodySchema)) body: UpdateFormBodyDto,
  ) {
    return this.formsService.update(userId, params, body);
  }

  @Delete(":formId")
  delete(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(formIdParamsSchema)) params: FormIdParamsDto,
  ) {
    return this.formsService.delete(userId, params);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: seconds(60) } })
  @Post(":formId/submissions")
  submitPublic(
    @Param(new ZodValidationPipe(formIdParamsSchema)) params: FormIdParamsDto,
    @Body(new ZodValidationPipe(publicFormSubmissionBodySchema))
    body: PublicFormSubmissionBodyDto,
  ) {
    return this.formsService.submitPublic(params, body);
  }
}
