import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createWidgetBodySchema,
  projectWidgetsParamsSchema,
  updateWidgetBodySchema,
  wallSlugParamsSchema,
  widgetIdParamsSchema,
  type CreateWidgetBodyDto,
  type ProjectWidgetsParamsDto,
  type UpdateWidgetBodyDto,
  type WallSlugParamsDto,
  type WidgetIdParamsDto,
} from "./widgets.dto.js";
import { WidgetsService } from "./widgets.service.js";

@Controller("widgets")
export class WidgetsController {
  constructor(@Inject(WidgetsService) private readonly widgetsService: WidgetsService) {}

  @Get("project/:projectId")
  list(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectWidgetsParamsSchema))
    params: ProjectWidgetsParamsDto,
  ) {
    return this.widgetsService.list(userId, params);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createWidgetBodySchema))
    body: CreateWidgetBodyDto,
  ) {
    return this.widgetsService.create(userId, body);
  }

  @Patch(":widgetId")
  update(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(widgetIdParamsSchema)) params: WidgetIdParamsDto,
    @Body(new ZodValidationPipe(updateWidgetBodySchema)) body: UpdateWidgetBodyDto,
  ) {
    return this.widgetsService.update(userId, params, body);
  }

  @Delete(":widgetId")
  delete(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(widgetIdParamsSchema)) params: WidgetIdParamsDto,
  ) {
    return this.widgetsService.delete(userId, params);
  }

  @Public()
  @Get(":widgetId/public")
  getPublic(
    @Param(new ZodValidationPipe(widgetIdParamsSchema)) params: WidgetIdParamsDto,
  ) {
    return this.widgetsService.getPublic(params);
  }

  @Public()
  @Get("walls/:wallSlug")
  getPublicWall(
    @Param(new ZodValidationPipe(wallSlugParamsSchema)) params: WallSlugParamsDto,
  ) {
    return this.widgetsService.getPublicWall(params);
  }

  @Public()
  @Get("embed/:widgetId")
  renderEmbed(
    @Param(new ZodValidationPipe(widgetIdParamsSchema)) params: WidgetIdParamsDto,
  ) {
    return this.widgetsService.renderEmbed(params);
  }
}
