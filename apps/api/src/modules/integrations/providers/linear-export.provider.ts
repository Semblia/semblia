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
  buildExportTitle,
  getRequiredString,
} from "./provider-utils.js";

const TEAMS_QUERY = `
query SembliaTeams($after: String) {
  teams(first: 100, after: $after) {
    nodes {
      id
      name
      key
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

const ISSUE_CREATE_MUTATION = `
mutation SembliaIssueCreate($input: IssueCreateInput!) {
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

  async listResources({
    token,
    query,
    cursor,
  }: NativeIntegrationResourceListInput) {
    const response = await this.httpClient.postJson({
      url: "https://api.linear.app/graphql",
      token: token.accessToken,
      body: {
        query: TEAMS_QUERY,
        variables: { after: cursor ?? null },
      },
    });
    const body = asRecord(response.body);
    const teams = asRecord(asRecord(body.data).teams);
    const pageInfo = asRecord(teams.pageInfo);
    const normalizedQuery = query?.trim().toLowerCase();
    const items = Array.isArray(teams.nodes)
      ? teams.nodes
          .map((team) => asRecord(team))
          .filter((team) => {
            const label = linearTeamLabel(team);
            return normalizedQuery
              ? label.toLowerCase().includes(normalizedQuery)
              : true;
          })
          .map((team) => {
            const id = getRequiredString(team, "id");
            return {
              id,
              label: linearTeamLabel(team),
              config: { teamId: id },
              metadata: { key: readString(team, "key") },
            };
          })
      : [];

    return {
      provider: IntegrationProvider.LINEAR,
      items,
      nextCursor:
        pageInfo.hasNextPage === true
          ? readString(pageInfo, "endCursor")
          : null,
    };
  }

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

function linearTeamLabel(team: Record<string, unknown>) {
  const name = readString(team, "name");
  const key = readString(team, "key");
  if (name && key) return `${name} (${key})`;
  return name || key || getRequiredString(team, "id");
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}
