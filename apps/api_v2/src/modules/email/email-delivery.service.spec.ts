import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import { EmailDeliveryStatus, EmailTemplateKey } from "@workspace/database/prisma";
import { EMAIL_DELIVERY_QUEUE } from "../queueing/queueing.constants.js";
import { EmailDeliveryService } from "./email-delivery.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { ResendMailerService } from "./resend-mailer.service.js";

function makeQueue() {
  return {
    add: vi.fn().mockResolvedValue({ id: "job_1" }),
  } as unknown as Queue;
}

function makePrisma(client: Record<string, unknown>) {
  return { client } as unknown as PrismaService;
}

function makeMailer(result: unknown) {
  return {
    sendDelivery: vi.fn().mockResolvedValue(result),
  } as unknown as ResendMailerService;
}

describe("EmailDeliveryService", () => {
  it("enqueues due pending deliveries with deterministic BullMQ options", async () => {
    const queue = makeQueue();
    const emailDeliveryUpdate = vi.fn().mockResolvedValue({ id: "email_1" });
    const prisma = makePrisma({
      emailDelivery: {
        findMany: vi.fn().mockResolvedValue([{ id: "email_1" }]),
        update: emailDeliveryUpdate,
      },
    });
    const service = new EmailDeliveryService(
      prisma,
      queue,
      makeMailer({ skipped: true }),
    );

    await expect(service.enqueuePending(25)).resolves.toEqual({ count: 1 });
    expect(queue.add).toHaveBeenCalledWith(
      "send",
      { deliveryId: "email_1" },
      expect.objectContaining({
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
        jobId: "email-delivery:email_1",
      }),
    );
    expect(emailDeliveryUpdate).toHaveBeenCalledWith({
      where: { id: "email_1" },
      data: { status: EmailDeliveryStatus.ENQUEUED },
      select: expect.any(Object),
    });
  });

  it("renders, sends, marks success, and increments daily usage", async () => {
    const now = new Date("2026-05-28T08:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const delivery = {
      id: "email_1",
      userId: "user_1",
      notificationId: "notification_1",
      projectId: "project_1",
      recipientEmail: "ada@example.com",
      recipientName: "Ada",
      template: EmailTemplateKey.NOTIFICATION,
      subject: "New testimonial",
      payload: {
        title: "New testimonial",
        message: "Ada left a review",
        link: "/projects/acme/testimonials",
        type: "NEW_TESTIMONIAL",
      },
      status: EmailDeliveryStatus.ENQUEUED,
      attempts: 0,
      nextAttemptAt: null,
      provider: "resend",
      providerMessageId: null,
      idempotencyKey: "notification:notification_1:user_1",
      providerError: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const emailUsageUpsert = vi.fn().mockResolvedValue({ id: "usage_1" });
    const prisma = makePrisma({
      emailDelivery: {
        findUnique: vi.fn().mockResolvedValue(delivery),
        update: vi
          .fn()
          .mockResolvedValueOnce({
            ...delivery,
            attempts: 1,
            status: EmailDeliveryStatus.SENDING,
          })
          .mockResolvedValueOnce({
            ...delivery,
            attempts: 1,
            status: EmailDeliveryStatus.SENT,
            providerMessageId: "msg_1",
            sentAt: now,
          }),
      },
      emailUsage: {
        upsert: emailUsageUpsert,
      },
    });
    const mailer = makeMailer({
      skipped: false,
      providerMessageId: "msg_1",
    });
    const service = new EmailDeliveryService(prisma, makeQueue(), mailer);

    await expect(service.processDelivery("email_1")).resolves.toMatchObject({
      status: EmailDeliveryStatus.SENT,
      providerMessageId: "msg_1",
    });

    expect(mailer.sendDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ id: "email_1", attempts: 1 }),
      expect.objectContaining({
        subject: "New testimonial",
        html: expect.stringContaining("Ada left a review"),
      }),
    );
    expect(emailUsageUpsert).toHaveBeenCalledWith({
      where: { date: "2026-05-28" },
      create: { date: "2026-05-28", count: 1 },
      update: { count: { increment: 1 } },
    });

    vi.useRealTimers();
  });
});
