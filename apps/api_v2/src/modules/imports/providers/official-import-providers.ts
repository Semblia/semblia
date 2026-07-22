import { Injectable } from "@nestjs/common";
import { Buffer } from "node:buffer";
import type { ImportCandidate } from "../import-normalization.js";

const PROVIDER_TIMEOUT_MS = 10_000;
const MAX_PAGE_SIZE = 100;
const GOOGLE_ACCOUNT_PAGE_SIZE = 20;
const GOOGLE_LOCATION_PAGE_SIZE = 100;
const GOOGLE_REVIEW_PAGE_SIZE = 50;
const YOUTUBE_RESOURCE_PAGE_SIZE = 50;
const YOUTUBE_THREAD_PAGE_SIZE = 1;
const MAX_RESPONSE_BYTES = 1_000_000;
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
    token: string,
    cursor?: string,
  ): Promise<ImportProviderResourcePage>;
  fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
  ): Promise<ImportProviderCandidatePage>;
}

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

abstract class BaseImportProvider implements ImportProvider {
  abstract readonly sourceKey: ImportProvider["sourceKey"];
  constructor(protected readonly http: ImportProviderHttpClient) {}
  abstract listResources(
    token: string,
    cursor?: string,
  ): Promise<ImportProviderResourcePage>;
  abstract fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
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

  async listResources(token: string): Promise<ImportProviderResourcePage> {
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
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
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

  async listResources(token: string): Promise<ImportProviderResourcePage> {
    const response = await this.request({
      url: "https://api.linkedin.com/v2/me",
      token,
      headers: linkedInHeaders(),
    });
    const body = requiredRecord(response.body);
    const id = requiredString(body, "id");
    const label =
      [
        optionalString(body, "localizedFirstName"),
        optionalString(body, "localizedLastName"),
      ]
        .filter(Boolean)
        .join(" ") || id;
    return {
      items: [
        {
          id: `urn:li:person:${id}`,
          label,
          config: { authorUrn: `urn:li:person:${id}` },
        },
      ],
      nextCursor: null,
    };
  }

  async fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
  ): Promise<ImportProviderCandidatePage> {
    const authorUrn = requiredConfigString(config, "authorUrn");
    const response = await this.request({
      url: "https://api.linkedin.com/rest/posts",
      token,
      headers: { ...linkedInHeaders(), "X-RestLi-Method": "FINDER" },
      params: {
        q: "author",
        author: authorUrn,
        start: linkedInStartCursor(cursor),
        count: String(MAX_PAGE_SIZE),
      },
    });
    const body = requiredRecord(response.body);
    const elements = requiredArrayField(body, "elements", MAX_PAGE_SIZE).map(
      record,
    );
    const paging = requiredRecordField(body, "paging");
    return {
      candidates: elements.flatMap(linkedInCandidate),
      nextCursor: linkedInNextStartCursor(paging),
    };
  }
}

@Injectable()
export class YouTubeImportProvider extends BaseImportProvider {
  readonly sourceKey = "youtube" as const;

