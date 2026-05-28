import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, seconds } from "@nestjs/throttler";
import { validateApiV2Env } from "./config/env.js";
import { PrismaModule } from "./modules/prisma/prisma.module.js";
import { RedisModule } from "./modules/redis/redis.module.js";
import { ClerkModule } from "./modules/clerk/clerk.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { ClerkAuthGuard } from "./common/guards/clerk-auth.guard.js";
import { ApiV2ThrottlerGuard } from "./common/guards/api-v2-throttler.guard.js";
import { ProjectsModule } from "./modules/projects/projects.module.js";
import { WidgetsModule } from "./modules/widgets/widgets.module.js";
import { TestimonialsModule } from "./modules/testimonials/testimonials.module.js";
import { FormsModule } from "./modules/forms/forms.module.js";
import { WebhooksModule } from "./modules/webhooks/webhooks.module.js";
import { AlertsModule } from "./modules/alerts/alerts.module.js";
import { OpsAdminModule } from "./modules/ops-admin/ops-admin.module.js";
import { OrganizationsModule } from "./modules/organizations/organizations.module.js";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module.js";
import { AgentAccessModule } from "./modules/agent-access/agent-access.module.js";
import { SubmissionsModule } from "./modules/submissions/submissions.module.js";
import { OutboundWebhooksModule } from "./modules/outbound-webhooks/outbound-webhooks.module.js";
import { ExportsModule } from "./modules/exports/exports.module.js";
import { IntegrationsModule } from "./modules/integrations/integrations.module.js";
import { AnalyticsModule } from "./modules/analytics/analytics.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { ProjectAuditModule } from "./modules/project-audit/project-audit.module.js";
import { PublicSurfacesModule } from "./modules/public-surfaces/public-surfaces.module.js";
import { BillingModule } from "./modules/billing/billing.module.js";
import { AccountDefaultsModule } from "./modules/account-defaults/account-defaults.module.js";
import { StorageModule } from "./modules/storage/storage.module.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { QueueingModule } from "./modules/queueing/queueing.module.js";
import { EmailModule } from "./modules/email/email.module.js";

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
          {
            name: "public-list",
            ttl: seconds(60),
            limit: 120,
          },
          {
            name: "analytics-events",
            ttl: seconds(60),
            limit: 240,
          },
          {
            name: "public-media-intent",
            ttl: seconds(60),
            limit: 20,
          },
        ],
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueingModule,
    EmailModule,
    ClerkModule,
    HealthModule,
    UsersModule,
    OrganizationsModule,
    ApiKeysModule,
    AgentAccessModule,
    SubmissionsModule,
    OutboundWebhooksModule,
    ExportsModule,
    IntegrationsModule,
    AnalyticsModule,
    NotificationsModule,
    BillingModule,
    AccountDefaultsModule,
    StorageModule,
    AdminModule,
    ProjectAuditModule,
    PublicSurfacesModule,
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
      useClass: ApiV2ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
