import { Inject, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { EmailDeliveryStatus } from "@workspace/database/prisma";
import type { Queue } from "bullmq";
import { EXPORT_DELIVERY_QUEUE } from "../exports/exports.service.js";
import { NATIVE_INTEGRATION_EXPORT_QUEUE } from "../integrations/integrations.service.js";
import { OUTBOUND_WEBHOOK_QUEUE } from "../outbound-webhooks/outbound-webhooks.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  EMAIL_DELIVERY_QUEUE,
  IMPORT_QUEUE,
  QUEUE_COUNT_STATUSES,
  SUBMISSION_MODERATION_QUEUE,
  type QueueCounts,
} from "./queueing.constants.js";

type StatusGroup = {
  status: string;
  _count: {
    _all: number;
  };
};

@Injectable()
export class QueueTelemetryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(OUTBOUND_WEBHOOK_QUEUE)
    private readonly outboundWebhookQueue: Queue,
    @InjectQueue(EXPORT_DELIVERY_QUEUE)
    private readonly exportDeliveryQueue: Queue,
    @InjectQueue(NATIVE_INTEGRATION_EXPORT_QUEUE)
    private readonly nativeIntegrationQueue: Queue,
    @InjectQueue(EMAIL_DELIVERY_QUEUE)
    private readonly emailDeliveryQueue: Queue,
    @InjectQueue(SUBMISSION_MODERATION_QUEUE)
    private readonly submissionModerationQueue: Queue,
    @InjectQueue(IMPORT_QUEUE)
    private readonly importQueue: Queue,
  ) {}

  async getSnapshot() {
    const [
      queues,
      deliveryCounts,
      moderationRunCounts,
      moderationRunCountsLast24h,
      oldestPendingEmailDeliveryAgeSeconds,
      deadLetterJobs,
    ] = await Promise.all([
      this.getQueueSnapshots(),
      this.getDeliveryStatusCounts(),
      this.getModerationRunCounts(),
      this.getRecentModerationRunCounts(),
      this.getOldestPendingEmailDeliveryAgeSeconds(),
      this.prisma.client.deadLetterJob.count(),
    ]);

    return {
      queues,
      deliveries: {
        ...deliveryCounts,
        moderationRuns: this.toStatusCounts(moderationRunCounts),
        moderationRunsLast24h: this.toStatusCounts(moderationRunCountsLast24h),
        oldestPendingEmailDeliveryAgeSeconds,
        deadLetterJobs,
      },
    };
  }

  private async getQueueSnapshots() {
    const [
      outboundQueue,
      exportQueue,
      integrationQueue,
      emailQueue,
      moderationQueue,
      importQueue,
    ] = await Promise.all([
      this.getQueueCounts(this.outboundWebhookQueue),
      this.getQueueCounts(this.exportDeliveryQueue),
      this.getQueueCounts(this.nativeIntegrationQueue),
      this.getQueueCounts(this.emailDeliveryQueue),
      this.getQueueCounts(this.submissionModerationQueue),
      this.getQueueCounts(this.importQueue),
    ]);

    return {
      [OUTBOUND_WEBHOOK_QUEUE]: outboundQueue,
      [EXPORT_DELIVERY_QUEUE]: exportQueue,
      [NATIVE_INTEGRATION_EXPORT_QUEUE]: integrationQueue,
      [EMAIL_DELIVERY_QUEUE]: emailQueue,
      [SUBMISSION_MODERATION_QUEUE]: moderationQueue,
      [IMPORT_QUEUE]: importQueue,
    };
  }

  private async getDeliveryStatusCounts() {
    const [outboundDeliveryCounts, exportDeliveryCounts, emailDeliveryCounts] =
      await Promise.all([
        this.prisma.client.outboundWebhookDelivery.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        this.prisma.client.exportDelivery.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        this.prisma.client.emailDelivery.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
      ]);

    return {
      outboundWebhooks: this.toStatusCounts(outboundDeliveryCounts),
      exports: this.toStatusCounts(exportDeliveryCounts),
      emails: this.toStatusCounts(emailDeliveryCounts),
    };
  }

  private getModerationRunCounts() {
    return this.prisma.client.formModerationRun.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  }

  private getRecentModerationRunCounts() {
    return this.prisma.client.formModerationRun.groupBy({
      by: ["status"],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      _count: { _all: true },
    });
  }

  private async getOldestPendingEmailDeliveryAgeSeconds() {
    const oldestPendingEmailDelivery =
      await this.prisma.client.emailDelivery.findFirst({
        where: {
          status: {
            in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.FAILED],
          },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

    if (oldestPendingEmailDelivery === null) {
      return null;
    }

    return Math.max(
      0,
      Math.floor(
        (Date.now() - oldestPendingEmailDelivery.createdAt.getTime()) / 1000,
      ),
    );
  }

  private async getQueueCounts(queue: Queue): Promise<QueueCounts> {
    const counts = await queue.getJobCounts(...QUEUE_COUNT_STATUSES);

    return Object.fromEntries(
      QUEUE_COUNT_STATUSES.map((status) => [status, counts[status] ?? 0]),
    ) as QueueCounts;
  }

  private toStatusCounts(groups: StatusGroup[]) {
    return Object.fromEntries(
      groups.map((group) => [group.status, group._count._all]),
    );
  }
}