  async listResources(
    token: string,
    cursor?: string,
  ): Promise<ImportProviderResourcePage> {
    const state = decodeYouTubeResourceCursor(cursor);
    const channelsResponse = await this.request({
      url: "https://www.googleapis.com/youtube/v3/channels",
      token,
      params: {
        part: "snippet,contentDetails",
        mine: "true",
        maxResults: String(YOUTUBE_RESOURCE_PAGE_SIZE),
        pageToken: state.channelPageToken ?? undefined,
      },
    });
    const channelsBody = requiredRecord(channelsResponse.body);
    const channels = requiredArrayField(
      channelsBody,
      "items",
      YOUTUBE_RESOURCE_PAGE_SIZE,
    ).map(record);
    const channelNextPageToken = optionalEnvelopeString(
      channelsBody,
      "nextPageToken",
    );
    if (!channels.length) {
      return {
        items: [],
        nextCursor: channelNextPageToken
          ? encodeCursor({
              kind: "youtube-resources",
              channelPageToken: channelNextPageToken,
              channelIndex: 0,
              playlistPageToken: null,
            })
          : null,
      };
    }
    if (state.channelIndex >= channels.length) throw invalidCursor();
    const channel = channels[state.channelIndex]!;
    const uploadsPlaylistId = requiredString(
      requiredRecordField(
        requiredRecordField(channel, "contentDetails"),
        "relatedPlaylists",
      ),
      "uploads",
    );
    const playlistResponse = await this.request({
      url: "https://www.googleapis.com/youtube/v3/playlistItems",
      token,
      params: {
        part: "snippet",
        playlistId: uploadsPlaylistId,
        maxResults: String(YOUTUBE_RESOURCE_PAGE_SIZE),
        pageToken: state.playlistPageToken ?? undefined,
      },
    });
    const playlistBody = requiredRecord(playlistResponse.body);
    const videos = requiredArrayField(
      playlistBody,
      "items",
      YOUTUBE_RESOURCE_PAGE_SIZE,
    ).map(record);
    const playlistNextPageToken = optionalEnvelopeString(
      playlistBody,
      "nextPageToken",
    );
    return {
      items: videos.map((video) => {
        const snippet = requiredRecordField(video, "snippet");
        const videoId = requiredString(
          requiredRecordField(snippet, "resourceId"),
          "videoId",
        );
        return {
          id: videoId,
          label: optionalString(snippet, "title") ?? videoId,
          config: { videoId },
        };
      }),
      nextCursor: nextYouTubeResourceCursor({
        state,
        channelCount: channels.length,
        channelNextPageToken,
        playlistNextPageToken,
      }),
    };
  }

  async fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
  ): Promise<ImportProviderCandidatePage> {
    const videoId = requiredConfigString(config, "videoId");
    const state = decodeYouTubeCandidateCursor(cursor);
    if (state.phase === "replies") {
      return this.fetchReplyPage(token, videoId, state);
    }
    const response = await this.request({
      url: "https://www.googleapis.com/youtube/v3/commentThreads",
      token,
      params: {
        part: "snippet,replies",
        videoId,
        maxResults: String(YOUTUBE_THREAD_PAGE_SIZE),
        pageToken: state.threadPageToken ?? undefined,
        textFormat: "plainText",
      },
    });
    const body = requiredRecord(response.body);
    const threads = requiredArrayField(
      body,
      "items",
      YOUTUBE_THREAD_PAGE_SIZE,
    ).map(record);
    const threadNextPageToken = optionalEnvelopeString(body, "nextPageToken");
    if (!threads.length) {
      return {
        candidates: [],
        nextCursor: threadNextPageToken
          ? encodeYouTubeThreadCursor(threadNextPageToken)
          : null,
      };
    }
    const thread = threads[0]!;
    const snippet = requiredRecordField(thread, "snippet");
    const topLevel = requiredRecordField(snippet, "topLevelComment");
    const totalReplyCount = requiredInteger(snippet, "totalReplyCount");
    const repliesEnvelope = optionalRecordField(thread, "replies");
    const embeddedReplies = repliesEnvelope
      ? optionalArrayField(repliesEnvelope, "comments", MAX_PAGE_SIZE).map(
          record,
        )
      : [];
    const topCandidate = youTubeCommentCandidate(topLevel, videoId);
    if (embeddedReplies.length < totalReplyCount) {
      const replyPage = await this.requestReplyPage(
        token,
        requiredString(topLevel, "id"),
      );
      const remainingReplies = remainingYouTubeReplies(
        totalReplyCount,
        replyPage,
      );
      return {
        candidates: [
          topCandidate,
          ...replyPage.comments.map((comment) =>
            youTubeCommentCandidate(comment, videoId),
          ),
        ],
        nextCursor: replyPage.nextPageToken
          ? encodeCursor({
              kind: "youtube-candidates",
              phase: "replies",
              parentId: requiredString(topLevel, "id"),
              replyPageToken: replyPage.nextPageToken,
              remainingReplies,
              threadPageToken: threadNextPageToken,
            })
          : threadNextPageToken
            ? encodeYouTubeThreadCursor(threadNextPageToken)
            : null,
      };
    }
    return {
      candidates: [
        topCandidate,
        ...embeddedReplies.map((comment) =>
          youTubeCommentCandidate(comment, videoId),
        ),
      ],
      nextCursor: threadNextPageToken
        ? encodeYouTubeThreadCursor(threadNextPageToken)
        : null,
    };
  }

  private async fetchReplyPage(
    token: string,
    videoId: string,
    state: YouTubeReplyCursor,
  ): Promise<ImportProviderCandidatePage> {
    const page = await this.requestReplyPage(
      token,
      state.parentId,
      state.replyPageToken,
    );
    const remainingReplies = remainingYouTubeReplies(
      state.remainingReplies,
      page,
    );
    return {
      candidates: page.comments.map((comment) =>
        youTubeCommentCandidate(comment, videoId),
      ),
      nextCursor: page.nextPageToken
        ? encodeCursor({
            ...state,
            replyPageToken: page.nextPageToken,
            remainingReplies,
          })
        : state.threadPageToken
          ? encodeYouTubeThreadCursor(state.threadPageToken)
          : null,
    };
  }

  private async requestReplyPage(
    token: string,
    parentId: string,
    pageToken?: string | null,
  ) {
    const response = await this.request({
      url: "https://www.googleapis.com/youtube/v3/comments",
      token,
      params: {
        part: "snippet",
        parentId,
        maxResults: String(MAX_PAGE_SIZE),
        pageToken: pageToken ?? undefined,
        textFormat: "plainText",
      },
    });
    const body = requiredRecord(response.body);
    return {
      comments: requiredArrayField(body, "items", MAX_PAGE_SIZE).map(record),
      nextPageToken: optionalEnvelopeString(body, "nextPageToken"),
    };
  }
}

