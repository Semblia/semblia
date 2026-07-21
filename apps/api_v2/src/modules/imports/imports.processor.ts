import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import {
  IMPORT_QUEUE,
  ImportsService,
  type ImportJobQueuePayload,
} from "./imports.service.js";
@Processor(IMPORT_QUEUE)
export class ImportsProcessor extends WorkerHost {
  constructor(private readonly imports: ImportsService) {
    super();
  }
  process(job: Job<ImportJobQueuePayload>) {
    return this.imports.process(job.data.jobId);
  }
}
