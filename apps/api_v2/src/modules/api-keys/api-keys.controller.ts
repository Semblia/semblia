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
import { ApiKeyType } from "@workspace/database/prisma";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { UserActorGuard } from "../../common/guards/user-actor.guard.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  apiKeyParamsSchema,
  apiKeyQuerySchema,
  createApiKeyBodySchema,
  updateApiKeyBodySchema,
  type ApiKeyQueryDto,
  type ApiKeyParamsDto,
  type CreateApiKeyBodyDto,
  type UpdateApiKeyBodyDto,
} from "./api-keys.dto.js";
import { ApiKeysService } from "./api-keys.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/api-keys")
@UseGuards(CapabilityGuard, UserActorGuard)
export class ApiKeysController {
  constructor(
    @Inject(ApiKeysService) private readonly apiKeysService: ApiKeysService,
  ) {}

  @Get()
  @RequireCapability(Capability.VIEW_CREDENTIALS)
  async list(@Req() request: ProjectRequest) {
    return {
      data: await this.apiKeysService.list(this.getProjectId(request), {
        keyType: ApiKeyType.SECRET,
      }),
    };
  }

  @Post()
  @RequireCapability(Capability.MANAGE_CREDENTIALS)
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createApiKeyBodySchema))
    body: CreateApiKeyBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.apiKeysService.create({
      ...body,
      userId,
      projectId: this.getProjectId(request),
      keyType: ApiKeyType.SECRET,
    });
  }

  @Patch(":keyId")
  @RequireCapability(Capability.MANAGE_CREDENTIALS)
  update(
    @Param(new ZodValidationPipe(apiKeyParamsSchema))
    params: ApiKeyParamsDto,
    @Body(new ZodValidationPipe(updateApiKeyBodySchema))
    body: UpdateApiKeyBodyDto,
    @Query(new ZodValidationPipe(apiKeyQuerySchema))
    query: ApiKeyQueryDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.apiKeysService.update(
      this.getProjectId(request),
      params.keyId,
      body,
      this.getKeyType(query),
      actor,
    );
  }

  @Post(":keyId/rotate")
  @RequireCapability(Capability.MANAGE_CREDENTIALS)
  rotate(
    @Param(new ZodValidationPipe(apiKeyParamsSchema))
    params: ApiKeyParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.apiKeysService.rotate(
      this.getProjectId(request),
      params.keyId,
      ApiKeyType.SECRET,
    );
  }

  @Post(":keyId/revoke")
  @RequireCapability(Capability.MANAGE_CREDENTIALS)
  revoke(
    @Param(new ZodValidationPipe(apiKeyParamsSchema))
    params: ApiKeyParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.apiKeysService.revoke(
      this.getProjectId(request),
      params.keyId,
      ApiKeyType.SECRET,
    );
  }

  @Get(":keyId/events")
  @RequireCapability(Capability.VIEW_CREDENTIALS)
  async events(
    @Param(new ZodValidationPipe(apiKeyParamsSchema))
    params: ApiKeyParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return {
      data: await this.apiKeysService.listEvents(
        this.getProjectId(request),
        params.keyId,
        ApiKeyType.SECRET,
      ),
    };
  }

  private getProjectId(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "ApiKeysController requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }

  private getKeyType(query: ApiKeyQueryDto) {
    return query.keyType === ApiKeyType.AGENT
      ? ApiKeyType.AGENT
      : ApiKeyType.SECRET;
  }
}
