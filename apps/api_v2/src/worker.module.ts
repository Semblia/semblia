import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, seconds } from "@nestjs/throttler";
import { validateApiV2Env } from "./config/env.js";
import { EmailWorkerModule } from "./modules/email/email.worker.module.js";
import { ExportsWorkerModule } from "./modules/exports/exports.worker.module.js";
import { IntegrationsWorkerModule } from "./modules/integrations/integrations.worker.module.js";
import { OutboundWebhooksWorkerModule } from "./modules/outbound-webhooks/outbound-webhooks.worker.module.js";
import { SubmissionModerationWorkerModule } from "./modules/submission-moderation/submission-moderation.worker.module.js";
import { MediaOptimizeWorkerModule } from "./modules/storage/media-optimize.worker.module.js";
import { PrismaModule } from "./modules/prisma/prisma.module.js";
import { QueueMaintenanceModule } from "./modules/queueing/queue-maintenance.module.js";
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
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: "default",
            ttl: seconds(
              configService.get<number>("API_V2_RATE_LIMIT_TTL_SECONDS") ?? 60,
            ),
            limit: configService.get<number>("API_V2_RATE_LIMIT_MAX") ?? 120,
          },
          {
            name: "public-submit-browser",
            ttl: seconds(60),
            limit: 10,
          },
          {
            name: "public-submit-hmac",
            ttl: seconds(60),
            limit: 120,
          },
        ],
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueingModule,
    QueueMaintenanceModule,
    EmailWorkerModule,
    OutboundWebhooksWorkerModule,
    ExportsWorkerModule,
    IntegrationsWorkerModule,
    SubmissionModerationWorkerModule,
    MediaOptimizeWorkerModule,
  ],
})
export class WorkerModule {}
