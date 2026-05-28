import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { validateApiV2Env } from "./config/env.js";
import { ExportsWorkerModule } from "./modules/exports/exports.worker.module.js";
import { IntegrationsWorkerModule } from "./modules/integrations/integrations.worker.module.js";
import { OutboundWebhooksWorkerModule } from "./modules/outbound-webhooks/outbound-webhooks.worker.module.js";
import { PrismaModule } from "./modules/prisma/prisma.module.js";
import { QueueingModule } from "./modules/queueing/queueing.module.js";
import { RedisModule } from "./modules/redis/redis.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateApiV2Env,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.getOrThrow<string>("REDIS_URL"),
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueingModule,
    OutboundWebhooksWorkerModule,
    ExportsWorkerModule,
    IntegrationsWorkerModule,
  ],
})
export class WorkerModule {}
