import { AlertSeverity } from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import { EMAIL_OUTBOX_LOCK, QUEUE_LOCK_TTL_MS } from "./queueing.constants.js";
import { QueueMaintenanceService } from "./queue-maintenance.service.js";

describe("QueueMaintenanceService", () => {
  it("drains the email outbox under a Redis lock", async () => {
    const locks = {
      withLock: vi.fn(async (_key, _ttl, task) => task()),
    };
    const emailDeliveries = {
      enqueuePending: vi.fn().mockResolvedValue({ count: 2 }),
    };
    const service = new QueueMaintenanceService(
      locks as never,
      emailDeliveries as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.drainEmailOutbox();

    expect(locks.withLock).toHaveBeenCalledWith(
      EMAIL_OUTBOX_LOCK,
      QUEUE_LOCK_TTL_MS,
      expect.any(Function),
    );
    expect(emailDeliveries.enqueuePending).toHaveBeenCalledWith(100);
  });

  it("does nothing when the email outbox lock is unavailable", async () => {
    const locks = {
      withLock: vi.fn().mockResolvedValue(null),
    };
    const emailDeliveries = {
      enqueuePending: vi.fn(),
    };
    const service = new QueueMaintenanceService(
      locks as never,
      emailDeliveries as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.drainEmailOutbox();

    expect(emailDeliveries.enqueuePending).not.toHaveBeenCalled();
  });

  it("records a backlog alert without throwing when alert delivery fails", async () => {
    const locks = {
      withLock: vi.fn(async (_key, _ttl, task) => task()),
    };
    const prisma = {
      client: {
        outboundWebhookDelivery: { findMany: vi.fn().mockResolvedValue([]) },
        exportDelivery: { findMany: vi.fn().mockResolvedValue([]) },
        alertConfig: {
          findFirst: vi.fn().mockResolvedValue({ dlqCountThreshold: 1 }),
        },
      },
    };
    const telemetry = {
      getSnapshot: vi.fn().mockResolvedValue({
        queues: {
          "email-delivery": {
            waiting: 2,
            active: 0,
            delayed: 0,
            failed: 0,
            completed: 0,
          },
        },
        deliveries: {},
      }),
    };
    const alerts = {
      recordOperationalAlert: vi
        .fn()
        .mockRejectedValue(new Error("slack down")),
    };
    const service = new QueueMaintenanceService(
      locks as never,
      { enqueuePending: vi.fn() } as never,
      telemetry as never,
      prisma as never,
      alerts as never,
      { add: vi.fn() } as never,
      { add: vi.fn() } as never,
      { add: vi.fn() } as never,
    );

    await expect(service.reconcileDeliveries()).resolves.toBeUndefined();
    expect(alerts.recordOperationalAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: "QUEUE_BACKLOG_HIGH",
        severity: AlertSeverity.WARNING,
      }),
    );
  });

  it("recovers stale ENQUEUED rows through failed-job replacement", async () => {
    const locks = {
      withLock: vi.fn(async (_key, _ttl, task) => task()),
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const emailDeliveries = {
      replaceStaleDeliveryJob: vi.fn().mockResolvedValue({ id: "email_1" }),
    };
    const prisma = {
      client: {
        emailDelivery: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              {
                id: "email_1",
                status: "ENQUEUED",
                attempts: 0,
                template: "NOTIFICATION",
              },
            ]),
          updateMany,
        },
      },
    };
    const service = new QueueMaintenanceService(
      locks as never,
      emailDeliveries as never,
      {} as never,
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.guardStaleEmailDeliveries();

    // Compare-and-swap: guarded by id + still-stuck status + still-stale
    // updatedAt, so a row a worker already moved on is not overwritten.
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "email_1",
          status: "ENQUEUED",
          updatedAt: { lte: expect.any(Date) },
        }),
        data: expect.objectContaining({ status: "PENDING" }),
      }),
    );
    expect(emailDeliveries.replaceStaleDeliveryJob).toHaveBeenCalledWith(
      "email_1",
    );
  });

  it("alerts when the durable email outbox age crosses its threshold", async () => {
    const locks = {
      withLock: vi.fn(async (_key, _ttl, task) => task()),
    };
    const prisma = {
      client: {
        outboundWebhookDelivery: { findMany: vi.fn().mockResolvedValue([]) },
        exportDelivery: { findMany: vi.fn().mockResolvedValue([]) },
        alertConfig: {
          findFirst: vi.fn().mockResolvedValue({ dlqCountThreshold: 100 }),
        },
      },
    };
    const telemetry = {
      getSnapshot: vi.fn().mockResolvedValue({
        queues: {
          "email-delivery": {
            waiting: 0,
            active: 0,
            delayed: 0,
            failed: 0,
            completed: 0,
          },
        },
        deliveries: { oldestPendingEmailDeliveryAgeSeconds: 901 },
      }),
    };
    const alerts = { recordOperationalAlert: vi.fn().mockResolvedValue({}) };
    const config = { get: vi.fn().mockReturnValue(900) };
    const service = new QueueMaintenanceService(
      locks as never,
      { enqueuePending: vi.fn() } as never,
      telemetry as never,
      prisma as never,
      alerts as never,
      { add: vi.fn() } as never,
      { add: vi.fn() } as never,
      { add: vi.fn() } as never,
      config as never,
    );

    await service.reconcileDeliveries();

    expect(alerts.recordOperationalAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: "QUEUE_BACKLOG_HIGH",
        metadata: expect.objectContaining({
          oldestPendingEmailDeliveryAgeSeconds: 901,
          ageThresholdSeconds: 900,
        }),
      }),
    );
  });
});