@Injectable()
export class GoogleBusinessImportProvider extends BaseImportProvider {
  readonly sourceKey = "google-business" as const;

  async listResources(
    token: string,
    cursor?: string,
  ): Promise<ImportProviderResourcePage> {
    const state = decodeGoogleResourceCursor(cursor);
    const accounts = requiredRecord(
      (
        await this.request({
          url: "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
          token,
          params: {
            pageSize: String(GOOGLE_ACCOUNT_PAGE_SIZE),
            pageToken: state.accountPageToken ?? undefined,
          },
        })
      ).body,
    );
    const accountItems = requiredArrayField(
      accounts,
      "accounts",
      GOOGLE_ACCOUNT_PAGE_SIZE,
    ).map(record);
    const accountNextPageToken = optionalEnvelopeString(
      accounts,
      "nextPageToken",
    );
    if (!accountItems.length) {
      return {
        items: [],
        nextCursor: accountNextPageToken
          ? encodeCursor({
              kind: "google-resources",
              accountPageToken: accountNextPageToken,
              accountIndex: 0,
              locationPageToken: null,
            })
          : null,
      };
    }
    if (state.accountIndex >= accountItems.length) throw invalidCursor();
    const account = accountItems[state.accountIndex]!;
    const accountName = requiredString(account, "name");
    const locations = requiredRecord(
      (
        await this.request({
          url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
          token,
          params: {
            pageSize: String(GOOGLE_LOCATION_PAGE_SIZE),
            pageToken: state.locationPageToken ?? undefined,
            readMask: "name,title",
          },
        })
      ).body,
    );
    const locationItems = requiredArrayField(
      locations,
      "locations",
      GOOGLE_LOCATION_PAGE_SIZE,
    ).map(record);
    const locationNextPageToken = optionalEnvelopeString(
      locations,
      "nextPageToken",
    );
    return {
      items: locationItems.map((location) => {
        const locationName = requiredString(location, "name");
        return {
          id: `${accountName}/${locationName}`,
          label: `${optionalString(account, "accountName") ?? accountName} - ${optionalString(location, "title") ?? locationName}`,
          config: { accountName, locationName },
        };
      }),
      nextCursor: nextGoogleResourceCursor({
        state,
        accountCount: accountItems.length,
        accountNextPageToken,
        locationNextPageToken,
      }),
    };
  }

  async fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
  ): Promise<ImportProviderCandidatePage> {
    const accountName = requiredConfigString(config, "accountName");
    const locationName = requiredConfigString(config, "locationName");
    const response = await this.request({
      url: `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews`,
      token,
      params: {
        pageSize: String(GOOGLE_REVIEW_PAGE_SIZE),
        pageToken: cursor,
      },
    });
    const body = requiredRecord(response.body);
    return {
      candidates: requiredArrayField(body, "reviews", GOOGLE_REVIEW_PAGE_SIZE)
        .map(record)
        .flatMap(googleBusinessCandidate),
      nextCursor: optionalEnvelopeString(body, "nextPageToken"),
    };
  }
}

