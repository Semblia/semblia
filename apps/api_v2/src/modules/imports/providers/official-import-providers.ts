import { Injectable } from "@nestjs/common";
import type { ImportCandidate } from "../import-normalization.js";
import { GooglePlayImportProviderOperations } from "./google-play-import-provider.js";
import { YouTubeImportProviderOperations } from "./youtube-import-provider.js";
import {
  discardResponse,
  readBoundedJson,
} from "./official-import-provider-json.js";
import { GoogleBusinessImportProviderOperations } from "./google-import-provider.js";
import { LinkedInImportProviderOperations } from "./linkedin-import-provider.js";
const PROVIDER_TIMEOUT_MS = 10_000;
const MAX_RETRY_AFTER_MS = 300_000;
const DEFAULT_RETRY_AFTER_MS = 60_000;
import {
  ImportProviderError,
  MAX_PAGE_SIZE,
  ProviderHttpError,
  integer,
  invalidProviderResponse,
  optionalArrayField,
  optionalConfigString,
  optionalEnvelopeString,
  optionalRecordField,
  optionalString,
  record,
  requiredArrayField,
  requiredRecord,
  requiredRecordField,
  requiredString,
  stringArray,
  type ImportProviderCandidatePage,
  type ImportProviderHttpClient,
  type ImportProviderResourcePage,
} from "./official-import-provider-shared.js";
export * from "./official-import-provider-shared.js";

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

export {
  googlePlayTimestamp,
  providerTimestamp,
} from "./official-import-provider-timestamps.js";
