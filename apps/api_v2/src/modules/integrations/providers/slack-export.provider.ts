import { Injectable } from "@nestjs/common";
import { IntegrationProvider } from "@workspace/database/prisma";
import {
  IntegrationHttpClient,
  IntegrationProviderError,
} from "./integration-http-client.js";
import type {
  NativeIntegrationProvider,
  NativeIntegrationProviderInput,
} from "./native-integration-provider.js";
import { buildExportBody, getRequiredString } from "./provider-utils.js";

@Injectable()
export class SlackExportProvider implements NativeIntegrationProvider {
  readonly provider = IntegrationProvider.SLACK;

  constructor(private readonly httpClient: IntegrationHttpClient) {}

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
