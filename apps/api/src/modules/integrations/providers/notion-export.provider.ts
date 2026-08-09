import { Injectable } from "@nestjs/common";
import { IntegrationProvider } from "@workspace/database/prisma";
import { IntegrationHttpClient } from "./integration-http-client.js";
import type {
  NativeIntegrationProvider,
  NativeIntegrationProviderInput,
  NativeIntegrationResourceListInput,
} from "./native-integration-provider.js";
import {
  asRecord,
  buildExportBody,
  buildExportTitle,
  compactRecord,
  getRequiredString,
} from "./provider-utils.js";

@Injectable()
export class NotionExportProvider implements NativeIntegrationProvider {
  readonly provider = IntegrationProvider.NOTION;

  constructor(private readonly httpClient: IntegrationHttpClient) {}

  async listResources({
    token,
    query,
    cursor,
  }: NativeIntegrationResourceListInput) {
    const response = await this.httpClient.postJson({
      url: "https://api.notion.com/v1/search",
      token: token.accessToken,
      headers: { "Notion-Version": "2022-06-28" },
      body: {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
        ...(query ? { query } : {}),
      },
    });
    const body = asRecord(response.body);
    const items = Array.isArray(body.results)
      ? body.results
          .map((resource) => asRecord(resource))
          .map((resource) => toNotionResource(resource))
          .filter((resource) => resource !== null)
      : [];

    return {
      provider: IntegrationProvider.NOTION,
      items,
      nextCursor: readString(body, "next_cursor") || null,
    };
  }

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

function toNotionResource(resource: Record<string, unknown>) {
  const id = readString(resource, "id");
  const object = readString(resource, "object");
  if (!id || (object !== "page" && object !== "database")) return null;

  return {
    id,
    label: getNotionTitle(resource) || `${object} ${id.slice(0, 8)}`,
    config: object === "database" ? { dataSourceId: id } : { parentPageId: id },
    metadata: { object },
  };
}

function getNotionTitle(resource: Record<string, unknown>) {
  const title = readTextArray(resource.title);
  if (title) return title;

  const properties = asRecord(resource.properties);
  const titleProperty = Object.values(properties)
    .map((value) => asRecord(value))
    .find((value) => value.type === "title");
  return titleProperty ? readTextArray(titleProperty.title) : "";
}

function readTextArray(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => asRecord(item))
    .map((item) => asRecord(item.text).content)
    .filter((content): content is string => typeof content === "string")
    .join("")
    .trim();
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

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}
