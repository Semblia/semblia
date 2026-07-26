import {
  decodeCursor,
  encodeCursor,
  invalidCursor,
  invalidProviderResponse,
  isCursorIndex,
  isCursorString,
  isOptionalCursorString,
  isPositiveSafeInteger,
  MAX_PAGE_SIZE,
  optionalArrayField,
  optionalEnvelopeString,
  optionalRecordField,
  optionalString,
  record,
  requiredArrayField,
  requiredConfigString,
  requiredInteger,
  requiredRecord,
  requiredRecordField,
  requiredString,
  type ImportProviderCandidatePage,
  type ImportProviderHttpClient,
  type ImportProviderHttpResponse,
  type ImportProviderResourcePage,
  YOUTUBE_RESOURCE_PAGE_SIZE,
  YOUTUBE_THREAD_PAGE_SIZE,
  youTubeCommentCandidate,
} from "./official-import-providers.js";

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
  threadIndex: number;
};

type YouTubeReplyCursor = Omit<YouTubeThreadCursor, "phase"> & {
  phase: "replies";
  parentId: string;
  replyPageToken: string;
  remainingReplies: number;
  terminal: boolean;
};

type YouTubeCandidateCursor = YouTubeThreadCursor | YouTubeReplyCursor;

export class YouTubeImportProviderOperations {
  constructor(
    private readonly request: (
      input: Parameters<ImportProviderHttpClient["getJson"]>[0],
    ) => Promise<ImportProviderHttpResponse>,
  ) {}

