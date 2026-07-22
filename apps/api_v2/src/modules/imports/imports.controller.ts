import {
  Body,
  Controller,
  Delete,
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
import type { ActorContext } from "../../common/authz/actor-context.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { CurrentActor } from "../../common/decorators/current-actor.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  createManualImportBodySchema,
  createImportConnectionBodySchema,
  createPublicImportBodySchema,
  createSpreadsheetImportBodySchema,
  importJobParamsSchema,
  importConnectionParamsSchema,
  importJobsQuerySchema,
  listImportProviderResourcesQuerySchema,
  type CreateManualImportBodyDto,
  type CreateImportConnectionBodyDto,
  type CreatePublicImportBodyDto,
  type ImportJobParamsDto,
  type ImportConnectionParamsDto,
  type ImportJobsQueryDto,
  type ListImportProviderResourcesQueryDto,
  spreadsheetPreviewBodySchema,
  type SpreadsheetPreviewBodyDto,
  type CreateSpreadsheetImportBodyDto,
  connectedProviderParamsSchema,
  type ConnectedProviderParamsDto,
  updateImportConnectionBodySchema,
  type UpdateImportConnectionBodyDto,
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
  @Get("connections")
  @RequireCapability(Capability.VIEW_PROJECT)
  listConnections(@Req() request: ProjectRequest) {
    return this.imports.listConnections(this.projectId(request));
  }
  @Get("providers/:provider/resources")
  @RequireCapability(Capability.OPERATE_PROJECT)
  listProviderResources(
    @Param(new ZodValidationPipe(connectedProviderParamsSchema))
    params: ConnectedProviderParamsDto,
    @Query(new ZodValidationPipe(listImportProviderResourcesQuerySchema))
    query: ListImportProviderResourcesQueryDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.listProviderResources(
      this.projectId(request),
      params.provider,
      query,
      actor,
    );
  }
  @Post("connections")
  @RequireCapability(Capability.OPERATE_PROJECT)
  createConnection(
    @Body(new ZodValidationPipe(createImportConnectionBodySchema))
    body: CreateImportConnectionBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.createConnection(this.projectId(request), body, actor);
  }
  @Patch("connections/:connectionId")
  @RequireCapability(Capability.OPERATE_PROJECT)
  updateConnection(
    @Param(new ZodValidationPipe(importConnectionParamsSchema))
    params: ImportConnectionParamsDto,
    @Body(new ZodValidationPipe(updateImportConnectionBodySchema))
    body: UpdateImportConnectionBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.updateConnection(
      this.projectId(request),
      params.connectionId,
      body,
      actor,
    );
  }
  @Post("connections/:connectionId/sync")
  @RequireCapability(Capability.OPERATE_PROJECT)
  syncConnection(
    @Param(new ZodValidationPipe(importConnectionParamsSchema))
    params: ImportConnectionParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.syncConnection(
      this.projectId(request),
      params.connectionId,
      actor,
    );
  }
  @Post("connections/:connectionId/enable")
  @RequireCapability(Capability.OPERATE_PROJECT)
  enableConnection(
    @Param(new ZodValidationPipe(importConnectionParamsSchema))
    params: ImportConnectionParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.enableConnection(
      this.projectId(request),
      params.connectionId,
      actor,
    );
  }
  @Post("connections/:connectionId/disable")
  @RequireCapability(Capability.OPERATE_PROJECT)
  disableConnection(
    @Param(new ZodValidationPipe(importConnectionParamsSchema))
    params: ImportConnectionParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.disableConnection(
      this.projectId(request),
      params.connectionId,
      actor,
    );
  }
  @Delete("connections/:connectionId")
  @RequireCapability(Capability.OPERATE_PROJECT)
  deleteConnection(
    @Param(new ZodValidationPipe(importConnectionParamsSchema))
    params: ImportConnectionParamsDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.deleteConnection(
      this.projectId(request),
      params.connectionId,
      actor,
    );
  }
  @Get("jobs") @RequireCapability(Capability.VIEW_PROJECT) list(
    @Query(new ZodValidationPipe(importJobsQuerySchema))
    query: ImportJobsQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.imports.listJobs(this.projectId(request), query);
  }
  @Post("spreadsheet/preview")
  @RequireCapability(Capability.OPERATE_PROJECT)
  previewSpreadsheet(
    @Body(new ZodValidationPipe(spreadsheetPreviewBodySchema))
    body: SpreadsheetPreviewBodyDto,
    @Req() request: ProjectRequest,
  ) {
    return this.imports.previewSpreadsheet(
      this.projectId(request),
      body.assetId,
      body.sheetName,
    );
  }
  @Post("jobs/spreadsheet")
  @RequireCapability(Capability.OPERATE_PROJECT)
  createSpreadsheet(
    @Body(new ZodValidationPipe(createSpreadsheetImportBodySchema))
    body: CreateSpreadsheetImportBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.createSpreadsheetImport(
      this.projectId(request),
      body,
      actor,
    );
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
  @Post("jobs/public-url")
  @RequireCapability(Capability.OPERATE_PROJECT)
  createPublicUrl(
    @Body(new ZodValidationPipe(createPublicImportBodySchema))
    body: CreatePublicImportBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.createPublicImport(
      this.projectId(request),
      body,
      "PUBLIC_URL",
      actor,
    );
  }
  @Post("jobs/migration")
  @RequireCapability(Capability.OPERATE_PROJECT)
  createMigration(
    @Body(new ZodValidationPipe(createPublicImportBodySchema))
    body: CreatePublicImportBodyDto,
    @Req() request: ProjectRequest,
    @CurrentActor() actor: ActorContext | null,
  ) {
    return this.imports.createPublicImport(
      this.projectId(request),
      body,
      "MIGRATION",
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
