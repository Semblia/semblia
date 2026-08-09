import { Module } from "@nestjs/common";
import { OutboundWebhooksModule } from "./outbound-webhooks.module.js";
import { OutboundWebhooksProcessor } from "./outbound-webhooks.processor.js";

@Module({
  imports: [OutboundWebhooksModule],
  providers: [OutboundWebhooksProcessor],
})
export class OutboundWebhooksWorkerModule {}
