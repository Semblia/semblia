import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service.js";
import { IMPORT_QUEUE } from "../queueing/queueing.constants.js";
import type { ImportJobQueuePayload } from "./imports.service.js";

export const IMPORT_QUEUE_DISPATCH_PENDING = "IMPORT_QUEUE_DISPATCH_PENDING";
const DISPATCH_PENDING_MESSAGE = "Import is queued for dispatch retry.";
const RECONCILE_BATCH_SIZE = 100;

export function enqueueImportJob(
  queue: Queue<ImportJobQueuePayload>,
  jobId: string,
) {
  return queue.add(
    "import",
    { jobId },
    {
      jobId: `import-${jobId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}

export async function retryFailedImportQueueJob(
  queue: Queue<ImportJobQueuePayload>,
  jobId: string,
) {
  const queued = await queue.getJob(`import-${jobId}`);
  if (!queued) {
    await enqueueImportJob(queue, jobId);
    return;
  }
  if ((await queued.getState()) === "failed") await queued.retry();
}

@Injectable()
export class ImportQueueDispatcher {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(IMPORT_QUEUE)
    private readonly queue: Queue<ImportJobQueuePayload>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: "import-queue-reconciliation",
    waitForCompletion: true,
  })
  async reconcileQueuedJobs() {
    const jobs = await this.prisma.client.importJob.findMany({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      take: RECONCILE_BATCH_SIZE,
      select: { id: true },
    });
    await Promise.all(jobs.map(({ id }) => this.dispatchQueuedJob(id)));
    return { scanned: jobs.length };
  }

  async dispatchQueuedJob(jobId: string) {
    try {
      await retryFailedImportQueueJob(this.queue, jobId);
      await this.prisma.client.importJob.updateMany({
        where: {
          id: jobId,
          status: "QUEUED",
          errorCode: IMPORT_QUEUE_DISPATCH_PENDING,
        },
        data: { errorCode: null, errorMessage: null },
      });
      return true;
    } catch {
      await markImportDispatchPending(this.prisma, jobId).catch(
        () => undefined,
      );
      return false;
    }
  }
}

export function markImportDispatchPending(
  prisma: PrismaService,
  jobId: string,
) {
  return prisma.client.importJob.updateMany({
    where: { id: jobId, status: "QUEUED" },
    data: {
      errorCode: IMPORT_QUEUE_DISPATCH_PENDING,
      errorMessage: DISPATCH_PENDING_MESSAGE,
    },
  });
}
