import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { IMPORT_QUEUE } from "../queueing/queueing.constants.js";
import { SubmissionModerationModule } from "../submission-moderation/submission-moderation.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { ClerkModule } from "../clerk/clerk.module.js";
import { ClerkConnectedAccountTokenProvider } from "../integrations/token-providers/clerk-connected-account-token-provider.js";
import { CONNECTED_ACCOUNT_TOKEN_PROVIDER } from "../integrations/token-providers/connected-account-token-provider.js";
import { ConnectedImportProviderRegistry } from "./connected-import-providers.js";
import { BoundedImportProviderHttpClient } from "./providers/official-import-providers.js";
import {
  BoundedOfficialUrlImportHttpClient,
  OfficialUrlImportProviderRegistry,
} from "./providers/official-url-import-providers.js";
import { ImportsService } from "./imports.service.js";

@Module({
  imports: [
    PrismaModule,
    ClerkModule,
    SubmissionModerationModule,
    StorageModule,
    BullModule.registerQueue({ name: IMPORT_QUEUE }),
  ],
  providers: [
    ImportsService,
    ProjectActionAuditService,
    BoundedImportProviderHttpClient,
    BoundedOfficialUrlImportHttpClient,
    ConnectedImportProviderRegistry,
    OfficialUrlImportProviderRegistry,
    {
      provide: CONNECTED_ACCOUNT_TOKEN_PROVIDER,
      useClass: ClerkConnectedAccountTokenProvider,
    },
  ],
  exports: [ImportsService],
})
export class ImportsCoreModule {}
