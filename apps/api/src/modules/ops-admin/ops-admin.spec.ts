import { afterEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, RequestMethod } from "@nestjs/common";
import { OpsAdminController } from "./ops-admin.controller.js";
import { OpsAdminService } from "./ops-admin.service.js";
import {
  EMAIL_DELIVERY_QUEUE,
  SUBMISSION_MODERATION_QUEUE,
} from "../queueing/queueing.constants.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

describe("OpsAdminController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is defined", () => {
    expect(OpsAdminController).toBeDefined();
  });

  it("declares GET /ops-admin/_status", () => {
    expect(Reflect.getMetadata(PATH_METADATA, OpsAdminController)).toBe(
      "ops-admin",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OpsAdminController.prototype.getStatus,
      ),
    ).toBe("_status");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        OpsAdminController.prototype.getStatus,
      ),
    ).toBe(RequestMethod.GET);
  });

  it("keeps ops-admin status placeholder-only and non-sensitive", () => {
    const service = new OpsAdminService({} as never, {} as never);

    expect(service.getStatus()).toEqual({
      status: "ready",
      surface: "internal-only",
    });
  });

  it("declares queue snapshot and dead-letter retry routes", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, OpsAdminController.prototype.getQueues),
    ).toBe("queues");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        OpsAdminController.prototype.getQueues,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        OpsAdminController.prototype.retryDeadLetter,
      ),
    ).toBe("dead-letter/:id/retry");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        OpsAdminController.prototype.retryDeadLetter,
      ),
    ).toBe(RequestMethod.POST);
  });

  it("combines queue telemetry with email usage and unresolved alert counts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-28T08:00:00.000Z"));

    const service = new OpsAdminService(
      {
        client: {
          emailUsage: {
            findUnique: vi
              .fn()
              .mockResolvedValueOnce({ date: "2026-05-28", count: 4 })
              .mockResolvedValueOnce({ date: "2026-05-27", count: 3 }),
          },
          alertHistory: {
            count: vi.fn().mockResolvedValue(2),
          },
          formModerationRun: {
            count: vi.fn().mockResolvedValue(3),
            findFirst: vi.fn().mockResolvedValue({
              createdAt: new Date("2026-05-28T07:55:00.000Z"),
            }),
          },
        },
      } as never,
      {
        getSnapshot: vi.fn().mockResolvedValue({
          queues: { [EMAIL_DELIVERY_QUEUE]: { waiting: 1 } },
          deliveries: { emails: { PENDING: 1 } },
        }),
      } as never,
    );

    await expect(service.getQueueSnapshot()).resolves.toEqual(
      expect.objectContaining({
        queues: { [EMAIL_DELIVERY_QUEUE]: { waiting: 1 } },
        deliveries: { emails: { PENDING: 1 } },
        emailUsage: {
          today: { date: "2026-05-28", count: 4 },
          yesterday: { date: "2026-05-27", count: 3 },
        },
        unresolvedAlertCount: 2,
        moderationBudget: {
          budgetSuppressedCount: 3,
          lastBudgetSuppressedAt: "2026-05-28T07:55:00.000Z",
        },
      }),
    );
  });

  it("rejects retry for unsupported dead-letter queues", async () => {
    const service = new OpsAdminService(
      {
        client: {
          deadLetterJob: {
            findUnique: vi.fn().mockResolvedValue({
              id: "dlq_1",
              queue: "unknown",
              retried: false,
              data: { deliveryId: "delivery_1" },
              retryHistory: null,
            }),
          },
        },
      } as never,
      {} as never,
    );

    await expect(service.retryDeadLetter("dlq_1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("retries email dead-letter jobs with deterministic BullMQ jobs", async () => {
    const emailQueue = { add: vi.fn().mockResolvedValue({ id: "job_1" }) };
    const update = vi.fn().mockResolvedValue({ id: "dlq_1", retried: true });
    const service = new OpsAdminService(
      {
        client: {
          deadLetterJob: {
            findUnique: vi.fn().mockResolvedValue({
              id: "dlq_1",
              queue: EMAIL_DELIVERY_QUEUE,
              retried: false,
              data: { deliveryId: "email_1" },
              retryHistory: null,
            }),
            update,
          },
        },
      } as never,
      {} as never,
      emailQueue as never,
    );

    await expect(service.retryDeadLetter("dlq_1")).resolves.toEqual({
      retried: true,
      jobId: "retry-email-delivery-dlq_1-email_1",
    });
    expect(emailQueue.add).toHaveBeenCalledWith(
      "send",
      { deliveryId: "email_1" },
      expect.objectContaining({
        jobId: "retry-email-delivery-dlq_1-email_1",
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "dlq_1" },
        data: expect.objectContaining({ retried: true }),
      }),
    );
  });

  it("retries submission moderation dead-letter jobs by run id", async () => {
    const moderationQueue = { add: vi.fn().mockResolvedValue({ id: "job_1" }) };
    const update = vi.fn().mockResolvedValue({ id: "dlq_1", retried: true });
    const service = new OpsAdminService(
      {
        client: {
          deadLetterJob: {
            findUnique: vi.fn().mockResolvedValue({
              id: "dlq_1",
              queue: SUBMISSION_MODERATION_QUEUE,
              retried: false,
              data: { runId: "run_1" },
              retryHistory: null,
            }),
            update,
          },
        },
      } as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      undefined,
      moderationQueue as never,
    );

    await expect(service.retryDeadLetter("dlq_1")).resolves.toEqual({
      retried: true,
      jobId: "retry-submission-moderation-dlq_1-run_1",
    });
    expect(moderationQueue.add).toHaveBeenCalledWith(
      SUBMISSION_MODERATION_QUEUE,
      { runId: "run_1" },
      expect.objectContaining({
        jobId: "retry-submission-moderation-dlq_1-run_1",
      }),
    );
  });
});
