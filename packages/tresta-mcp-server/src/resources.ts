import {
  ResourceTemplate,
  type McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TrestaClient } from "./tresta-client.js";

type ResourceServer = Pick<McpServer, "registerResource">;

export function registerTrestaResources(
  server: ResourceServer,
  client: Pick<
    TrestaClient,
    | "listProjects"
    | "getProjectSummary"
    | "listRecentSubmissions"
    | "listTestimonials"
    | "listDeliveryFailures"
  >,
) {
  server.registerResource(
    "tresta_projects",
    "tresta://projects",
    {
      title: "Tresta Projects",
      description: "Projects visible to the configured Tresta agent key.",
      mimeType: "application/json",
    },
    async (uri) =>
      jsonResource(uri, await client.listProjects({ pageSize: 50 })),
  );

  server.registerResource(
    "tresta_project_summary",
    new ResourceTemplate("tresta://projects/{slug}/summary", {
      list: undefined,
    }),
    {
      title: "Tresta Project Summary",
      description: "Project details plus analytics availability for one slug.",
      mimeType: "application/json",
    },
    async (uri, variables) =>
      jsonResource(uri, await client.getProjectSummary(requireSlug(variables))),
  );

  server.registerResource(
    "tresta_project_recent_submissions",
    new ResourceTemplate("tresta://projects/{slug}/submissions/recent", {
      list: undefined,
    }),
    {
      title: "Recent Tresta Submissions",
      description: "Recent immutable submissions for one project.",
      mimeType: "application/json",
    },
    async (uri, variables) =>
      jsonResource(
        uri,
        await client.listRecentSubmissions(requireSlug(variables), {
          pageSize: 20,
        }),
      ),
  );

  server.registerResource(
    "tresta_project_testimonials",
    new ResourceTemplate("tresta://projects/{slug}/testimonials", {
      list: undefined,
    }),
    {
      title: "Tresta Testimonials",
      description: "Submission-backed testimonials for one project.",
      mimeType: "application/json",
    },
    async (uri, variables) =>
      jsonResource(
        uri,
        await client.listTestimonials(requireSlug(variables), { pageSize: 50 }),
      ),
  );

  server.registerResource(
    "tresta_project_delivery_failures",
    new ResourceTemplate("tresta://projects/{slug}/delivery-failures", {
      list: undefined,
    }),
    {
      title: "Tresta Delivery Failures",
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
