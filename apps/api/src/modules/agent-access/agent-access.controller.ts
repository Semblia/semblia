import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { UserActorGuard } from "../../common/guards/user-actor.guard.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  agentKeyParamsSchema,
  createAgentKeyBodySchema,
  type AgentKeyParamsDto,
  type CreateAgentKeyBodyDto,
} from "./agent-access.dto.js";
import { AgentAccessService } from "./agent-access.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/agent-access")
@UseGuards(UserActorGuard, CapabilityGuard)
export class AgentAccessController {
  constructor(
    @Inject(AgentAccessService)
    private readonly agentAccessService: AgentAccessService,
  ) {}

  @Get()
  @RequireCapability(Capability.VIEW_AGENT_ACCESS)
  getOverview(@Req() request: ProjectRequest) {
    return this.agentAccessService.getOverview(this.getProjectId(request));
  }

  @Post("keys")
  @RequireCapability(Capability.MANAGE_AGENT_ACCESS)
  createKey(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createAgentKeyBodySchema))
    body: CreateAgentKeyBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.agentAccessService.createKey(
      userId,
      this.getProjectId(request),
      body,
    );
  }

  @Post("keys/:keyId/revoke")
  @RequireCapability(Capability.MANAGE_AGENT_ACCESS)
  revokeKey(
    @Param(new ZodValidationPipe(agentKeyParamsSchema))
    params: AgentKeyParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.agentAccessService.revokeKey(
      this.getProjectId(request),
      params.keyId,
    );
  }

  @Get("actions")
  @RequireCapability(Capability.VIEW_AGENT_ACCESS)
  listActions(@Req() request: ProjectRequest) {
    return this.agentAccessService.listActions(this.getProjectId(request));
  }

  private getProjectId(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "AgentAccessController requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }
}
