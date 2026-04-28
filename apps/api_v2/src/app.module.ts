import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { validateApiV2Env } from "./config/env.js";
import { PrismaModule } from "./modules/prisma/prisma.module.js";
import { RedisModule } from "./modules/redis/redis.module.js";
import { ClerkModule } from "./modules/clerk/clerk.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { ClerkAuthGuard } from "./common/guards/clerk-auth.guard.js";
import { ProjectsModule } from "./modules/projects/projects.module.js";
import { WidgetsModule } from "./modules/widgets/widgets.module.js";
import { TestimonialsModule } from "./modules/testimonials/testimonials.module.js";
import { FormsModule } from "./modules/forms/forms.module.js";
import { WebhooksModule } from "./modules/webhooks/webhooks.module.js";
import { AlertsModule } from "./modules/alerts/alerts.module.js";
import { OpsAdminModule } from "./modules/ops-admin/ops-admin.module.js";

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
    UsersModule,
    ProjectsModule,
    WidgetsModule,
    TestimonialsModule,
    FormsModule,
    WebhooksModule,
    AlertsModule,
    OpsAdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
