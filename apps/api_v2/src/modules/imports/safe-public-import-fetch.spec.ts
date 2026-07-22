import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it, vi } from "vitest";

import {
  SafePublicImportFetchError,
  fetchPublicImport,
  requestPinnedPublicImport,
  safePublicImportRequestHeaders,
  type PublicImportFetchDependencies,
} from "./safe-public-import-fetch.js";

const policy = {
  sourceKey: "trustpilot",
  exactHosts: ["reviews.example.com"],
  suffixHosts: ["wall.example.com"],
};
const safeDns = vi
  .fn()
  .mockResolvedValue([{ address: "93.184.216.34", family: 4 as const }]);

function dependencies(overrides: Partial<PublicImportFetchDependencies> = {}) {
  return {
    resolveDns: safeDns,
    request: vi.fn().mockResolvedValue({
      statusCode: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: [Buffer.from("<p>proof</p>")],
      cancel: vi.fn(),
    }),
    ...overrides,
  };
}

describe("safe public import fetch", () => {
  it.each([
    "ftp://reviews.example.com/proof",
    "http://reviews.example.com/proof",
    "https://user:password@reviews.example.com/proof",
    "https://127.0.0.1/proof",
    "https://[::1]/proof",
    "https://169.254.169.254/latest/meta-data",
    "https://unapproved.example.com/proof",
    "https://reviews.example.com:8443/proof",
    "http://reviews.example.com:8080/proof",
    "https://reviews.example.com/proof?access_token=private",
  ])("rejects unsafe input %s", async (url) => {
    await expect(
      fetchPublicImport(url, policy, dependencies()),
    ).rejects.toBeInstanceOf(SafePublicImportFetchError);
  });

  it("rejects a hostname when any resolved address is unsafe", async () => {
    await expect(
      fetchPublicImport(
        "https://reviews.example.com/proof",
        policy,
        dependencies({
          resolveDns: vi.fn().mockResolvedValue([
            { address: "93.184.216.34", family: 4 },
            { address: "::ffff:127.0.0.1", family: 6 },
          ]),
        }),
      ),
    ).rejects.toThrow("not allowed");
  });

  it.each(["192.0.2.12", "::ffff:192.0.2.12", "2001:db8::12", "fec0::12"])(
    "rejects reserved DNS result %s",
    async (address) => {
      await expect(
        fetchPublicImport(
          "https://reviews.example.com/proof",
          policy,
          dependencies({
            resolveDns: vi
              .fn()
              .mockResolvedValue([
                { address, family: address.includes(":") ? 6 : 4 },
              ]),
          }),
        ),
      ).rejects.toThrow("not allowed");
    },
  );

  it("pins each request and revalidates redirects against the caller policy", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: "https://proof.wall.example.com/one" },
        body: [],
        cancel: vi.fn(),
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: [Buffer.from('{"proof":true}')],
        cancel: vi.fn(),
      });
    const result = await fetchPublicImport(
      "https://reviews.example.com/proof",
      policy,
      dependencies({ request }),
    );
    expect(result.url).toBe("https://proof.wall.example.com/one");
    const firstRequest = request.mock.calls[0]?.[0];
    expect(firstRequest).toEqual(
      expect.objectContaining({ address: "93.184.216.34" }),
    );
    expect(firstRequest?.headers).toEqual({
      "user-agent": "SembliaImport/1.0 (+https://semblia.com)",
      accept: "text/html,application/json;q=0.9",
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("rejects overlong redirect chains, non-text content, and streamed oversized bodies", async () => {
    const redirect = {
      statusCode: 302,
      headers: { location: "https://reviews.example.com/next" },
      body: [],
      cancel: vi.fn(),
    };
    await expect(
      fetchPublicImport(
        "https://reviews.example.com/a",
        policy,
        dependencies({ request: vi.fn().mockResolvedValue(redirect) }),
      ),
    ).rejects.toThrow("redirect");
    await expect(
      fetchPublicImport(
        "https://reviews.example.com/a",
        policy,
        dependencies({
          request: vi.fn().mockResolvedValue({
            statusCode: 200,
            headers: { "content-type": "image/png" },
            body: [],
            cancel: vi.fn(),
          }),
        }),
      ),
    ).rejects.toThrow("content type");
    await expect(
      fetchPublicImport(
        "https://reviews.example.com/a",
        policy,
        dependencies({
          request: vi.fn().mockResolvedValue({
            statusCode: 200,
            headers: { "content-type": "text/html" },
            body: [Buffer.alloc(2 * 1024 * 1024), Buffer.from("x")],
            cancel: vi.fn(),
          }),
        }),
      ),
    ).rejects.toThrow("too large");
  });

  it("cancels a redirect body immediately without consuming an oversized stream", async () => {
    const cancel = vi.fn();
    const body = {
      [Symbol.asyncIterator]: () => {
        throw new Error("redirect body was consumed");
      },
    };
    const request = vi.fn().mockResolvedValue({
      statusCode: 302,
      headers: { location: "https://unapproved.example.com/next" },
      body,
      cancel,
    });
    await expect(
      fetchPublicImport(
        "https://reviews.example.com/a",
        policy,
        dependencies({ request }),
      ),
    ).rejects.toThrow("not allowed");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("rejects and cancels a redirect to a non-default port", async () => {
    const cancel = vi.fn();
    await expect(
      fetchPublicImport(
        "https://reviews.example.com/a",
        policy,
        dependencies({
          request: vi.fn().mockResolvedValue({
            statusCode: 302,
            headers: { location: "https://reviews.example.com:8443/next" },
            body: [],
            cancel,
          }),
        }),
      ),
    ).rejects.toThrow("not allowed");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("applies one deadline before DNS and translates DNS causes", async () => {
    const controller = new AbortController();
    const request = vi.fn();
    const resolveDns = vi.fn(
      (_hostname: string, signal: AbortSignal) =>
        new Promise<never>((_resolve, reject) => {
          expect(signal).toBe(controller.signal);
          signal.addEventListener("abort", () =>
            reject(new Error("private DNS cause")),
          );
        }),
    );
    const pending = fetchPublicImport(
      "https://reviews.example.com/a",
      policy,
      dependencies({
        resolveDns,
        request,
        createTimeoutSignal: () => controller.signal,
      }),
    );
    controller.abort();
    await expect(pending).rejects.toThrow("timed out");
    expect(request).not.toHaveBeenCalled();

    await expect(
      fetchPublicImport(
        "https://reviews.example.com/a",
        policy,
        dependencies({
          resolveDns: vi.fn().mockRejectedValue(new Error("private DNS cause")),
        }),
      ),
    ).rejects.toThrow("Public import DNS resolution failed");
  });

  it("races transport acquisition against the same deadline", async () => {
    const controller = new AbortController();
    const request = vi.fn(
      (input: { signal: AbortSignal }) =>
        new Promise<never>(() => {
          expect(input.signal).toBe(controller.signal);
        }),
    );
    const pending = fetchPublicImport(
      "https://reviews.example.com/a",
      policy,
      dependencies({
        request,
        createTimeoutSignal: () => controller.signal,
      }),
    );
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(pending).rejects.toThrow("timed out");
  });

  it("bounds body-stream causes, cancels, and races the same deadline", async () => {
    const streamFailureCancel = vi.fn();
    const failingBody = {
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject(new Error("private upstream body")),
      }),
    };
    await expect(
      fetchPublicImport(
        "https://reviews.example.com/a",
        policy,
        dependencies({
          request: vi.fn().mockResolvedValue({
            statusCode: 200,
            headers: { "content-type": "text/html" },
            body: failingBody,
            cancel: streamFailureCancel,
          }),
        }),
      ),
    ).rejects.toThrow("Public import response stream failed");
    expect(streamFailureCancel).toHaveBeenCalledTimes(1);

    const controller = new AbortController();
    const timeoutCancel = vi.fn();
    const next = vi.fn(() => new Promise<never>(() => undefined));
    const hangingBody = {
      [Symbol.asyncIterator]: () => ({
        next,
      }),
    };
    const pending = fetchPublicImport(
      "https://reviews.example.com/a",
      policy,
      dependencies({
        createTimeoutSignal: () => controller.signal,
        request: vi.fn().mockResolvedValue({
          statusCode: 200,
          headers: { "content-type": "text/html" },
          body: hangingBody,
          cancel: timeoutCancel,
        }),
      }),
    );
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(pending).rejects.toThrow("timed out");
    expect(timeoutCancel).toHaveBeenCalledTimes(1);
  });

  it("canonicalizes source identity before transport", async () => {
    const request = vi.fn().mockResolvedValue({
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: [Buffer.from("proof")],
      cancel: vi.fn(),
    });
    const googlePlayPolicy = {
      sourceKey: "google-play",
      exactHosts: ["play.google.com"],
      suffixHosts: [],
    };
    const result = await fetchPublicImport(
      "https://play.google.com/store/apps/details?utm_source=one&id=com.example.app&hl=en",
      googlePlayPolicy,
      dependencies({ request }),
    );
    expect(request.mock.calls[0]?.[0].url.toString()).toBe(
      "https://play.google.com/store/apps/details?id=com.example.app",
    );
    expect(result.url).toBe(
      "https://play.google.com/store/apps/details?id=com.example.app",
    );
  });

  it("sends only safe headers through the real pinned Node transport", async () => {
    let receivedHeaders: Record<string, string | string[] | undefined> = {};
    const server = createServer((request, response) => {
      receivedHeaders = request.headers;
      response.setHeader("content-type", "text/html");
      response.end("<p>ok</p>");
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    try {
      const address = server.address() as AddressInfo;
      const response = await requestPinnedPublicImport({
        url: new URL(`http://reviews.example.com:${address.port}/proof`),
        address: "127.0.0.1",
        family: 4,
        headers: safePublicImportRequestHeaders(),
        signal: AbortSignal.timeout(2_000),
      });
      let bytes = 0;
      for await (const chunk of response.body) bytes += chunk.byteLength;
      expect(bytes).toBeGreaterThan(0);
      expect(receivedHeaders.cookie).toBeUndefined();
      expect(receivedHeaders.authorization).toBeUndefined();
      expect(
        Object.keys(receivedHeaders)
          .filter((header) => header !== "host" && header !== "connection")
          .sort(),
      ).toEqual(["accept", "user-agent"]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("opens a new socket for each validated pinned address", async () => {
    const firstServer = createServer((_request, response) =>
      response.end("address-one"),
    );
    await listen(firstServer, 0, "127.0.0.1");
    const port = (firstServer.address() as AddressInfo).port;
    const secondServer = createServer((_request, response) =>
      response.end("address-two"),
    );
    let secondListening = false;
    try {
      await listen(secondServer, port, "127.0.0.2");
      secondListening = true;
      const url = new URL(`http://reviews.example.com:${port}/proof`);
      const first = await requestPinnedPublicImport({
        url,
        address: "127.0.0.1",
        family: 4,
        headers: safePublicImportRequestHeaders(),
        signal: AbortSignal.timeout(2_000),
      });
      expect(await responseText(first.body)).toBe("address-one");
      const second = await requestPinnedPublicImport({
        url,
        address: "127.0.0.2",
        family: 4,
        headers: safePublicImportRequestHeaders(),
        signal: AbortSignal.timeout(2_000),
      });
      expect(await responseText(second.body)).toBe("address-two");
    } finally {
      await close(firstServer);
      if (secondListening) await close(secondServer);
    }
  });
});

function listen(
  server: ReturnType<typeof createServer>,
  port: number,
  host: string,
) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
}

function close(server: ReturnType<typeof createServer>) {
  return new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

async function responseText(
  body: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
