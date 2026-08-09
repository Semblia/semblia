import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import {
  IntegrationsService,
  NATIVE_INTEGRATION_EXPORT_QUEUE,
  type NativeIntegrationDeliveryJob,
} from "./integrations.service.js";

@Processor(NATIVE_INTEGRATION_EXPORT_QUEUE)
export class IntegrationDeliveryProcessor extends WorkerHost {
  constructor(private readonly integrationsService: IntegrationsService) {
    super();
  }

  process(job: Job<NativeIntegrationDeliveryJob>) {
    return this.integrationsService.processNativeExport(job.data.deliveryId);
  }
}
