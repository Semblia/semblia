import { Module } from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { EmailModule } from "../email/email.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { FormRequestsController } from "./form-requests.controller.js";
import { FormRequestsService } from "./form-requests.service.js";

@Module({
  imports: [AuthzModule, EmailModule, PrismaModule],
  controllers: [FormRequestsController],
  providers: [FormRequestsService, ProjectActionAuditService],
})
export class FormRequestsModule {}
