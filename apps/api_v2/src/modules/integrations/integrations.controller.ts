import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
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
  createIntegrationConnectionBodySchema,
  createNativeIntegrationExportBodySchema,
  integrationConnectionParamsSchema,
  updateIntegrationConnectionBodySchema,
  type CreateIntegrationConnectionBodyDto,
  type CreateNativeIntegrationExportBodyDto,
  type IntegrationConnectionParamsDto,
  type UpdateIntegrationConnectionBodyDto,
} from "./integrations.dto.js";
import { IntegrationsService } from "./integrations.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/integrations")
@UseGuards(CapabilityGuard)
export class IntegrationsController {
  constructor(
    @Inject(IntegrationsService)
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get()
  @RequireCapability(Capability.VIEW_INTEGRATIONS)
  async listConnections(@Req() request: ProjectRequest) {
    return {
      data: await this.integrationsService.listConnections(
        this.getProjectId(request),
      ),
    };
  }

  @Post("connections")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  createConnection(
    @Body(new ZodValidationPipe(createIntegrationConnectionBodySchema))
    body: CreateIntegrationConnectionBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.integrationsService.createConnection(
      this.getProjectId(request),
      body,
      actor,
    );
  }

  @Patch("connections/:connectionId")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  updateConnection(
    @Param(new ZodValidationPipe(integrationConnectionParamsSchema))
    params: IntegrationConnectionParamsDto,
    @Body(new ZodValidationPipe(updateIntegrationConnectionBodySchema))
    body: UpdateIntegrationConnectionBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.integrationsService.updateConnection(
      this.getProjectId(request),
      params.connectionId,
      body,
      actor,
    );
  }

  @Post("connections/:connectionId/disable")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  disableConnection(
    @Param(new ZodValidationPipe(integrationConnectionParamsSchema))
    params: IntegrationConnectionParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.integrationsService.disableConnection(
      this.getProjectId(request),
      params.connectionId,
      actor,
    );
  }

  @Post("connections/:connectionId/exports")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  createNativeExport(
    @Param(new ZodValidationPipe(integrationConnectionParamsSchema))
    params: IntegrationConnectionParamsDto,
    @Body(new ZodValidationPipe(createNativeIntegrationExportBodySchema))
    body: CreateNativeIntegrationExportBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.integrationsService.createNativeExport(
      this.getProjectId(request),
      params.connectionId,
      body,
      actor,
    );
  }

  private getProjectId(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "IntegrationsController requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }
}
