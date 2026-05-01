import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AlertSeverity,
  ErrorSeverity,
  Prisma,
  type AlertConfig,
  type AlertHistory,
} from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";

export const ALERTS_SLACK_FETCH = Symbol("ALERTS_SLACK_FETCH");
export type AlertsSlackFetch = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

const ALERT_SLACK_WEBHOOK_KEY = "alerts:slack_webhook_url";
const SLACK_WEBHOOK_PREFIXES = [
  "https://hooks.slack.com/",
  "https://hooks.slack-gov.com/",
];

type OperationalAlertConfigUpdate = {
  emailQuotaThreshold?: number;
  dlqCountThreshold?: number;
  failedJobRateThreshold?: number;
  updatedBy?: string;
};

type OperationalAlertInput = {
  alertType: string;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AlertsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ALERTS_SLACK_FETCH) private readonly slackFetch: AlertsSlackFetch,
  ) {}

  getStatus() {
    return {
      status: "ready",
      surface: "internal-only",
    } as const;
  }

  async getOperationalAlertConfig() {
    const [config, webhookUrl] = await Promise.all([
      this.getOrCreateAlertConfigRecord(),
      this.getConfiguredSlackWebhookUrl(),
    ]);

    return this.toSafeConfigSnapshot(config, Boolean(webhookUrl));
  }

  async updateOperationalAlertConfig(input: OperationalAlertConfigUpdate) {
    const config = await this.getOrCreateAlertConfigRecord();
    const updated = await this.prisma.client.alertConfig.update({
      where: { id: config.id },
      data: {
        emailQuotaThreshold: input.emailQuotaThreshold,
        dlqCountThreshold: input.dlqCountThreshold,
        failedJobRateThreshold: input.failedJobRateThreshold,
        updatedBy: input.updatedBy,
      },
    });
    const webhookUrl = await this.getConfiguredSlackWebhookUrl();

    return this.toSafeConfigSnapshot(updated, Boolean(webhookUrl));
  }

  async recordOperationalAlert(
    input: OperationalAlertInput,
  ): Promise<AlertHistory> {
    const existing = await this.prisma.client.alertHistory.findFirst({
      where: {
        alertType: input.alertType,
        resolved: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return existing;
    }

    const created = await this.prisma.client.alertHistory.create({
      data: {
        alertType: input.alertType,
        severity: input.severity,
        message: input.message,
        metadata: input.metadata
          ? this.toInputJsonValue(input.metadata)
          : undefined,
      },
    });

    await this.sendSlackNotification(input);
    return created;
  }

  async resolveOperationalAlert(
    alertType: string,
    resolvedBy = "system",
  ): Promise<void> {
    await this.prisma.client.alertHistory.updateMany({
      where: {
        alertType,
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  private async getOrCreateAlertConfigRecord(): Promise<AlertConfig> {
    const existing = await this.prisma.client.alertConfig.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.client.alertConfig.create({ data: {} });
  }

  private async getConfiguredSlackWebhookUrl(): Promise<string> {
    const configuredSetting =
      await this.prisma.client.systemSettings.findUnique({
        where: { key: ALERT_SLACK_WEBHOOK_KEY },
        select: { value: true },
      });
    const storedWebhookUrl = configuredSetting?.value.trim();
    const candidate =
      storedWebhookUrl ||
      this.configService.get<string>("SLACK_WEBHOOK_URL")?.trim() ||
      "";

    return this.isAllowedSlackWebhookUrl(candidate) ? candidate : "";
  }

  private toSafeConfigSnapshot(
    config: AlertConfig,
    slackWebhookConfigured: boolean,
  ) {
    return {
      id: config.id,
      emailQuotaThreshold: config.emailQuotaThreshold,
      dlqCountThreshold: config.dlqCountThreshold,
      failedJobRateThreshold: config.failedJobRateThreshold,
      slackWebhookConfigured,
    };
  }

  private async sendSlackNotification(
    alert: OperationalAlertInput,
  ): Promise<void> {
    try {
      const webhookUrl = await this.getConfiguredSlackWebhookUrl();
      if (!webhookUrl) {
        return;
      }

      const response = await this.slackFetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.buildSlackPayload(alert)),
      });

      if (!response.ok) {
        const responseBody = await this.readResponseText(response);
        await this.recordSlackDeliveryFailure(alert, {
          message: `Slack webhook returned ${response.status}`,
          status: response.status,
          responseBody,
        });
      }
    } catch (error) {
      await this.recordSlackDeliveryFailure(alert, {
        message: this.getErrorMessage(error),
      });
    }
  }

  private buildSlackPayload(alert: OperationalAlertInput) {
    const colors: Record<AlertSeverity, string> = {
      [AlertSeverity.INFO]: "#2563eb",
      [AlertSeverity.WARNING]: "#d97706",
      [AlertSeverity.CRITICAL]: "#dc2626",
    };
    const metadataFields = Object.entries(alert.metadata ?? {})
      .slice(0, 8)
      .map(([title, value]) => ({
        title,
        value: typeof value === "string" ? value : JSON.stringify(value),
        short: true,
      }));

    return {
      text: `[${alert.severity}] ${alert.alertType}: ${alert.message}`,
      username: "Tresta Monitoring",
      icon_emoji: ":rotating_light:",
      attachments: [
        {
          color: colors[alert.severity],
          title: alert.alertType,
          text: alert.message,
          fields: [
            {
              title: "Environment",
              value:
                this.configService.get<string>("NODE_ENV") ?? "development",
              short: true,
            },
            {
              title: "Severity",
              value: alert.severity,
              short: true,
            },
            ...metadataFields,
          ],
          footer: "Tresta Monitoring",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  private async recordSlackDeliveryFailure(
    alert: OperationalAlertInput,
    error: {
      message: string;
      status?: number;
      responseBody?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.client.errorLog.create({
        data: {
          severity: ErrorSeverity.ERROR,
          errorType: "SlackWebhookDeliveryError",
          message: error.message,
          metadata: this.toInputJsonValue({
            alertType: alert.alertType,
            severity: alert.severity,
            status: error.status,
            responseBody: error.responseBody,
          }),
        },
      });
    } catch {
      // Alert recording is the source of truth; Slack failure logging is best-effort.
    }
  }

  private async readResponseText(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, 500);
    } catch {
      return "";
    }
  }

  private isAllowedSlackWebhookUrl(value: string): boolean {
    return SLACK_WEBHOOK_PREFIXES.some((prefix) => value.startsWith(prefix));
  }

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return this.sanitizeJson(value) as Prisma.InputJsonValue;
  }

  private sanitizeJson(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (depth >= 4) {
      return "[Truncated]";
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (Array.isArray(value)) {
      return value
        .slice(0, 20)
        .map((entry) => this.sanitizeJson(entry, depth + 1));
    }

    if (typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, entry]) => entry !== undefined)
          .slice(0, 50)
          .map(([key, entry]) => [key, this.sanitizeJson(entry, depth + 1)]),
      );
    }

    return String(value);
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
