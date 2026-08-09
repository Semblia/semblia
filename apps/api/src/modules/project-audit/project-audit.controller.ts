import {
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  projectActionAuditQuerySchema,
  type ProjectActionAuditQueryDto,
} from "./project-audit.dto.js";

type ProjectRequest = { projectAccess?: { projectId: string } };

@Controller("projects/:slug/action-audit")
@UseGuards(CapabilityGuard)
export class ProjectAuditController {
  constructor(
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
  ) {}

  @Get()
  @RequireCapability(Capability.VIEW_PROJECT)
  list(
    @Query(new ZodValidationPipe(projectActionAuditQuerySchema))
    query: ProjectActionAuditQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.actionAudit.list(this.getProjectId(request), query);
  }

  private getProjectId(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "ProjectAuditController requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }
}
