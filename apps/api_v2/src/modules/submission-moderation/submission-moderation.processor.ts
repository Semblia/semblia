import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { SUBMISSION_MODERATION_QUEUE } from "../queueing/queueing.constants.js";
import { DEFAULT_MODERATION_QUEUE_CONCURRENCY } from "./submission-moderation.constants.js";
import {
  SubmissionModerationService,
  type SubmissionModerationJob,
} from "./submission-moderation.service.js";

@Processor(SUBMISSION_MODERATION_QUEUE, {
  concurrency: DEFAULT_MODERATION_QUEUE_CONCURRENCY,
})
export class SubmissionModerationProcessor extends WorkerHost {
  constructor(
    private readonly submissionModerationService: SubmissionModerationService,
  ) {
    super();
  }

  process(job: Job<SubmissionModerationJob>) {
    return this.submissionModerationService.processRun(job.data.runId);
  }
}
