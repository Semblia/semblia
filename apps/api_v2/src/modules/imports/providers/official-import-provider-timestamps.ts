type InvalidProviderResponse = () => Error;

export function providerTimestamp(
  value: Record<string, unknown>,
  key: string,
  invalid: InvalidProviderResponse,
) {
  const timestamp = value[key];
  if (timestamp === undefined || timestamp === null) return null;
  if (typeof timestamp === "string")
    return boundedTimestamp(timestamp, invalid);
  if (typeof timestamp === "number") return epochTimestamp(timestamp, invalid);
  throw invalid();
}

export function googlePlayTimestamp(
  comment: Record<string, unknown>,
  invalid: InvalidProviderResponse,
) {
  const lastModified = requiredRecordOrNull(comment.lastModified, invalid);
  if (!lastModified) return null;
  return epochTimestamp(seconds(lastModified.seconds, invalid) * 1000, invalid);
}

function boundedTimestamp(value: string, invalid: InvalidProviderResponse) {
  const normalized = value.trim();
  if (normalized && normalized.length <= 100) return normalized;
  throw invalid();
}

function epochTimestamp(value: number, invalid: InvalidProviderResponse) {
  if (!Number.isSafeInteger(value) || value < 0) throw invalid();
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw invalid();
  return date.toISOString();
}

function seconds(value: unknown, invalid: InvalidProviderResponse) {
  const numeric =
    typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : typeof value === "number"
        ? value
        : NaN;
  if (!Number.isSafeInteger(numeric) || numeric < 0) throw invalid();
  return numeric;
}

function requiredRecordOrNull(
  value: unknown,
  invalid: InvalidProviderResponse,
): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw invalid();
}
