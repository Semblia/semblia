import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { IMPORT_QUEUE } from "../queueing/queueing.constants.js";
import { SubmissionModerationModule } from "../submission-moderation/submission-moderation.module.js";
import { ImportsService } from "./imports.service.js";

@Module({
  imports: [
    PrismaModule,
    SubmissionModerationModule,
    BullModule.registerQueue({ name: IMPORT_QUEUE }),
  ],
  providers: [ImportsService, ProjectActionAuditService],
  exports: [ImportsService],
})
export class ImportsCoreModule {}
