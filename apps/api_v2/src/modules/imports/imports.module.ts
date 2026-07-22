import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { IMPORT_QUEUE } from "../queueing/queueing.constants.js";
import { ImportQueueDispatcher } from "./import-queue-dispatcher.js";
import { ImportsController } from "./imports.controller.js";
import { ImportsCoreModule } from "./imports.core.module.js";
import { ImportSourceCleanupService } from "./import-source-cleanup.service.js";
@Module({
  imports: [
    AuthzModule,
    ImportsCoreModule,
    PrismaModule,
    BullModule.registerQueue({ name: IMPORT_QUEUE }),
  ],
  controllers: [ImportsController],
  providers: [ImportQueueDispatcher, ImportSourceCleanupService],
})
export class ImportsModule {}
