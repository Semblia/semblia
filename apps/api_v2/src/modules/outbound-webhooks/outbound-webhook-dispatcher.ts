import { Injectable } from "@nestjs/common";
import {
  BlockedOutboundWebhookUrlError,
  assertOutboundWebhookTargetAllowed,
} from "./outbound-webhook-url-safety.js";

const WEBHOOK_TIMEOUT_MS = 10_000;
const RESPONSE_SNIPPET_LIMIT = 2000;
const MAX_REDIRECTS = 3;

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
    let target = await assertOutboundWebhookTargetAllowed(url);

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await fetch(target.toString(), {
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
        throw new BlockedOutboundWebhookUrlError(
          "Outbound webhook redirected too many times",
        );
      }

      target = await assertOutboundWebhookTargetAllowed(
        new URL(location, target).toString(),
      );
    }

    throw new BlockedOutboundWebhookUrlError(
      "Outbound webhook redirected too many times",
    );
  }
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
