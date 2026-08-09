import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { ClerkModule } from "../clerk/clerk.module.js";
import { IntegrationsController } from "./integrations.controller.js";
import {
  IntegrationsService,
  NATIVE_INTEGRATION_EXPORT_QUEUE,
} from "./integrations.service.js";
import { IntegrationHttpClient } from "./providers/integration-http-client.js";
import { SlackExportProvider } from "./providers/slack-export.provider.js";
import { NotionExportProvider } from "./providers/notion-export.provider.js";
import { LinearExportProvider } from "./providers/linear-export.provider.js";
import { GithubExportProvider } from "./providers/github-export.provider.js";
import { ClerkConnectedAccountTokenProvider } from "./token-providers/clerk-connected-account-token-provider.js";
import { CONNECTED_ACCOUNT_TOKEN_PROVIDER } from "./token-providers/connected-account-token-provider.js";

@Module({
  imports: [
    AuthzModule,
    ClerkModule,
    BullModule.registerQueue({ name: NATIVE_INTEGRATION_EXPORT_QUEUE }),
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    ProjectActionAuditService,
    IntegrationHttpClient,
    SlackExportProvider,
    NotionExportProvider,
    LinearExportProvider,
    GithubExportProvider,
    {
      provide: CONNECTED_ACCOUNT_TOKEN_PROVIDER,
      useClass: ClerkConnectedAccountTokenProvider,
    },
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
