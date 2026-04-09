import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { validateApiV2Env } from "./config/env.js";
import { PrismaModule } from "./modules/prisma/prisma.module.js";
import { RedisModule } from "./modules/redis/redis.module.js";
import { ClerkModule } from "./modules/clerk/clerk.module.js";
import { HealthModule } from "./modules/health/health.module.js";

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
    ClerkModule,
    HealthModule,
  ],
})
export class AppModule {}
