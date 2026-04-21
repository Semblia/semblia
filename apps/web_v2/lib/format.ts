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
