import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";
import type { JsonRecord, TrestaClient } from "./tresta-client.js";

export const TRESTA_TOOL_NAMES = [
  "tresta_list_projects",
  "tresta_get_project",
  "tresta_list_recent_submissions",
  "tresta_get_submission",
  "tresta_annotate_submission",
  "tresta_moderate_submission",
  "tresta_list_testimonials",
  "tresta_publish_testimonial",
  "tresta_unpublish_testimonial",
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
  | "listRecentSubmissions"
  | "getSubmission"
  | "annotateSubmission"
  | "moderateSubmission"
  | "listTestimonials"
  | "publishTestimonial"
  | "unpublishTestimonial"
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
const submissionSchema = slugSchema.extend({
  submissionId: z.string().trim().min(1),
});
const testimonialSchema = slugSchema.extend({
  submissionId: z.string().trim().min(1),
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
    "tresta_list_recent_submissions",
    {
      title: "List Recent Submissions",
      description: "List recent immutable feedback submissions for a project.",
      inputSchema: slugSchema.extend(pageSizeSchema),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug, limit }) =>
      runTool(() => client.listRecentSubmissions(slug, { pageSize: limit })),
  );

  server.registerTool(
    "tresta_get_submission",
    {
      title: "Get Submission",
      description: "Fetch one immutable feedback submission by id.",
      inputSchema: submissionSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug, submissionId }) =>
      runTool(() => client.getSubmission(slug, submissionId)),
  );

  server.registerTool(
    "tresta_annotate_submission",
    {
      title: "Annotate Submission",
      description:
        "Add workflow-layer notes, labels, sentiment, or metadata without rewriting original feedback.",
      inputSchema: submissionSchema.extend({
        note: z.string().trim().min(1).max(2000).optional(),
        labels: z.array(z.string().trim().min(1).max(80)).max(25).optional(),
        sentiment: z.string().trim().min(1).max(64).optional(),
        metadata: metadataSchema.optional(),
      }),
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ slug, submissionId, note, labels, sentiment, metadata }) =>
      runTool(() =>
        client.annotateSubmission(slug, submissionId, {
          note,
          labels,
          sentiment,
          metadata,
        }),
      ),
  );

  server.registerTool(
    "tresta_moderate_submission",
    {
      title: "Moderate Submission",
      description:
        "Update workflow moderation state for a submission without changing the source answers.",
      inputSchema: submissionSchema.extend({
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]),
        reason: z.string().trim().min(1).max(2000).optional(),
        metadata: metadataSchema.optional(),
      }),
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ slug, submissionId, status, reason, metadata }) =>
      runTool(() =>
        client.moderateSubmission(slug, submissionId, {
          status,
          reason,
          metadata,
        }),
      ),
  );

  server.registerTool(
    "tresta_list_testimonials",
    {
      title: "List Testimonials",
      description: "List submission-backed testimonials for a project.",
      inputSchema: slugSchema.extend({
        ...pageSizeSchema,
        status: z
          .enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED", "ALL"])
          .default("ALL"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ slug, limit, status }) =>
      runTool(() => client.listTestimonials(slug, { pageSize: limit, status })),
  );

  server.registerTool(
    "tresta_publish_testimonial",
    {
      title: "Publish Testimonial",
      description: "Publish an approved submission-backed testimonial.",
      inputSchema: testimonialSchema,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ slug, submissionId }) =>
      runTool(() => client.publishTestimonial(slug, submissionId)),
  );

  server.registerTool(
    "tresta_unpublish_testimonial",
    {
      title: "Unpublish Testimonial",
      description: "Remove a submission-backed testimonial from public display.",
      inputSchema: testimonialSchema,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ slug, submissionId }) =>
      runTool(() => client.unpublishTestimonial(slug, submissionId)),
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
