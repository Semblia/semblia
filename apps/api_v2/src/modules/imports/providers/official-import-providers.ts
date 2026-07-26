import { Injectable } from "@nestjs/common";
import { Buffer } from "node:buffer";
import type { ImportCandidate } from "../import-normalization.js";
import { GooglePlayImportProviderOperations } from "./google-play-import-provider.js";
import {
  googlePlayTimestamp,
  providerTimestamp,
} from "./official-import-provider-timestamps.js";
import { YouTubeImportProviderOperations } from "./youtube-import-provider.js";
import {
  discardResponse,
  readBoundedJson,
} from "./official-import-provider-json.js";
import { GoogleBusinessImportProviderOperations } from "./google-import-provider.js";
import { LinkedInImportProviderOperations } from "./linkedin-import-provider.js";
import {
  integer,
  invalidProviderConfiguration,
  invalidProviderResponse,
  optionalArrayField,
  optionalConfigString,
  optionalEnvelopeString,
  optionalInteger,
  optionalRecordField,
  optionalString,
  record,
  requiredArrayField,
  requiredConfigString,
  requiredInteger,
  requiredRecord,
  requiredRecordField,
  requiredString,
  stringArray,
} from "./official-import-provider-validation.js";

const PROVIDER_TIMEOUT_MS = 10_000;
const MAX_PAGE_SIZE = 100;
const GOOGLE_ACCOUNT_PAGE_SIZE = 20;
const GOOGLE_LOCATION_PAGE_SIZE = 100;
const GOOGLE_REVIEW_PAGE_SIZE = 50;
const YOUTUBE_RESOURCE_PAGE_SIZE = 50;
const YOUTUBE_THREAD_PAGE_SIZE = MAX_PAGE_SIZE;
const MAX_CURSOR_BYTES = 4096;
const MAX_RETRY_AFTER_MS = 300_000;
const DEFAULT_RETRY_AFTER_MS = 60_000;

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

export interface ImportProvider {
  readonly sourceKey:
    | "x"
    | "linkedin"
    | "youtube"
    | "google-business"
    | "google-play";
  listResources(
    ...args: ImportProviderResourceArguments
  ): Promise<ImportProviderResourcePage>;
  fetchCandidates(
    ...args: ImportProviderCandidateArguments
  ): Promise<ImportProviderCandidatePage>;
}

type ImportProviderResourceArguments = [token: string, cursor?: string];
type ImportProviderCandidateArguments = [
  token: string,
  config: Record<string, unknown>,
  cursor?: string,
];

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

@Injectable()
export class BoundedImportProviderHttpClient
  implements ImportProviderHttpClient
{
  async getJson({
    url,
    token,
    params = {},
    headers = {},
  }: Parameters<ImportProviderHttpClient["getJson"]>[0]) {
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) target.searchParams.set(key, value);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const response = await fetch(target, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...headers,
        },
        signal: controller.signal,
      });
      const responseHeaders = Object.fromEntries(response.headers.entries());
      if (!response.ok) {
        await discardResponse(response);
        throw new ProviderHttpError(
          response.status,
          undefined,
          responseHeaders,
        );
      }
      const body = await readBoundedJson(response);
      return { status: response.status, headers: responseHeaders, body };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export abstract class BaseImportProvider implements ImportProvider {
  abstract readonly sourceKey: ImportProvider["sourceKey"];
  constructor(protected readonly http: ImportProviderHttpClient) {}
  abstract listResources(
    ...args: ImportProviderResourceArguments
  ): Promise<ImportProviderResourcePage>;
  abstract fetchCandidates(
    ...args: ImportProviderCandidateArguments
  ): Promise<ImportProviderCandidatePage>;

  protected async request(
    input: Parameters<ImportProviderHttpClient["getJson"]>[0],
  ) {
    try {
      const response = await this.http.getJson(input);
      if (response.status < 200 || response.status >= 300) {
        throw new ProviderHttpError(
          response.status,
          undefined,
          response.headers,
        );
      }
      return response;
    } catch (error) {
      throw classifyProviderError(error);
    }
  }
}

@Injectable()
export class XImportProvider extends BaseImportProvider {
  readonly sourceKey = "x" as const;

  async listResources(
    ...[token]: ImportProviderResourceArguments
  ): Promise<ImportProviderResourcePage> {
    const response = await this.request({
      url: "https://api.x.com/2/users/me",
      token,
      params: { "user.fields": "name,username" },
    });
    const user = requiredRecordField(requiredRecord(response.body), "data");
    const id = requiredString(user, "id");
    return {
      items: [
        {
          id,
          label: optionalString(user, "name") ?? id,
          config: {
            userId: id,
            username: optionalString(user, "username") ?? "",
          },
        },
      ],
      nextCursor: null,
    };
  }

