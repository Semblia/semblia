import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import {
  OUTBOUND_WEBHOOK_QUEUE,
  type OutboundWebhookDeliveryJob,
  OutboundWebhooksService,
} from "./outbound-webhooks.service.js";

@Processor(OUTBOUND_WEBHOOK_QUEUE)
export class OutboundWebhooksProcessor extends WorkerHost {
  constructor(
    private readonly outboundWebhooksService: OutboundWebhooksService,
  ) {
    super();
  }

  process(job: Job<OutboundWebhookDeliveryJob>) {
    return this.outboundWebhooksService.processDelivery(job.data.deliveryId);
  }
}
