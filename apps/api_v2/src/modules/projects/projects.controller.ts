import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  InternalServerErrorException,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Put,
  UseGuards,
} from "@nestjs/common";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  addProjectMemberBodySchema,
  replaceAllowedOriginsBodySchema,
  createProjectBodySchema,
  listProjectsQuerySchema,
  projectMemberParamsSchema,
  projectSlugParamsSchema,
  updateProjectMemberBodySchema,
  updateProjectBodySchema,
  type AddProjectMemberBodyDto,
  type CreateProjectBodyDto,
  type ListProjectsQueryDto,
  type ProjectMemberParamsDto,
  type ProjectSlugParamsDto,
  type ReplaceAllowedOriginsBodyDto,
  type UpdateProjectMemberBodyDto,
  type UpdateProjectBodyDto,
} from "./projects.dto.js";
import { ProjectsService } from "./projects.service.js";
import { SigningSecretService } from "./signing-secret.service.js";

@Controller("projects")
export class ProjectsController {
  constructor(
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
    @Inject(SigningSecretService)
    private readonly signingSecretService: SigningSecretService,
  ) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @CurrentActor() actor: ActorContext | null,
    @Query(new ZodValidationPipe(listProjectsQuerySchema))
    query: ListProjectsQueryDto,
  ) {
    return this.projectsService.list(userId, query, actor);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @CurrentActor() actor: ActorContext | null,
    @Body(new ZodValidationPipe(createProjectBodySchema))
    body: CreateProjectBodyDto,
  ) {
    return this.projectsService.create(userId, body, actor);
  }

  @Get(":slug")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.VIEW_PROJECT)
  getBySlug(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    params: ProjectSlugParamsDto,
  ) {
    return this.projectsService.getBySlug(userId, params);
  }

  @Patch(":slug")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  update(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    params: ProjectSlugParamsDto,
    @Body(new ZodValidationPipe(updateProjectBodySchema))
    body: UpdateProjectBodyDto,
  ) {
    return this.projectsService.update(userId, params, body);
  }

  @Delete(":slug")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  delete(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    params: ProjectSlugParamsDto,
  ) {
    return this.projectsService.delete(userId, params);
  }

  @Get(":slug/members")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.VIEW_PROJECT)
  listMembers(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    params: ProjectSlugParamsDto,
  ) {
    return this.projectsService.listMembers(userId, params);
  }

  @Post(":slug/members")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_MEMBERS)
  addMember(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    params: ProjectSlugParamsDto,
    @Body(new ZodValidationPipe(addProjectMemberBodySchema))
    body: AddProjectMemberBodyDto,
  ) {
    return this.projectsService.addMember(userId, params, body);
  }

  @Patch(":slug/members/:userId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_MEMBERS)
  updateMember(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectMemberParamsSchema))
    params: ProjectMemberParamsDto,
    @Body(new ZodValidationPipe(updateProjectMemberBodySchema))
    body: UpdateProjectMemberBodyDto,
  ) {
    return this.projectsService.updateMember(userId, params, body);
  }

  @Delete(":slug/members/:userId")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_MEMBERS)
  removeMember(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectMemberParamsSchema))
    params: ProjectMemberParamsDto,
  ) {
    return this.projectsService.removeMember(userId, params);
  }

  @Get(":slug/allowed-origins")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  async listAllowedOrigins(
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    _params: ProjectSlugParamsDto,
    @Req() request: { projectAccess?: { projectId: string } },
  ) {
    return {
      origins: await this.projectsService.listAllowedOrigins(
        this.getProjectIdFromRequest(request),
      ),
    };
  }

  @Put(":slug/allowed-origins")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  async replaceAllowedOrigins(
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    _params: ProjectSlugParamsDto,
    @Body(new ZodValidationPipe(replaceAllowedOriginsBodySchema))
    body: ReplaceAllowedOriginsBodyDto,
    @Req() request: { projectAccess?: { projectId: string } },
  ) {
    return {
      origins: await this.projectsService.replaceAllowedOrigins(
        this.getProjectIdFromRequest(request),
        body.origins,
      ),
    };
  }

  @Post(":slug/signing-secret")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  async generateSigningSecret(
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    _params: ProjectSlugParamsDto,
    @Req() request: { projectAccess?: { projectId: string } },
  ) {
    return this.signingSecretService.generateOrRotate(
      this.getProjectIdFromRequest(request),
    );
  }

  @Delete(":slug/signing-secret")
  @UseGuards(CapabilityGuard)
  @RequireCapability(Capability.MANAGE_PROJECT)
  @HttpCode(204)
  async clearSigningSecret(
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    _params: ProjectSlugParamsDto,
    @Req() request: { projectAccess?: { projectId: string } },
  ) {
    await this.signingSecretService.clear(
      this.getProjectIdFromRequest(request),
    );
  }

  private getProjectIdFromRequest(request: {
    projectAccess?: { projectId: string };
  }) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "ProjectsController requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }
}
