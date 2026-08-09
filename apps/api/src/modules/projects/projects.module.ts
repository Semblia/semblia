import { Module } from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { BillingModule } from "../billing/billing.module.js";
import { EmailModule } from "../email/email.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { ProjectInvitesController } from "./project-invites.controller.js";
import { ProjectTransfersController } from "./project-transfers.controller.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";
import { SigningSecretService } from "./signing-secret.service.js";

@Module({
  imports: [
    AuthzModule,
    BillingModule,
    EmailModule,
    NotificationsModule,
    OrganizationsModule,
    StorageModule,
  ],
  controllers: [
    ProjectsController,
    ProjectInvitesController,
    ProjectTransfersController,
  ],
  providers: [ProjectsService, SigningSecretService, ProjectActionAuditService],
  exports: [SigningSecretService],
})
export class ProjectsModule {}
