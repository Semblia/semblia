import { Module } from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ApiKeysController } from "./api-keys.controller.js";
import { ApiKeyAuthenticator, ApiKeyAuthGuard } from "./api-key-auth.guard.js";
import { ApiKeysService } from "./api-keys.service.js";

@Module({
  imports: [AuthzModule, NotificationsModule],
  controllers: [ApiKeysController],
  providers: [
    ApiKeysService,
    ApiKeyAuthenticator,
    ApiKeyAuthGuard,
    ProjectActionAuditService,
  ],
  exports: [ApiKeysService, ApiKeyAuthenticator, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
