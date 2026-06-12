import { EmailTemplateKey } from "@workspace/database/prisma";
import {
  button,
  emailTextFooter,
  escapeHtml,
  paragraph,
  renderEmailLayout,
} from "./email-layout.js";
import type {
  ClerkEmailDeliveryPayload,
  EmailTemplatePayload,
  NotificationEmailPayload,
  ProjectMemberInviteEmailPayload,
  RenderedEmail,
} from "./email.types.js";

export function renderEmailTemplate(
  input: EmailTemplatePayload,
): RenderedEmail {
  switch (input.template) {
    case EmailTemplateKey.NOTIFICATION:
      return renderNotificationEmail(input.payload);
    case EmailTemplateKey.PROJECT_MEMBER_INVITE:
      return renderProjectInviteEmail(input.payload);
    case EmailTemplateKey.CLERK_EMAIL:
      return renderClerkEmail(input.payload);
  }
}

function renderNotificationEmail(
  payload: NotificationEmailPayload,
): RenderedEmail {
  const subject = trimSubject(payload.title);
  const cta = payload.link
    ? { label: "Open in Semblia", href: payload.link }
    : null;

  const html = renderEmailLayout({
    preheader: payload.message,
    heading: payload.title,
    bodyHtml: paragraph(payload.message),
    cta,
  });

  const text = [
    payload.title,
    payload.message,
    cta ? `Open in Semblia: ${cta.href}` : "",
    emailTextFooter(),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, text, html };
}

function renderProjectInviteEmail(
  payload: ProjectMemberInviteEmailPayload,
): RenderedEmail {
  const inviter = payload.inviterEmail
    ? `${payload.inviterEmail} invited you`
    : "You've been invited";
  const subject = trimSubject(`Invitation to ${payload.projectName}`);
  const lead = `${inviter} to join ${payload.projectName} as ${formatRole(payload.role)} on Semblia.`;

  const html = renderEmailLayout({
    preheader: lead,
    heading: `Join ${payload.projectName}`,
    bodyHtml: paragraph(lead),
    cta: { label: "Accept invitation", href: payload.acceptUrl },
    footnote:
      "If you weren't expecting this invitation, you can safely ignore this email.",
  });

  const text = [
    lead,
    `Accept invitation: ${payload.acceptUrl}`,
    "If you weren't expecting this invitation, you can safely ignore this email.",
    emailTextFooter(),
  ].join("\n\n");

  return { subject, text, html };
}

function renderClerkEmail(payload: ClerkEmailDeliveryPayload): RenderedEmail {
  const subject = trimSubject(payload.subject ?? clerkFallbackSubject(payload));
  const text =
    normalizeOptionalText(payload.text) ??
    htmlToText(normalizeOptionalText(payload.html)) ??
    clerkFallbackText(payload, subject);
  const html =
    normalizeOptionalText(payload.html) ??
    renderClerkFallbackHtml(payload, subject);

  return { subject, text, html };
}

function formatRole(role: string) {
  const normalized = role.trim().toLowerCase();
  if (!normalized) {
    return "a member";
  }
  const article = /^[aeiou]/.test(normalized) ? "an" : "a";
  return `${article} ${normalized}`;
}

function trimSubject(value: string) {
  return value.trim().slice(0, 255);
}

function normalizeOptionalText(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value : null;
}

function clerkFallbackSubject(payload: ClerkEmailDeliveryPayload) {
  const slug = payload.slug?.toLowerCase().replaceAll("-", "_");
  if (slug?.includes("verification")) return "Your Semblia verification code";
  if (slug?.includes("reset")) return "Reset your Semblia password";
  if (slug?.includes("magic")) return "Sign in to Semblia";
  if (slug?.includes("invitation")) return "You're invited to Semblia";
  return "Semblia account notification";
}

function clerkFallbackText(
  payload: ClerkEmailDeliveryPayload,
  subject: string,
) {
  const lines = [subject];
  if (payload.otpCode) {
    lines.push(`Your code is ${payload.otpCode}.`);
  }
  if (payload.magicLink) {
    lines.push(`Sign in: ${payload.magicLink}`);
  }
  if (payload.actionUrl) {
    lines.push(`Continue: ${payload.actionUrl}`);
  }
  if (lines.length === 1) {
    lines.push("Open Semblia to continue.");
  }
  lines.push(emailTextFooter());

  return lines.join("\n\n");
}

function renderClerkFallbackHtml(
  payload: ClerkEmailDeliveryPayload,
  subject: string,
) {
  const cta = payload.magicLink
    ? { label: "Sign in", href: payload.magicLink }
    : payload.actionUrl
      ? { label: "Continue", href: payload.actionUrl }
      : null;
  const body = [
    payload.otpCode
      ? paragraph(`Your code is ${payload.otpCode}.`)
      : paragraph("Open Semblia to continue."),
    payload.otpCode
      ? `<p style="margin:8px 0 20px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:28px;line-height:36px;font-weight:700;color:#201914;letter-spacing:4px;">${escapeHtml(
          payload.otpCode,
        )}</p>`
      : "",
    cta ? button(cta) : "",
  ]
    .filter(Boolean)
    .join("");

  return renderEmailLayout({
    preheader: subject,
    heading: subject,
    bodyHtml: body,
  });
}

function htmlToText(html: string | null) {
  if (!html) return null;
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return text || null;
}
