import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  BlockedOutboundWebhookUrlError,
  assertOutboundWebhookTargetAllowed,
  isBlockedIpAddress,
} from "./outbound-webhook-url-safety.js";
import { OutboundWebhookDispatcher } from "./outbound-webhook-dispatcher.js";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

const lookupMock = vi.mocked(lookup);
const publicLookupResult = [
  { address: "93.184.216.34", family: 4 as const },
] as never;

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

describe("OutboundWebhookDispatcher", () => {
  afterEach(() => {
    lookupMock.mockResolvedValue(publicLookupResult);
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("aborts slow webhook requests", async () => {
    vi.useFakeTimers();

    const requestResolvedTarget = vi.fn(
      (_target: unknown, init?: RequestInit): Promise<Response> => {
        const signal = init?.signal;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        });
      },
    );

    const dispatch = new OutboundWebhookDispatcher(requestResolvedTarget).send({
      url: "https://93.184.216.34/webhook",
      headers: {},
      rawBody: "{}",
    });
    const expectedTimeout = expect(dispatch).rejects.toThrow(
      "Webhook request timed out",
    );

    await vi.advanceTimersByTimeAsync(10_000);

    await expectedTimeout;
  });

  it("does not read unbounded webhook response bodies", async () => {
    let pulls = 0;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls > 10) {
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode("x".repeat(1000)));
      },
    });

    const requestResolvedTarget = vi.fn(() =>
      Promise.resolve(
        new Response(body, {
          status: 500,
        }),
      ),
    );

    const result = await new OutboundWebhookDispatcher(
      requestResolvedTarget,
    ).send({
      url: "https://93.184.216.34/webhook",
      headers: {},
      rawBody: "{}",
    });

    expect(result).toEqual({
      status: 500,
      bodySnippet: "x".repeat(2000),
    });
    expect(pulls).toBeLessThan(10);
  });

  it("handles empty 204 responses from the pinned HTTP transport", async () => {
    await withLocalHttpServer(
      (_request, response) => {
        response.writeHead(204, { "x-empty": "true" });
        response.end();
      },
      async (baseUrl) => {
        const result = await new OutboundWebhookDispatcher().send({
          url: `${baseUrl}/webhook`,
          headers: { "content-type": "application/json" },
          rawBody: "{}",
        });

        expect(result).toEqual({
          status: 204,
          bodySnippet: "",
        });
      },
    );
  });

  it("blocks private IP webhook destinations before dispatch", async () => {
    await expect(
      assertOutboundWebhookTargetAllowed({
        url: "https://169.254.169.254/hook",
      }),
    ).rejects.toBeInstanceOf(BlockedOutboundWebhookUrlError);
  });

  it("blocks hex-form IPv4-mapped IPv6 addresses", () => {
    expect(isBlockedIpAddress({ address: "::ffff:7f00:1" })).toBe(true);
    expect(isBlockedIpAddress({ address: "::ffff:0a00:1" })).toBe(true);
    expect(isBlockedIpAddress({ address: "::ffff:c0a8:1" })).toBe(true);
    expect(isBlockedIpAddress({ address: "::1" })).toBe(true);
    expect(isBlockedIpAddress({ address: "fc00::1" })).toBe(true);
    expect(isBlockedIpAddress({ address: "93.184.216.34" })).toBe(false);
  });

  it("rejects malformed, credentialed, and non-HTTPS webhook targets", async () => {
    await expect(
      assertOutboundWebhookTargetAllowed({ url: "not-a-url" }),
    ).rejects.toBeInstanceOf(BlockedOutboundWebhookUrlError);
    await expect(
      assertOutboundWebhookTargetAllowed({
        url: "https://user:pass@example.com/hook",
      }),
    ).rejects.toBeInstanceOf(BlockedOutboundWebhookUrlError);
    await expect(
      assertOutboundWebhookTargetAllowed({
        url: "http://hooks.example/hook",
      }),
    ).rejects.toBeInstanceOf(BlockedOutboundWebhookUrlError);
  });

  it("blocks DNS names that resolve to private IPs", async () => {
    lookupMock.mockResolvedValueOnce([
      { address: "192.168.1.5", family: 4 as const },
    ] as never);

    await expect(
      assertOutboundWebhookTargetAllowed({
        url: "https://hooks.example/hook",
      }),
    ).rejects.toBeInstanceOf(BlockedOutboundWebhookUrlError);
  });

  it("does not follow redirects to blocked hosts", async () => {
    const requestResolvedTarget = vi.fn(() =>
      Promise.resolve(
        new Response(null, {
          status: 302,
          headers: {
            location: "https://169.254.169.254/latest/meta-data/",
          },
        }),
      ),
    );

    await expect(
      new OutboundWebhookDispatcher(requestResolvedTarget).send({
        url: "https://93.184.216.34/webhook",
        headers: {},
        rawBody: "{}",
      }),
    ).rejects.toBeInstanceOf(BlockedOutboundWebhookUrlError);
  });

  it("returns manual redirect responses that do not include a location", async () => {
    const requestResolvedTarget = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 302 })),
    );

    const result = await new OutboundWebhookDispatcher(
      requestResolvedTarget,
    ).send({
      url: "https://93.184.216.34/webhook",
      headers: {},
      rawBody: "{}",
    });

    expect(result).toEqual({
      status: 302,
      bodySnippet: "",
    });
  });

  it("fails closed after the redirect limit", async () => {
    const requestResolvedTarget = vi.fn(() =>
      Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: "/again" },
        }),
      ),
    );

    await expect(
      new OutboundWebhookDispatcher(requestResolvedTarget).send({
        url: "https://93.184.216.34/webhook",
        headers: {},
        rawBody: "{}",
      }),
    ).rejects.toBeInstanceOf(BlockedOutboundWebhookUrlError);
    expect(requestResolvedTarget).toHaveBeenCalledTimes(4);
  });
});
