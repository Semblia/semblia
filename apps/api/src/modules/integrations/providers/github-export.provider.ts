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
  getOptionalStringArray,
  getRequiredString,
} from "./provider-utils.js";

@Injectable()
export class GithubExportProvider implements NativeIntegrationProvider {
  readonly provider = IntegrationProvider.GITHUB;

  constructor(private readonly httpClient: IntegrationHttpClient) {}

  async listResources({
    token,
    query,
    cursor,
  }: NativeIntegrationResourceListInput) {
    const response = await this.httpClient.getJson({
      url: "https://api.github.com/user/repos",
      token: token.accessToken,
      params: {
        page: cursor,
        per_page: "100",
        sort: "updated",
      },
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
      },
    });
    const normalizedQuery = query?.trim().toLowerCase();
    const items = Array.isArray(response.body)
      ? response.body
          .map((repository) => asRecord(repository))
          .filter((repository) => {
            const label = readString(repository, "full_name");
            return label
              ? normalizedQuery
                ? label.toLowerCase().includes(normalizedQuery)
                : true
              : false;
          })
          .map((repository) => {
            const owner = asRecord(repository.owner);
            const ownerLogin = getRequiredString(owner, "login");
            const repo = getRequiredString(repository, "name");
            return {
              id: readString(repository, "full_name"),
              label: readString(repository, "full_name"),
              config: { owner: ownerLogin, repo },
              metadata: {
                private: Boolean(repository.private),
                archived: Boolean(repository.archived),
              },
            };
          })
      : [];

    return {
      provider: IntegrationProvider.GITHUB,
      items,
      nextCursor: null,
    };
  }

  async deliver({
    token,
    connection,
    delivery,
  }: NativeIntegrationProviderInput) {
    const owner = encodeURIComponent(
      getRequiredString(connection.config, "owner"),
    );
    const repo = encodeURIComponent(
      getRequiredString(connection.config, "repo"),
    );
    const response = await this.httpClient.postJson({
      url: `https://api.github.com/repos/${owner}/${repo}/issues`,
      token: token.accessToken,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": getGitHubApiVersion(connection.config),
      },
      body: {
        title: buildExportTitle(delivery.payload),
        body: buildExportBody(delivery.payload),
        labels: getOptionalStringArray(connection.config, "labels"),
      },
    });

    const body = response.body as Record<string, unknown> | null;
    return {
      externalId:
        body && typeof body.id === "number" ? String(body.id) : undefined,
      externalUrl:
        body && typeof body.html_url === "string"
          ? String(body.html_url)
          : undefined,
      response: body ?? { status: response.status },
    };
  }
}

function getGitHubApiVersion(config: Record<string, unknown>) {
  return typeof config.apiVersion === "string" && config.apiVersion.trim()
    ? config.apiVersion.trim()
    : "2026-03-10";
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}
