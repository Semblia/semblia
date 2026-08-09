import { Injectable } from "@nestjs/common";
import { IntegrationProvider } from "@workspace/database/prisma";
import {
  IntegrationHttpClient,
  IntegrationProviderError,
} from "./integration-http-client.js";
import type {
  NativeIntegrationProvider,
  NativeIntegrationProviderInput,
  NativeIntegrationResourceListInput,
} from "./native-integration-provider.js";
import {
  asRecord,
  buildExportBody,
  getRequiredString,
} from "./provider-utils.js";

@Injectable()
export class SlackExportProvider implements NativeIntegrationProvider {
  readonly provider = IntegrationProvider.SLACK;

  constructor(private readonly httpClient: IntegrationHttpClient) {}

  async listResources({
    token,
    query,
    cursor,
  }: NativeIntegrationResourceListInput) {
    const response = await this.httpClient.getJson({
      url: "https://slack.com/api/conversations.list",
      token: token.accessToken,
      params: {
        cursor,
        exclude_archived: "true",
        limit: "100",
        types: "public_channel,private_channel",
      },
    });

    const body = asRecord(response.body);
    if (body.ok === false) {
      throw new IntegrationProviderError(
        String(body.error ?? "Slack rejected resource discovery"),
        response.status,
        body,
      );
    }

    const normalizedQuery = query?.trim().toLowerCase();
    const items = Array.isArray(body.channels)
      ? body.channels
          .map((channel) => asRecord(channel))
          .filter((channel) => {
            const id = readString(channel, "id");
            const name = readString(channel, "name");
            if (!id || !name) return false;
            return normalizedQuery
              ? name.toLowerCase().includes(normalizedQuery)
              : true;
          })
          .map((channel) => ({
            id: readString(channel, "id"),
            label: readString(channel, "name"),
            config: { channelId: readString(channel, "id") },
            metadata: { isPrivate: Boolean(channel.is_private) },
          }))
      : [];
    const metadata = asRecord(body.response_metadata);
    const nextCursor = readString(metadata, "next_cursor") || null;

    return {
      provider: IntegrationProvider.SLACK,
      items,
      nextCursor,
    };
  }

  async deliver({
    token,
    connection,
    delivery,
  }: NativeIntegrationProviderInput) {
    const response = await this.httpClient.postJson({
      url: "https://slack.com/api/chat.postMessage",
      token: token.accessToken,
      body: {
        channel: getRequiredString(connection.config, "channelId"),
        text: buildExportBody(delivery.payload),
        unfurl_links: false,
        unfurl_media: false,
        metadata: {
          event_type: delivery.eventType,
          event_payload: { deliveryId: delivery.id },
        },
      },
    });

    const body = response.body as Record<string, unknown> | null;
    if (body && body.ok === false) {
      throw new IntegrationProviderError(
        String(body.error ?? "Slack rejected the message"),
        response.status,
        body,
      );
    }

    return {
      externalId:
        body && typeof body.ts === "string" ? String(body.ts) : undefined,
      response: body ?? { status: response.status },
    };
  }
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}
