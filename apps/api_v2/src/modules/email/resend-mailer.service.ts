import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import type {
  EmailDeliveryForSend,
  MailerSendError,
  MailerSendResult,
  RenderedEmail,
} from "./email.types.js";

export const RESEND_CLIENT = Symbol("RESEND_CLIENT");

export type ResendSendPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags: Array<{ name: string; value: string }>;
};

export type ResendClient = {
  emails: {
    send: (
      payload: ResendSendPayload,
      options: { idempotencyKey: string },
    ) => Promise<{
      data?: { id?: string } | null;
      error?: unknown | null;
    }>;
  };
};

@Injectable()
export class ResendMailerService {
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(RESEND_CLIENT)
    private readonly resendClient: ResendClient | null = null,
  ) {}

  async sendDelivery(
    delivery: EmailDeliveryForSend,
    rendered: RenderedEmail,
  ): Promise<MailerSendResult> {
    if (!this.isEmailEnabled()) {
      return { skipped: true };
    }

    const client = this.resendClient ?? this.createClient();
    if (!client) {
      return {
        skipped: false,
        error: {
          message: "RESEND_API_KEY is not configured",
          retryable: false,
        },
      };
    }

    const from = this.getOptionalString("EMAIL_FROM");
    if (!from) {
      return {
        skipped: false,
        error: {
          message: "EMAIL_FROM is not configured",
          retryable: false,
        },
      };
    }

    try {
      const replyTo = this.getOptionalString("EMAIL_REPLY_TO");
      const { data, error } = await client.emails.send(
        {
          from,
          to: [delivery.recipientEmail],
          ...(replyTo ? { replyTo } : {}),
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tags: this.buildTags(delivery),
        },
        { idempotencyKey: delivery.idempotencyKey },
      );

      if (error) {
        return {
          skipped: false,
          error: this.toMailerError(error),
        };
      }

      if (!data?.id) {
        return {
          skipped: false,
          error: {
            message: "Resend did not return a message id",
            retryable: true,
          },
        };
      }

      return { skipped: false, providerMessageId: data.id };
    } catch (error) {
      return {
        skipped: false,
        error: {
          message:
            error instanceof Error ? error.message : "Resend request failed",
          retryable: true,
          providerResponse: stringifyProviderResponse(error),
        },
      };
    }
  }

  private createClient(): ResendClient | null {
    const apiKey = this.getOptionalString("RESEND_API_KEY");
    return apiKey ? (new Resend(apiKey) as unknown as ResendClient) : null;
  }

  private isEmailEnabled() {
    const value = this.configService.get<boolean | string>("EMAIL_ENABLED");
    return value === true || value === "true";
  }

  private getOptionalString(key: string) {
    const value = this.configService.get<string>(key);
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private buildTags(delivery: EmailDeliveryForSend) {
    return [
      { name: "template", value: String(delivery.template) },
      { name: "delivery_id", value: delivery.id },
      ...(delivery.projectId
        ? [{ name: "project_id", value: delivery.projectId }]
        : []),
      ...(delivery.userId ? [{ name: "user_id", value: delivery.userId }] : []),
    ];
  }

  private toMailerError(error: unknown): MailerSendError {
    const statusCode = getStatusCode(error);
    return {
      message: getErrorMessage(error),
      retryable: !statusCode || !isPermanentStatus(statusCode),
      ...(statusCode ? { statusCode } : {}),
      providerResponse: stringifyProviderResponse(error),
    };
  }
}

function getStatusCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const record = error as Record<string, unknown>;
  const status = record.statusCode ?? record.status;
  return typeof status === "number" ? status : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Resend email send failed";
}

function isPermanentStatus(statusCode: number) {
  return [400, 401, 403, 404, 422].includes(statusCode);
}

function stringifyProviderResponse(value: unknown) {
  try {
    return JSON.stringify(value)?.slice(0, 2000);
  } catch {
    return undefined;
  }
}
