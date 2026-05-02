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
import {
  createWidgetBodySchema,
  publicWidgetParamsSchema,
  projectWidgetsParamsSchema,
  studioDraftBodySchema,
  updateWidgetBodySchema,
  wallSlugParamsSchema,
  widgetParamsSchema,
  type CreateWidgetBodyDto,
  type ProjectWidgetsParamsDto,
  type PublicWidgetParamsDto,
  type StudioDraftBodyDto,
  type UpdateWidgetBodyDto,
  type WallSlugParamsDto,
  type WidgetParamsDto,
} from "./widgets.dto.js";
import { WidgetsService } from "./widgets.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/widgets")
export class WidgetsController {
  constructor(
    @Inject(WidgetsService) private readonly widgetsService: WidgetsService,
  ) {}

  @Get()
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  list(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(projectWidgetsParamsSchema))
    params: ProjectWidgetsParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.widgetsService.list(params, request);
  }

  @Post()
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  create(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(projectWidgetsParamsSchema))
    params: ProjectWidgetsParamsDto,
    @Body(new ZodValidationPipe(createWidgetBodySchema))
    body: CreateWidgetBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.widgetsService.create(params, body, request);
  }

  @Get(":widgetId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  getById(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(widgetParamsSchema)) params: WidgetParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.widgetsService.getById(params, request);
  }

  @Patch(":widgetId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  update(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(widgetParamsSchema)) params: WidgetParamsDto,
    @Body(new ZodValidationPipe(updateWidgetBodySchema))
    body: UpdateWidgetBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.widgetsService.update(params, body, request);
  }

  @Delete(":widgetId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  delete(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(widgetParamsSchema)) params: WidgetParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.widgetsService.delete(params, request);
  }

  @Get(":widgetId/draft")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  getDraft(
    @CurrentUserId() _userId: string,
    @Param(new ZodValidationPipe(widgetParamsSchema)) params: WidgetParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.widgetsService.getDraft(params, request);
  }

  @Put(":widgetId/draft")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PUBLISH_SURFACES)
  saveDraft(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(widgetParamsSchema)) params: WidgetParamsDto,
    @Body(new ZodValidationPipe(studioDraftBodySchema))
    body: StudioDraftBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.widgetsService.saveDraft(params, body, request, userId);
  }
}

@Controller("widget-embeds")
export class PublicWidgetEmbedsController {
  constructor(
    @Inject(WidgetsService) private readonly widgetsService: WidgetsService,
  ) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get(":widgetId")
  getById(
    @Param(new ZodValidationPipe(publicWidgetParamsSchema))
    params: PublicWidgetParamsDto,
  ) {
    return this.widgetsService.getPublicEmbed(params);
  }
}

@Controller("walls")
export class PublicWallsController {
  constructor(
    @Inject(WidgetsService) private readonly widgetsService: WidgetsService,
  ) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "public-list": { limit: 120, ttl: seconds(60) } })
  @Get(":wallSlug")
  getBySlug(
    @Param(new ZodValidationPipe(wallSlugParamsSchema))
    params: WallSlugParamsDto,
  ) {
    return this.widgetsService.getPublicWall(params);
  }
}