  async fetchCandidates(
    ...[token, config, cursor]: ImportProviderCandidateArguments
  ): Promise<ImportProviderCandidatePage> {
    const postIds = stringArray(config.postIds, MAX_PAGE_SIZE);
    const userId = optionalConfigString(config, "userId");
    if (!postIds.length && !userId) {
      throw new ImportProviderError(
        "PROVIDER_INVALID_CONFIGURATION",
        "Provider configuration is invalid.",
      );
    }
    const timelineUrl = `https://api.x.com/2/users/${encodeURIComponent(userId ?? "")}/tweets`;
    const response = await this.request({
      url: postIds.length ? "https://api.x.com/2/tweets" : timelineUrl,
      token,
      params: postIds.length
        ? {
            ids: postIds.join(","),
            expansions: "author_id",
            "tweet.fields": "created_at,author_id",
          }
        : {
            max_results: String(MAX_PAGE_SIZE),
            pagination_token: cursor,
            expansions: "author_id",
            "tweet.fields": "created_at,author_id",
          },
    });
    const body = requiredRecord(response.body);
    const meta = optionalRecordField(body, "meta") ?? {};
    const tweets = xDataItems(body, meta);
    const includes = optionalRecordField(body, "includes");
    const includedUsers = includes
      ? optionalArrayField(includes, "users", MAX_PAGE_SIZE)
      : [];
    const users = new Map(
      includedUsers
        .map(record)
        .map((user) => [optionalString(user, "id"), user]),
    );
    return {
      candidates: tweets
        .map(record)
        .flatMap((tweet) => xCandidate(tweet, users)),
      nextCursor: optionalEnvelopeString(meta, "next_token"),
    };
  }
}

@Injectable()
export class LinkedInImportProvider extends BaseImportProvider {
  readonly sourceKey = "linkedin" as const;
  private readonly operations = new LinkedInImportProviderOperations((input) =>
    this.request(input),
  );

  listResources(...[token]: ImportProviderResourceArguments) {
    return this.operations.listResources(token);
  }

  fetchCandidates(
    ...[token, config, cursor]: ImportProviderCandidateArguments
  ) {
    return this.operations.fetchCandidates(token, config, cursor);
  }
}

@Injectable()
export class YouTubeImportProvider extends BaseImportProvider {
  readonly sourceKey = "youtube" as const;
  private readonly operations = new YouTubeImportProviderOperations((input) =>
    this.request(input),
  );

  listResources(...[token, cursor]: ImportProviderResourceArguments) {
    return this.operations.listResources(token, cursor);
  }

  fetchCandidates(
    ...[token, config, cursor]: ImportProviderCandidateArguments
  ) {
    return this.operations.fetchCandidates(token, config, cursor);
  }
}
@Injectable()
export class GoogleBusinessImportProvider extends BaseImportProvider {
  readonly sourceKey = "google-business" as const;
  private readonly operations = new GoogleBusinessImportProviderOperations(
    (input) => this.request(input),
  );
  listResources(...[token, cursor]: ImportProviderResourceArguments) {
    return this.operations.listResources(token, cursor);
  }
  fetchCandidates(
    ...[token, config, cursor]: ImportProviderCandidateArguments
  ) {
    return this.operations.fetchCandidates(token, config, cursor);
  }
}
@Injectable()
export class GooglePlayImportProvider extends BaseImportProvider {
  readonly sourceKey = "google-play" as const;
  private readonly operations = new GooglePlayImportProviderOperations(
    (input) => this.request(input),
  );

  listResources(...[token, cursor]: ImportProviderResourceArguments) {
    return this.operations.listResources(token, cursor);
  }

  fetchCandidates(
    ...[token, config, cursor]: ImportProviderCandidateArguments
  ) {
    return this.operations.fetchCandidates(token, config, cursor);
  }
}

type GoogleResourceCursor = {
  kind: "google-resources";
  accountPageToken: string | null;
  accountIndex: number;
  locationPageToken: string | null;
};