@Injectable()
export class GooglePlayImportProvider extends BaseImportProvider {
  readonly sourceKey = "google-play" as const;

  async listResources(
    token: string,
    cursor?: string,
  ): Promise<ImportProviderResourcePage> {
    const response = await this.request({
      url: "https://playdeveloperreporting.googleapis.com/v1beta1/apps:search",
      token,
      params: {
        pageSize: String(MAX_PAGE_SIZE),
        pageToken: cursor,
      },
    });
    const body = requiredRecord(response.body);
    return {
      items: requiredArrayField(body, "apps", MAX_PAGE_SIZE)
        .map(record)
        .flatMap((app) => {
          const packageName = optionalString(app, "packageName");
          if (!packageName) return [];
          return [
            {
              id: packageName,
              label:
                optionalString(app, "displayName") ??
                optionalString(app, "title") ??
                packageName,
              config: { packageName },
            },
          ];
        }),
      nextCursor: optionalEnvelopeString(body, "nextPageToken"),
    };
  }

  async fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
  ): Promise<ImportProviderCandidatePage> {
    const packageName = requiredConfigString(config, "packageName");
    const response = await this.request({
      url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/reviews`,
      token,
      params: {
        maxResults: String(MAX_PAGE_SIZE),
        token: cursor,
      },
    });
    const body = requiredRecord(response.body);
    const pagination = optionalRecordField(body, "tokenPagination");
    return {
      candidates: requiredArrayField(body, "reviews", MAX_PAGE_SIZE)
        .map(record)
        .flatMap((review) => googlePlayCandidate(review, packageName)),
      nextCursor: pagination
        ? optionalEnvelopeString(pagination, "nextPageToken")
        : null,
    };
  }
}

type GoogleResourceCursor = {
  kind: "google-resources";
  accountPageToken: string | null;
  accountIndex: number;
  locationPageToken: string | null;
};

type YouTubeResourceCursor = {
  kind: "youtube-resources";
  channelPageToken: string | null;
  channelIndex: number;
  playlistPageToken: string | null;
};

type YouTubeThreadCursor = {
  kind: "youtube-candidates";
  phase: "threads";
  threadPageToken: string | null;
};

type YouTubeReplyCursor = {
  kind: "youtube-candidates";
  phase: "replies";
  parentId: string;
  replyPageToken: string;
  remainingReplies: number;
  threadPageToken: string | null;
};

type YouTubeCandidateCursor = YouTubeThreadCursor | YouTubeReplyCursor;

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

function nextYouTubeResourceCursor({
  state,
  channelCount,
  channelNextPageToken,
  playlistNextPageToken,
}: {
  state: YouTubeResourceCursor;
  channelCount: number;
  channelNextPageToken: string | null;
  playlistNextPageToken: string | null;
}) {
  if (playlistNextPageToken) {
    return encodeCursor({ ...state, playlistPageToken: playlistNextPageToken });
  }
  if (state.channelIndex + 1 < channelCount) {
    return encodeCursor({
      ...state,
      channelIndex: state.channelIndex + 1,
      playlistPageToken: null,
    });
  }
  return channelNextPageToken
    ? encodeCursor({
        kind: "youtube-resources",
        channelPageToken: channelNextPageToken,
        channelIndex: 0,
        playlistPageToken: null,
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
  if (
    value.kind !== "google-resources" ||
    !isOptionalCursorString(value.accountPageToken) ||
    !isCursorIndex(value.accountIndex) ||
    !isOptionalCursorString(value.locationPageToken)
  ) {
    throw invalidCursor();
  }
  return value as GoogleResourceCursor;
}

function decodeYouTubeResourceCursor(cursor?: string): YouTubeResourceCursor {
  if (!cursor) {
    return {
      kind: "youtube-resources",
      channelPageToken: null,
      channelIndex: 0,
      playlistPageToken: null,
    };
  }
  const value = decodeCursor(cursor);
  if (
    value.kind !== "youtube-resources" ||
    !isOptionalCursorString(value.channelPageToken) ||
    !isCursorIndex(value.channelIndex) ||
    !isOptionalCursorString(value.playlistPageToken)
  ) {
    throw invalidCursor();
  }
  return value as YouTubeResourceCursor;
}

function decodeYouTubeCandidateCursor(cursor?: string): YouTubeCandidateCursor {
  if (!cursor) {
    return {
      kind: "youtube-candidates",
      phase: "threads",
      threadPageToken: null,
    };
  }
  const value = decodeCursor(cursor);
  if (
    value.kind !== "youtube-candidates" ||
    !isOptionalCursorString(value.threadPageToken)
  ) {
    throw invalidCursor();
  }
  if (value.phase === "threads") return value as YouTubeThreadCursor;
  if (
    value.phase === "replies" &&
    isCursorString(value.parentId) &&
    isCursorString(value.replyPageToken) &&
    isPositiveSafeInteger(value.remainingReplies)
  ) {
    return value as YouTubeReplyCursor;
  }
  throw invalidCursor();
}

function encodeYouTubeThreadCursor(threadPageToken: string) {
  return encodeCursor({
    kind: "youtube-candidates",
    phase: "threads",
    threadPageToken,
  });
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

function remainingYouTubeReplies(
  expected: number,
  page: { comments: Record<string, unknown>[]; nextPageToken: string | null },
) {
  const remaining = expected - page.comments.length;
  if (
    remaining < 0 ||
    (page.nextPageToken !== null && page.comments.length === 0) ||
    (page.nextPageToken !== null && remaining <= 0) ||
    (page.nextPageToken === null && remaining !== 0)
  ) {
    throw invalidProviderResponse();
  }
  return remaining;
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

function linkedInCandidate(post: Record<string, unknown>): ImportCandidate[] {
  const id = optionalString(post, "id");
  const commentary =
    optionalString(record(post.commentary), "text") ??
    optionalString(post, "commentary");
  if (!id || !commentary) return [];
  return [
    {
      externalId: id,
      sourceUrl:
        optionalString(post, "permalink") ??
        `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}`,
      sourceCreatedAt: providerTimestamp(post, "createdAt"),
      text: commentary,
      ratingValue: null,
      ratingScale: null,
      authorName: null,
      authorRole: null,
      authorCompany: null,
      tags: [],
    },
  ];
}

function linkedInStartCursor(cursor?: string) {
  if (cursor === undefined) return "0";
  if (!/^\d+$/.test(cursor)) throw invalidCursor();
  const value = Number(cursor);
  if (!Number.isSafeInteger(value) || value < 0) throw invalidCursor();
  return String(value);
}

function linkedInNextStartCursor(paging: Record<string, unknown>) {
  const links = optionalArrayField(paging, "links", 10).map(record);
  const next = links.find((link) => optionalString(link, "rel") === "next");
  if (!next) return null;
  const href = requiredString(next, "href");
  let target: URL;
  try {
    target = new URL(href, "https://api.linkedin.com");
  } catch {
    throw invalidProviderResponse();
  }
  if (
    target.origin !== "https://api.linkedin.com" ||
    target.pathname !== "/rest/posts"
  ) {
    throw invalidProviderResponse();
  }
  const start = target.searchParams.get("start");
  if (start === null) throw invalidProviderResponse();
  try {
    return linkedInStartCursor(start);
  } catch {
    throw invalidProviderResponse();
  }
}

function providerTimestamp(value: Record<string, unknown>, key: string) {
  const timestamp = value[key];
  if (timestamp === undefined || timestamp === null) return null;
  if (typeof timestamp === "string") {
    const normalized = timestamp.trim();
    if (normalized && normalized.length <= 100) return normalized;
  }
  if (
    typeof timestamp === "number" &&
    Number.isSafeInteger(timestamp) &&
    timestamp >= 0
  ) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
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

function googlePlayCandidate(
  review: Record<string, unknown>,
  packageName: string,
): ImportCandidate[] {
  const id = optionalString(review, "reviewId");
  if (!id) return [];
  const comment = optionalArrayField(review, "comments", MAX_PAGE_SIZE)
    .map(record)
    .map((value) => optionalRecordField(value, "userComment"))
    .find((value): value is Record<string, unknown> => value !== null);
  if (!comment) return [];
  const text = optionalString(comment, "text");
  if (!text) return [];
  const rating = optionalInteger(comment, "starRating");
  if (rating !== null && (rating < 1 || rating > 5)) {
    throw invalidProviderResponse();
  }
  return [
    {
      externalId: id,
      sourceUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&reviewId=${encodeURIComponent(id)}`,
      sourceCreatedAt: googlePlayTimestamp(comment),
      text,
      ratingValue: rating,
      ratingScale: rating === null ? null : 5,
      authorName: optionalString(review, "authorName"),
      authorRole: null,
      authorCompany: null,
      tags: [],
    },
  ];
}

