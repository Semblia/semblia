import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { MEDIA_OPTIMIZE_QUEUE } from "../queueing/queueing.constants.js";
import {
  MediaOptimizeService,
  type MediaOptimizeJob,
} from "./media-optimize.service.js";

@Processor(MEDIA_OPTIMIZE_QUEUE, { concurrency: 2 })
export class MediaOptimizeProcessor extends WorkerHost {
  constructor(private readonly mediaOptimizeService: MediaOptimizeService) {
    super();
  }

  process(job: Job<MediaOptimizeJob>) {
    return this.mediaOptimizeService.processAsset(job.data.assetId);
  }
}
