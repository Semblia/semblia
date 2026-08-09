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

/**
 * The one email addressed to somebody with no Semblia account: the person who
 * left a testimonial, thanked by the project they left it for. It therefore
 * speaks in the project's name, never the app's, and its only link is either
 * absent or a form of that project's.
 */
export type ResponseThankYouEmailPayload = {
  kind: "DEFAULT" | "CUSTOM" | "INVITE";
  projectName: string;
  /** The author's own name, when they gave one — for the greeting. */
  authorName?: string | null;
  /** A short excerpt of what they said, so the thank-you is clearly specific. */
  quote?: string | null;
  /** The owner's own words, for `CUSTOM`. */
  message?: string | null;
  /** The form they are invited to, for `INVITE`. */
  formName?: string | null;
  formUrl?: string | null;
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
    }
  | {
      template: Extract<EmailTemplateKey, "RESPONSE_THANK_YOU">;
      payload: ResponseThankYouEmailPayload;
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
