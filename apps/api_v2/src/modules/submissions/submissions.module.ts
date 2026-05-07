import { Module } from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { SubmissionsController } from "./submissions.controller.js";
import { SubmissionsService } from "./submissions.service.js";

@Module({
  imports: [AuthzModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, ProjectActionAuditService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
