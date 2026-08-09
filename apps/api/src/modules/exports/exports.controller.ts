import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createCsvExportBodySchema,
  exportDeliveriesQuerySchema,
  exportDeliveryParamsSchema,
  type CreateCsvExportBodyDto,
  type ExportDeliveriesQueryDto,
  type ExportDeliveryParamsDto,
} from "./exports.dto.js";
import { ExportsService } from "./exports.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/exports")
@UseGuards(CapabilityGuard)
export class ExportsController {
  constructor(
    @Inject(ExportsService) private readonly exportsService: ExportsService,
  ) {}

  @Post("csv")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  createCsvExport(
    @Body(new ZodValidationPipe(createCsvExportBodySchema))
    body: CreateCsvExportBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.exportsService.createCsvExport(
      this.getProjectId(request),
      body,
      actor,
    );
  }

  @Get("deliveries")
  @RequireCapability(Capability.VIEW_INTEGRATIONS)
  listDeliveries(
    @Query(new ZodValidationPipe(exportDeliveriesQuerySchema))
    query: ExportDeliveriesQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.exportsService.listDeliveries(
      this.getProjectId(request),
      query,
    );
  }

  @Get("deliveries/:deliveryId")
  @RequireCapability(Capability.VIEW_INTEGRATIONS)
  getDelivery(
    @Param(new ZodValidationPipe(exportDeliveryParamsSchema))
    params: ExportDeliveryParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.exportsService.getDelivery(
      this.getProjectId(request),
      params.deliveryId,
    );
  }

  @Get("deliveries/:deliveryId/download")
  @RequireCapability(Capability.VIEW_INTEGRATIONS)
  async downloadDelivery(
    @Param(new ZodValidationPipe(exportDeliveryParamsSchema))
    params: ExportDeliveryParamsDto,
    @Req() request: ProjectRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const url = await this.exportsService.getCsvDownload(
      this.getProjectId(request),
      params.deliveryId,
    );

    response.redirect(302, url);
  }

  private getProjectId(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "ExportsController requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }
}
