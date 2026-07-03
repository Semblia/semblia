import { Injectable } from "@nestjs/common";
import {
  type AllowedOutboundWebhookTarget,
  BlockedOutboundWebhookUrlError,
  resolveOutboundWebhookTarget,
} from "./outbound-webhook-url-safety.js";
import { requestPinnedTarget } from "./outbound-webhook-http-transport.js";

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
    let target = await resolveOutboundWebhookTarget({ url });

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
      target = await resolveOutboundWebhookTarget({
        url: new URL(location, target.url).toString(),
      });
    }

    throw new BlockedOutboundWebhookUrlError(
      "Outbound webhook redirected too many times",
    );
  }
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
