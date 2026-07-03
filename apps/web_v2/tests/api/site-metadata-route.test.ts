import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import {
  BlockedMetadataFetchError,
  fetchWithSafeRedirects,
  isBlockedHost,
} from "../../lib/site-metadata-fetch";
import { requestPinnedMetadataTarget } from "../../lib/site-metadata-http-transport";

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
const metadataFetchInit = { headers: { accept: "text/html" } };

type MetadataRequestTarget = NonNullable<
  Parameters<typeof fetchWithSafeRedirects>[2]
>;

async function withLocalHttpServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected local HTTP server to bind a TCP port");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function redirectResponse(location?: string) {
  return new Response(null, {
    status: 302,
    headers: location === undefined ? undefined : { location },
  });
}

function fetchTestMetadata(requestTarget: MetadataRequestTarget) {
  return fetchWithSafeRedirects(
    "https://example.com",
    metadataFetchInit,
    requestTarget,
  );
}

describe("site metadata SSRF guards", () => {
  afterEach(() => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 as const },
    ] as never);
    vi.unstubAllGlobals();
  });

  it("blocks local and cloud metadata hosts", () => {
    expect(isBlockedHost({ host: "localhost" })).toBe(true);
    expect(isBlockedHost({ host: "169.254.169.254" })).toBe(true);
    expect(isBlockedHost({ host: "[::ffff:7f00:1]" })).toBe(true);
    expect(isBlockedHost({ host: "[::ffff:c0a8:1]" })).toBe(true);
    expect(isBlockedHost({ host: "metadata.google.internal" })).toBe(true);
    expect(isBlockedHost({ host: "example.com" })).toBe(false);
  });

  it("rejects unsupported metadata URL forms", async () => {
    await expect(
      fetchWithSafeRedirects("ftp://example.com/file", {
        headers: { accept: "text/html" },
      }),
    ).rejects.toBeInstanceOf(BlockedMetadataFetchError);
    await expect(
      fetchWithSafeRedirects("https://user:pass@example.com", {
        headers: { accept: "text/html" },
      }),
    ).rejects.toBeInstanceOf(BlockedMetadataFetchError);
  });

  it("handles empty 204 responses from the pinned metadata transport", async () => {
    await withLocalHttpServer(
      (_request, response) => {
        response.writeHead(204, { "x-empty": "true" });
        response.end();
      },
      async (baseUrl) => {
        const response = await requestPinnedMetadataTarget(
          { url: new URL(baseUrl), address: "127.0.0.1", family: 4 },
          { headers: { accept: "text/html" } },
        );

        expect(response.status).toBe(204);
        expect(await response.text()).toBe("");
      },
    );
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

  it("returns manual redirect responses that do not include a location", async () => {
    const response = redirectResponse();
    const requestTarget = vi.fn().mockResolvedValue(response);

    const result = await fetchTestMetadata(requestTarget);

    expect(result).toEqual({
      response,
      finalUrl: "https://example.com/",
    });
  });

  it.each([
    [
      "blocked redirect targets",
      "https://169.254.169.254/latest/meta-data/",
      1,
    ],
    ["the redirect limit", "/next", 4],
  ] as const)("fails closed on %s", async (_name, location, expectedCalls) => {
    const requestTarget = vi.fn().mockResolvedValue(redirectResponse(location));

    await expect(fetchTestMetadata(requestTarget)).rejects.toBeInstanceOf(
      BlockedMetadataFetchError,
    );
    expect(requestTarget).toHaveBeenCalledTimes(expectedCalls);
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
