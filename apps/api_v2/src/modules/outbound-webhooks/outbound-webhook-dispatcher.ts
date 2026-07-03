import { request as httpRequest, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { Injectable } from "@nestjs/common";
import {
  type AllowedOutboundWebhookTarget,
  BlockedOutboundWebhookUrlError,
  resolveOutboundWebhookTarget,
} from "./outbound-webhook-url-safety.js";

const WEBHOOK_TIMEOUT_MS = 10_000;
const RESPONSE_SNIPPET_LIMIT = 2000;
const MAX_REDIRECTS = 3;

type ResolvedTargetRequest = (
  target: AllowedOutboundWebhookTarget,
  init: RequestInit,
) => Promise<Response>;

export type OutboundWebhookDispatchInput = {
  url: string;
  headers: Record<string, string>;
  rawBody: string;
};

export type OutboundWebhookDispatchResult = {
  status: number;
  bodySnippet: string;
};

@Injectable()
export class OutboundWebhookDispatcher {
  constructor(
    private readonly requestResolvedTarget: ResolvedTargetRequest = requestPinnedTarget,
  ) {}

  async send({
    url,
    headers,
    rawBody,
  }: OutboundWebhookDispatchInput): Promise<OutboundWebhookDispatchResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const response = await this.fetchWithSafeRedirects(url, {
        method: "POST",
        headers,
        body: rawBody,
        signal: controller.signal,
      });

      return {
        status: response.status,
        bodySnippet: await readResponseSnippet(response),
      };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error("Webhook request timed out");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchWithSafeRedirects(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    let target = await resolveOutboundWebhookTarget(url);

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await this.requestResolvedTarget(target, {
        ...init,
        redirect: "manual",
      });

      if (response.status < 300 || response.status >= 400) {
        return response;
      }

      const location = response.headers.get("location");
      if (!location) {
        return response;
      }
      if (redirects === MAX_REDIRECTS) {
        await cancelResponseBody(response);
        throw new BlockedOutboundWebhookUrlError(
          "Outbound webhook redirected too many times",
        );
      }

      await cancelResponseBody(response);
      target = await resolveOutboundWebhookTarget(
        new URL(location, target.url).toString(),
      );
    }

    throw new BlockedOutboundWebhookUrlError(
      "Outbound webhook redirected too many times",
    );
  }
}

function requestPinnedTarget(
  target: AllowedOutboundWebhookTarget,
  init: RequestInit,
) {
  return new Promise<Response>((resolve, reject) => {
    const request =
      target.url.protocol === "http:" ? httpRequest : httpsRequest;
    const req = request(
      target.url,
      buildRequestOptions(target, init),
      (res) => {
        resolve(
          new Response(Readable.toWeb(res) as ReadableStream<Uint8Array>, {
            status: res.statusCode ?? 502,
            statusText: res.statusMessage,
            headers: responseHeaders(res.headers),
          }),
        );
      },
    );

    req.on("error", reject);
    writeRequestBody(req, init.body);
  });
}

function buildRequestOptions(
  target: AllowedOutboundWebhookTarget,
  init: RequestInit,
): RequestOptions {
  const options: RequestOptions = {
    method: init.method,
    headers: Object.fromEntries(new Headers(init.headers).entries()),
    signal: init.signal ?? undefined,
  };

  if (target.address && target.family) {
    options.lookup = (_hostname, _options, callback) => {
      callback(null, target.address as string, target.family as 4 | 6);
    };
  }

  return options;
}

function responseHeaders(headers: import("node:http").IncomingHttpHeaders) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => result.append(name, entry));
    } else if (value !== undefined) {
      result.set(name, String(value));
    }
  }
  return result;
}

function writeRequestBody(
  request: import("node:http").ClientRequest,
  body: RequestInit["body"] | null | undefined,
) {
  if (body === undefined || body === null) {
    request.end();
    return;
  }

  if (typeof body === "string" || body instanceof Uint8Array) {
    request.end(body);
    return;
  }

  request.destroy(new Error("Unsupported webhook request body type"));
}

async function cancelResponseBody(response: Response) {
  await response.body?.cancel().catch(() => undefined);
}

export function truncateResponseSnippet(value: string) {
  return value.length > RESPONSE_SNIPPET_LIMIT
    ? value.slice(0, RESPONSE_SNIPPET_LIMIT)
    : value;
}

async function readResponseSnippet(response: Response) {
  if (!response.body) {
    return truncateResponseSnippet(await response.text().catch(() => ""));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let snippet = "";
  let doneReading = false;

  try {
    while (snippet.length < RESPONSE_SNIPPET_LIMIT) {
      const result = await reader.read();
      if (result.done) {
        doneReading = true;
        break;
      }

      snippet += decoder.decode(result.value, { stream: true });
    }

    snippet += decoder.decode();
  } finally {
    if (!doneReading) {
      await reader.cancel().catch(() => undefined);
    }
  }

  return truncateResponseSnippet(snippet);
}
