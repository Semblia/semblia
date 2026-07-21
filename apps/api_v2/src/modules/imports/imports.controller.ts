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
  UseGuards,
} from "@nestjs/common";
import { Capability } from "../../common/authz/capabilities.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createManualImportBodySchema,
  importJobParamsSchema,
  importJobsQuerySchema,
  type CreateManualImportBodyDto,
  type ImportJobParamsDto,
  type ImportJobsQueryDto,
} from "./imports.dto.js";
import { ImportsService } from "./imports.service.js";
type ProjectRequest = { projectAccess?: { projectId: string } };
@Controller("projects/:slug/imports")
@UseGuards(CapabilityGuard)
export class ImportsController {
  constructor(
    @Inject(ImportsService) private readonly imports: ImportsService,
  ) {}
  @Get("catalog") @RequireCapability(Capability.VIEW_PROJECT) catalog() {
    return this.imports.catalog();
  }
  @Get("jobs") @RequireCapability(Capability.VIEW_PROJECT) list(
    @Query(new ZodValidationPipe(importJobsQuerySchema))
    query: ImportJobsQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.imports.listJobs(this.projectId(request), query);
  }
  @Get("jobs/:jobId") @RequireCapability(Capability.VIEW_PROJECT) get(
    @Param(new ZodValidationPipe(importJobParamsSchema))
    params: ImportJobParamsDto,
    @Req() request: ProjectRequest,
  ) {
    return this.imports.getJob(this.projectId(request), params.jobId);
  }
  @Post("jobs/manual")
  @RequireCapability(Capability.OPERATE_PROJECT)
  createManual(
    @Body(new ZodValidationPipe(createManualImportBodySchema))
    body: CreateManualImportBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.createManualImport(
      this.projectId(request),
      body,
      actor,
    );
  }
  private projectId(request: ProjectRequest) {
    if (!request.projectAccess?.projectId)
      throw new InternalServerErrorException(
        "ImportsController requires request.projectAccess.projectId",
      );
    return request.projectAccess.projectId;
  }
}