function googlePlayTimestamp(comment: Record<string, unknown>) {
  const lastModified = optionalRecordField(comment, "lastModified");
  if (!lastModified) return null;
  const seconds = lastModified.seconds;
  const numericSeconds =
    typeof seconds === "string" && /^\d+$/.test(seconds)
      ? Number(seconds)
      : typeof seconds === "number"
        ? seconds
        : NaN;
  if (!Number.isSafeInteger(numericSeconds) || numericSeconds < 0) {
    throw invalidProviderResponse();
  }
  const date = new Date(numericSeconds * 1000);
  if (!Number.isFinite(date.valueOf())) throw invalidProviderResponse();
  return date.toISOString();
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

async function discardResponse(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // Status and headers are sufficient for sanitized provider classification.
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
    await discardResponse(response);
    throw new ImportProviderError(
      "PROVIDER_INVALID_RESPONSE",
      "Provider response exceeded the allowed size.",
    );
  }
  const reader = response.body?.getReader();
  if (!reader) return null;
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new ImportProviderError(
        "PROVIDER_INVALID_RESPONSE",
        "Provider response exceeded the allowed size.",
      );
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(concat(chunks, size));
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ImportProviderError(
      "PROVIDER_INVALID_RESPONSE",
      "Provider returned an invalid response.",
    );
  }
}

