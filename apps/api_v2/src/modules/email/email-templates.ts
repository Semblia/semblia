import { EmailTemplateKey } from "@workspace/database/prisma";
import {
  EMAIL_BRAND,
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
  ResponseThankYouEmailPayload,
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
    case EmailTemplateKey.RESPONSE_THANK_YOU:
      return renderResponseThankYouEmail(input.payload);
  }
}

/**
 * A project thanking the person who vouched for it.
 *
 * The recipient has no Semblia account and did not ask to hear from us, so the
 * email is the project's, not the app's: the project's name leads, the quote
 * proves it is about the specific thing they wrote, and the only link — when
 * there is one at all — goes to a form of that project's. No dashboard CTA, no
 * "open in Semblia".
 */
function renderResponseThankYouEmail(
  payload: ResponseThankYouEmailPayload,
): RenderedEmail {
  const greeting = payload.authorName?.trim()
    ? `Thank you, ${payload.authorName.trim()}`
    : "Thank you";
  const subject = trimSubject(`${greeting} — ${payload.projectName}`);
  const body = thankYouBody(payload);
  const cta =
    payload.kind === "INVITE" && payload.formUrl
      ? {
          label: payload.formName
            ? `Share more: ${payload.formName}`
            : "Share more",
          href: payload.formUrl,
        }
      : null;

  const quoted = payload.quote?.trim();
  const html = renderEmailLayout({
    preheader: body[0] ?? greeting,
    heading: greeting,
    bodyHtml: [
      ...body.map((line) => paragraph(line)),
      quoted ? blockquote(quoted) : "",
    ]
      .filter(Boolean)
      .join(""),
    cta,
    footnote: `Sent by ${payload.projectName} because you left them a testimonial. Reply to this email to reach them directly.`,
  });

  const text = [
    greeting,
    ...body,
    // The same excerpt the HTML shows: a plain-text part that quotes the whole
    // essay back while the HTML part trims it is two different emails.
    quoted ? `“${excerpt(quoted)}”` : "",
    cta ? `${cta.label}: ${cta.href}` : "",
    `Sent by ${payload.projectName} because you left them a testimonial.`,
    emailTextFooter(),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, text, html };
}

/** The paragraphs, in order, for each of the three kinds. */
function thankYouBody(payload: ResponseThankYouEmailPayload): string[] {
  const custom = payload.message?.trim();
  if (payload.kind === "CUSTOM" && custom) {
    // The owner's own words stand alone; adding ours around them would make
    // the message we promised was theirs read as a template.
    return custom
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const thanks = `Thank you for taking the time to write about ${payload.projectName}. It genuinely helps.`;
  if (payload.kind === "INVITE") {
    return [
      thanks,
      payload.formName
        ? `If you have a moment, we'd love to hear from you once more — ${payload.formName}.`
        : "If you have a moment, we'd love to hear from you once more.",
    ];
  }
  return [thanks, "Nothing is needed from you — we just wanted to say so."];
}

/** The author's own words, set apart. Escaped by the same helper as everything else. */
function blockquote(text: string): string {
  const FONT =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 20px;"><tr><td style="border-left:3px solid ${EMAIL_BRAND.paleAmber};padding:2px 0 2px 14px;"><p style="margin:0;font-family:${FONT};font-size:15px;line-height:24px;font-style:italic;color:${EMAIL_BRAND.bodyText};">${escapeHtml(
    excerpt(text),
  )}</p></td></tr></table>`;
}

/** One readable excerpt, never the whole essay back at its author. */
function excerpt(text: string, limit = 240): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length <= limit
    ? collapsed
    : `${collapsed.slice(0, limit).trimEnd()}…`;
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
