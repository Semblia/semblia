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
import {
  buildExportBody,
  buildExportTitle,
  getRequiredString,
} from "./provider-utils.js";

const ISSUE_CREATE_MUTATION = `
mutation TrestaIssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      id
      title
      url
    }
  }
}`;

@Injectable()
export class LinearExportProvider implements NativeIntegrationProvider {
  readonly provider = IntegrationProvider.LINEAR;

  constructor(private readonly httpClient: IntegrationHttpClient) {}

  async deliver({
    token,
    connection,
    delivery,
  }: NativeIntegrationProviderInput) {
    const response = await this.httpClient.postJson({
      url: "https://api.linear.app/graphql",
      token: token.accessToken,
      body: {
        query: ISSUE_CREATE_MUTATION,
        variables: {
          input: {
            teamId: getRequiredString(connection.config, "teamId"),
            title: buildExportTitle(delivery.payload),
            description: buildExportBody(delivery.payload),
          },
        },
      },
    });

    const body = response.body as Record<string, unknown> | null;
    const issueCreate = ((body?.data as Record<string, unknown> | undefined)
      ?.issueCreate ?? null) as Record<string, unknown> | null;
    if (!issueCreate?.success) {
      throw new IntegrationProviderError(
        "Linear issue creation failed",
        response.status,
        body,
      );
    }
    const issue = (issueCreate.issue ?? {}) as Record<string, unknown>;

    return {
      externalId: typeof issue.id === "string" ? String(issue.id) : undefined,
      externalUrl:
        typeof issue.url === "string" ? String(issue.url) : undefined,
      response: body ?? { status: response.status },
    };
  }
}
