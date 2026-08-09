/**
 * The shared vocabulary behind both credential surfaces.
 *
 * `developers/keys` and `developers/agents` were two copies of the same screen
 * that had drifted: two status-chip implementations, two expiry rules, two
 * "last used" formats, and two definitions of when a key can still be rotated.
 * Everything that is genuinely about *a key* now lives here, so the two page
 * shells configure one behaviour instead of re-deriving it.
 *
 * Three rules this module exists to enforce:
 *
 *  1. **The clock is read once, by the caller.** Deriving "expired" separately
 *     in the row and in the filter let a badge and its pill disagree once the
 *     tab had been open a while. Every helper takes `now` as an argument.
 *  2. **A status the API grows is still readable.** `status` is a closed union
 *     today; when it isn't, the badge humanizes the raw value rather than
 *     leaking `PENDING_ROTATION` onto the screen.
 *  3. **Absent, zero, and never-used are three different facts.** A key that has
 *     never authenticated a request says "Never used" — not `0`, which claims a
 *     measurement, and not `—`, which claims ignorance.
 */

import type { V2ApiKeyDTO, V2ApiKeyEventDTO } from "@workspace/types";
import type { StatusMeta } from "@/components/shared";
import { fmtCount, fmtDateTime, humanizeLabel, timeAgo } from "@/lib/format";

// ── Lifecycle ────────────────────────────────────────────────────────────────

export type KeyLifecycle =
  "active" | "expired" | "revoked" | "disabled" | "unknown";

export interface KeyState {
  lifecycle: KeyLifecycle;
  /** The one badge the row is allowed. Colour carries the signal. */
  status: StatusMeta;
  /** Whether rotate / revoke can still succeed against this record. */
  actionable: boolean;
  /** Why they can't — rendered in place beside the disabled control. */
  blockedReason: string | null;
}

export interface DescribedKey {
  entry: V2ApiKeyDTO;
  state: KeyState;
}

/** The four statuses this build knows how to reason about. */
const KNOWN_STATUSES = new Set(["ACTIVE", "DISABLED", "REVOKED", "EXPIRED"]);

const LIFECYCLE_STATUS: Record<Exclude<KeyLifecycle, "unknown">, StatusMeta> = {
  active: { label: "Active", tone: "positive" },
  expired: { label: "Expired", tone: "attention" },
  revoked: { label: "Revoked", tone: "critical" },
  disabled: { label: "Disabled", tone: "muted" },
};

function isPast(value: string | null, now: number): boolean {
  if (value == null) return false;
  const at = Date.parse(value);
  return Number.isFinite(at) && at <= now;
}

function lifecycleOf(entry: V2ApiKeyDTO, now: number): KeyLifecycle {
  if (!KNOWN_STATUSES.has(entry.status)) return "unknown";
  if (entry.status === "REVOKED" || entry.revokedAt != null) return "revoked";
  if (entry.status === "EXPIRED" || isPast(entry.expiresAt, now)) {
    return "expired";
  }
  if (entry.status === "DISABLED" || !entry.isActive) return "disabled";
  return "active";
}

function blockedReasonFor(lifecycle: KeyLifecycle): string {
  switch (lifecycle) {
    case "revoked":
      return "This key was revoked. Revoking is one-way — create a new key instead.";
    case "expired":
      return "This key has expired. Create a new key instead of rotating this one.";
    case "disabled":
      return "This key is disabled, so it can't be rotated or revoked.";
    default:
      return "Semblia doesn't recognise this key's state, so it won't change it.";
  }
}

/**
 * `isActive` is the server's own answer to "will this key still authenticate?",
 * so it — not the derived lifecycle — decides whether an action is offered. An
 * expired-but-still-active key can genuinely be revoked, and pretending
 * otherwise would hide a control that works.
 */
export function describeKey(entry: V2ApiKeyDTO, now: number): KeyState {
  const lifecycle = lifecycleOf(entry, now);
  const status: StatusMeta =
    lifecycle === "unknown"
      ? { label: humanizeLabel(entry.status), tone: "neutral" }
      : LIFECYCLE_STATUS[lifecycle];

  return {
    lifecycle,
    status,
    actionable: entry.isActive,
    blockedReason: entry.isActive ? null : blockedReasonFor(lifecycle),
  };
}

export function describeKeys(
  entries: V2ApiKeyDTO[],
  now: number,
): DescribedKey[] {
  return entries.map((entry) => ({ entry, state: describeKey(entry, now) }));
}

// ── Filtering ────────────────────────────────────────────────────────────────

export type KeyStatusFilter = "all" | "active" | "expired" | "revoked";

export type KeyStatusCounts = Record<KeyStatusFilter, number>;

/**
 * `disabled` and an unrecognised-but-inactive status both land in "Revoked":
 * from the caller's side they are the same fact — the key no longer works — and
 * a fourth pill for a status the API doesn't currently emit is noise. The badge
 * still says exactly which one it is.
 */
function bucketOf(state: KeyState): Exclude<KeyStatusFilter, "all"> {
  if (state.lifecycle === "expired") return "expired";
  if (state.lifecycle === "active") return "active";
  if (state.lifecycle === "unknown") {
    return state.actionable ? "active" : "revoked";
  }
  return "revoked";
}

