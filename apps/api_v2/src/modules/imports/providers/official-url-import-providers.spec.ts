import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BoundedOfficialUrlImportHttpClient,
  VimeoUrlImportProvider,
  parseVimeoLocator,
  type OfficialUrlImportHttpClient,
} from "./official-url-import-providers.js";

afterEach(() => vi.unstubAllGlobals());

function http(responses: unknown[]) {
  return {
    getJson: vi.fn(async () => responses.shift()),
  } as OfficialUrlImportHttpClient;
}

describe("official URL import providers", () => {
  it("uses the Vimeo API for a public player locator and normalizes comments", async () => {
    const client = http([
      {
        data: [
          {
            uri: "/videos/123/comments/456",
            text: "Excellent walkthrough.",
            created_on: "2026-01-02T03:04:05Z",
            user: { name: "Ada" },
          },
        ],
        paging: { next: null },
      },
    ]);

    const candidates = await new VimeoUrlImportProvider(
      client,
      "token",
    ).fetchCandidates("https://player.vimeo.com/video/123", 20);

    expect(client.getJson).toHaveBeenCalledWith({
      url: "https://api.vimeo.com/videos/123/comments",
      headers: { Authorization: "Bearer token" },
      params: { per_page: "20", page: "1" },
    });
    expect(candidates).toEqual([
      expect.objectContaining({
        externalId: "vimeo:/videos/123/comments/456",
        sourceUrl: "https://player.vimeo.com/video/123",
        authorName: "Ada",
        text: "Excellent walkthrough.",
      }),
    ]);
  });

  it("rejects off-domain and malformed locators", () => {
    expect(() => parseVimeoLocator("https://vimeo.com.evil.test/123")).toThrow(
      "The import URL is invalid.",
    );
    expect(() =>
      parseVimeoLocator("https://vimeo.com/channels/staffpicks"),
    ).toThrow("The import URL is invalid.");
  });

  it("uses a constant Vimeo page size and trims the final page locally", async () => {
    const client = http([
      {
        data: Array.from({ length: 100 }, (_, index) => ({
          uri: `/videos/123/comments/${index}`,
          text: `Comment ${index}`,
        })),
        paging: { next: "/next" },
      },
      {
        data: Array.from({ length: 100 }, (_, index) => ({
          uri: `/videos/123/comments/${100 + index}`,
          text: `Comment ${100 + index}`,
        })),
        paging: { next: null },
      },
    ]);

    const candidates = await new VimeoUrlImportProvider(
      client,
      "token",
    ).fetchCandidates("https://vimeo.com/123?autoplay=1#comment", 120);

    expect(candidates).toHaveLength(120);
    expect(
      candidates.every(
        ({ sourceUrl }) => sourceUrl === "https://vimeo.com/123",
      ),
    ).toBe(true);
    expect(client.getJson).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ params: { per_page: "100", page: "1" } }),
    );
    expect(client.getJson).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ params: { per_page: "100", page: "2" } }),
    );
  });

  it("returns a safe setup-required error when a provider secret is absent", async () => {
    const provider = new VimeoUrlImportProvider(http([]), "");
    expect(provider.isConfigured()).toBe(false);
    await expect(
      provider.fetchCandidates("https://vimeo.com/123", 20),
    ).rejects.toMatchObject({ code: "PROVIDER_SETUP_REQUIRED" });
    expect(new VimeoUrlImportProvider(http([]), "token").isConfigured()).toBe(
      true,
    );
  });

  it("preserves bounded Retry-After metadata from official URL APIs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "120" },
        }),
      ),
    );

    await expect(
      new VimeoUrlImportProvider(
        new BoundedOfficialUrlImportHttpClient(),
        "token",
      ).fetchCandidates("https://vimeo.com/123", 20),
    ).rejects.toMatchObject({
      code: "PROVIDER_RATE_LIMITED",
      retryAfterMs: 120_000,
    });
  });
});
