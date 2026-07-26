import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BoundedImportProviderHttpClient,
  GoogleBusinessImportProvider,
  GooglePlayImportProvider,
  LinkedInImportProvider,
  ProviderHttpError,
  XImportProvider,
  YouTubeImportProvider,
  type ImportProviderHttpClient,
  type ImportProviderHttpResponse,
} from "./official-import-providers.js";

const token = "provider-token";
const http = (responses: unknown[]): ImportProviderHttpClient => ({
  getJson: vi.fn(async () => responses.shift() as ImportProviderHttpResponse),
});

function youtubeThread(input: {
  id: string;
  html: string;
  plain: string;
  totalReplyCount?: number;
  replies?: ReturnType<typeof comment>[];
}) {
  return {
    snippet: {
      topLevelComment: comment(input.id, input.html, input.plain),
      totalReplyCount: input.totalReplyCount ?? 0,
    },
    ...(input.replies ? { replies: { comments: input.replies } } : {}),
  };
}

type YouTubeCandidatePage = Awaited<
  ReturnType<YouTubeImportProvider["fetchCandidates"]>
>;

function expectYouTubeReplyPaging(input: {
  client: ImportProviderHttpClient;
  first: YouTubeCandidatePage;
  second: YouTubeCandidatePage;
  third: YouTubeCandidatePage;
}) {
  expect(input.first.candidates.map(({ externalId }) => externalId)).toEqual([
    "comment-1",
    "reply-1",
    "reply-2",
  ]);
  expect(input.first.candidates.map(({ text }) => text)).toEqual([
    "Great & useful",
    "First reply",
    "Second reply",
  ]);
  expect(input.second.candidates.map(({ externalId }) => externalId)).toEqual([
    "reply-3",
  ]);
  expect(input.third.candidates.map(({ externalId }) => externalId)).toEqual([
    "comment-2",
  ]);
  expect(input.third.nextCursor).toBeNull();
  expect(input.client.getJson).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      url: "https://www.googleapis.com/youtube/v3/commentThreads",
      params: expect.objectContaining({
        maxResults: "100",
        textFormat: "plainText",
        videoId: "video-1",
      }),
    }),
  );
  expect(input.client.getJson).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      url: "https://www.googleapis.com/youtube/v3/comments",
      params: {
        maxResults: "100",
        pageToken: undefined,
        parentId: "comment-1",
        part: "snippet",
        textFormat: "plainText",
      },
    }),
  );
  expect(input.client.getJson).toHaveBeenNthCalledWith(
    3,
    expect.objectContaining({
      params: expect.objectContaining({ pageToken: "replies-next" }),
    }),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("official inbound import providers", () => {
  it("maps X expansions and carries the API cursor", async () => {
    const client = http([
      ok({
        data: [
          {
            id: "tweet-1",
            text: "Excellent product",
            author_id: "u1",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        includes: {
          users: [{ id: "u1", name: "Ada", username: "ada" }],
        },
        meta: { next_token: "next-page" },
      }),
    ]);

    await expect(
      new XImportProvider(client).fetchCandidates(
        token,
        { userId: "u1" },
        "previous-page",
      ),
    ).resolves.toMatchObject({
      nextCursor: "next-page",
      candidates: [
        expect.objectContaining({
          externalId: "tweet-1",
          authorName: "Ada",
          sourceUrl: "https://x.com/ada/status/tweet-1",
        }),
      ],
    });
    expect(client.getJson).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.x.com/2/users/u1/tweets",
        params: expect.objectContaining({
          pagination_token: "previous-page",
          max_results: "100",
        }),
      }),
    );
  });

  it("lists LinkedIn approved-member posts and classifies 403 as reauthorization", async () => {
    const resourcesClient = http([
      ok({
        sub: "1",
        name: "Ada Lovelace",
      }),
    ]);
    await expect(
      new LinkedInImportProvider(resourcesClient).listResources(token),
    ).resolves.toMatchObject({
      items: [{ id: "urn:li:person:1", label: "Ada Lovelace" }],
    });
    expect(resourcesClient.getJson).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://api.linkedin.com/v2/userinfo" }),
    );
    await expect(
      new LinkedInImportProvider(
        http([
          {
            status: 403,
            headers: {},
            body: { message: "not allowed", access_token: "must-not-leak" },
          },
        ]),
      ).fetchCandidates(token, { authorUrn: "urn:li:person:1" }),
    ).rejects.toMatchObject({
      code: "REAUTHORIZATION_REQUIRED",
      message: "Provider authorization needs to be renewed.",
    });
  });

  it("uses the LinkedIn author finder and follows paging links with epoch dates", async () => {
    const client = http([
      ok({
        elements: [
          {
            id: "urn:li:share:1",
            commentary: "A reliable product",
            createdAt: 1_636_669_884_769,
          },
        ],
        paging: {
          start: 0,
          count: 100,
          links: [
            {
              rel: "next",
              href: "https://api.linkedin.com/rest/posts?q=author&author=urn%3Ali%3Aperson%3A1&start=25&count=100",
            },
          ],
        },
      }),
    ]);

    const page = await new LinkedInImportProvider(client).fetchCandidates(
      token,
      { authorName: "Ada Lovelace", authorUrn: "urn:li:person:1" },
      "0",
    );

    expect(page).toMatchObject({
      nextCursor: "25",
      candidates: [
        expect.objectContaining({
          externalId: "urn:li:share:1",
          authorName: "Ada Lovelace",
          sourceCreatedAt: "2021-11-11T22:31:24.769Z",
        }),
      ],
    });
    expect(client.getJson).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.linkedin.com/rest/posts",
        headers: expect.objectContaining({
          "X-RestLi-Method": "FINDER",
        }),
        params: {
          author: "urn:li:person:1",
          count: "100",
          q: "author",
          start: "0",
        },
      }),
    );
  });

  it("requires an X user for timelines and accepts documented empty pages", async () => {
    const client = http([
      ok({ meta: { result_count: 0, next_token: "empty-next" } }),
    ]);
    const provider = new XImportProvider(client);

    await expect(provider.fetchCandidates(token, {})).rejects.toMatchObject({
      code: "PROVIDER_INVALID_CONFIGURATION",
    });
    await expect(
      provider.fetchCandidates(token, { userId: "user-1" }),
    ).resolves.toEqual({ candidates: [], nextCursor: "empty-next" });
    expect(client.getJson).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.x.com/2/users/user-1/tweets",
      }),
    );
  });

  it("discovers directly importable YouTube videos through the uploads playlist", async () => {
    const client = http([
      ok({
        items: [
          {
            id: "channel-1",
            snippet: { title: "Ada's channel" },
            contentDetails: { relatedPlaylists: { uploads: "uploads-1" } },
          },
        ],
      }),
      ok({
        items: [
          {
            snippet: {
              title: "Customer stories",
              resourceId: { videoId: "video-1" },
            },
          },
        ],
        nextPageToken: "videos-next",
      }),
    ]);

    const page = await new YouTubeImportProvider(client).listResources(token);

    expect(page.items).toEqual([
      {
        id: "video-1",
        label: "Customer stories",
        config: { videoId: "video-1" },
      },
    ]);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(client.getJson).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: "https://www.googleapis.com/youtube/v3/channels",
        params: expect.objectContaining({
          part: "snippet,contentDetails",
          mine: "true",
          maxResults: "50",
        }),
      }),
    );
    expect(client.getJson).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: "https://www.googleapis.com/youtube/v3/playlistItems",
        params: expect.objectContaining({
          part: "snippet",
          playlistId: "uploads-1",
          maxResults: "50",
        }),
      }),
    );
  });

  it("fetches every YouTube reply with bounded cursors and plain text", async () => {
    const client = http([
      ok({
        items: [
          youtubeThread({
            id: "comment-1",
            html: "<b>Great</b>",
            plain: "Great & useful",
            totalReplyCount: 3,
            replies: [comment("reply-embedded", "<i>Embedded</i>", "Embedded")],
          }),
        ],
        nextPageToken: "threads-next",
      }),
      ok({
        items: [
          comment("reply-1", "<b>First</b>", "First reply"),
          comment("reply-2", "<b>Second</b>", "Second reply"),
        ],
        nextPageToken: "replies-next",
      }),
      ok({
        items: [comment("reply-3", "<b>Third</b>", "Third reply")],
      }),
      ok({
        items: [
          youtubeThread({
            id: "comment-2",
            html: "<b>Next</b>",
            plain: "Next thread",
          }),
        ],
      }),
    ]);
    const provider = new YouTubeImportProvider(client);
    const first = await provider.fetchCandidates(token, { videoId: "video-1" });
    const second = await provider.fetchCandidates(
      token,
      { videoId: "video-1" },
      first.nextCursor!,
    );
    const third = await provider.fetchCandidates(
      token,
      { videoId: "video-1" },
      second.nextCursor!,
    );

    expectYouTubeReplyPaging({ client, first, second, third });
  });

  it("resumes YouTube threads within a full API page without skips or duplicates", async () => {
    const client = http([
      ok({
        items: [
          youtubeThread({ id: "comment-1", html: "One", plain: "One" }),
          youtubeThread({ id: "comment-2", html: "Two", plain: "Two" }),
        ],
        nextPageToken: "threads-next",
      }),
      ok({
        items: [
          youtubeThread({ id: "comment-1", html: "One", plain: "One" }),
          youtubeThread({ id: "comment-2", html: "Two", plain: "Two" }),
        ],
        nextPageToken: "threads-next",
      }),
      ok({
        items: [
          youtubeThread({ id: "comment-3", html: "Three", plain: "Three" }),
        ],
      }),
    ]);
    const provider = new YouTubeImportProvider(client);
    const first = await provider.fetchCandidates(token, { videoId: "video-1" });
    const second = await provider.fetchCandidates(
      token,
      { videoId: "video-1" },
      first.nextCursor!,
    );
    const third = await provider.fetchCandidates(
      token,
      { videoId: "video-1" },
      second.nextCursor!,
    );

    expect(
      [first, second, third].flatMap(({ candidates }) =>
        candidates.map(({ externalId }) => externalId),
      ),
    ).toEqual(["comment-1", "comment-2", "comment-3"]);
    expect(third.nextCursor).toBeNull();
    expect(client.getJson).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: "https://www.googleapis.com/youtube/v3/commentThreads",
        params: expect.objectContaining({
          maxResults: "100",
          pageToken: undefined,
        }),
      }),
    );
    expect(client.getJson).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        params: expect.objectContaining({
          maxResults: "100",
          pageToken: "threads-next",
        }),
      }),
    );
  });

  it("continues pre-index YouTube reply cursors", async () => {
    const legacyCursor = Buffer.from(
      JSON.stringify({
        kind: "youtube-candidates",
        phase: "replies",
        parentId: "comment-1",
        replyPageToken: "replies-next",
        remainingReplies: 1,
        threadPageToken: "threads-next",
      }),
      "utf8",
    ).toString("base64url");
    const provider = new YouTubeImportProvider(
      http([ok({ items: [comment("reply-3", "Third", "Third reply")] })]),
    );

    await expect(
      provider.fetchCandidates(token, { videoId: "video-1" }, legacyCursor),
    ).resolves.toMatchObject({
      candidates: [expect.objectContaining({ externalId: "reply-3" })],
    });
  });

  it("finishes a final multi-page YouTube reply thread without restarting it", async () => {
    const firstReplyPage = Array.from({ length: 100 }, (_, index) =>
      comment(`reply-${index + 1}`, `Reply ${index + 1}`, `Reply ${index + 1}`),
    );
    const provider = new YouTubeImportProvider(
      http([
        ok({
          items: [
            {
              snippet: {
                topLevelComment: comment("comment-1", "Top", "Final thread"),
                totalReplyCount: 101,
              },
            },
          ],
        }),
        ok({ items: firstReplyPage, nextPageToken: "last-reply-page" }),
        ok({ items: [comment("reply-101", "Last", "Last reply")] }),
      ]),
    );

    const first = await provider.fetchCandidates(token, {
      videoId: "video-1",
    });
    const second = await provider.fetchCandidates(
      token,
      { videoId: "video-1" },
      first.nextCursor!,
    );

    expect(first.candidates).toHaveLength(101);
    expect(second.candidates.map(({ externalId }) => externalId)).toEqual([
      "reply-101",
    ]);
    expect(second.nextCursor).toBeNull();
  });

  it("treats YouTube totalReplyCount as advisory when a valid final page is short", async () => {
    const provider = new YouTubeImportProvider(
      http([
        ok({
          items: [
            {
              snippet: {
                topLevelComment: comment("comment-1", "Top", "Top level"),
                totalReplyCount: 2,
              },
            },
          ],
        }),
        ok({ items: [comment("reply-1", "Reply", "Only reply returned")] }),
      ]),
    );

    await expect(
      provider.fetchCandidates(token, { videoId: "video-1" }),
    ).resolves.toMatchObject({
      candidates: [
        expect.objectContaining({ externalId: "comment-1" }),
        expect.objectContaining({ externalId: "reply-1" }),
      ],
      nextCursor: null,
    });
  });

  it("follows a YouTube reply token after the advisory count is reached", async () => {
    const client = http([
      ok({
        items: [
          {
            snippet: {
              topLevelComment: comment("comment-1", "Top", "Top level"),
              totalReplyCount: 1,
            },
          },
        ],
      }),
      ok({
        items: [comment("reply-1", "Reply", "The only reply")],
        nextPageToken: "reply-page-2",
      }),
      ok({ items: [comment("reply-2", "Later", "A later reply")] }),
    ]);
    const provider = new YouTubeImportProvider(client);
    const first = await provider.fetchCandidates(token, { videoId: "video-1" });
    const second = await provider.fetchCandidates(
      token,
      { videoId: "video-1" },
      first.nextCursor!,
    );

    expect(second).toMatchObject({
      candidates: [expect.objectContaining({ externalId: "reply-2" })],
      nextCursor: null,
    });
    expect(client.getJson).toHaveBeenCalledTimes(3);
  });

  it("resumes a zero-remaining YouTube reply cursor when the API supplies another page", async () => {
    const client = http([
      ok({
        items: [
          {
            snippet: {
              topLevelComment: comment("comment-1", "Top", "Top level"),
              totalReplyCount: 2,
            },
          },
        ],
      }),
      ok({
        items: [comment("reply-1", "First", "First reply")],
        nextPageToken: "reply-page-2",
      }),
      ok({
        items: [comment("reply-2", "Second", "Second reply")],
        nextPageToken: "reply-page-3",
      }),
      ok({ items: [comment("reply-3", "Third", "Third reply")] }),
    ]);
    const provider = new YouTubeImportProvider(client);
    const first = await provider.fetchCandidates(token, { videoId: "video-1" });
    const second = await provider.fetchCandidates(
      token,
      { videoId: "video-1" },
      first.nextCursor!,
    );
    const third = await provider.fetchCandidates(
      token,
      { videoId: "video-1" },
      second.nextCursor!,
    );

    expect(third).toMatchObject({
      candidates: [expect.objectContaining({ externalId: "reply-3" })],
      nextCursor: null,
    });
    expect(client.getJson).toHaveBeenCalledTimes(4);
  });

  it("uses Google limits and returns cursors for location and review pages", async () => {
    const client = http([
      ok({
        accounts: [{ name: "accounts/1", accountName: "Acme" }],
        nextPageToken: "accounts-next",
      }),
      ok({
        locations: [{ name: "locations/1", title: "Acme London" }],
        nextPageToken: "locations-next",
      }),
      ok({
        reviews: [
          {
            reviewId: "review-1",
            comment: "Five stars",
            starRating: "FIVE",
            reviewer: { displayName: "Pat" },
            createTime: "2026-01-03T00:00:00Z",
          },
        ],
        nextPageToken: "reviews-next",
      }),
    ]);
    const provider = new GoogleBusinessImportProvider(client);
    const resources = await provider.listResources(token);
    const reviews = await provider.fetchCandidates(token, {
      accountName: "accounts/1",
      locationName: "locations/1",
    });

    expect(resources).toMatchObject({
      items: [{ id: "accounts/1/locations/1", label: "Acme - Acme London" }],
    });
    expect(resources.nextCursor).toEqual(expect.any(String));
    expect(reviews).toMatchObject({
      nextCursor: "reviews-next",
      candidates: [
        expect.objectContaining({
          externalId: "review-1",
          ratingValue: 5,
          ratingScale: 5,
        }),
      ],
    });
    expect(client.getJson).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        params: { pageSize: "20", pageToken: undefined },
      }),
    );
    expect(client.getJson).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        params: {
          pageSize: "100",
          pageToken: undefined,
          readMask: "name,title",
        },
      }),
    );
    expect(client.getJson).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        params: { pageSize: "50", pageToken: undefined },
      }),
    );
  });

  it("continues Google account and location discovery without dropping pages", async () => {
    const client = http([
      ok({
        accounts: [{ name: "accounts/1", accountName: "Acme" }],
        nextPageToken: "accounts-next",
      }),
      ok({
        locations: [{ name: "locations/1", title: "London" }],
        nextPageToken: "locations-next",
      }),
      ok({
        accounts: [{ name: "accounts/1", accountName: "Acme" }],
        nextPageToken: "accounts-next",
      }),
      ok({ locations: [{ name: "locations/2", title: "Paris" }] }),
      ok({
        accounts: [{ name: "accounts/2", accountName: "Beta" }],
      }),
      ok({ locations: [{ name: "locations/3", title: "Berlin" }] }),
    ]);
    const provider = new GoogleBusinessImportProvider(client);
    const first = await provider.listResources(token);
    const second = await provider.listResources(token, first.nextCursor!);
    const third = await provider.listResources(token, second.nextCursor!);
    const calls = vi.mocked(client.getJson).mock.calls;

    expect(first.items[0]?.id).toBe("accounts/1/locations/1");
    expect(second.items[0]?.id).toBe("accounts/1/locations/2");
    expect(third.items[0]?.id).toBe("accounts/2/locations/3");
    expect(third.nextCursor).toBeNull();
    expect(calls[3]?.[0].params?.pageToken).toBe("locations-next");
    expect(calls[4]?.[0].params?.pageToken).toBe("accounts-next");
  });

  it("discovers Google Play apps and imports bounded review pages", async () => {
    const client = http([
      ok({
        apps: [{ packageName: "com.example.app", displayName: "Example App" }],
        nextPageToken: "apps-next",
      }),
      ok({
        reviews: [
          {
            reviewId: "review-1",
            authorName: "Pat",
            comments: [
              {
                userComment: {
                  text: "Very useful",
                  starRating: 5,
                  lastModified: { seconds: "1761955200" },
                },
              },
            ],
          },
        ],
        tokenPagination: { nextPageToken: "reviews-next" },
      }),
    ]);
    const provider = new GooglePlayImportProvider(client);

    await expect(provider.listResources(token)).resolves.toEqual({
      items: [
        {
          id: "com.example.app",
          label: "Example App",
          config: { packageName: "com.example.app" },
        },
      ],
      nextCursor: "apps-next",
    });
    await expect(
      provider.fetchCandidates(
        token,
        { packageName: "com.example.app" },
        "old",
      ),
    ).resolves.toMatchObject({
      nextCursor: "reviews-next",
      candidates: [
        expect.objectContaining({
          externalId: "review-1",
          authorName: "Pat",
          ratingValue: 5,
          ratingScale: 5,
          sourceCreatedAt: "2025-11-01T00:00:00.000Z",
        }),
      ],
    });
    expect(client.getJson).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: "https://playdeveloperreporting.googleapis.com/v1beta1/apps:search",
        params: { pageSize: "100", pageToken: undefined },
      }),
    );
    expect(client.getJson).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.app/reviews",
        params: { maxResults: "100", token: "old" },
      }),
    );
  });

  it.each([
    [
      "X resources",
      () => new XImportProvider(http([ok({})])).listResources(token),
    ],
    [
      "LinkedIn posts",
      () =>
        new LinkedInImportProvider(
          http([ok({ elements: {} })]),
        ).fetchCandidates(token, { authorUrn: "urn:li:person:1" }),
    ],
    [
      "YouTube threads",
      () =>
        new YouTubeImportProvider(http([ok({ items: {} })])).fetchCandidates(
          token,
          { videoId: "video-1" },
        ),
    ],
    [
      "Google reviews",
      () =>
        new GoogleBusinessImportProvider(
          http([ok({ reviews: {} })]),
        ).fetchCandidates(token, {
          accountName: "accounts/1",
          locationName: "locations/1",
        }),
    ],
  ])("rejects malformed 2xx %s envelopes", async (_name, invoke) => {
    await expect(invoke()).rejects.toMatchObject({
      code: "PROVIDER_INVALID_RESPONSE",
      message: "Provider returned an invalid response.",
    });
  });

  it("accepts Google Play review pages without the optional reviews array", async () => {
    await expect(
      new GooglePlayImportProvider(
        http([ok({ tokenPagination: { nextPageToken: "next" } })]),
      ).fetchCandidates(token, { packageName: "com.example.app" }),
    ).resolves.toEqual({ candidates: [], nextCursor: "next" });
  });

  it("rejects malformed Google resource names before provider URL requests", async () => {
    for (const suffix of ["../..", "safe?query", "safe#fragment"]) {
      const accountClient = http([
        ok({ accounts: [{ name: `accounts/${suffix}` }] }),
      ]);
      await expect(
        new GoogleBusinessImportProvider(accountClient).listResources(token),
      ).rejects.toThrow("Provider returned an invalid response.");
      expect(accountClient.getJson).toHaveBeenCalledTimes(1);

      const locationClient = http([
        ok({ accounts: [{ name: "accounts/valid" }] }),
        ok({ locations: [{ name: `locations/${suffix}` }] }),
      ]);
      await expect(
        new GoogleBusinessImportProvider(locationClient).listResources(token),
      ).rejects.toThrow("Provider returned an invalid response.");
      expect(locationClient.getJson).toHaveBeenCalledTimes(2);

      const configClient = http([]);
      await expect(
        new GoogleBusinessImportProvider(configClient).fetchCandidates(token, {
          accountName: `accounts/${suffix}`,
          locationName: "locations/valid",
        }),
      ).rejects.toThrow("Provider configuration is invalid.");
      await expect(
        new GoogleBusinessImportProvider(configClient).fetchCandidates(token, {
          accountName: "accounts/valid",
          locationName: `locations/${suffix}`,
        }),
      ).rejects.toThrow("Provider configuration is invalid.");
      expect(configClient.getJson).not.toHaveBeenCalled();
    }
  });

  it("classifies non-2xx before parsing bodies and supports HTTP-date Retry-After", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T00:00:00.000Z"));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response("not-json", {
            status: 403,
            headers: { "content-length": "2000000" },
          }),
        )
        .mockResolvedValueOnce(
          new Response("not-json", {
            status: 429,
            headers: {
              "retry-after": "Wed, 22 Jul 2026 00:02:00 GMT",
            },
          }),
        ),
    );
    const provider = new XImportProvider(new BoundedImportProviderHttpClient());

    await expect(provider.listResources(token)).rejects.toMatchObject({
      code: "REAUTHORIZATION_REQUIRED",
    });
    await expect(provider.listResources(token)).rejects.toMatchObject({
      code: "PROVIDER_RATE_LIMITED",
      retryAfterMs: 120_000,
    });
  });

  it("cancels a declared-oversize successful response before rejecting it", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), {
      status: 200,
      headers: { "content-length": "1000001" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(
      new BoundedImportProviderHttpClient().getJson({
        url: "https://api.x.com/2/users/me",
        token,
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_INVALID_RESPONSE",
    });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("exposes bounded retry metadata and sanitizes rate-limit and timeout errors", async () => {
    await expect(
      new XImportProvider(
        http([
          {
            status: 429,
            headers: { "retry-after": "600" },
            body: { error: "secret body" },
          },
        ]),
      ).listResources(token),
    ).rejects.toMatchObject({
      code: "PROVIDER_RATE_LIMITED",
      retryAfterMs: 300_000,
      message: "Provider rate limit reached. Try again later.",
    });
    const timedOut: ImportProviderHttpClient = {
      getJson: vi.fn(async () => {
        throw new DOMException("aborted", "AbortError");
      }),
    };
    await expect(
      new XImportProvider(timedOut).listResources(token),
    ).rejects.toMatchObject({
      code: "PROVIDER_TIMEOUT",
      message: "Provider request timed out.",
    });
    expect(new ProviderHttpError(500, { token }).message).not.toContain(token);
  });
});

function ok(body: unknown): ImportProviderHttpResponse {
  return { status: 200, headers: {}, body };
}

function comment(id: string, textDisplay: string, textOriginal: string) {
  return {
    id,
    snippet: {
      textDisplay,
      textOriginal,
      authorDisplayName: "Author",
      publishedAt: "2026-01-02T00:00:00Z",
    },
  };
}
