import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import {
  EmailDeliveryStatus,
  EmailTemplateKey,
  Prisma,
  type EmailDelivery,
  type NotificationType,
} from "@workspace/database/prisma";
import type { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  DEFAULT_DELIVERY_ATTEMPTS,
  DEFAULT_DELIVERY_BACKOFF_MS,
  EMAIL_DELIVERY_QUEUE,
} from "../queueing/queueing.constants.js";
import { renderEmailTemplate } from "./email-templates.js";
import type {
  ClerkEmailDeliveryPayload,
  EmailDeliveryJob,
  MailerSendError,
  MailerSendOptions,
  NotificationEmailPayload,
  ProjectMemberInviteEmailPayload,
  RenderedEmail,
  ResponsePublishedEmailPayload,
  ResponseThankYouEmailPayload,
} from "./email.types.js";
import { ResendMailerService } from "./resend-mailer.service.js";
import type { ClerkEmailPayloadDto } from "../users/users.dto.js";
import {
  createEmailUnsubscribeUrl,
  hashEmailAddress,
} from "./email-unsubscribe.service.js";

const EMAIL_DELIVERY_SELECT = {
  id: true,
  userId: true,
  notificationId: true,
  projectId: true,
  recipientEmail: true,
  recipientName: true,
  template: true,
  subject: true,
  payload: true,
  status: true,
  suppressionReason: true,
  attempts: true,
  nextAttemptAt: true,
  provider: true,
  providerMessageId: true,
  idempotencyKey: true,
  providerError: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailDeliverySelect;

type EmailDeliveryRecord = Prisma.EmailDeliveryGetPayload<{
  select: typeof EMAIL_DELIVERY_SELECT;
}>;

type EmailWriter = Pick<Prisma.TransactionClient, "emailDelivery">;

type NotificationForEmail = {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Prisma.JsonValue | null;
};

type NotificationEmailRecipient = {
  userId?: string | null;
  email: string;
  name?: string | null;
  emailEnabled?: boolean;
  typePreferences?: Prisma.JsonValue | null;
};

type ProjectInviteForEmail = {
  id: string;
  email: string;
  role: string;
};

type ProjectForInviteEmail = {
  id: string;
  name: string;
};

type InviterForEmail = {
  email?: string | null;
};

@Injectable()
export class EmailDeliveryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_DELIVERY_QUEUE)
    private readonly emailQueue: Queue<EmailDeliveryJob>,
    private readonly mailer: ResendMailerService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  createNotificationDeliveryWith(
    writer: EmailWriter,
    notification: NotificationForEmail,
    recipient: NotificationEmailRecipient,
  ) {
    if (
      recipient.emailEnabled === false ||
      this.isEmailDisabled(recipient.typePreferences, notification.type)
    ) {
      return null;
    }

    const payload: NotificationEmailPayload = {
      title: notification.title,
      message: notification.message,
      link: notification.link ? this.toAppUrl(notification.link) : null,
      type: String(notification.type),
    };

    return writer.emailDelivery.upsert({
      where: {
        idempotencyKey: `notification:${notification.id}:${recipient.email.toLowerCase()}`,
      },
      update: {},
      create: {
        userId: recipient.userId ?? null,
        notificationId: notification.id,
        projectId: getProjectId(notification.metadata),
        recipientEmail: recipient.email.toLowerCase(),
        recipientName: recipient.name ?? null,
        template: EmailTemplateKey.NOTIFICATION,
        subject: trimSubject(notification.title),
        payload: payload as Prisma.InputJsonValue,
        idempotencyKey: `notification:${notification.id}:${recipient.email.toLowerCase()}`,
      },
      select: EMAIL_DELIVERY_SELECT,
    });
  }

  createProjectInviteDeliveryWith(
    writer: EmailWriter,
    invite: ProjectInviteForEmail,
    project: ProjectForInviteEmail,
    inviter?: InviterForEmail | null,
  ) {
    const payload: ProjectMemberInviteEmailPayload = {
      projectName: project.name,
      role: invite.role,
      inviterEmail: inviter?.email ?? null,
      acceptUrl: this.toAppUrl(`/invitations/${invite.id}`),
    };
    const recipientEmail = invite.email.toLowerCase();

    return writer.emailDelivery.upsert({
      where: {
        idempotencyKey: `project-invite:${invite.id}:${recipientEmail}`,
      },
      update: {},
      create: {
        projectId: project.id,
        recipientEmail,
        template: EmailTemplateKey.PROJECT_MEMBER_INVITE,
        subject: trimSubject(`Invitation to ${project.name}`),
        payload: payload as Prisma.InputJsonValue,
        idempotencyKey: `project-invite:${invite.id}:${recipientEmail}`,
      },
      select: EMAIL_DELIVERY_SELECT,
    });
  }

  async createClerkEmailDelivery(
    payload: ClerkEmailPayloadDto,
    providerEventId: string,
  ) {
    const recipientEmail = payload.toEmailAddress.toLowerCase();
    const subject = trimSubject(
      payload.subject ?? subjectForClerkEmail(payload.slug),
    );
    const deliveryPayload: ClerkEmailDeliveryPayload = {
      subject,
      html: payload.body ?? null,
      text: payload.bodyPlain ?? null,
      slug: payload.slug ?? null,
      status: payload.status ?? null,
      clerkMessageId: payload.id ?? null,
      otpCode: payload.otpCode ?? null,
      magicLink: payload.magicLink ?? null,
      actionUrl: payload.actionUrl ?? null,
    };

    const delivery = await this.prisma.client.emailDelivery.upsert({
      where: {
        idempotencyKey: this.clerkEmailIdempotencyKey(
          providerEventId,
          recipientEmail,
        ),
      },
      update: {},
      create: {
        recipientEmail,
        template: EmailTemplateKey.CLERK_EMAIL,
        subject,
        payload: deliveryPayload as Prisma.InputJsonValue,
        idempotencyKey: this.clerkEmailIdempotencyKey(
          providerEventId,
          recipientEmail,
        ),
      },
      select: EMAIL_DELIVERY_SELECT,
    });

    if (
      delivery.status === EmailDeliveryStatus.PENDING ||
      delivery.status === EmailDeliveryStatus.FAILED
    ) {
      return this.enqueueDelivery(delivery.id);
    }

    return delivery;
  }

  async enqueuePending(limit = 100) {
    const deliveries = await this.prisma.client.emailDelivery.findMany({
      where: {
        status: {
          in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.FAILED],
        },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true },
    });

    await Promise.all(
      deliveries.map((delivery) => this.enqueueDelivery(delivery.id)),
    );

    return { count: deliveries.length };
  }

  async enqueueDelivery(deliveryId: string) {
    await this.emailQueue.add(
      "send",
      { deliveryId },
      {
        attempts: DEFAULT_DELIVERY_ATTEMPTS,
        backoff: { type: "exponential", delay: DEFAULT_DELIVERY_BACKOFF_MS },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: emailDeliveryJobId(deliveryId),
      },
    );

    return this.prisma.client.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: EmailDeliveryStatus.ENQUEUED,
        suppressionReason: null,
      },
      select: EMAIL_DELIVERY_SELECT,
    });
  }

  async replaceStaleDeliveryJob(deliveryId: string) {
    const jobId = emailDeliveryJobId(deliveryId);
    const staleJob = await this.emailQueue.getJob(jobId);
    if (staleJob) {
      // A job that is currently active is locked; BullMQ throws on remove().
      // That job is not stale — it is mid-flight — so leave it alone rather
      // than crash the maintenance cron. Only a finished/failed leftover under
      // the deterministic id blocks re-enqueue, and that one removes cleanly.
      const state = await staleJob.getState();
      if (state === "active") return null;
      try {
        await staleJob.remove();
      } catch {
        // Raced into active/locked between the state check and remove — treat
        // it as in-flight and skip; the next cron pass reassesses.
        return null;
      }
    }
    return this.enqueueDelivery(deliveryId);
  }

  async processDelivery(deliveryId: string) {
    const delivery = await this.getDeliveryOrThrow(deliveryId);
    if (isTerminalStatus(delivery.status)) return delivery;

    if (this.isEmailExplicitlyDisabled()) {
      return this.prisma.client.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: EmailDeliveryStatus.SUPPRESSED,
          suppressionReason: "DELIVERY_DISABLED",
          providerError: null,
          nextAttemptAt: null,
          ...terminalPayloadUpdate(delivery.template),
        },
        select: EMAIL_DELIVERY_SELECT,
      });
    }

    if (await this.isRecipientSuppressed(delivery)) {
      return this.prisma.client.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: EmailDeliveryStatus.SUPPRESSED,
          suppressionReason: "RECIPIENT_SUPPRESSED",
          providerError: null,
          nextAttemptAt: null,
        },
        select: EMAIL_DELIVERY_SELECT,
      });
    }

    if (await this.isDailyLimitReached(delivery)) {
      return this.prisma.client.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: EmailDeliveryStatus.PENDING,
          suppressionReason: null,
          nextAttemptAt: nextUtcMidnight(),
          providerError: null,
        },
        select: EMAIL_DELIVERY_SELECT,
      });
    }

    const sending = await this.prisma.client.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: EmailDeliveryStatus.SENDING,
        attempts: { increment: 1 },
        nextAttemptAt: null,
        providerError: null,
        suppressionReason: null,
      },
      select: EMAIL_DELIVERY_SELECT,
    });

    const sendContext = this.buildSendContext(sending);
    const rendered = this.renderDelivery(sending, sendContext.unsubscribeUrl);
    const result = await this.mailer.sendDelivery(
      sending,
      rendered,
      sendContext.mailerOptions,
    );

    if (result.skipped) {
      return this.prisma.client.emailDelivery.update({
        where: { id: sending.id },
        data: {
          status: EmailDeliveryStatus.SUPPRESSED,
          suppressionReason: "DELIVERY_DISABLED",
          providerError: null,
          nextAttemptAt: null,
          ...terminalPayloadUpdate(sending.template),
        },
        select: EMAIL_DELIVERY_SELECT,
      });
    }

    if ("error" in result) {
      const failed = await this.markDeliveryFailed(
        sending,
        sending.attempts,
        result.error,
      );
      if (
        failed.status === EmailDeliveryStatus.FAILED &&
        result.error.retryable
      ) {
        throw new Error(result.error.message);
      }

      return failed;
    }

    const updated = await this.prisma.client.emailDelivery.update({
      where: { id: sending.id },
      data: {
        status: EmailDeliveryStatus.SENT,
        suppressionReason: null,
        providerMessageId: result.providerMessageId,
        providerError: null,
        nextAttemptAt: null,
        sentAt: new Date(),
        ...terminalPayloadUpdate(sending.template),
      },
      select: EMAIL_DELIVERY_SELECT,
    });

    await this.recordEmailUsage();
    return updated;
  }

  async markDeliveryFailed(
    delivery: Pick<EmailDelivery, "id" | "template" | "recipientEmail">,
    attempts: number,
    error: MailerSendError,
  ) {
    const exhausted =
      attempts >= DEFAULT_DELIVERY_ATTEMPTS || error.retryable === false;
    const updated = await this.prisma.client.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted
          ? EmailDeliveryStatus.EXHAUSTED
          : EmailDeliveryStatus.FAILED,
        providerError: error.message,
        nextAttemptAt: exhausted ? null : nextAttemptAt(attempts),
        suppressionReason: null,
        ...(exhausted ? terminalPayloadUpdate(delivery.template) : {}),
      },
      select: EMAIL_DELIVERY_SELECT,
    });

    if (exhausted) {
      await this.recordDeadLetter(updated, error);
    }

    return updated;
  }

  recordDeadLetter(
    delivery: Pick<EmailDelivery, "id" | "template" | "recipientEmail">,
    error: MailerSendError,
  ) {
    return this.prisma.client.deadLetterJob.create({
      data: {
        jobId: `email-delivery:${delivery.id}`,
        queue: EMAIL_DELIVERY_QUEUE,
        data: {
          deliveryId: delivery.id,
          template: delivery.template,
          recipientEmail: delivery.recipientEmail,
        },
        error: error.message,
        errorType: error.retryable ? "transient" : "permanent",
        statusCode: error.statusCode ?? null,
        providerResponse: error.providerResponse ?? null,
        failedAt: new Date(),
      },
    });
  }

  private async getDeliveryOrThrow(deliveryId: string) {
    const delivery = await this.prisma.client.emailDelivery.findUnique({
      where: { id: deliveryId },
      select: EMAIL_DELIVERY_SELECT,
    });

    if (!delivery) {
      throw new NotFoundException("Email delivery not found");
    }

    return delivery;
  }

  private getTemplatePayload(
    delivery: EmailDeliveryRecord,
  ):
    | NotificationEmailPayload
    | ProjectMemberInviteEmailPayload
    | ClerkEmailDeliveryPayload
    | ResponseThankYouEmailPayload
    | ResponsePublishedEmailPayload {
    if (
      !delivery.payload ||
      typeof delivery.payload !== "object" ||
      Array.isArray(delivery.payload)
    ) {
      throw new Error("Email delivery payload is invalid");
    }

    return delivery.payload as
      | NotificationEmailPayload
      | ProjectMemberInviteEmailPayload
      | ClerkEmailDeliveryPayload
      | ResponseThankYouEmailPayload
      | ResponsePublishedEmailPayload;
  }

  private renderDelivery(
    delivery: EmailDeliveryRecord,
    unsubscribeUrl: string | null,
  ): RenderedEmail {
    const template = delivery.template;
    switch (template) {
      case EmailTemplateKey.NOTIFICATION:
        return renderEmailTemplate({
          template: EmailTemplateKey.NOTIFICATION,
          payload: this.getTemplatePayload(
            delivery,
          ) as NotificationEmailPayload,
        });
      case EmailTemplateKey.PROJECT_MEMBER_INVITE:
        return renderEmailTemplate({
          template: EmailTemplateKey.PROJECT_MEMBER_INVITE,
          payload: this.getTemplatePayload(
            delivery,
          ) as ProjectMemberInviteEmailPayload,
        });
      case EmailTemplateKey.CLERK_EMAIL:
        return renderEmailTemplate({
          template: EmailTemplateKey.CLERK_EMAIL,
          payload: this.getTemplatePayload(
            delivery,
          ) as ClerkEmailDeliveryPayload,
        });
      case EmailTemplateKey.RESPONSE_THANK_YOU:
        return renderEmailTemplate(
          {
            template: EmailTemplateKey.RESPONSE_THANK_YOU,
            payload: this.getTemplatePayload(
              delivery,
            ) as ResponseThankYouEmailPayload,
          },
          { unsubscribeUrl },
        );
      case EmailTemplateKey.RESPONSE_PUBLISHED:
        return renderEmailTemplate(
          {
            template: EmailTemplateKey.RESPONSE_PUBLISHED,
            payload: this.getTemplatePayload(
              delivery,
            ) as ResponsePublishedEmailPayload,
          },
          { unsubscribeUrl },
        );
      default:
        return assertNever(template);
    }
  }

  private buildSendContext(delivery: EmailDeliveryRecord): {
    unsubscribeUrl: string | null;
    mailerOptions: MailerSendOptions;
  } {
    if (!isProjectVoicedTemplate(delivery.template)) {
      return { unsubscribeUrl: null, mailerOptions: {} };
    }

    const payload = this.getTemplatePayload(delivery) as
      | ResponseThankYouEmailPayload
      | ResponsePublishedEmailPayload;
    const secret = this.getOptionalString("EMAIL_UNSUBSCRIBE_SECRET");
    const apiPublicUrl = this.getOptionalString("API_PUBLIC_URL");
    const unsubscribeUrl =
      secret && apiPublicUrl
        ? createEmailUnsubscribeUrl({
            deliveryId: delivery.id,
            secret,
            apiPublicUrl,
          })
        : null;

    return {
      unsubscribeUrl,
      mailerOptions: {
        replyTo: payload.ownerEmail,
        ...(unsubscribeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      },
    };
  }

  private async isRecipientSuppressed(delivery: EmailDeliveryRecord) {
    if (!isProjectVoicedTemplate(delivery.template)) return false;
    // Suppression is per-project (see EmailSuppression); a project-voiced
    // delivery always carries a projectId, but if one is somehow absent there
    // is no project to scope the block to, so it cannot be suppressed.
    if (!delivery.projectId) return false;
    const suppression = await this.prisma.client.emailSuppression.findUnique({
      where: {
        projectId_emailHash: {
          projectId: delivery.projectId,
          emailHash: hashEmailAddress(delivery.recipientEmail),
        },
      },
      select: { id: true },
    });
    return suppression !== null;
  }

  private async isDailyLimitReached(delivery: EmailDeliveryRecord) {
    if (delivery.template === EmailTemplateKey.CLERK_EMAIL) return false;
    const date = new Date().toISOString().slice(0, 10);
    const usage = await this.prisma.client.emailUsage.findUnique({
      where: { date },
      select: { count: true },
    });
    const configured = this.configService?.get<number | string>(
      "EMAIL_DAILY_LIMIT",
    );
    const limit = Number(configured ?? 1000);
    return (usage?.count ?? 0) >= limit;
  }

  private getOptionalString(key: string) {
    const value = this.configService?.get<string>(key);
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private isEmailExplicitlyDisabled() {
    if (!this.configService) return false;
    const value = this.configService.get<boolean | string>("EMAIL_ENABLED");
    return value === false || value === "false";
  }

  private recordEmailUsage() {
    const date = new Date().toISOString().slice(0, 10);
    return this.prisma.client.emailUsage.upsert({
      where: { date },
      create: { date, count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  private isEmailDisabled(
    value: Prisma.JsonValue | null | undefined,
    type: string,
  ) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    const preference = (value as Record<string, unknown>)[type];
    if (
      !preference ||
      typeof preference !== "object" ||
      Array.isArray(preference)
    ) {
      return false;
    }

    return (preference as { email?: unknown }).email === false;
  }

  private toAppUrl(pathOrUrl: string) {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }

    const baseUrl =
      this.configService?.get<string>("APP_PUBLIC_URL") ??
      "https://semblia.com";
    return `${baseUrl.replace(/\/$/, "")}/${pathOrUrl.replace(/^\//, "")}`;
  }

  private clerkEmailIdempotencyKey(providerEventId: string, email: string) {
    return `clerk-email:${providerEventId}:${email}`.slice(0, 255);
  }
}

function getProjectId(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const projectId = (metadata as Record<string, unknown>).projectId;
  return typeof projectId === "string" ? projectId : null;
}

function trimSubject(value: string) {
  return value.trim().slice(0, 255);
}

function subjectForClerkEmail(slug: string | null | undefined) {
  const normalized = slug?.toLowerCase().replaceAll("-", "_");
  if (normalized?.includes("verification")) {
    return "Your Semblia verification code";
  }
  if (normalized?.includes("reset")) {
    return "Reset your Semblia password";
  }
  if (normalized?.includes("magic")) {
    return "Sign in to Semblia";
  }
  if (normalized?.includes("invitation")) {
    return "You're invited to Semblia";
  }
  return "Semblia account notification";
}

function nextAttemptAt(attempts: number) {
  return new Date(Date.now() + Math.min(30 * 2 ** attempts, 600) * 1000);
}

function nextUtcMidnight() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

function emailDeliveryJobId(deliveryId: string) {
  return `email-delivery-${deliveryId}`;
}

function isTerminalStatus(status: EmailDeliveryStatus) {
  return (
    status === EmailDeliveryStatus.SENT ||
    status === EmailDeliveryStatus.EXHAUSTED ||
    status === EmailDeliveryStatus.SUPPRESSED
  );
}

function isProjectVoicedTemplate(template: EmailTemplateKey) {
  return (
    template === EmailTemplateKey.RESPONSE_THANK_YOU ||
    template === EmailTemplateKey.RESPONSE_PUBLISHED
  );
}

function terminalPayloadUpdate(template: EmailTemplateKey) {
  return template === EmailTemplateKey.CLERK_EMAIL
    ? { payload: Prisma.DbNull }
    : {};
}

function assertNever(value: never): never {
  throw new Error(`Unhandled email delivery template: ${String(value)}`);
}
