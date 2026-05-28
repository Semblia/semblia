import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { EMAIL_DELIVERY_QUEUE } from "../queueing/queueing.constants.js";
import { EmailDeliveryService } from "./email-delivery.service.js";
import type { EmailDeliveryJob } from "./email.types.js";

@Processor(EMAIL_DELIVERY_QUEUE, { concurrency: 5 })
export class EmailDeliveryProcessor extends WorkerHost {
  constructor(private readonly emailDeliveryService: EmailDeliveryService) {
    super();
  }

  process(job: Job<EmailDeliveryJob>) {
    return this.emailDeliveryService.processDelivery(job.data.deliveryId);
  }
}
