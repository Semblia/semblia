import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { OutboundWebhookDispatcher } from "./outbound-webhook-dispatcher.js";
import { OutboundWebhooksController } from "./outbound-webhooks.controller.js";
import {
  OUTBOUND_WEBHOOK_QUEUE,
  OutboundWebhooksService,
} from "./outbound-webhooks.service.js";

@Module({
  imports: [
    AuthzModule,
    NotificationsModule,
    BullModule.registerQueue({ name: OUTBOUND_WEBHOOK_QUEUE }),
  ],
  controllers: [OutboundWebhooksController],
  providers: [
    OutboundWebhooksService,
    ProjectActionAuditService,
    {
      provide: "OUTBOUND_WEBHOOK_DISPATCHER",
      // Factory, not useClass: the constructor's only param is a plain
      // function with a default — Nest's reflection can't resolve it and
      // fails the whole app boot with UnknownDependenciesException.
      useFactory: () => new OutboundWebhookDispatcher(),
    },
  ],
  exports: [OutboundWebhooksService],
})
export class OutboundWebhooksModule {}
