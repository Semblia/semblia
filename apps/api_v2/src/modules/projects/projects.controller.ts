import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUserId } from "../../common/decorators/current-user-id.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createProjectBodySchema,
  listProjectsQuerySchema,
  projectSlugParamsSchema,
  updateProjectBodySchema,
  type CreateProjectBodyDto,
  type ListProjectsQueryDto,
  type ProjectSlugParamsDto,
  type UpdateProjectBodyDto,
} from "./projects.dto.js";
import { ProjectsService } from "./projects.service.js";

@Controller("projects")
export class ProjectsController {
  constructor(
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(listProjectsQuerySchema))
    query: ListProjectsQueryDto,
  ) {
    return this.projectsService.list(userId, query);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createProjectBodySchema))
    body: CreateProjectBodyDto,
  ) {
    return this.projectsService.create(userId, body);
  }

  @Get(":slug")
  getBySlug(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    params: ProjectSlugParamsDto,
  ) {
    return this.projectsService.getBySlug(userId, params);
  }

  @Patch(":slug")
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
  delete(
    @CurrentUserId() userId: string,
    @Param(new ZodValidationPipe(projectSlugParamsSchema))
    params: ProjectSlugParamsDto,
  ) {
    return this.projectsService.delete(userId, params);
  }
}
