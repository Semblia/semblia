/**
 * Recipient-chip parsing for the request composer.
 *
 * Paste-friendly: a block of addresses copied from a spreadsheet or an email
 * client usually arrives separated by commas, semicolons, newlines, or plain
 * whitespace — never just one delimiter — so the tokenizer treats all four as
 * boundaries and drops the empty tokens a trailing separator leaves behind.
 *
 * Invalid tokens are still turned into chips rather than silently dropped —
 * the composer flags them in place so the error copy can name the exact
 * address, per the list contract (never fail silently on a bulk paste).
 */

const DELIMITERS = /[,;\s]+/;

/** Splits raw pasted/typed text into candidate email tokens. */
export function parseEmailTokens(raw: string): string[] {
  return raw
    .split(DELIMITERS)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * Mirrors the API's `emails: string[]` schema on `POST .../form-requests`:
 * trimmed, ≤320 chars, RFC-shaped. Kept as its own copy of the same rule
 * `validateInviteEmail` (`components/settings/shared/normalize.ts`) enforces
 * for member invites — the two guard different endpoints that could diverge.
 */
export function validateRequestEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter an email address.";
  if (trimmed.length > 320) return "That email address is too long.";
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)) {
    return "Enter a complete email address, like customer@example.com.";
  }
  return null;
}

/** The API's own cap on recipients per request. */
export const MAX_REQUEST_RECIPIENTS = 50;

/**
 * Adds newly typed/pasted tokens to the existing chip list: deduplicated
 * case-insensitively (an inbox doesn't care about casing, and two chips for
 * the same address would double-send) and capped at the API's limit. Tokens
 * past the cap are silently dropped — the composer surfaces the cap via the
 * inline `N/50` count, not a per-token rejection toast.
 */
export function mergeEmailChips(
  existing: string[],
  raw: string,
  max: number = MAX_REQUEST_RECIPIENTS,
): string[] {
  const seen = new Set(existing.map((email) => email.toLowerCase()));
  const merged = [...existing];
  for (const token of parseEmailTokens(raw)) {
    if (merged.length >= max) break;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(token);
  }
  return merged;
}
