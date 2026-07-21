import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import { QueueTelemetryService } from "./queue-telemetry.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

function makeQueue(counts: Record<string, number>) {
  return {
    getJobCounts: vi.fn().mockResolvedValue(counts),
  } as unknown as Queue;
}

function makePrisma() {
  return {
    client: {
      outboundWebhookDelivery: {
        groupBy: vi.fn().mockResolvedValue([
          { status: "PENDING", _count: { _all: 2 } },
          { status: "FAILED", _count: { _all: 1 } },
        ]),
      },
      exportDelivery: {
        groupBy: vi
          .fn()
          .mockResolvedValue([{ status: "SUCCEEDED", _count: { _all: 3 } }]),
      },
      emailDelivery: {
        groupBy: vi
          .fn()
          .mockResolvedValue([{ status: "PENDING", _count: { _all: 5 } }]),
        findFirst: vi.fn().mockResolvedValue({
          createdAt: new Date("2026-05-28T07:58:30.000Z"),
        }),
      },
      formModerationRun: {
        groupBy: vi
          .fn()
          .mockResolvedValueOnce([
            { status: "SUPPRESSED", _count: { _all: 1 } },
            { status: "FAILED", _count: { _all: 2 } },
          ])
          .mockResolvedValueOnce([
            { status: "ENQUEUED", _count: { _all: 3 } },
          ]),
      },
      deadLetterJob: {
        count: vi.fn().mockResolvedValue(7),
      },
    },
  } as unknown as PrismaService;
}

const expectedQueueSnapshot = {
  queues: {
    "outbound-webhook-delivery": {
      waiting: 1,
      active: 2,
      delayed: 0,
      failed: 3,
      completed: 0,
    },
    "export-delivery": {
      waiting: 4,
      active: 0,
      delayed: 5,
      failed: 0,
      completed: 0,
    },
    "native-integration-export": {
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0,
      completed: 6,
    },
    "email-delivery": {
      waiting: 7,
      active: 1,
      delayed: 0,
      failed: 0,
      completed: 0,
    },
    "submission-moderation": {
      waiting: 8,
      active: 0,
      delayed: 0,
      failed: 2,
      completed: 0,
    },
    imports: {
      waiting: 9,
      active: 0,
      delayed: 1,
      failed: 4,
      completed: 0,
    },
  },
  deliveries: {
    outboundWebhooks: { PENDING: 2, FAILED: 1 },
    exports: { SUCCEEDED: 3 },
    emails: { PENDING: 5 },
    moderationRuns: { SUPPRESSED: 1, FAILED: 2 },
    moderationRunsLast24h: { ENQUEUED: 3 },
    oldestPendingEmailDeliveryAgeSeconds: 90,
    deadLetterJobs: 7,
  },
};

describe("QueueTelemetryService", () => {
  it("summarizes BullMQ counts and durable delivery counts", async () => {
    const now = new Date("2026-05-28T08:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const outboundQueue = makeQueue({ waiting: 1, active: 2, failed: 3 });
    const exportQueue = makeQueue({ waiting: 4, delayed: 5 });
    const integrationQueue = makeQueue({ completed: 6 });
    const emailQueue = makeQueue({ waiting: 7, active: 1 });
    const moderationQueue = makeQueue({ waiting: 8, failed: 2 });
    const importQueue = makeQueue({ waiting: 9, delayed: 1, failed: 4 });
    const prisma = makePrisma();
    const service = new QueueTelemetryService(
      prisma,
      outboundQueue,
      exportQueue,
      integrationQueue,
      emailQueue,
      moderationQueue,
      importQueue,
    );

    await expect(service.getSnapshot()).resolves.toEqual(expectedQueueSnapshot);
    expect(prisma.client.formModerationRun.groupBy).toHaveBeenNthCalledWith(1, {
      by: ["status"],
      _count: { _all: true },
    });
    expect(prisma.client.formModerationRun.groupBy).toHaveBeenNthCalledWith(2, {
      by: ["status"],
      where: {
        createdAt: {
          gte: new Date("2026-05-27T08:00:00.000Z"),
        },
      },
      _count: { _all: true },
    });
    vi.useRealTimers();
  });
});
