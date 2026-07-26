import { Processor, WorkerHost } from "@nestjs/bullmq";
import { DelayedError, type Job } from "bullmq";
import {
  IMPORT_QUEUE,
  ImportRetryAfterError,
  ImportsService,
  type ImportJobQueuePayload,
} from "./imports.service.js";
@Processor(IMPORT_QUEUE)
export class ImportsProcessor extends WorkerHost {
  constructor(private readonly imports: ImportsService) {
    super();
  }
  async process(job: Job<ImportJobQueuePayload>, token?: string) {
    try {
      return await this.imports.process(job.data.jobId);
    } catch (error) {
      if (error instanceof ImportRetryAfterError) {
        await job.moveToDelayed(Date.now() + error.retryAfterMs, token);
        throw new DelayedError();
      }
      throw error;
    }
  }
}
