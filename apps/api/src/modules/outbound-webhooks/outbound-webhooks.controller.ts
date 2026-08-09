import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Patch,
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
  createOutboundWebhookEndpointBodySchema,
  outboundWebhookDeliveriesQuerySchema,
  outboundWebhookDeliveryParamsSchema,
  outboundWebhookEndpointParamsSchema,
  updateOutboundWebhookEndpointBodySchema,
  type CreateOutboundWebhookEndpointBodyDto,
  type OutboundWebhookDeliveriesQueryDto,
  type OutboundWebhookDeliveryParamsDto,
  type OutboundWebhookEndpointParamsDto,
  type UpdateOutboundWebhookEndpointBodyDto,
} from "./outbound-webhooks.dto.js";
import { OutboundWebhooksService } from "./outbound-webhooks.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/outbound-webhooks")
@UseGuards(CapabilityGuard)
export class OutboundWebhooksController {
  constructor(
    @Inject(OutboundWebhooksService)
    private readonly outboundWebhooksService: OutboundWebhooksService,
  ) {}

  @Get()
  @RequireCapability(Capability.VIEW_INTEGRATIONS)
  async listEndpoints(@Req() request: ProjectRequest) {
    return {
      data: await this.outboundWebhooksService.listEndpoints(
        this.getProjectId(request),
      ),
    };
  }

  @Post()
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  createEndpoint(
    @Body(new ZodValidationPipe(createOutboundWebhookEndpointBodySchema))
    body: CreateOutboundWebhookEndpointBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.outboundWebhooksService.createEndpoint(
      this.getProjectId(request),
      body,
      actor,
    );
  }

  @Get("deliveries")
  @RequireCapability(Capability.VIEW_INTEGRATIONS)
  listDeliveries(
    @Query(new ZodValidationPipe(outboundWebhookDeliveriesQuerySchema))
    query: OutboundWebhookDeliveriesQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.outboundWebhooksService.listDeliveries(
      this.getProjectId(request),
      query,
    );
  }

  @Get("deliveries/:deliveryId")
  @RequireCapability(Capability.VIEW_INTEGRATIONS)
  getDelivery(
    @Param(new ZodValidationPipe(outboundWebhookDeliveryParamsSchema))
    params: OutboundWebhookDeliveryParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.outboundWebhooksService.getDelivery(
      this.getProjectId(request),
      params.deliveryId,
    );
  }

  @Post("deliveries/:deliveryId/retry")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  retryDelivery(
    @Param(new ZodValidationPipe(outboundWebhookDeliveryParamsSchema))
    params: OutboundWebhookDeliveryParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.outboundWebhooksService.retryDelivery(
      this.getProjectId(request),
      params.deliveryId,
      actor,
    );
  }

  @Get(":endpointId")
  @RequireCapability(Capability.VIEW_INTEGRATIONS)
  getEndpoint(
    @Param(new ZodValidationPipe(outboundWebhookEndpointParamsSchema))
    params: OutboundWebhookEndpointParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.outboundWebhooksService.getEndpoint(
      this.getProjectId(request),
      params.endpointId,
    );
  }

  @Patch(":endpointId")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  updateEndpoint(
    @Param(new ZodValidationPipe(outboundWebhookEndpointParamsSchema))
    params: OutboundWebhookEndpointParamsDto,
    @Body(new ZodValidationPipe(updateOutboundWebhookEndpointBodySchema))
    body: UpdateOutboundWebhookEndpointBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.outboundWebhooksService.updateEndpoint(
      this.getProjectId(request),
      params.endpointId,
      body,
      actor,
    );
  }

  @Post(":endpointId/disable")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  disableEndpoint(
    @Param(new ZodValidationPipe(outboundWebhookEndpointParamsSchema))
    params: OutboundWebhookEndpointParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.outboundWebhooksService.disableEndpoint(
      this.getProjectId(request),
      params.endpointId,
      actor,
    );
  }

  @Post(":endpointId/revoke")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  revokeEndpoint(
    @Param(new ZodValidationPipe(outboundWebhookEndpointParamsSchema))
    params: OutboundWebhookEndpointParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.outboundWebhooksService.revokeEndpoint(
      this.getProjectId(request),
      params.endpointId,
      actor,
    );
  }

  @Post(":endpointId/rotate-secret")
  @RequireCapability(Capability.MANAGE_INTEGRATIONS)
  rotateSecret(
    @Param(new ZodValidationPipe(outboundWebhookEndpointParamsSchema))
    params: OutboundWebhookEndpointParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.outboundWebhooksService.rotateEndpointSecret(
      this.getProjectId(request),
      params.endpointId,
      actor,
    );
  }

  private getProjectId(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "OutboundWebhooksController requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }
}
