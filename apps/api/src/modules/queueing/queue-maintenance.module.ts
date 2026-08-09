import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AlertsModule } from "../alerts/alerts.module.js";
import { EmailModule } from "../email/email.module.js";
import { EXPORT_DELIVERY_QUEUE } from "../exports/exports.service.js";
import { NATIVE_INTEGRATION_EXPORT_QUEUE } from "../integrations/integrations.service.js";
import { OUTBOUND_WEBHOOK_QUEUE } from "../outbound-webhooks/outbound-webhooks.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { QueueMaintenanceService } from "./queue-maintenance.service.js";
import { QueueingModule } from "./queueing.module.js";
import {
  IMPORT_QUEUE,
  SUBMISSION_MODERATION_QUEUE,
} from "./queueing.constants.js";

@Module({
  imports: [
    AlertsModule,
    EmailModule,
    PrismaModule,
    QueueingModule,
    BullModule.registerQueue(
      { name: OUTBOUND_WEBHOOK_QUEUE },
      { name: EXPORT_DELIVERY_QUEUE },
      { name: NATIVE_INTEGRATION_EXPORT_QUEUE },
      { name: SUBMISSION_MODERATION_QUEUE },
      { name: IMPORT_QUEUE },
    ),
  ],
  providers: [QueueMaintenanceService],
})
export class QueueMaintenanceModule {}