export function countKeys(rows: DescribedKey[]): KeyStatusCounts {
  const counts: KeyStatusCounts = {
    all: rows.length,
    active: 0,
    expired: 0,
    revoked: 0,
  };
  for (const row of rows) counts[bucketOf(row.state)] += 1;
  return counts;
}

export function filterKeys(
  rows: DescribedKey[],
  status: KeyStatusFilter,
  search: string,
): DescribedKey[] {
  const needle = search.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (status !== "all" && bucketOf(row.state) !== status) return false;
    if (!needle) return true;
    return `${row.entry.name} ${row.entry.keyPrefix} ${row.entry.lastFour ?? ""}`
      .toLocaleLowerCase()
      .includes(needle);
  });
}

// ── Display ──────────────────────────────────────────────────────────────────

/** Masked identity. A missing `lastFour` never renders as `null` or `****`. */
export function maskedKey(entry: V2ApiKeyDTO): string {
  return `${entry.keyPrefix}••••${entry.lastFour ?? "••••"}`;
}

export interface KeyFactDisplay {
  text: string;
  /** Precise value for a `title` attribute, when the text is relative. */
  title?: string;
}

export function lastUsedDisplay(entry: V2ApiKeyDTO): KeyFactDisplay {
  if (entry.lastUsedAt) {
    return {
      text: timeAgo(entry.lastUsedAt),
      title: fmtDateTime(entry.lastUsedAt),
    };
  }
  // Never used is a fact, not a gap: "0" would claim a measured zero and "—"
  // would claim the value is unknown. Both are wrong.
  return entry.usageCount > 0
    ? { text: "Last use not recorded" }
    : { text: "Never used" };
}

export function expiryDisplay(
  entry: V2ApiKeyDTO,
  state: KeyState,
): KeyFactDisplay {
  if (entry.expiresAt == null) return { text: "No expiry" };
  // One time formatter for both directions: `timeAgo` reads a future stamp as
  // its absolute date, which is what an expiry needs to say anyway.
  return {
    text: `${state.lifecycle === "expired" ? "Expired" : "Expires"} ${timeAgo(entry.expiresAt)}`,
    title: fmtDateTime(entry.expiresAt),
  };
}

/** `null` when the key has no quota — that is "no limit", not "unknown". */
export function quotaHint(entry: V2ApiKeyDTO): string | null {
  if (entry.usageLimit == null) return null;
  return entry.usageCount > entry.usageLimit
    ? `Over its ${fmtCount(entry.usageLimit)} request limit`
    : `of ${fmtCount(entry.usageLimit)} allowed`;
}

/** `" / 10,000"`, or `""` when the key is uncapped. Pairs with the count. */
export function quotaSuffix(entry: V2ApiKeyDTO): string {
  return entry.usageLimit == null ? "" : ` / ${fmtCount(entry.usageLimit)}`;
}

// ── Usage series ─────────────────────────────────────────────────────────────

export interface UsagePoint {
  date: string;
  count: number;
}

const DAY_MS = 86_400_000;
/** Guard against a pathological range turning into an unbounded loop. */
const MAX_POINTS = 366;

function dayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const at = Date.parse(value);
  return Number.isFinite(at) ? new Date(at).toISOString().slice(0, 10) : null;
}

function startOfDayMs(value: number): number {
  return Date.parse(new Date(value).toISOString().slice(0, 10));
}

/**
 * A continuous daily series, zero-filled.
 *
 * The usage feed only emits a row for days that saw traffic, and an area chart
 * drawn straight from those rows draws a straight line across the silent days —
 * inventing traffic that never happened. A day with no event is a day with zero
 * requests, which is known, so the series states it. The window starts no
 * earlier than the key itself, because zeros before a key existed would be a
 * different lie.
 */
export function buildUsageSeries(
  events: V2ApiKeyEventDTO[],
  entry: V2ApiKeyDTO,
  now: number,
  maxDays = 30,
): UsagePoint[] {
  const byDay = new Map<string, number>();
  for (const event of events) {
    const key = dayKey(event.date) ?? dayKey(event.occurredAt);
    if (key == null) continue;
    const count = Number.isFinite(event.requestCount) ? event.requestCount : 0;
    byDay.set(key, (byDay.get(key) ?? 0) + count);
  }
  if (byDay.size === 0) return [];

  const eventDays = [...byDay.keys()].map((key) => Date.parse(key));
  const today = startOfDayMs(now);
  const created = dayKey(entry.createdAt);
  const createdMs = created ? Date.parse(created) : null;

  const windowStart = today - (maxDays - 1) * DAY_MS;
  let start = Math.max(windowStart, createdMs ?? windowStart);
  start = Math.min(start, ...eventDays);
  const end = Math.max(today, ...eventDays);

  const points: UsagePoint[] = [];
  for (let at = start; at <= end && points.length < MAX_POINTS; at += DAY_MS) {
    const key = new Date(at).toISOString().slice(0, 10);
    points.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return points;
}
