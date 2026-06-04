/**
 * Response display derivation.
 *
 * The canonical record behind every piece of collected feedback is a
 * `CollectionFormSubmission` (`V2ResponseDTO` on the wire). Its answers are a
 * free-form `answers[questionId]` map, because the feedback pipeline is no
 * longer testimonial-shaped — a project can collect arbitrary questions.
 *
 * The inbox and the widget preview both still want a human-friendly card:
 * a name, a primary line of text, and a rating. This module derives that
 * presentation view from the raw answer map using the conventional question
 * ids the Collect studio ships by default (`authorName`, `authorEmail`,
 * `story`, `rating`, …) with sensible fallbacks for custom forms.
 *
 * Kept structurally typed (no `@workspace/types` import) so it can be reused
 * from the inbox, the detail view, and the widget preview mapping without
 * coupling to a specific DTO revision.
 */

export interface DerivableResponse {
  answers: Record<string, unknown>;
  ratingValue: number | null;
  ratingScale?: number | null;
  collectionForm?: { name?: string | null } | null;
}

export interface ResponseDisplay {
  /** Best-effort author name, or "Anonymous" when the form collects none. */
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  email: string | null;
  /** The primary free-text line shown in rows and card previews. */
  primaryText: string | null;
  rating: number | null;
  /** Rating denominator (e.g. 5 or 10); null when the form collects no rating. */
  ratingScale: number | null;
  /** Name of the form this feedback came in through, when known. */
  formName: string | null;
}

/** Answer keys we treat as a person's name, in priority order. */
const NAME_KEYS = ["authorName", "name", "fullName", "fullname", "displayName"];
const EMAIL_KEYS = ["authorEmail", "email", "emailAddress"];
const ROLE_KEYS = ["authorRole", "role", "jobTitle", "title", "position"];
const COMPANY_KEYS = ["authorCompany", "company", "organization", "org"];
/** Answer keys we treat as the primary feedback text, in priority order. */
const TEXT_KEYS = [
  "story",
  "content",
  "testimonial",
  "feedback",
  "message",
  "review",
  "comment",
  "quote",
  "body",
];

function readString(
  answers: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = answers[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Falls back to the longest plain-string answer when none of the conventional
 * text keys match — for fully custom forms this still surfaces something
 * meaningful in the row instead of an empty line.
 */
function longestStringAnswer(
  answers: Record<string, unknown>,
  excludeKeys: string[],
): string | null {
  let best: string | null = null;
  for (const [key, value] of Object.entries(answers)) {
    if (excludeKeys.includes(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    if (!best || trimmed.length > best.length) best = trimmed;
  }
  return best;
}

export function deriveResponseDisplay(
  response: DerivableResponse,
): ResponseDisplay {
  const answers = response.answers ?? {};

  const authorName = readString(answers, NAME_KEYS);
  const email = readString(answers, EMAIL_KEYS);
  const role = readString(answers, ROLE_KEYS);
  const company = readString(answers, COMPANY_KEYS);

  const usedKeys = [...NAME_KEYS, ...EMAIL_KEYS, ...ROLE_KEYS, ...COMPANY_KEYS];
  const primaryText =
    readString(answers, TEXT_KEYS) ?? longestStringAnswer(answers, usedKeys);

  return {
    authorName: authorName ?? "Anonymous",
    authorRole: role,
    authorCompany: company,
    email,
    primaryText,
    rating: response.ratingValue,
    ratingScale: response.ratingScale ?? null,
    formName: response.collectionForm?.name ?? null,
  };
}

/** First letter for an avatar chip; "?" when the name is empty. */
export function avatarInitial(name: string): string {
  const ch = name.trim()[0];
  return ch ? ch.toUpperCase() : "?";
}
