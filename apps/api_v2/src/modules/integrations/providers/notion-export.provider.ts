import { Injectable } from "@nestjs/common";
import { IntegrationProvider } from "@workspace/database/prisma";
import { IntegrationHttpClient } from "./integration-http-client.js";
import type {
  NativeIntegrationProvider,
  NativeIntegrationProviderInput,
} from "./native-integration-provider.js";
import {
  buildExportBody,
  buildExportTitle,
  compactRecord,
  getRequiredString,
} from "./provider-utils.js";

@Injectable()
export class NotionExportProvider implements NativeIntegrationProvider {
  readonly provider = IntegrationProvider.NOTION;

  constructor(private readonly httpClient: IntegrationHttpClient) {}

  async deliver({
    token,
    connection,
    delivery,
  }: NativeIntegrationProviderInput) {
    const parent = buildNotionParent(connection.config);
    const response = await this.httpClient.postJson({
      url: "https://api.notion.com/v1/pages",
      token: token.accessToken,
      headers: {
        "Notion-Version": getNotionVersion(connection.config),
      },
      body: {
        parent,
        properties: {
          title: {
            title: [
              {
                type: "text",
                text: { content: buildExportTitle(delivery.payload) },
              },
            ],
          },
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: { content: buildExportBody(delivery.payload) },
                },
              ],
            },
          },
        ],
      },
    });

    const body = response.body as Record<string, unknown> | null;
    return {
      externalId:
        body && typeof body.id === "string" ? String(body.id) : undefined,
      externalUrl:
        body && typeof body.url === "string" ? String(body.url) : undefined,
      response: body ?? { status: response.status },
    };
  }
}

function buildNotionParent(config: Record<string, unknown>) {
  if (typeof config.dataSourceId === "string" && config.dataSourceId.trim()) {
    return { data_source: { id: config.dataSourceId.trim() } };
  }

  return compactRecord({
    page_id: getRequiredString(config, "parentPageId"),
  });
}

function getNotionVersion(config: Record<string, unknown>) {
  return typeof config.notionVersion === "string" && config.notionVersion.trim()
    ? config.notionVersion.trim()
    : "2022-06-28";
}
