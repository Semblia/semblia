import { EmailTemplateKey } from "@workspace/database/prisma";
import type {
  EmailTemplatePayload,
  NotificationEmailPayload,
  ProjectMemberInviteEmailPayload,
  RenderedEmail,
} from "./email.types.js";

export function renderEmailTemplate(input: EmailTemplatePayload): RenderedEmail {
  switch (input.template) {
    case EmailTemplateKey.NOTIFICATION:
      return renderNotificationEmail(input.payload);
    case EmailTemplateKey.PROJECT_MEMBER_INVITE:
      return renderProjectInviteEmail(input.payload);
  }
}

function renderNotificationEmail(
  payload: NotificationEmailPayload,
): RenderedEmail {
  const subject = trimSubject(payload.title);
  const action = payload.link
    ? `<p><a href="${escapeHtml(payload.link)}">Open in Tresta</a></p>`
    : "";

  return {
    subject,
    text: [payload.title, payload.message, payload.link ?? ""]
      .filter(Boolean)
      .join("\n\n"),
    html: [
      "<main>",
      `<h1>${escapeHtml(payload.title)}</h1>`,
      `<p>${escapeHtml(payload.message)}</p>`,
      action,
      "</main>",
    ].join(""),
  };
}

function renderProjectInviteEmail(
  payload: ProjectMemberInviteEmailPayload,
): RenderedEmail {
  const inviter = payload.inviterEmail
    ? `${payload.inviterEmail} invited you`
    : "You were invited";
  const subject = trimSubject(`Invitation to ${payload.projectName}`);

  return {
    subject,
    text: [
      `${inviter} to join ${payload.projectName} as ${payload.role}.`,
      payload.acceptUrl,
    ].join("\n\n"),
    html: [
      "<main>",
      `<h1>${escapeHtml(payload.projectName)}</h1>`,
      `<p>${escapeHtml(inviter)} to join this project as ${escapeHtml(payload.role)}.</p>`,
      `<p><a href="${escapeHtml(payload.acceptUrl)}">Accept invitation</a></p>`,
      "</main>",
    ].join(""),
  };
}

function trimSubject(value: string) {
  return value.trim().slice(0, 255);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
