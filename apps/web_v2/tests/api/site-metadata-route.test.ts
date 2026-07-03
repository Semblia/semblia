import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";

import {
  BlockedMetadataFetchError,
  fetchWithSafeRedirects,
  isBlockedHost,
} from "../../lib/site-metadata-fetch";

const dnsMock = vi.hoisted(() => ({
  lookup: vi.fn(
    async () => [{ address: "93.184.216.34", family: 4 as const }] as never,
  ),
}));

vi.mock("node:dns/promises", () => ({
  default: dnsMock,
  lookup: dnsMock.lookup,
}));

const lookupMock = vi.mocked(lookup);

describe("site metadata SSRF guards", () => {
  afterEach(() => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 as const },
    ] as never);
    vi.unstubAllGlobals();
  });

  it("blocks local and cloud metadata hosts", () => {
    expect(isBlockedHost("localhost")).toBe(true);
    expect(isBlockedHost("169.254.169.254")).toBe(true);
    expect(isBlockedHost("[::ffff:7f00:1]")).toBe(true);
    expect(isBlockedHost("[::ffff:c0a8:1]")).toBe(true);
    expect(isBlockedHost("metadata.google.internal")).toBe(true);
    expect(isBlockedHost("example.com")).toBe(false);
  });

  it("re-checks redirect targets before following them", async () => {
    const requestTarget = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location: "https://169.254.169.254/latest/meta-data/",
        },
      }),
    );

    await expect(
      fetchWithSafeRedirects(
        "https://example.com",
        {
          headers: { accept: "text/html" },
        },
        requestTarget,
      ),
    ).rejects.toBeInstanceOf(BlockedMetadataFetchError);
  });

  it("blocks DNS names that resolve to private addresses", async () => {
    lookupMock.mockResolvedValueOnce([
      { address: "10.0.0.7", family: 4 as const },
    ] as never);

    await expect(
      fetchWithSafeRedirects("https://preview.example", {
        headers: { accept: "text/html" },
      }),
    ).rejects.toBeInstanceOf(BlockedMetadataFetchError);
  });

  it("allows safe same-origin relative redirects", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "/about" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("<title>Ok</title>", { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWithSafeRedirects(
      "https://example.com",
      {
        headers: { accept: "text/html" },
      },
      fetchMock,
    );

    expect(result.finalUrl).toBe("https://example.com/about");
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.objectContaining({
          href: "https://example.com/about",
        }),
      }),
      expect.objectContaining({ redirect: "manual" }),
    );
  });
});
