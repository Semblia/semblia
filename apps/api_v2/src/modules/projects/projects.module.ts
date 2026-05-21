import { Module } from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { ProjectInvitesController } from "./project-invites.controller.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";
import { SigningSecretService } from "./signing-secret.service.js";

@Module({
  imports: [AuthzModule, OrganizationsModule, StorageModule],
  controllers: [ProjectsController, ProjectInvitesController],
  providers: [ProjectsService, SigningSecretService, ProjectActionAuditService],
  exports: [SigningSecretService],
})
export class ProjectsModule {}
