import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import {
  EmailDeliveryStatus,
  EmailTemplateKey,
  Prisma,
} from "@workspace/database/prisma";
import { EmailDeliveryService } from "./email-delivery.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { ResendMailerService } from "./resend-mailer.service.js";
import type { ConfigService } from "@nestjs/config";

function makeQueue() {
  return {
    add: vi.fn().mockResolvedValue({ id: "job_1" }),
    getJob: vi.fn().mockResolvedValue(null),
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

function makeConfig(values: Record<string, unknown>) {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function delivery(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-08-12T08:00:00.000Z");
  return {
    id: "email_1",
    userId: null,
    notificationId: null,
    projectId: "project_1",
    recipientEmail: "ada@example.com",
    recipientName: "Ada",
    template: EmailTemplateKey.NOTIFICATION,
    subject: "New submission",
    payload: { title: "New submission", message: "A response arrived" },
    status: EmailDeliveryStatus.ENQUEUED,
    suppressionReason: null,
    attempts: 0,
    nextAttemptAt: null,
    provider: "resend",
    providerMessageId: null,
    idempotencyKey: "email-1",
    providerError: null,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
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
    expect(prisma.client.emailDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { nextAttemptAt: null },
            { nextAttemptAt: { lte: expect.any(Date) } },
          ],
        }),
      }),
    );
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
      data: {
        status: EmailDeliveryStatus.ENQUEUED,
        suppressionReason: null,
      },
      select: expect.any(Object),
    });
  });

  it("defers a non-auth delivery at the daily cap until next UTC midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T23:45:00.000Z"));
    const current = delivery();
    const update = vi.fn().mockResolvedValue({
      ...current,
      status: EmailDeliveryStatus.PENDING,
      nextAttemptAt: new Date("2026-08-13T00:00:00.000Z"),
    });
    const prisma = makePrisma({
      emailDelivery: {
        findUnique: vi.fn().mockResolvedValue(current),
        update,
      },
      emailUsage: { findUnique: vi.fn().mockResolvedValue({ count: 1000 }) },
    });
    const mailer = makeMailer({ skipped: false, providerMessageId: "msg_1" });
    const service = new EmailDeliveryService(
      prisma,
      makeQueue(),
      mailer,
      makeConfig({ EMAIL_DAILY_LIMIT: 1000 }),
    );

    await expect(service.processDelivery(current.id)).resolves.toMatchObject({
      status: EmailDeliveryStatus.PENDING,
      nextAttemptAt: new Date("2026-08-13T00:00:00.000Z"),
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailDeliveryStatus.PENDING,
          nextAttemptAt: new Date("2026-08-13T00:00:00.000Z"),
        }),
      }),
    );
    expect(mailer.sendDelivery).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("exempts Clerk auth mail from the daily cap", async () => {
    const current = delivery({
      id: "email_clerk_cap",
      template: EmailTemplateKey.CLERK_EMAIL,
      payload: { subject: "Your code", text: "424242", otpCode: "424242" },
    });
    const usageFind = vi.fn().mockResolvedValue({ count: 1000 });
    const update = vi
      .fn()
      .mockResolvedValueOnce({ ...current, attempts: 1, status: EmailDeliveryStatus.SENDING })
      .mockResolvedValueOnce({ ...current, attempts: 1, status: EmailDeliveryStatus.SENT });
    const prisma = makePrisma({
      emailDelivery: { findUnique: vi.fn().mockResolvedValue(current), update },
      emailUsage: {
        findUnique: usageFind,
        upsert: vi.fn().mockResolvedValue({}),
      },
    });
    const mailer = makeMailer({ skipped: false, providerMessageId: "msg_1" });
    const service = new EmailDeliveryService(
      prisma,
      makeQueue(),
      mailer,
      makeConfig({ EMAIL_DAILY_LIMIT: 1 }),
    );

    await service.processDelivery(current.id);

    expect(usageFind).not.toHaveBeenCalled();
    expect(mailer.sendDelivery).toHaveBeenCalledTimes(1);
  });

  it("suppresses opted-out non-user mail before rendering or sending", async () => {
    const current = delivery({ template: "RESPONSE_PUBLISHED" });
    const update = vi.fn().mockResolvedValue({
      ...current,
      status: EmailDeliveryStatus.SUPPRESSED,
      suppressionReason: "RECIPIENT_SUPPRESSED",
    });
    const prisma = makePrisma({
      emailDelivery: { findUnique: vi.fn().mockResolvedValue(current), update },
      emailUsage: { findUnique: vi.fn().mockResolvedValue(null) },
      emailSuppression: { findUnique: vi.fn().mockResolvedValue({ id: "suppression_1" }) },
    });
    const mailer = makeMailer({ skipped: false, providerMessageId: "msg_1" });
    const service = new EmailDeliveryService(prisma, makeQueue(), mailer);

    await expect(service.processDelivery(current.id)).resolves.toMatchObject({
      status: EmailDeliveryStatus.SUPPRESSED,
      suppressionReason: "RECIPIENT_SUPPRESSED",
    });
    expect(mailer.sendDelivery).not.toHaveBeenCalled();
  });

  it("records DELIVERY_DISABLED when the provider gate skips a delivery", async () => {
    const current = delivery();
    const update = vi
      .fn()
      .mockResolvedValueOnce({ ...current, attempts: 1, status: EmailDeliveryStatus.SENDING })
      .mockResolvedValueOnce({
        ...current,
        attempts: 1,
        status: EmailDeliveryStatus.SUPPRESSED,
        suppressionReason: "DELIVERY_DISABLED",
      });
    const prisma = makePrisma({
      emailDelivery: { findUnique: vi.fn().mockResolvedValue(current), update },
      emailUsage: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    const service = new EmailDeliveryService(
      prisma,
      makeQueue(),
      makeMailer({ skipped: true }),
    );

    await expect(service.processDelivery(current.id)).resolves.toMatchObject({
      suppressionReason: "DELIVERY_DISABLED",
    });
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ suppressionReason: "DELIVERY_DISABLED" }),
      }),
    );
  });

  it("sends project-voiced mail with owner reply-to and one-click unsubscribe headers", async () => {
    const current = delivery({
      template: "RESPONSE_PUBLISHED",
      payload: {
        projectName: "Acme",
        ownerEmail: "owner@acme.test",
        authorName: "Ada",
        publishedUrl: "https://acme.walls.semblia.com",
      },
    });
    const update = vi
      .fn()
      .mockResolvedValueOnce({ ...current, attempts: 1, status: EmailDeliveryStatus.SENDING })
      .mockResolvedValueOnce({ ...current, attempts: 1, status: EmailDeliveryStatus.SENT });
    const prisma = makePrisma({
      emailDelivery: { findUnique: vi.fn().mockResolvedValue(current), update },
      emailUsage: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
      emailSuppression: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    const mailer = makeMailer({ skipped: false, providerMessageId: "msg_1" });
    const service = new EmailDeliveryService(
      prisma,
      makeQueue(),
      mailer,
      makeConfig({
        EMAIL_DAILY_LIMIT: 1000,
        EMAIL_UNSUBSCRIBE_SECRET: "test-unsubscribe-secret",
        API_PUBLIC_URL: "https://api.semblia.com",
      }),
    );

    await service.processDelivery(current.id);

    expect(mailer.sendDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ id: current.id }),
      expect.objectContaining({ html: expect.stringContaining("Unsubscribe") }),
      {
        replyTo: "owner@acme.test",
        headers: {
          "List-Unsubscribe": expect.stringMatching(
            /^<https:\/\/api\.semblia\.com\/v2\/public\/email\/unsubscribe\?token=/,
          ),
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
    );
  });

  it("returns terminal deliveries without re-rendering, sending, or counting usage", async () => {
    const current = delivery({ status: EmailDeliveryStatus.SENT, sentAt: new Date() });
    const update = vi.fn();
    const usageFind = vi.fn();
    const prisma = makePrisma({
      emailDelivery: { findUnique: vi.fn().mockResolvedValue(current), update },
      emailUsage: { findUnique: usageFind, upsert: vi.fn() },
    });
    const mailer = makeMailer({ skipped: false, providerMessageId: "msg_2" });
    const service = new EmailDeliveryService(prisma, makeQueue(), mailer);

    await expect(service.processDelivery(current.id)).resolves.toEqual(current);
    expect(update).not.toHaveBeenCalled();
    expect(mailer.sendDelivery).not.toHaveBeenCalled();
    expect(usageFind).not.toHaveBeenCalled();
  });

  it("removes a retained failed BullMQ job before adding its replacement", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const getState = vi.fn().mockResolvedValue("failed");
    const queue = makeQueue();
    vi.mocked(queue.getJob).mockResolvedValue({ remove, getState } as never);
    const prisma = makePrisma({
      emailDelivery: { update: vi.fn().mockResolvedValue({ id: "email_1" }) },
    });
    const service = new EmailDeliveryService(
      prisma,
      queue,
      makeMailer({ skipped: true }),
    );

    await service.replaceStaleDeliveryJob("email_1");

    expect(queue.getJob).toHaveBeenCalledWith("email-delivery-email_1");
    expect(remove).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      "send",
      { deliveryId: "email_1" },
      expect.objectContaining({ jobId: "email-delivery-email_1" }),
    );
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(queue.add).mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it("leaves an active (locked) job in place and does not re-enqueue", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const getState = vi.fn().mockResolvedValue("active");
    const queue = makeQueue();
    vi.mocked(queue.getJob).mockResolvedValue({ remove, getState } as never);
    const service = new EmailDeliveryService(
      makePrisma({ emailDelivery: { update: vi.fn() } }),
      queue,
      makeMailer({ skipped: true }),
    );

    const result = await service.replaceStaleDeliveryJob("email_1");

    expect(result).toBeNull();
    expect(remove).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
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
        findUnique: vi.fn().mockResolvedValue(null),
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
      expect.any(Object),
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
      expect.any(Object),
    );
    expect(prisma.client.emailDelivery.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ payload: Prisma.DbNull }),
      }),
    );

    vi.useRealTimers();
  });
});