  async listResources(
    token: string,
    cursor?: string,
  ): Promise<ImportProviderResourcePage> {
    const state = decodeYouTubeResourceCursor(cursor);
    const channelsBody = requiredRecord(
      (
        await this.request({
          url: "https://www.googleapis.com/youtube/v3/channels",
          token,
          params: {
            part: "snippet,contentDetails",
            mine: "true",
            maxResults: String(YOUTUBE_RESOURCE_PAGE_SIZE),
            pageToken: state.channelPageToken ?? undefined,
          },
        })
      ).body,
    );
    const channels = requiredArrayField(
      channelsBody,
      "items",
      YOUTUBE_RESOURCE_PAGE_SIZE,
    ).map(record);
    const channelNextPageToken = optionalEnvelopeString(
      channelsBody,
      "nextPageToken",
    );
    if (!channels.length) return emptyResourcesCursor(channelNextPageToken);
    if (state.channelIndex >= channels.length) throw invalidCursor();

    const channel = channels[state.channelIndex]!;
    const uploadsPlaylistId = requiredString(
      requiredRecordField(
        requiredRecordField(channel, "contentDetails"),
        "relatedPlaylists",
      ),
      "uploads",
    );
    const playlistBody = requiredRecord(
      (
        await this.request({
          url: "https://www.googleapis.com/youtube/v3/playlistItems",
          token,
          params: {
            part: "snippet",
            playlistId: uploadsPlaylistId,
            maxResults: String(YOUTUBE_RESOURCE_PAGE_SIZE),
            pageToken: state.playlistPageToken ?? undefined,
          },
        })
      ).body,
    );
    const videos = requiredArrayField(
      playlistBody,
      "items",
      YOUTUBE_RESOURCE_PAGE_SIZE,
    ).map(record);
    return {
      items: videos.map(videoResource),
      nextCursor: nextYouTubeResourceCursor({
        state,
        channelCount: channels.length,
        channelNextPageToken,
        playlistNextPageToken: optionalEnvelopeString(
          playlistBody,
          "nextPageToken",
        ),
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
    if (state.phase === "replies")
      return this.fetchReplyPage({ token, videoId, state });

    const body = requiredRecord(
      (
        await this.request({
          url: "https://www.googleapis.com/youtube/v3/commentThreads",
          token,
          params: {
            part: "snippet,replies",
            videoId,
            maxResults: String(YOUTUBE_THREAD_PAGE_SIZE),
            pageToken: state.threadPageToken ?? undefined,
            textFormat: "plainText",
          },
        })
      ).body,
    );
    const threads = requiredArrayField(
      body,
      "items",
      YOUTUBE_THREAD_PAGE_SIZE,
    ).map(record);
    const nextPageToken = optionalEnvelopeString(body, "nextPageToken");
    if (!threads.length) return emptyThreadCursor(nextPageToken);
    if (state.threadIndex >= threads.length) throw invalidCursor();
    return this.threadCandidates({
      token,
      videoId,
      state,
      threads,
      nextPageToken,
    });
  }

  private async threadCandidates(input: {
    token: string;
    videoId: string;
    state: YouTubeThreadCursor;
    threads: Record<string, unknown>[];
    nextPageToken: string | null;
  }): Promise<ImportProviderCandidatePage> {
    const thread = input.threads[input.state.threadIndex]!;
    const snippet = requiredRecordField(thread, "snippet");
    const topLevel = requiredRecordField(snippet, "topLevelComment");
    const totalReplyCount = requiredInteger(snippet, "totalReplyCount");
    const replies = optionalRecordField(thread, "replies");
    const embeddedReplies = replies
      ? optionalArrayField(replies, "comments", MAX_PAGE_SIZE).map(record)
      : [];
    const topCandidate = youTubeCommentCandidate(topLevel, input.videoId);
    if (embeddedReplies.length >= totalReplyCount) {
      return {
        candidates: [
          topCandidate,
          ...embeddedReplies.map((comment) =>
            youTubeCommentCandidate(comment, input.videoId),
          ),
        ],
        nextCursor: encodeNextYouTubeThreadCursor(
          input.state,
          input.threads.length,
          input.nextPageToken,
        ),
      };
    }
    const parentId = requiredString(topLevel, "id");
    const page = await this.requestReplyPage({ token: input.token, parentId });
    const remainingReplies = remainingYouTubeReplies(totalReplyCount, page);
    return {
      candidates: [
        topCandidate,
        ...page.comments.map((comment) =>
          youTubeCommentCandidate(comment, input.videoId),
        ),
      ],
      nextCursor: page.nextPageToken
        ? encodeCursor({
            kind: "youtube-candidates",
            phase: "replies",
            parentId,
            replyPageToken: page.nextPageToken,
            remainingReplies,
            ...nextYouTubeThreadState(
              input.state,
              input.threads.length,
              input.nextPageToken,
            ),
          })
        : encodeNextYouTubeThreadCursor(
            input.state,
            input.threads.length,
            input.nextPageToken,
          ),
    };
  }

  private async fetchReplyPage(input: {
    token: string;
    videoId: string;
    state: YouTubeReplyCursor;
  }): Promise<ImportProviderCandidatePage> {
    const page = await this.requestReplyPage({
      token: input.token,
      parentId: input.state.parentId,
      pageToken: input.state.replyPageToken,
    });
    const remainingReplies = remainingYouTubeReplies(
      input.state.remainingReplies,
      page,
    );
    return {
      candidates: page.comments.map((comment) =>
        youTubeCommentCandidate(comment, input.videoId),
      ),
      nextCursor: page.nextPageToken
        ? encodeCursor({
            ...input.state,
            replyPageToken: page.nextPageToken,
            remainingReplies,
          })
        : input.state.terminal
          ? null
          : encodeYouTubeThreadCursor(input.state),
    };
  }

  private async requestReplyPage(input: {
    token: string;
    parentId: string;
    pageToken?: string | null;
  }) {
    const body = requiredRecord(
      (
        await this.request({
          url: "https://www.googleapis.com/youtube/v3/comments",
          token: input.token,
          params: {
            part: "snippet",
            parentId: input.parentId,
            maxResults: String(MAX_PAGE_SIZE),
            pageToken: input.pageToken ?? undefined,
            textFormat: "plainText",
          },
        })
      ).body,
    );
    return {
      comments: requiredArrayField(body, "items", MAX_PAGE_SIZE).map(record),
      nextPageToken: optionalEnvelopeString(body, "nextPageToken"),
    };
  }
}

function videoResource(video: Record<string, unknown>) {
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
}

function emptyResourcesCursor(
  nextPageToken: string | null,
): ImportProviderResourcePage {
  return {
    items: [],
    nextCursor: nextPageToken
      ? encodeCursor({
          kind: "youtube-resources",
          channelPageToken: nextPageToken,
          channelIndex: 0,
          playlistPageToken: null,
        })
      : null,
  };
}

function emptyThreadCursor(
  nextPageToken: string | null,
): ImportProviderCandidatePage {
  return {
    candidates: [],
    nextCursor: nextPageToken
      ? encodeYouTubeThreadCursor({
          threadPageToken: nextPageToken,
          threadIndex: 0,
        })
      : null,
  };
}

function nextYouTubeResourceCursor(input: {
  state: YouTubeResourceCursor;
  channelCount: number;
  channelNextPageToken: string | null;
  playlistNextPageToken: string | null;
}) {
  if (input.playlistNextPageToken)
    return encodeCursor({
      ...input.state,
      playlistPageToken: input.playlistNextPageToken,
    });
  if (input.state.channelIndex + 1 < input.channelCount)
    return encodeCursor({
      ...input.state,
      channelIndex: input.state.channelIndex + 1,
      playlistPageToken: null,
    });
  return input.channelNextPageToken
    ? encodeCursor({
        kind: "youtube-resources",
        channelPageToken: input.channelNextPageToken,
        channelIndex: 0,
        playlistPageToken: null,
      })
    : null;
}

function decodeYouTubeResourceCursor(cursor?: string): YouTubeResourceCursor {
  if (!cursor)
    return {
      kind: "youtube-resources",
      channelPageToken: null,
      channelIndex: 0,
      playlistPageToken: null,
    };
  const value = decodeCursor(cursor);
  if (
    value.kind !== "youtube-resources" ||
    !isOptionalCursorString(value.channelPageToken) ||
    !isCursorIndex(value.channelIndex) ||
    !isOptionalCursorString(value.playlistPageToken)
  )
    throw invalidCursor();
  return value as YouTubeResourceCursor;
}

function decodeYouTubeCandidateCursor(cursor?: string): YouTubeCandidateCursor {
  if (!cursor)
    return {
      kind: "youtube-candidates",
      phase: "threads",
      threadPageToken: null,
      threadIndex: 0,
    };
  const value = decodeCursor(cursor);
  const threadIndex = value.threadIndex === undefined ? 0 : value.threadIndex;
  if (
    value.kind !== "youtube-candidates" ||
    !isOptionalCursorString(value.threadPageToken) ||
    !isCursorIndex(threadIndex)
  )
    throw invalidCursor();
  if (value.phase === "threads")
    return { ...value, threadIndex } as YouTubeThreadCursor;
  if (
    value.phase === "replies" &&
    isCursorString(value.parentId) &&
    isCursorString(value.replyPageToken) &&
    isPositiveSafeInteger(value.remainingReplies) &&
    (value.terminal === undefined || typeof value.terminal === "boolean")
  ) {
    return {
      ...value,
      threadIndex,
      terminal:
        typeof value.terminal === "boolean"
          ? value.terminal
          : value.threadPageToken === null && threadIndex === 0,
    } as YouTubeReplyCursor;
  }
  throw invalidCursor();
}

function nextYouTubeThreadState(
  state: YouTubeThreadCursor,
  threadCount: number,
  nextPageToken: string | null,
) {
  return state.threadIndex + 1 < threadCount
    ? {
        threadPageToken: state.threadPageToken,
        threadIndex: state.threadIndex + 1,
        terminal: false,
      }
    : {
        threadPageToken: nextPageToken,
        threadIndex: 0,
        terminal: nextPageToken === null,
      };
}

function encodeNextYouTubeThreadCursor(
  state: YouTubeThreadCursor,
  threadCount: number,
  nextPageToken: string | null,
) {
  const next = nextYouTubeThreadState(state, threadCount, nextPageToken);
  return state.threadIndex + 1 < threadCount || nextPageToken !== null
    ? encodeYouTubeThreadCursor(next)
    : null;
}

function encodeYouTubeThreadCursor(
  state: Pick<YouTubeThreadCursor, "threadPageToken" | "threadIndex">,
) {
  return encodeCursor({
    kind: "youtube-candidates",
    phase: "threads",
    threadPageToken: state.threadPageToken,
    threadIndex: state.threadIndex,
  });
}

function remainingYouTubeReplies(
  expected: number,
  page: { comments: Record<string, unknown>[]; nextPageToken: string | null },
) {
  const remaining = expected - page.comments.length;
  const nextPageIsInconsistent =
    page.nextPageToken !== null &&
    (page.comments.length === 0 || remaining <= 0);
  if (
    remaining < 0 ||
    nextPageIsInconsistent ||
    (page.nextPageToken === null && remaining !== 0)
  )
    throw invalidProviderResponse();
  return remaining;
}
