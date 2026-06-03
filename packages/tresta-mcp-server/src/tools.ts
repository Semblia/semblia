import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";
import type { JsonRecord, TrestaClient } from "./tresta-client.js";

export const TRESTA_TOOL_NAMES = [
  "tresta_list_projects",
  "tresta_get_project",
  "tresta_list_responses",
  "tresta_get_response",
  "tresta_annotate_response",
  "tresta_moderate_response",
  "tresta_get_project_analytics",
  "tresta_list_export_destinations",
  "tresta_trigger_export",
  "tresta_list_delivery_failures",
] as const;

type ToolServer = Pick<McpServer, "registerTool">;
type ToolClient = Pick<
  TrestaClient,
  | "listProjects"
  | "getProject"
  | "listResponses"
  | "getResponse"
  | "annotateResponse"
  | "moderateResponse"
  | "getProjectAnalytics"
  | "listExportDestinations"
  | "createCsvExport"
  | "createNativeIntegrationExport"
  | "listDeliveryFailures"
>;

const slugSchema = z.object({
  slug: z.string().trim().min(1).describe("Tresta project slug."),
});
const pageSizeSchema = {
  limit: z.number().int().min(1).max(100).default(10),
};
const responseSchema = slugSchema.extend({
  responseId: z.string().trim().min(1),
});
const metadataSchema = z.record(z.string(), z.unknown());

export function registerTrestaTools(server: ToolServer, client: ToolClient) {
  server.registerTool(
    "tresta_list_projects",
    {
      title: "List Tresta Projects",
      description: "List projects visible to the configured Tresta agent key.",
      inputSchema: z.object({
        pageSize: z.number().int().min(1).max(100).default(50),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ pageSize }) =>
      runTool(() => client.listProjects({ pageSize, page: 1 })),
  );

  server.registerTool(
    "tresta_get_project",
    {
      title: "Get Tresta Project",
      description: "Fetch one project by slug.",
      inputSchema: slugSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug }) => runTool(() => client.getProject(slug)),
  );

  server.registerTool(
    "tresta_list_responses",
    {
      title: "List Responses",
      description: "List feedback responses for a project.",
      inputSchema: slugSchema.extend(pageSizeSchema),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug, limit }) =>
      runTool(() => client.listResponses(slug, { pageSize: limit })),
  );

  server.registerTool(
    "tresta_get_response",
    {
      title: "Get Response",
      description: "Fetch one feedback response by id.",
      inputSchema: responseSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug, responseId }) =>
      runTool(() => client.getResponse(slug, responseId)),
  );

  server.registerTool(
    "tresta_annotate_response",
    {
      title: "Annotate Response",
      description:
        "Add workflow-layer notes, labels, sentiment, or metadata without rewriting original feedback.",
      inputSchema: responseSchema.extend({
        note: z.string().trim().min(1).max(2000).optional(),
        labels: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
        sentiment: z.string().trim().min(1).max(64).optional(),
        metadata: metadataSchema.optional(),
      }),
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ slug, responseId, note, labels, sentiment, metadata }) =>
      runTool(() =>
        client.annotateResponse(slug, responseId, {
          note,
          labels,
          sentiment,
          metadata,
        }),
      ),
  );

  server.registerTool(
    "tresta_moderate_response",
    {
      title: "Moderate Response",
      description:
        "Update workflow moderation state for a response without changing the source answers.",
      inputSchema: responseSchema.extend({
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]),
        reason: z.string().trim().min(1).max(2000).optional(),
        metadata: metadataSchema.optional(),
      }),
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ slug, responseId, status, reason, metadata }) =>
      runTool(() =>
        client.moderateResponse(slug, responseId, {
          status,
          reason,
          metadata,
        }),
      ),
  );

  server.registerTool(
    "tresta_get_project_analytics",
    {
      title: "Get Project Analytics",
      description:
        "Fetch the project analytics summary endpoint when available in api_v2.",
      inputSchema: slugSchema.extend({
        days: z.number().int().min(1).max(366).default(30),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug, days }) =>
      runTool(() => client.getProjectAnalytics(slug, { days })),
  );

  server.registerTool(
    "tresta_list_export_destinations",
    {
      title: "List Export Destinations",
      description:
        "List CSV and native integration destinations available to the agent key.",
      inputSchema: slugSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug }) => runTool(() => client.listExportDestinations(slug)),
  );

  server.registerTool(
    "tresta_trigger_export",
    {
      title: "Trigger Export",
      description:
        "Trigger a CSV export or a one-way native integration export through existing api_v2 routes.",
      inputSchema: z.object({
        slug: z.string().trim().min(1),
        destinationType: z.enum(["csv", "native_integration"]),
        filename: z.string().trim().min(1).max(120).optional(),
        connectionId: z.string().trim().min(1).optional(),
        eventType: z.string().trim().min(1).optional(),
        payload: metadataSchema.optional(),
      }),
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({
      slug,
      destinationType,
      filename,
      connectionId,
      eventType,
      payload,
    }) =>
      runTool(() => {
        if (destinationType === "csv") {
          return client.createCsvExport(slug, { filename });
        }

        if (!connectionId || !eventType || !payload) {
          throw new Error(
            "connectionId, eventType, and payload are required for native integration exports",
          );
        }

        return client.createNativeIntegrationExport(slug, connectionId, {
          eventType,
          payload: payload as JsonRecord,
        });
      }),
  );

  server.registerTool(
    "tresta_list_delivery_failures",
    {
      title: "List Delivery Failures",
      description:
        "List failed and exhausted export or outbound webhook delivery records.",
      inputSchema: slugSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug }) => runTool(() => client.listDeliveryFailures(slug)),
  );
}

async function runTool(task: () => Promise<unknown> | unknown) {
  try {
    const value = await task();
    return jsonToolResult(value);
  } catch (error) {
    return errorToolResult(error);
  }
}

function jsonToolResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function errorToolResult(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      },
    ],
  };
}