function nextGoogleResourceCursor({
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

function decodeGoogleResourceCursor(cursor?: string): GoogleResourceCursor {
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
  assertGoogleResourceAccount(value);
  assertGoogleResourceLocation(value);
}

function assertGoogleResourceAccount(value: Record<string, unknown>) {
  if (value.kind !== "google-resources") throw invalidCursor();
  if (!isOptionalCursorString(value.accountPageToken)) throw invalidCursor();
}

function assertGoogleResourceLocation(value: Record<string, unknown>) {
  if (!isCursorIndex(value.accountIndex)) throw invalidCursor();
  if (!isOptionalCursorString(value.locationPageToken)) throw invalidCursor();
}

function encodeCursor(value: Record<string, unknown>) {
  const encoded = Buffer.from(JSON.stringify(value), "utf8").toString(
    "base64url",
  );
  if (encoded.length > MAX_CURSOR_BYTES) throw invalidCursor();
  return encoded;
}

function decodeCursor(cursor: string): Record<string, unknown> {
  if (!cursor || cursor.length > MAX_CURSOR_BYTES) throw invalidCursor();
  try {
    return requiredRecord(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    );
  } catch {
    throw invalidCursor();
  }
}

function isCursorString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 2048;
}

function isOptionalCursorString(value: unknown): value is string | null {
  return value === null || isCursorString(value);
}

function isCursorIndex(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) < 100
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function invalidCursor() {
  return new ImportProviderError(
    "PROVIDER_INVALID_CONFIGURATION",
    "Provider cursor is invalid.",
  );
}

function xCandidate(
  tweet: Record<string, unknown>,
  users: Map<string | null, Record<string, unknown>>,
): ImportCandidate[] {
  const id = optionalString(tweet, "id");
  const text = optionalString(tweet, "text");
  if (!id || !text) return [];
  const user = users.get(optionalString(tweet, "author_id"));
  const username = user && optionalString(user, "username");
  return [
    {
      externalId: id,
      sourceUrl: username
        ? `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`
        : null,
      sourceCreatedAt: optionalString(tweet, "created_at"),
      text,
      ratingValue: null,
      ratingScale: null,
      authorName: user ? optionalString(user, "name") : null,
      authorRole: null,
      authorCompany: null,
      tags: [],
    },
  ];
}

function xDataItems(
  body: Record<string, unknown>,
  meta: Record<string, unknown>,
) {
  if (body.data !== undefined && body.data !== null) {
    return requiredArrayField(body, "data", MAX_PAGE_SIZE);
  }
  if (integer(meta, "result_count") === 0) return [];
  throw invalidProviderResponse();
}

function youTubeCommentCandidate(
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

function googleBusinessCandidate(
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
      sourceCreatedAt: optionalString(review, "createTime"),
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

function classifyProviderError(error: unknown): ImportProviderError {
  if (error instanceof ImportProviderError) return error;
  if (error instanceof ProviderHttpError) {
    if (error.status === 401 || error.status === 403)
      return new ImportProviderError(
        "REAUTHORIZATION_REQUIRED",
        "Provider authorization needs to be renewed.",
      );
    if (error.status === 429)
      return new ImportProviderError(
        "PROVIDER_RATE_LIMITED",
        "Provider rate limit reached. Try again later.",
        retryAfterMs(error.headers),
      );
  }
  if (error instanceof DOMException && error.name === "AbortError")
    return new ImportProviderError(
      "PROVIDER_TIMEOUT",
      "Provider request timed out.",
    );
  return new ImportProviderError(
    "PROVIDER_REQUEST_FAILED",
    "Provider request failed.",
  );
}

export function retryAfterMs(headers: Record<string, string | undefined>) {
  const raw = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === "retry-after",
  )?.[1];
  if (!raw) return DEFAULT_RETRY_AFTER_MS;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.round(seconds * 1000), MAX_RETRY_AFTER_MS);
  }
  const date = Date.parse(raw);
  if (!Number.isNaN(date) && date > Date.now()) {
    return Math.min(date - Date.now(), MAX_RETRY_AFTER_MS);
  }
  return DEFAULT_RETRY_AFTER_MS;
}

export function linkedInHeaders() {
  return { "Linkedin-Version": "202601", "X-Restli-Protocol-Version": "2.0.0" };
}

export {
  MAX_PAGE_SIZE,
  GOOGLE_ACCOUNT_PAGE_SIZE,
  GOOGLE_LOCATION_PAGE_SIZE,
  GOOGLE_REVIEW_PAGE_SIZE,
  YOUTUBE_RESOURCE_PAGE_SIZE,
  YOUTUBE_THREAD_PAGE_SIZE,
  encodeCursor,
  decodeCursor,
  invalidCursor,
  invalidProviderResponse,
  isCursorIndex,
  isCursorString,
  isOptionalCursorString,
  isPositiveSafeInteger,
  integer,
  optionalArrayField,
  optionalConfigString,
  optionalEnvelopeString,
  optionalInteger,
  optionalRecordField,
  optionalString,
  record,
  requiredArrayField,
  requiredConfigString,
  requiredInteger,
  requiredRecord,
  requiredRecordField,
  requiredString,
  stringArray,
  youTubeCommentCandidate,
  decodeGoogleResourceCursor,
  nextGoogleResourceCursor,
  googleBusinessCandidate,
  googlePlayTimestamp,
  providerTimestamp,
  invalidProviderConfiguration,
};
