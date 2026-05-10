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
  getOptionalStringArray,
  getRequiredString,
} from "./provider-utils.js";

@Injectable()
export class GithubExportProvider implements NativeIntegrationProvider {
  readonly provider = IntegrationProvider.GITHUB;

  constructor(private readonly httpClient: IntegrationHttpClient) {}

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
