import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import {
  EmailDeliveryStatus,
  EmailTemplateKey,
} from "@workspace/database/prisma";
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
  it("creates and immediately enqueues Clerk-routed email deliveries", async () => {
    const queue = makeQueue();
    const emailDeliveryUpsert = vi.fn().mockResolvedValue({
      id: "email_clerk_1",
      status: EmailDeliveryStatus.PENDING,
    });
    const emailDeliveryUpdate = vi.fn().mockResolvedValue({
      id: "email_clerk_1",
      status: EmailDeliveryStatus.ENQUEUED,
    });
    const prisma = makePrisma({
      emailDelivery: {
        upsert: emailDeliveryUpsert,
        update: emailDeliveryUpdate,
      },
    });
    const service = new EmailDeliveryService(
      prisma,
      queue,
      makeMailer({ skipped: true }),
    );

    await expect(
      service.createClerkEmailDelivery(
        {
          id: "email_123",
          slug: "verification_code",
          status: "queued",
          toEmailAddress: "Invitee@Example.com",
          subject: "424242 is your Semblia verification code",
          body: "<p>Your code is 424242.</p>",
          bodyPlain: "Your code is 424242.",
          otpCode: "424242",
        },
        "msg_123",
      ),
    ).resolves.toMatchObject({
      id: "email_clerk_1",
      status: EmailDeliveryStatus.ENQUEUED,
    });

    expect(emailDeliveryUpsert).toHaveBeenCalledWith({
      where: {
        idempotencyKey: "clerk-email:msg_123:invitee@example.com",
      },
      update: {},
      create: expect.objectContaining({
        recipientEmail: "invitee@example.com",
        template: EmailTemplateKey.CLERK_EMAIL,
        subject: "424242 is your Semblia verification code",
        idempotencyKey: "clerk-email:msg_123:invitee@example.com",
        payload: expect.objectContaining({
          clerkMessageId: "email_123",
          slug: "verification_code",
          html: "<p>Your code is 424242.</p>",
          text: "Your code is 424242.",
          otpCode: "424242",
        }),
      }),
      select: expect.any(Object),
    });
    expect(queue.add).toHaveBeenCalledWith(
      "send",
      { deliveryId: "email_clerk_1" },
      expect.objectContaining({
        jobId: "email-delivery-email_clerk_1",
      }),
    );
  });

  it("does not re-enqueue an already sent Clerk email delivery", async () => {
    const queue = makeQueue();
    const prisma = makePrisma({
      emailDelivery: {
        upsert: vi.fn().mockResolvedValue({
          id: "email_clerk_1",
          status: EmailDeliveryStatus.SENT,
        }),
      },
    });
    const service = new EmailDeliveryService(
      prisma,
      queue,
      makeMailer({ skipped: true }),
    );

    await expect(
      service.createClerkEmailDelivery(
        {
          toEmailAddress: "invitee@example.com",
          subject: "Welcome",
          body: "<p>Welcome.</p>",
        },
        "msg_123",
      ),
    ).resolves.toMatchObject({
      id: "email_clerk_1",
      status: EmailDeliveryStatus.SENT,
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

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
        jobId: "email-delivery-email_1",
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
      subject: "New submission",
      payload: {
        title: "New submission",
        message: "Ada submitted a response",
        link: "/projects/acme/submissions/submission_1",
        type: "SUBMISSION_CREATED",
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
        subject: "New submission",
        html: expect.stringContaining("Ada submitted a response"),
      }),
    );
    expect(emailUsageUpsert).toHaveBeenCalledWith({
      where: { date: "2026-05-28" },
      create: { date: "2026-05-28", count: 1 },
      update: { count: { increment: 1 } },
    });

    vi.useRealTimers();
  });

  it("renders Clerk email.created payloads through the Resend mailer", async () => {
    const now = new Date("2026-05-28T08:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const delivery = {
      id: "email_clerk_1",
      userId: null,
      notificationId: null,
      projectId: null,
      recipientEmail: "invitee@example.com",
      recipientName: null,
      template: EmailTemplateKey.CLERK_EMAIL,
      subject: "Sign in to Semblia",
      payload: {
        subject: "Sign in to Semblia",
        html: "<p>Use this link to sign in.</p>",
        text: "Use this link to sign in.",
        slug: "magic_link",
        magicLink: "https://accounts.semblia.com/magic",
      },
      status: EmailDeliveryStatus.ENQUEUED,
      attempts: 0,
      nextAttemptAt: null,
      provider: "resend",
      providerMessageId: null,
      idempotencyKey: "clerk-email:msg_123:invitee@example.com",
      providerError: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    };
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
        upsert: vi.fn().mockResolvedValue({ id: "usage_1" }),
      },
    });
    const mailer = makeMailer({
      skipped: false,
      providerMessageId: "msg_1",
    });
    const service = new EmailDeliveryService(prisma, makeQueue(), mailer);

    await expect(
      service.processDelivery("email_clerk_1"),
    ).resolves.toMatchObject({
      status: EmailDeliveryStatus.SENT,
      providerMessageId: "msg_1",
    });

    expect(mailer.sendDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ id: "email_clerk_1", attempts: 1 }),
      expect.objectContaining({
        subject: "Sign in to Semblia",
        html: "<p>Use this link to sign in.</p>",
        text: "Use this link to sign in.",
      }),
    );

    vi.useRealTimers();
  });
});
