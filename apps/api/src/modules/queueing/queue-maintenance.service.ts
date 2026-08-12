import { Inject, Injectable, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  AlertSeverity,
  DeliveryStatus,
  EmailDeliveryStatus,
  ExportDestinationProvider,
  Prisma,
} from "@workspace/database/prisma";
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
import { AlertsService } from "../alerts/alerts.service.js";
import { EmailDeliveryService } from "../email/email-delivery.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { QueueLockService } from "./queue-lock.service.js";
import { QueueTelemetryService } from "./queue-telemetry.service.js";
import {
  DEFAULT_DELIVERY_ATTEMPTS,
  DEFAULT_DELIVERY_BACKOFF_MS,
  EMAIL_OUTBOX_LOCK,
  EMAIL_DELIVERY_QUEUE,
  QUEUE_LOCK_TTL_MS,
  QUEUE_MAINTENANCE_LOCK,
} from "./queueing.constants.js";

const EMAIL_USAGE_RECONCILIATION_LOCK = "locks:email-usage-reconciliation";
const STALE_EMAIL_DELIVERY_LOCK = "locks:stale-email-deliveries";

@Injectable()
export class QueueMaintenanceService {
  constructor(
    private readonly locks: QueueLockService,
    private readonly emailDeliveries: EmailDeliveryService,
    private readonly telemetry: QueueTelemetryService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AlertsService) private readonly alerts: AlertsService,
    @InjectQueue(OUTBOUND_WEBHOOK_QUEUE)
    private readonly outboundWebhookQueue: Queue<OutboundWebhookDeliveryJob>,
    @InjectQueue(EXPORT_DELIVERY_QUEUE)
    private readonly exportDeliveryQueue: Queue<ExportDeliveryJob>,
    @InjectQueue(NATIVE_INTEGRATION_EXPORT_QUEUE)
    private readonly nativeIntegrationQueue: Queue<NativeIntegrationDeliveryJob>,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: "email-outbox-drain",
    waitForCompletion: true,
  })
  drainEmailOutbox() {
    return this.locks.withLock(EMAIL_OUTBOX_LOCK, QUEUE_LOCK_TTL_MS, () =>
      this.emailDeliveries.enqueuePending(100),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: "delivery-reconciliation",
    waitForCompletion: true,
  })
  reconcileDeliveries() {
    return this.locks.withLock(
      QUEUE_MAINTENANCE_LOCK,
      QUEUE_LOCK_TTL_MS,
      async () => {
        await Promise.all([
          this.emailDeliveries.enqueuePending(100),
          this.reenqueueDueOutboundWebhooks(),
          this.reenqueueDueExports(),
        ]);
        await this.recordBacklogAlertIfNeeded();
      },
    );
  }

  @Cron("10 0 * * *", {
    name: "email-usage-reconciliation",
    timeZone: "UTC",
    waitForCompletion: true,
  })
  reconcileEmailUsage() {
    return this.locks.withLock(
      EMAIL_USAGE_RECONCILIATION_LOCK,
      QUEUE_LOCK_TTL_MS,
      async () => {
        const date = previousUtcDate();
        const count = await this.prisma.client.emailDelivery.count({
          where: {
            status: EmailDeliveryStatus.SENT,
            sentAt: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lt: new Date(`${date}T23:59:59.999Z`),
            },
          },
        });

        await this.prisma.client.emailUsage.upsert({
          where: { date },
          create: { date, count, lastSnapshotCount: count },
          update: { count, lastSnapshotCount: count },
        });
      },
    );
  }

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: "stale-email-delivery-guard",
    waitForCompletion: true,
  })
  guardStaleEmailDeliveries() {
    return this.locks.withLock(
      STALE_EMAIL_DELIVERY_LOCK,
      QUEUE_LOCK_TTL_MS,
      async () => {
        const cutoff = new Date(Date.now() - 15 * 60 * 1000);
        const stale = await this.prisma.client.emailDelivery.findMany({
          where: {
            status: {
              in: [EmailDeliveryStatus.ENQUEUED, EmailDeliveryStatus.SENDING],
            },
            updatedAt: { lte: cutoff },
          },
          select: { id: true, status: true, attempts: true, template: true },
          take: 100,
        });

        await Promise.all(
          stale.map(async (delivery) => {
            const exhausted =
              delivery.status === EmailDeliveryStatus.SENDING &&
              delivery.attempts >= DEFAULT_DELIVERY_ATTEMPTS;
            // Compare-and-swap: only rewrite the row if it is STILL in the same
            // stuck status and still stale. A worker may have moved it to SENT
            // (or touched it) between the read above and now — without the
            // guard, maintenance would overwrite that terminal state and
            // re-enqueue an already-sent email.
            const claimed = await this.prisma.client.emailDelivery.updateMany({
              where: {
                id: delivery.id,
                status: delivery.status,
                updatedAt: { lte: cutoff },
              },
              data: {
                status: exhausted
                  ? EmailDeliveryStatus.EXHAUSTED
                  : delivery.status === EmailDeliveryStatus.ENQUEUED
                    ? EmailDeliveryStatus.PENDING
                    : EmailDeliveryStatus.FAILED,
                suppressionReason: null,
                nextAttemptAt: exhausted ? null : new Date(),
                providerError:
                  delivery.status === EmailDeliveryStatus.ENQUEUED
                    ? "Email delivery was stuck in ENQUEUED"
                    : "Email delivery was stuck in SENDING",
                ...(exhausted && delivery.template === "CLERK_EMAIL"
                  ? { payload: Prisma.DbNull }
                  : {}),
              },
            });

            if (claimed.count === 1 && !exhausted) {
              await this.emailDeliveries.replaceStaleDeliveryJob(delivery.id);
            }
          }),
        );
      },
    );
  }

  private async reenqueueDueOutboundWebhooks() {
    const deliveries =
      await this.prisma.client.outboundWebhookDelivery.findMany({
        where: {
          status: { in: [DeliveryStatus.PENDING, DeliveryStatus.FAILED] },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        },
        select: { id: true },
        take: 100,
      });

    await Promise.all(
      deliveries.map((delivery) =>
        this.outboundWebhookQueue.add(
          "deliver",
          { deliveryId: delivery.id },
          {
            attempts: DEFAULT_DELIVERY_ATTEMPTS,
            backoff: {
              type: "exponential",
              delay: DEFAULT_DELIVERY_BACKOFF_MS,
            },
            removeOnComplete: true,
            removeOnFail: false,
            jobId: `outbound-webhook-${delivery.id}`,
          },
        ),
      ),
    );
  }

  private async reenqueueDueExports() {
    const deliveries = await this.prisma.client.exportDelivery.findMany({
      where: {
        status: { in: [DeliveryStatus.PENDING, DeliveryStatus.FAILED] },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      select: {
        id: true,
        destination: {
          select: {
            provider: true,
          },
        },
      },
      take: 100,
    });

    await Promise.all(
      deliveries.map((delivery) => {
        if (delivery.destination.provider === ExportDestinationProvider.CSV) {
          return this.exportDeliveryQueue.add(
            "csv",
            { deliveryId: delivery.id },
            {
              attempts: DEFAULT_DELIVERY_ATTEMPTS,
              backoff: {
                type: "exponential",
                delay: DEFAULT_DELIVERY_BACKOFF_MS,
              },
              removeOnComplete: true,
              removeOnFail: false,
              jobId: `csv-export-${delivery.id}`,
            },
          );
        }

        return this.nativeIntegrationQueue.add(
          "deliver",
          { deliveryId: delivery.id },
          {
            attempts: DEFAULT_DELIVERY_ATTEMPTS,
            backoff: {
              type: "exponential",
              delay: DEFAULT_DELIVERY_BACKOFF_MS,
            },
            removeOnComplete: true,
            removeOnFail: false,
            jobId: `native-integration-export-${delivery.id}`,
          },
        );
      }),
    );
  }

  private async recordBacklogAlertIfNeeded() {
    const [snapshot, config] = await Promise.all([
      this.telemetry.getSnapshot(),
      this.prisma.client.alertConfig.findFirst({
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const threshold = config?.dlqCountThreshold ?? 100;
    const entries = Object.entries(snapshot.queues).map(([queue, counts]) => ({
      queue,
      backlog: counts.waiting + counts.delayed + counts.failed,
    }));
    const highest = entries.sort(
      (left, right) => right.backlog - left.backlog,
    )[0];

    const age = snapshot.deliveries.oldestPendingEmailDeliveryAgeSeconds;
    const configuredAgeThreshold = this.configService?.get<number | string>(
      "EMAIL_BACKLOG_ALERT_SECONDS",
    );
    const parsedAgeThreshold = Number(configuredAgeThreshold);
    // Guard the parse: a blank or non-numeric value would coerce to 0 (or NaN)
    // and turn every non-empty outbox into a false stall alert.
    const ageThresholdSeconds =
      Number.isFinite(parsedAgeThreshold) && parsedAgeThreshold > 0
        ? parsedAgeThreshold
        : 900;
    const queueOverThreshold = Boolean(highest && highest.backlog >= threshold);
    const emailOutboxStalled =
      typeof age === "number" && age >= ageThresholdSeconds;

    if (!queueOverThreshold && !emailOutboxStalled) {
      return;
    }

    try {
      await this.alerts.recordOperationalAlert({
        alertType: "QUEUE_BACKLOG_HIGH",
        severity: AlertSeverity.WARNING,
        message: emailOutboxStalled
          ? `${EMAIL_DELIVERY_QUEUE} oldest durable delivery is ${age} seconds old, above threshold ${ageThresholdSeconds}.`
          : `${highest?.queue} backlog is ${highest?.backlog}, above threshold ${threshold}.`,
        metadata: {
          ...(highest
            ? {
                queue: highest.queue,
                backlog: highest.backlog,
                threshold,
              }
            : {}),
          ...(emailOutboxStalled
            ? {
                oldestPendingEmailDeliveryAgeSeconds: age,
                ageThresholdSeconds,
              }
            : {}),
        },
      });
    } catch {
      // Queue maintenance must never fail because the alert sink is unavailable.
    }
  }
}

function previousUtcDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
