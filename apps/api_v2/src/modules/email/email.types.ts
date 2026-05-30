import type {
  EmailDelivery,
  EmailTemplateKey,
} from "@workspace/database/prisma";

export type EmailDeliveryJob = {
  deliveryId: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

export type EmailDeliveryForSend = Pick<
  EmailDelivery,
  | "id"
  | "userId"
  | "projectId"
  | "recipientEmail"
  | "template"
  | "idempotencyKey"
>;

export type NotificationEmailPayload = {
  title: string;
  message: string;
  link?: string | null;
  type?: string | null;
};

export type ProjectMemberInviteEmailPayload = {
  projectName: string;
  role: string;
  inviterEmail?: string | null;
  acceptUrl: string;
};

export type ClerkEmailDeliveryPayload = {
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  slug?: string | null;
  status?: string | null;
  clerkMessageId?: string | null;
  otpCode?: string | null;
  magicLink?: string | null;
  actionUrl?: string | null;
};

export type EmailTemplatePayload =
  | {
      template: Extract<EmailTemplateKey, "NOTIFICATION">;
      payload: NotificationEmailPayload;
    }
  | {
      template: Extract<EmailTemplateKey, "PROJECT_MEMBER_INVITE">;
      payload: ProjectMemberInviteEmailPayload;
    }
  | {
      template: Extract<EmailTemplateKey, "CLERK_EMAIL">;
      payload: ClerkEmailDeliveryPayload;
    };

export type MailerSendResult =
  | { skipped: true }
  | { skipped: false; providerMessageId: string }
  | { skipped: false; error: MailerSendError };

export type MailerSendError = {
  message: string;
  retryable: boolean;
  statusCode?: number;
  providerResponse?: string;
};
