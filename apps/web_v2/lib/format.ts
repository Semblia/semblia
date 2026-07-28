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

/**
 * @deprecated Use {@link timeAgo} — the single canonical time formatter.
 * Kept only until the remaining call sites are swept.
 */
export const fmtRelative = timeAgo;

/** Expiry countdown: "Expires in 3d", "Expires in 2h", "Expired". */
export function fmtExpiry(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const s = diff / 1000;
  if (s < 3600) return `Expires in ${Math.floor(s / 60)}m`;
  if (s < 86400) return `Expires in ${Math.floor(s / 3600)}h`;
  return `Expires in ${Math.ceil(s / 86400)}d`;
}

// ── Absent values ─────────────────────────────────────────────────────────────
//
// One rule, applied everywhere: a value the system does not have renders as an
// em dash. A value the system *does* have and which happens to be `0` renders
// as `0`. Never "N/A", never "null", never an empty cell — those read as a bug.

/** The single placeholder for unknown / not-applicable values. */
export const ABSENT = "—";

/**
 * Display a scalar, falling back to {@link ABSENT} when it is genuinely
 * missing. A legitimate `0` (or `false`, or `"0"`) is preserved — only
 * `null`, `undefined`, blank strings, and non-finite numbers are dashed.
 */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ABSENT;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : ABSENT;
  }
  return value.trim() === "" ? ABSENT : value;
}

/** Grouped integer for display: `1234` → `"1,234"`. Pair with `tabular-nums`. */
export function fmtCount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US") : ABSENT;
}

/** Pagination summary: `"21–40 of 142"` (en dash, per the list contract). */
export function fmtRange(
  page: number,
  pageSize: number,
  total: number,
): string {
  if (total <= 0) return "0 of 0";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const span = from === to ? `${from}` : `${from}–${to}`;
  return `${span} of ${fmtCount(total)}`;
}

/**
 * The canonical time formatter. Relative up to a week (`2m ago`, `5h ago`,
 * `3d ago`), absolute with the year beyond that (`Mar 14, 2026`) — a bare
 * "Mar 14" is ambiguous once data is more than a year old.
 *
 * Accepts a Date or an ISO string (V2 DTOs ship strings). Anything absent or
 * unparseable renders as {@link ABSENT} rather than "Invalid Date".
 */
export function timeAgo(date: Date | string | null | undefined): string {
  if (date === null || date === undefined) return ABSENT;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return ABSENT;

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 0) return fmtDate(d);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
}

/** Absolute date, always carrying the year: `"Mar 14, 2026"`. */
export function fmtDate(date: Date | string | null | undefined): string {
  if (date === null || date === undefined) return ABSENT;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return ABSENT;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Full timestamp for `title` attributes — the precise value behind `timeAgo`. */
export function fmtDateTime(date: Date | string | null | undefined): string {
  if (date === null || date === undefined) return ABSENT;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return ABSENT;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * A rating renders with its scale or not at all — `4` alone is a lie when the
 * scale is 10. Returns `null` when there is nothing honest to show.
 */
export function fmtRating(
  value: number | null | undefined,
  scale: number | null | undefined,
): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  if (!scale || !Number.isFinite(scale)) return null;
  return `${value}/${scale}`;
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

const LABEL_WORD_SEPARATOR = /[\s._-]+/;

function splitLabelWords(value: string): string[] {
  return value.trim().split(LABEL_WORD_SEPARATOR).filter(Boolean);
}

function titleCaseWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatLabelWord(word: string): string {
  const lower = word.toLowerCase();
  return (
    MIXED_CASE[lower] ??
    (ACRONYMS.has(lower) ? lower.toUpperCase() : titleCaseWord(lower))
  );
}

/**
 * Humanize a dotted/underscored identifier into a Title Case display label,
 * preserving common acronyms and brand casing:
 * `"export.csv.requested"` → `"Export CSV Requested"`,
 * `"oauth.token"` → `"OAuth Token"`.
 */
export function humanizeLabel(value: string): string {
  return splitLabelWords(value).map(formatLabelWord).join(" ");
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
