import { Module } from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ProjectAuditController } from "./project-audit.controller.js";

@Module({
  imports: [AuthzModule, PrismaModule],
  controllers: [ProjectAuditController],
  providers: [ProjectActionAuditService],
})
export class ProjectAuditModule {}
