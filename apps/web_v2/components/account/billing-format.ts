/**
 * Money and plan display for the billing surfaces.
 *
 * Amounts arrive from Razorpay in paise, so every render divides by 100 exactly
 * once — in here — rather than at each call site where the factor is easy to
 * drop. A non-finite amount renders as an em dash rather than "₹NaN".
 */

import { ABSENT } from "@/lib/format";

/** Rupee amount from a paise integer: `79900` → `"₹799"`. */
export function formatINR(paise: number): string {
  if (!Number.isFinite(paise)) return ABSENT;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/** `"BUSINESS"` → `"Business"`. Raw plan enums never reach a user's eyes. */
export function planDisplayName(plan: string): string {
  if (!plan) return ABSENT;
  return `${plan.charAt(0).toUpperCase()}${plan.slice(1).toLowerCase()}`;
}
