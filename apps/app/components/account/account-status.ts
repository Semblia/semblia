/**
 * Status vocabularies for the records the shared registries don't cover.
 *
 * `components/shared/status-badge` owns one registry per V2 API enum. The
 * account area also renders Clerk resources and Razorpay-backed billing values,
 * which are not V2 DTO enums and therefore have no entry there. These follow
 * the same contract as the shared registries — Title Case labels matching what
 * the provider calls the state, exactly one tone, and a readable fallback — so
 * a value a provider grows before the app knows it still reaches the screen as
 * words instead of as `past_due`.
 *
 * Lookup tables are null-prototype so a provider value that collides with an
 * Object member ("constructor", "toString") falls through to the fallback
 * instead of resolving to something off the prototype chain.
 */

import { humanizeLabel } from "@/lib/format";
import type { StatusMeta, StatusTone } from "@/components/shared";

function table(
  entries: Record<string, StatusMeta>,
): Record<string, StatusMeta> {
  return Object.assign(
    Object.create(null) as Record<string, StatusMeta>,
    entries,
  );
}

function fallback(value: string, tone: StatusTone): StatusMeta {
  return { label: humanizeLabel(value.toLowerCase()), tone };
}

// ── Clerk verification ─────────────────────────────────────────────────────────
//
// One vocabulary shared by email addresses and linked provider accounts: both
// carry the same `verification.status` from Clerk.

const VERIFICATION = table({
  verified: { label: "Verified", tone: "positive" },
  unverified: { label: "Unverified", tone: "attention" },
  transferable: { label: "Unverified", tone: "attention" },
  failed: { label: "Verification failed", tone: "critical" },
  expired: { label: "Verification expired", tone: "critical" },
});

/**
 * An absent status is not a blank badge: Clerk omits the object entirely until
 * verification has been attempted, which is exactly "unverified".
 */
export function verificationMeta(value: string | null | undefined): StatusMeta {
  if (!value) return { label: "Unverified", tone: "attention" };
  return VERIFICATION[value] ?? fallback(value, "attention");
}

// ── Billing ────────────────────────────────────────────────────────────────────

const SUBSCRIPTION = table({
  active: { label: "Active", tone: "positive" },
  trialing: { label: "Trial", tone: "progress" },
  past_due: { label: "Past due", tone: "critical" },
  canceled: { label: "Canceled", tone: "muted" },
});

export function subscriptionStatusMeta(value: string): StatusMeta {
  return SUBSCRIPTION[value] ?? fallback(value, "attention");
}

const INVOICE = table({
  paid: { label: "Paid", tone: "positive" },
  open: { label: "Open", tone: "attention" },
  void: { label: "Void", tone: "muted" },
});

export function invoiceStatusMeta(value: string): StatusMeta {
  return INVOICE[value] ?? fallback(value, "attention");
}

// ── Two-factor ─────────────────────────────────────────────────────────────────

export function totpMeta(enabled: boolean): StatusMeta {
  return enabled
    ? { label: "Enabled", tone: "positive" }
    : { label: "Not set up", tone: "neutral" };
}
