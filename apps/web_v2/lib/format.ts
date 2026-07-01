/** Shared formatting / display helpers used across the app. */

/** First two initials from a multi-word name, e.g. "Acme Corp" → "AC". */
export function projectInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Full display name from Clerk user fields, falling back to email. */
export function userDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string,
): string {
  return [firstName, lastName].filter(Boolean).join(" ") || email;
}

/**
 * Up to two initials from a free-form name string ("Ada Lovelace" → "AL").
 * Collapses any whitespace and takes the first letter of the first two words,
 * uppercased. Returns `fallback` when the name is empty or blank.
 */
export function nameInitials(
  name: string | null | undefined,
  fallback = "",
): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback;
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || fallback;
}

/** One- or two-char initials from user name fields. */
export function userInitials(
  firstName: string | null,
  lastName: string | null,
  email: string,
): string {
  const initials = [firstName?.[0], lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials || (email[0] ?? "?").toUpperCase();
}

/** Returns true if the event target is an input, textarea, or contenteditable. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/** Compact number formatter: 1200 → "1.2k", 1500000 → "1.5M". */
export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Relative time from a Date: "2m ago", "3h ago", "5d ago", "Jan 3". */
export function fmtRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = diff / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Expiry countdown: "Expires in 3d", "Expires in 2h", "Expired". */
export function fmtExpiry(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const s = diff / 1000;
  if (s < 3600) return `Expires in ${Math.floor(s / 60)}m`;
  if (s < 86400) return `Expires in ${Math.floor(s / 3600)}h`;
  return `Expires in ${Math.ceil(s / 86400)}d`;
}

/**
 * Relative time label with week granularity.
 * Accepts Date or ISO string (from V2 DTOs).
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Identifier humanization ───────────────────────────────────────────────────

/** Tokens that should stay fully uppercased when humanizing identifiers. */
const ACRONYMS = new Set([
  "api",
  "csv",
  "url",
  "id",
  "ip",
  "ui",
  "ai",
  "mcp",
  "sso",
  "saml",
  "hmac",
  "json",
  "html",
  "css",
  "sdk",
  "tls",
  "http",
  "https",
  "pdf",
]);

/** Tokens with a fixed mixed-case spelling. */
const MIXED_CASE: Record<string, string> = {
  github: "GitHub",
  oauth: "OAuth",
};

/**
 * Humanize a dotted/underscored identifier into a Title Case display label,
 * preserving common acronyms and brand casing:
 * `"export.csv.requested"` → `"Export CSV Requested"`,
 * `"oauth.token"` → `"OAuth Token"`.
 */
export function humanizeLabel(value: string): string {
  return value
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (MIXED_CASE[lower]) return MIXED_CASE[lower];
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

// ── Display label maps ────────────────────────────────────────────────────────

/** Human-readable project-type labels. Key set mirrors V2ProjectType. */
export const PROJECT_TYPE_LABELS: Record<string, string> = {
  SAAS_APP: "SaaS App",
  PORTFOLIO: "Portfolio",
  MOBILE_APP: "Mobile App",
  CONSULTING_SERVICE: "Consulting",
  E_COMMERCE: "E-Commerce",
  AGENCY: "Agency",
  FREELANCE: "Freelance",
  PRODUCT: "Product",
  COURSE: "Course",
  COMMUNITY: "Community",
  OTHER: "Other",
};

/** Human-readable moderation-status labels. Key set mirrors V2ModerationStatus. */
export const MODERATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FLAGGED: "Flagged",
};
