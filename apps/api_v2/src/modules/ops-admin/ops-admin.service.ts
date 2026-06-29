import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Prisma } from "@workspace/database/prisma";
import type { Queue } from "bullmq";
import {
  EXPORT_DELIVERY_QUEUE,
  type ExportDeliveryJob,
} from "../exports/exports.service.js";
import {
  NATIVE_INTEGRATION_EXPORT_QUEUE,
  type NativeIntegrationDeliveryJob,
} from "../integrations/integrations.service.js";
import {
  OUTBOUND_WEBHOOK_QUEUE,
  type OutboundWebhookDeliveryJob,
} from "../outbound-webhooks/outbound-webhooks.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { QueueTelemetryService } from "../queueing/queue-telemetry.service.js";
import {
  DEFAULT_DELIVERY_ATTEMPTS,
  DEFAULT_DELIVERY_BACKOFF_MS,
  EMAIL_DELIVERY_QUEUE,
  SUBMISSION_MODERATION_QUEUE,
} from "../queueing/queueing.constants.js";
import type { EmailDeliveryJob } from "../email/email.types.js";

// The submission-moderation pipeline was removed in the forms rebuild
// (docs/plans/2026-06-18-forms-rebuild.md). The queue name stays registered as
// reserved infra; Phase 6 reintroduces a form-moderation processor on it. Ops
// DLQ retry stays generic over the queue.
type SubmissionModerationJob = { runId: string };

@Injectable()
export class OpsAdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly queueTelemetry: QueueTelemetryService,
    @Optional()
    @InjectQueue(EMAIL_DELIVERY_QUEUE)
    private readonly emailQueue?: Queue<EmailDeliveryJob>,
    @Optional()
    @InjectQueue(OUTBOUND_WEBHOOK_QUEUE)
    private readonly outboundWebhookQueue?: Queue<OutboundWebhookDeliveryJob>,
    @Optional()
    @InjectQueue(EXPORT_DELIVERY_QUEUE)
    private readonly exportDeliveryQueue?: Queue<ExportDeliveryJob>,
    @Optional()
    @InjectQueue(NATIVE_INTEGRATION_EXPORT_QUEUE)
    private readonly nativeIntegrationQueue?: Queue<NativeIntegrationDeliveryJob>,
    @Optional()
    @InjectQueue(SUBMISSION_MODERATION_QUEUE)
    private readonly submissionModerationQueue?: Queue<SubmissionModerationJob>,
  ) {}

  getStatus() {
    return {
      status: "ready",
      surface: "internal-only",
    } as const;
  }

  async getQueueSnapshot() {
    const today = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    const [
      snapshot,
      todayUsage,
      yesterdayUsage,
      unresolvedAlertCount,
      budgetSuppressedCount,
      latestBudgetSuppressed,
    ] = await Promise.all([
        this.queueTelemetry.getSnapshot(),
        this.prisma.client.emailUsage.findUnique({ where: { date: today } }),
        this.prisma.client.emailUsage.findUnique({
          where: { date: yesterday },
        }),
        this.prisma.client.alertHistory.count({
          where: { resolved: false },
        }),
        // Submission moderation runs were removed in the forms rebuild
        // (rebuilt as form moderation in Phase 6). Report no budget suppressions.
        Promise.resolve(0),
        Promise.resolve<{ createdAt: Date } | null>(null),
      ]);

    return {
      ...snapshot,
      emailUsage: {
        today: { date: today, count: todayUsage?.count ?? 0 },
        yesterday: { date: yesterday, count: yesterdayUsage?.count ?? 0 },
      },
      unresolvedAlertCount,
      moderationBudget: {
        budgetSuppressedCount,
        lastBudgetSuppressedAt:
          latestBudgetSuppressed?.createdAt.toISOString() ?? null,
      },
    };
  }

  async retryDeadLetter(id: string) {
    const deadLetter = await this.prisma.client.deadLetterJob.findUnique({
      where: { id },
    });

    if (!deadLetter) {
      throw new NotFoundException("Dead-letter job not found");
    }

    if (deadLetter.retried) {
      return { retried: false, reason: "already_retried" as const };
    }

    const targetId = getRetryTargetId(deadLetter.queue, deadLetter.data);
    if (!targetId) {
      throw new BadRequestException("Dead-letter job is missing retry target id");
    }

    const retry = this.getRetryTarget(deadLetter.queue, deadLetter.id, targetId);
    await (retry.queue as Queue).add(retry.name, retry.data, retry.options);

    const retriedAt = new Date();
    await this.prisma.client.deadLetterJob.update({
      where: { id: deadLetter.id },
      data: {
        retried: true,
        retriedAt,
        retryHistory: buildRetryHistory(deadLetter.retryHistory, {
          retriedAt: retriedAt.toISOString(),
          jobId: retry.options.jobId,
          queue: deadLetter.queue,
          targetId,
        }),
      },
    });

    return { retried: true, jobId: retry.options.jobId };
  }

  private getRetryTarget(queue: string, deadLetterId: string, targetId: string) {
    const commonOptions = {
      attempts: DEFAULT_DELIVERY_ATTEMPTS,
      backoff: { type: "exponential" as const, delay: DEFAULT_DELIVERY_BACKOFF_MS },
      removeOnComplete: true,
      removeOnFail: false,
    };

    if (queue === EMAIL_DELIVERY_QUEUE && this.emailQueue) {
      return {
        queue: this.emailQueue,
        name: "send",
        data: { deliveryId: targetId },
        options: {
          ...commonOptions,
          jobId: `retry-email-delivery-${deadLetterId}-${targetId}`,
        },
      };
    }

    if (queue === OUTBOUND_WEBHOOK_QUEUE && this.outboundWebhookQueue) {
      return {
        queue: this.outboundWebhookQueue,
        name: "deliver",
        data: { deliveryId: targetId },
        options: {
          ...commonOptions,
          jobId: `retry-outbound-webhook-${deadLetterId}-${targetId}`,
        },
      };
    }

    if (queue === EXPORT_DELIVERY_QUEUE && this.exportDeliveryQueue) {
      return {
        queue: this.exportDeliveryQueue,
        name: "csv",
        data: { deliveryId: targetId },
        options: {
          ...commonOptions,
          jobId: `retry-export-delivery-${deadLetterId}-${targetId}`,
        },
      };
    }

    if (queue === NATIVE_INTEGRATION_EXPORT_QUEUE && this.nativeIntegrationQueue) {
      return {
        queue: this.nativeIntegrationQueue,
        name: "deliver",
        data: { deliveryId: targetId },
        options: {
          ...commonOptions,
          jobId: `retry-native-integration-export-${deadLetterId}-${targetId}`,
        },
      };
    }

    if (queue === SUBMISSION_MODERATION_QUEUE && this.submissionModerationQueue) {
      return {
        queue: this.submissionModerationQueue,
        name: SUBMISSION_MODERATION_QUEUE,
        data: { runId: targetId },
        options: {
          ...commonOptions,
          jobId: `retry-submission-moderation-${deadLetterId}-${targetId}`,
        },
      };
    }

    throw new BadRequestException(`Unsupported dead-letter queue: ${queue}`);
  }
}

function getRetryTargetId(queue: string, data: Prisma.JsonValue) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const key = queue === SUBMISSION_MODERATION_QUEUE ? "runId" : "deliveryId";
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

function buildRetryHistory(
  existing: Prisma.JsonValue,
  entry: Record<string, string>,
) {
  const history = Array.isArray(existing) ? existing : [];
  return [...history, entry] as Prisma.InputJsonValue;
}
