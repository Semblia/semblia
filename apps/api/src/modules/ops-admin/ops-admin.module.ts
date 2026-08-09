import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import {
  EMAIL_DELIVERY_QUEUE,
  SUBMISSION_MODERATION_QUEUE,
} from "../queueing/queueing.constants.js";
import { EXPORT_DELIVERY_QUEUE } from "../exports/exports.service.js";
import { NATIVE_INTEGRATION_EXPORT_QUEUE } from "../integrations/integrations.service.js";
import { OUTBOUND_WEBHOOK_QUEUE } from "../outbound-webhooks/outbound-webhooks.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { QueueingModule } from "../queueing/queueing.module.js";
import { OpsAdminController } from "./ops-admin.controller.js";
import { OpsAdminService } from "./ops-admin.service.js";

@Module({
  imports: [
    PrismaModule,
    QueueingModule,
    BullModule.registerQueue(
      { name: EMAIL_DELIVERY_QUEUE },
      { name: OUTBOUND_WEBHOOK_QUEUE },
      { name: EXPORT_DELIVERY_QUEUE },
      { name: NATIVE_INTEGRATION_EXPORT_QUEUE },
      { name: SUBMISSION_MODERATION_QUEUE },
    ),
  ],
  controllers: [OpsAdminController],
  providers: [OpsAdminService],
})
export class OpsAdminModule {}
