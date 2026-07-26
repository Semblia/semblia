import { Buffer } from "node:buffer";
import type { ImportCandidate } from "../import-normalization.js";
import { providerTimestamp } from "./official-import-provider-timestamps.js";

export { providerTimestamp };

export const MAX_PAGE_SIZE = 100;
export const GOOGLE_ACCOUNT_PAGE_SIZE = 20;
export const GOOGLE_LOCATION_PAGE_SIZE = 100;
export const GOOGLE_REVIEW_PAGE_SIZE = 50;
export const YOUTUBE_RESOURCE_PAGE_SIZE = 50;
export const YOUTUBE_THREAD_PAGE_SIZE = MAX_PAGE_SIZE;
const MAX_CURSOR_BYTES = 4096;

export type ImportProviderHttpResponse = {
  status: number;
  headers: Record<string, string | undefined>;
  body: unknown;
};

export type ImportProviderHttpClient = {
  getJson(input: {
    url: string;
    token: string;
    params?: Record<string, string | undefined>;
    headers?: Record<string, string>;
  }): Promise<ImportProviderHttpResponse>;
};

export type ImportProviderResource = {
  id: string;
  label: string;
  config: Record<string, string>;
};

export type ImportProviderResourcePage = {
  items: ImportProviderResource[];
  nextCursor: string | null;
};

export type ImportProviderCandidatePage = {
  candidates: ImportCandidate[];
  nextCursor: string | null;
};

export class ProviderHttpError extends Error {
  constructor(
    readonly status: number,
    _body?: unknown,
    readonly headers: Record<string, string | undefined> = {},
  ) {
    super(`Provider returned HTTP ${status}`);
  }
}

export class ImportProviderError extends Error {
  constructor(
    readonly code:
      | "REAUTHORIZATION_REQUIRED"
      | "PROVIDER_RATE_LIMITED"
      | "PROVIDER_TIMEOUT"
      | "PROVIDER_REQUEST_FAILED"
      | "PROVIDER_INVALID_RESPONSE"
      | "PROVIDER_INVALID_CONFIGURATION"
      | "PROVIDER_SETUP_REQUIRED",
    message: string,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

export function encodeCursor(value: Record<string, unknown>) {
  const encoded = Buffer.from(JSON.stringify(value), "utf8").toString(
    "base64url",
  );
  if (encoded.length > MAX_CURSOR_BYTES) throw invalidCursor();
  return encoded;
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  if (!cursor || cursor.length > MAX_CURSOR_BYTES) throw invalidCursor();
  try {
    return requiredRecord(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    );
  } catch {
    throw invalidCursor();
  }
}

export function isCursorString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 2048;
}

export function isOptionalCursorString(value: unknown): value is string | null {
  return value === null || isCursorString(value);
}

export function isCursorIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value < 100
  );
}

export function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function invalidCursor() {
  return new ImportProviderError(
    "PROVIDER_INVALID_CONFIGURATION",
    "Provider cursor is invalid.",
  );
}

export function invalidProviderResponse() {
  return new ImportProviderError(
    "PROVIDER_INVALID_RESPONSE",
    "Provider returned an invalid response.",
  );
}

export function invalidProviderConfiguration() {
  return new ImportProviderError(
    "PROVIDER_INVALID_CONFIGURATION",
    "Provider configuration is invalid.",
  );
}

export function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function requiredRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  throw invalidProviderResponse();
}

export function requiredRecordField(
  ...[value, key]: [Record<string, unknown>, string]
): Record<string, unknown> {
  return requiredRecord(value[key]);
}

export function optionalRecordField(
  ...[value, key]: [Record<string, unknown>, string]
): Record<string, unknown> | null {
  const field = optionalField(value, key);
  return field === null ? null : requiredRecord(field);
}

export function requiredArrayField(
  ...[value, key, maxLength]: [Record<string, unknown>, string, number]
): unknown[] {
  const result = value[key];
  if (!Array.isArray(result) || result.length > maxLength) {
    throw invalidProviderResponse();
  }
  return result;
}

export function optionalArrayField(
  ...[value, key, maxLength]: [Record<string, unknown>, string, number]
): unknown[] {
  if (optionalField(value, key) === null) return [];
  return requiredArrayField(value, key, maxLength);
}

export function optionalEnvelopeString(
  ...[value, key]: [Record<string, unknown>, string]
) {
  const field = optionalField(value, key);
  if (field === null) return null;
  return requiredEnvelopeString(field);
}

export function requiredInteger(
  ...[value, key]: [Record<string, unknown>, string]
) {
  const result = value[key];
  if (!isNonNegativeSafeInteger(result)) throw invalidProviderResponse();
  return result;
}

export function optionalInteger(
  ...[value, key]: [Record<string, unknown>, string]
): number | null {
  const result = optionalField(value, key);
  if (result === null) return null;
  if (typeof result !== "number" || !Number.isSafeInteger(result)) {
    throw invalidProviderResponse();
  }
  return result;
}

