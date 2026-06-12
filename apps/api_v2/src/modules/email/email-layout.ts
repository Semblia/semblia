/**
 * Shared, email-client-safe layout for all Semblia transactional emails.
 *
 * Constraints that shape this file:
 * - Table-based structure and inline styles only. Gmail/Outlook strip <head>
 *   styles and ignore modern CSS (flex/grid/oklch), so layout lives in inline
 *   attributes on nested tables.
 * - Brand colors are hardcoded hex (converted from the app's oklch tokens in
 *   apps/web_v2/app/globals.css) because email clients do not support oklch:
 *     brand amber  oklch(0.7 0.12 55)  -> #d78951
 *     warm ink     oklch(0.22 0.014 60) -> #201914
 *     pale amber   oklch(0.93 0.04 70) -> #fae4cc
 * - The content region receives pre-built, already-escaped HTML. Callers MUST
 *   run dynamic values through `escapeHtml` (or the `paragraph`/`button`
 *   helpers, which do it for you).
 *
 * New templates (notifications, invites, and the Clerk-routed auth emails) can
 * all reuse `renderEmailLayout` so every Semblia email shares one chrome.
 */

export const EMAIL_BRAND = {
  amber: "#d78951",
  amberDark: "#b9692f",
  ink: "#201914",
  bodyText: "#5f574e",
  mutedText: "#8c8377",
  paleAmber: "#fae4cc",
  page: "#f7f5f2",
  card: "#ffffff",
  border: "#ece8e2",
} as const;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const SUPPORT_EMAIL = "support@semblia.com";

export type EmailCta = {
  label: string;
  href: string;
};

export type EmailLayoutInput = {
  /** Hidden preview text shown in the inbox list before the email is opened. */
  preheader: string;
  /** Plain heading text; escaped here. */
  heading: string;
  /** Trusted, already-escaped HTML for the body region. */
  bodyHtml: string;
  /** Optional primary call-to-action button. */
  cta?: EmailCta | null;
  /** Optional small note rendered under the body (escaped). */
  footnote?: string | null;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Build a body paragraph from plain text (escaped). */
export function paragraph(
  text: string,
  options: { muted?: boolean } = {},
): string {
  const color = options.muted ? EMAIL_BRAND.mutedText : EMAIL_BRAND.bodyText;
  return `<p style="margin:0 0 16px;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${color};">${escapeHtml(
    text,
  )}</p>`;
}

/** Bulletproof CTA button (table-wrapped anchor) from plain label + href. */
export function button(cta: EmailCta): string {
  return [
    '<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">',
    "<tr>",
    `<td align="center" bgcolor="${EMAIL_BRAND.amber}" style="border-radius:10px;">`,
    `<a href="${escapeHtml(cta.href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-family:${FONT_STACK};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(
      cta.label,
    )}</a>`,
    "</td>",
    "</tr>",
    "</table>",
  ].join("");
}

export function renderEmailLayout(input: EmailLayoutInput): string {
  const { preheader, heading, bodyHtml } = input;
  const ctaHtml = input.cta ? button(input.cta) : "";
  const footnoteHtml = input.footnote
    ? `<p style="margin:20px 0 0;font-family:${FONT_STACK};font-size:13px;line-height:20px;color:${EMAIL_BRAND.mutedText};">${escapeHtml(
        input.footnote,
      )}</p>`
    : "";

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    "<title></title>",
    "</head>",
    `<body style="margin:0;padding:0;background-color:${EMAIL_BRAND.page};">`,
    // Preheader: visible to inbox preview, hidden in the body.
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(
      preheader,
    )}</div>`,
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_BRAND.page};">`,
    "<tr>",
    '<td align="center" style="padding:32px 16px;">',
    '<table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">',
    // Header / wordmark
    "<tr>",
    '<td style="padding:4px 4px 20px;">',
    `<span style="font-family:${FONT_STACK};font-size:20px;font-weight:700;letter-spacing:-0.01em;color:${EMAIL_BRAND.ink};">Semblia</span>`,
    "</td>",
    "</tr>",
    // Card
    "<tr>",
    `<td style="background-color:${EMAIL_BRAND.card};border:1px solid ${EMAIL_BRAND.border};border-radius:16px;padding:32px;">`,
    `<h1 style="margin:0 0 16px;font-family:${FONT_STACK};font-size:22px;line-height:30px;font-weight:700;color:${EMAIL_BRAND.ink};">${escapeHtml(
      heading,
    )}</h1>`,
    bodyHtml,
    ctaHtml,
    footnoteHtml,
    "</td>",
    "</tr>",
    // Footer
    "<tr>",
    '<td style="padding:24px 4px 4px;">',
    `<p style="margin:0 0 6px;font-family:${FONT_STACK};font-size:12px;line-height:18px;color:${EMAIL_BRAND.mutedText};">Sent by Semblia — the testimonial &amp; feedback platform.</p>`,
    `<p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:18px;color:${EMAIL_BRAND.mutedText};">Need help? Reply to this email or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${EMAIL_BRAND.amberDark};text-decoration:none;">${SUPPORT_EMAIL}</a>.</p>`,
    "</td>",
    "</tr>",
    "</table>",
    "</td>",
    "</tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}

/** Shared plain-text footer appended to every email's text part. */
export function emailTextFooter(): string {
  return [
    "—",
    "Sent by Semblia — the testimonial & feedback platform.",
    `Need help? Reply to this email or contact ${SUPPORT_EMAIL}.`,
  ].join("\n");
}
