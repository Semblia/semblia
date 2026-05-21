import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { AuthzModule } from "../../common/authz/authz.module.js";
import { OutboundWebhooksModule } from "../outbound-webhooks/outbound-webhooks.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { ExportDeliveryProcessor } from "./export-delivery.processor.js";
import { ExportsController } from "./exports.controller.js";
import { EXPORT_DELIVERY_QUEUE, ExportsService } from "./exports.service.js";

@Module({
  imports: [
    AuthzModule,
    OutboundWebhooksModule,
    StorageModule,
    BullModule.registerQueue({ name: EXPORT_DELIVERY_QUEUE }),
  ],
  controllers: [ExportsController],
  providers: [
    ExportsService,
    ExportDeliveryProcessor,
    ProjectActionAuditService,
  ],
})
export class ExportsModule {}