export function optionalString(
  ...[value, key]: [Record<string, unknown>, string]
) {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim().slice(0, 10_000)
    : null;
}

export function requiredString(
  ...[value, key]: [Record<string, unknown>, string]
) {
  const result = optionalString(value, key);
  if (!result) throw invalidProviderResponse();
  return result;
}

export function optionalConfigString(
  ...[config, key]: [Record<string, unknown>, string]
) {
  const value = config[key];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 512)
    : null;
}

export function requiredConfigString(
  ...[config, key]: [Record<string, unknown>, string]
) {
  const result = optionalConfigString(config, key);
  if (!result) throw invalidProviderConfiguration();
  return result;
}

export function stringArray(...[value, max]: [unknown, number]) {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .slice(0, max)
        .map((item) => item.trim().slice(0, 512))
    : [];
}

export function integer(...[value, key]: [unknown, string]) {
  const result = record(value)[key];
  return typeof result === "number" &&
    Number.isSafeInteger(result) &&
    result >= 0
    ? result
    : null;
}

export function youTubeCommentCandidate(
  comment: Record<string, unknown>,
  videoId: string,
): ImportCandidate {
  const id = requiredString(comment, "id");
  const snippet = requiredRecordField(comment, "snippet");
  const text =
    optionalString(snippet, "textOriginal") ??
    requiredString(snippet, "textDisplay");
  return {
    externalId: id,
    sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&lc=${encodeURIComponent(id)}`,
    sourceCreatedAt: optionalString(snippet, "publishedAt"),
    text,
    ratingValue: null,
    ratingScale: null,
    authorName: optionalString(snippet, "authorDisplayName"),
    authorRole: null,
    authorCompany: null,
    tags: [],
  };
}

export function linkedInHeaders() {
  return { "Linkedin-Version": "202601", "X-Restli-Protocol-Version": "2.0.0" };
}

export function googleBusinessCandidate(
  review: Record<string, unknown>,
): ImportCandidate[] {
  const id = optionalString(review, "reviewId");
  const text = optionalString(review, "comment");
  if (!id || !text) return [];
  const rating =
    ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as Record<string, number>)[
      optionalString(review, "starRating") ?? ""
    ] ?? null;
  return [
    {
      externalId: id,
      sourceUrl: null,
      sourceCreatedAt: providerTimestamp(
        review,
        "createTime",
        invalidProviderResponse,
      ),
      text,
      ratingValue: rating,
      ratingScale: rating === null ? null : 5,
      authorName: optionalString(record(review.reviewer), "displayName"),
      authorRole: null,
      authorCompany: null,
      tags: [],
    },
  ];
}

type GoogleResourceCursor = {
  kind: "google-resources";
  accountPageToken: string | null;
  accountIndex: number;
  locationPageToken: string | null;
};

export function nextGoogleResourceCursor({
  state,
  accountCount,
  accountNextPageToken,
  locationNextPageToken,
}: {
  state: GoogleResourceCursor;
  accountCount: number;
  accountNextPageToken: string | null;
  locationNextPageToken: string | null;
}) {
  if (locationNextPageToken) {
    return encodeCursor({ ...state, locationPageToken: locationNextPageToken });
  }
  if (state.accountIndex + 1 < accountCount) {
    return encodeCursor({
      ...state,
      accountIndex: state.accountIndex + 1,
      locationPageToken: null,
    });
  }
  return accountNextPageToken
    ? encodeCursor({
        kind: "google-resources",
        accountPageToken: accountNextPageToken,
        accountIndex: 0,
        locationPageToken: null,
      })
    : null;
}

export function decodeGoogleResourceCursor(
  cursor?: string,
): GoogleResourceCursor {
  if (!cursor) {
    return {
      kind: "google-resources",
      accountPageToken: null,
      accountIndex: 0,
      locationPageToken: null,
    };
  }
  const value = decodeCursor(cursor);
  assertGoogleResourceCursor(value);
  return value as GoogleResourceCursor;
}

function assertGoogleResourceCursor(value: Record<string, unknown>) {
  assertGoogleResourceKind(value);
  assertGoogleResourceAccount(value);
  assertGoogleResourceLocation(value);
}

function assertGoogleResourceKind(value: Record<string, unknown>) {
  if (value.kind !== "google-resources") throw invalidCursor();
}

function assertGoogleResourceAccount(value: Record<string, unknown>) {
  if (!isOptionalCursorString(value.accountPageToken)) throw invalidCursor();
}

function assertGoogleResourceLocation(value: Record<string, unknown>) {
  if (!isCursorIndex(value.accountIndex)) throw invalidCursor();
  if (!isOptionalCursorString(value.locationPageToken)) throw invalidCursor();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalField(
  value: Record<string, unknown>,
  key: string,
): unknown | null {
  const field = value[key];
  return field === undefined || field === null ? null : field;
}

function requiredEnvelopeString(value: unknown) {
  if (typeof value !== "string") throw invalidProviderResponse();
  if (!value.trim()) throw invalidProviderResponse();
  if (value.length > 2048) throw invalidProviderResponse();
  return value;
}

export function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
