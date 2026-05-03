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
import { ApiKeyType } from "@workspace/database/prisma";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  apiKeyParamsSchema,
  createApiKeyBodySchema,
  type ApiKeyParamsDto,
  type CreateApiKeyBodyDto,
} from "./api-keys.dto.js";
import { ApiKeysService } from "./api-keys.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/api-keys")
@UseGuards(CapabilityGuard)
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
}
