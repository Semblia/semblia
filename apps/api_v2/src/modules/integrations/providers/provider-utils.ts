export function getRequiredString(
  config: Record<string, unknown>,
  key: string,
) {
  const value = config[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required for this provider`);
  }
  return value.trim();
}

export function getOptionalStringArray(
  config: Record<string, unknown>,
  key: string,
) {
  const value = config[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function buildExportTitle(payload: Record<string, unknown>) {
  return truncate(String(payload.title ?? "Tresta feedback"), 180);
}

export function buildExportBody(payload: Record<string, unknown>) {
  const lines = [
    payload.summary ? String(payload.summary) : null,
    payload.content ? String(payload.content) : null,
    payload.authorName ? `Author: ${String(payload.authorName)}` : null,
    typeof payload.rating === "number" ? `Rating: ${payload.rating}` : null,
    payload.sourceUrl ? `Source: ${String(payload.sourceUrl)}` : null,
    payload.testimonialId
      ? `Tresta testimonial: ${String(payload.testimonialId)}`
      : null,
    payload.submissionId
      ? `Tresta submission: ${String(payload.submissionId)}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return truncate(lines.join("\n\n"), 5000);
}

export function compactRecord(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

export function truncate(value: string, maxLength: number) {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 1)}…`;
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
