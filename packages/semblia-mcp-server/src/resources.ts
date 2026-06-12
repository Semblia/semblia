import {
  ResourceTemplate,
  type McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SembliaClient } from "./semblia-client.js";

type ResourceServer = Pick<McpServer, "registerResource">;

export function registerSembliaResources(
  server: ResourceServer,
  client: Pick<
    SembliaClient,
    | "listProjects"
    | "getProjectSummary"
    | "listResponses"
    | "listDeliveryFailures"
  >,
) {
  server.registerResource(
    "semblia_projects",
    "semblia://projects",
    {
      title: "Semblia Projects",
      description: "Projects visible to the configured Semblia agent key.",
      mimeType: "application/json",
    },
    async (uri) =>
      jsonResource(uri, await client.listProjects({ pageSize: 50 })),
  );

  server.registerResource(
    "semblia_project_summary",
    new ResourceTemplate("semblia://projects/{slug}/summary", {
      list: undefined,
    }),
    {
      title: "Semblia Project Summary",
      description: "Project details plus analytics availability for one slug.",
      mimeType: "application/json",
    },
    async (uri, variables) =>
      jsonResource(uri, await client.getProjectSummary(requireSlug(variables))),
  );

  server.registerResource(
    "semblia_project_responses",
    new ResourceTemplate("semblia://projects/{slug}/responses", {
      list: undefined,
    }),
    {
      title: "Semblia Responses",
      description: "Feedback responses for one project.",
      mimeType: "application/json",
    },
    async (uri, variables) =>
      jsonResource(
        uri,
        await client.listResponses(requireSlug(variables), {
          pageSize: 20,
        }),
      ),
  );

  server.registerResource(
    "semblia_project_delivery_failures",
    new ResourceTemplate("semblia://projects/{slug}/delivery-failures", {
      list: undefined,
    }),
    {
      title: "Semblia Delivery Failures",
      description: "Failed export and outbound webhook delivery records.",
      mimeType: "application/json",
    },
    async (uri, variables) =>
      jsonResource(
        uri,
        await client.listDeliveryFailures(requireSlug(variables)),
      ),
  );
}

function jsonResource(uri: URL, value: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function requireSlug(variables: Record<string, string | string[]>) {
  const value = variables["slug"];
  const slug = Array.isArray(value) ? value[0] : value;
  if (!slug) throw new Error("Missing project slug");
  return slug;
}
