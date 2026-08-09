import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import {
  EXPORT_DELIVERY_QUEUE,
  type ExportDeliveryJob,
  ExportsService,
} from "./exports.service.js";

@Processor(EXPORT_DELIVERY_QUEUE)
export class ExportDeliveryProcessor extends WorkerHost {
  constructor(private readonly exportsService: ExportsService) {
    super();
  }

  process(job: Job<ExportDeliveryJob>) {
    return this.exportsService.processCsvExport(job.data.deliveryId);
  }
}
