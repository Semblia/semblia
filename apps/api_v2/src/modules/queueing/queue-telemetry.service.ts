import { Inject, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { EXPORT_DELIVERY_QUEUE } from "../exports/exports.service.js";
import { NATIVE_INTEGRATION_EXPORT_QUEUE } from "../integrations/integrations.service.js";
import { OUTBOUND_WEBHOOK_QUEUE } from "../outbound-webhooks/outbound-webhooks.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  QUEUE_COUNT_STATUSES,
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
  ) {}

  async getSnapshot() {
    const [
      outboundQueue,
      exportQueue,
      integrationQueue,
      outboundDeliveryCounts,
      exportDeliveryCounts,
      deadLetterJobs,
    ] = await Promise.all([
      this.getQueueCounts(this.outboundWebhookQueue),
      this.getQueueCounts(this.exportDeliveryQueue),
      this.getQueueCounts(this.nativeIntegrationQueue),
      this.prisma.client.outboundWebhookDelivery.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.client.exportDelivery.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.client.deadLetterJob.count(),
    ]);

    return {
      queues: {
        [OUTBOUND_WEBHOOK_QUEUE]: outboundQueue,
        [EXPORT_DELIVERY_QUEUE]: exportQueue,
        [NATIVE_INTEGRATION_EXPORT_QUEUE]: integrationQueue,
      },
      deliveries: {
        outboundWebhooks: this.toStatusCounts(outboundDeliveryCounts),
        exports: this.toStatusCounts(exportDeliveryCounts),
        deadLetterJobs,
      },
    };
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