function concat(chunks: Uint8Array[], size: number) {
  const value = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    value.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return value;
}
function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function requiredRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw invalidProviderResponse();
}
function requiredRecordField(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return requiredRecord(value[key]);
}
function optionalRecordField(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  if (value[key] === undefined || value[key] === null) return null;
  return requiredRecord(value[key]);
}
function requiredArrayField(
  value: Record<string, unknown>,
  key: string,
  maxLength: number,
): unknown[] {
  const result = value[key];
  if (!Array.isArray(result) || result.length > maxLength) {
    throw invalidProviderResponse();
  }
  return result;
}
function optionalArrayField(
  value: Record<string, unknown>,
  key: string,
  maxLength: number,
): unknown[] {
  if (value[key] === undefined || value[key] === null) return [];
  return requiredArrayField(value, key, maxLength);
}
function optionalEnvelopeString(value: Record<string, unknown>, key: string) {
  const result = value[key];
  if (result === undefined || result === null) return null;
  if (typeof result !== "string" || !result.trim() || result.length > 2048) {
    throw invalidProviderResponse();
  }
  return result;
}
function requiredInteger(value: Record<string, unknown>, key: string) {
  const result = value[key];
  if (
    typeof result !== "number" ||
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw invalidProviderResponse();
  }
  return result;
}
function optionalInteger(value: Record<string, unknown>, key: string) {
  const result = value[key];
  if (result === undefined || result === null) return null;
  if (typeof result !== "number" || !Number.isSafeInteger(result)) {
    throw invalidProviderResponse();
  }
  return result;
}
function invalidProviderResponse() {
  return new ImportProviderError(
    "PROVIDER_INVALID_RESPONSE",
    "Provider returned an invalid response.",
  );
}
function optionalString(value: Record<string, unknown>, key: string) {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim().slice(0, 10_000)
    : null;
}
function requiredString(value: Record<string, unknown>, key: string) {
  const result = optionalString(value, key);
  if (!result)
    throw new ImportProviderError(
      "PROVIDER_INVALID_RESPONSE",
      "Provider returned an invalid response.",
    );
  return result;
}
function optionalConfigString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 512)
    : null;
}
function requiredConfigString(config: Record<string, unknown>, key: string) {
  const result = optionalConfigString(config, key);
  if (!result)
    throw new ImportProviderError(
      "PROVIDER_INVALID_CONFIGURATION",
      "Provider configuration is invalid.",
    );
  return result;
}
function stringArray(value: unknown, max: number) {
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
function integer(value: unknown, key: string) {
  const result = record(value)[key];
  return typeof result === "number" &&
    Number.isSafeInteger(result) &&
    result >= 0
    ? result
    : null;
}
function linkedInHeaders() {
  return { "Linkedin-Version": "202601", "X-Restli-Protocol-Version": "2.0.0" };
}
