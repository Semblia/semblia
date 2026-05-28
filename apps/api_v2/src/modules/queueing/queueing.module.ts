import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EXPORT_DELIVERY_QUEUE } from "../exports/exports.service.js";
import { NATIVE_INTEGRATION_EXPORT_QUEUE } from "../integrations/integrations.service.js";
import { OUTBOUND_WEBHOOK_QUEUE } from "../outbound-webhooks/outbound-webhooks.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { QueueLockService } from "./queue-lock.service.js";
import { QueueTelemetryService } from "./queue-telemetry.service.js";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue(
      { name: OUTBOUND_WEBHOOK_QUEUE },
      { name: EXPORT_DELIVERY_QUEUE },
      { name: NATIVE_INTEGRATION_EXPORT_QUEUE },
    ),
  ],
  providers: [QueueLockService, QueueTelemetryService],
  exports: [QueueLockService, QueueTelemetryService],
})
export class QueueingModule {}
