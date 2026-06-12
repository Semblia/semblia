import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

export const SEMBLIA_PROMPT_NAMES = [
  "review_recent_feedback",
  "prepare_response_review",
  "debug_project_collection_setup",
  "summarize_delivery_failures",
] as const;

type PromptServer = Pick<McpServer, "registerPrompt">;

const projectPromptArgs = {
  slug: z.string().trim().min(1).describe("Semblia project slug."),
};

export function registerSembliaPrompts(server: PromptServer) {
  server.registerPrompt(
    "review_recent_feedback",
    {
      title: "Review Recent Feedback",
      description:
        "Inspect recent responses and propose safe workflow actions.",
      argsSchema: {
        ...projectPromptArgs,
        limit: z.number().int().min(1).max(50).default(20),
      },
    },
    ({ slug, limit }) =>
      promptResult(`Review the ${limit} most recent feedback responses for project "${slug}".

Use semblia_list_responses first. Summarize themes, flag urgent issues, and suggest annotations or moderation changes. Do not rewrite original response answers.`),
  );

  server.registerPrompt(
    "prepare_response_review",
    {
      title: "Prepare Response Review",
      description: "Find promising responses and propose workflow actions.",
      argsSchema: projectPromptArgs,
    },
    ({ slug }) =>
      promptResult(`Prepare response review for project "${slug}".

Use semblia_list_responses. For strong candidates, propose annotation or moderation actions without rewriting original response answers.`),
  );

  server.registerPrompt(
    "debug_project_collection_setup",
    {
      title: "Debug Collection Setup",
      description:
        "Inspect project setup, recent responses, and delivery failures.",
      argsSchema: projectPromptArgs,
    },
    ({ slug }) =>
      promptResult(`Debug the collection setup for project "${slug}".

Use semblia_get_project, semblia_list_responses, semblia_get_project_analytics, and semblia_list_delivery_failures. Separate confirmed API facts from hypotheses, and avoid changing credentials or billing.`),
  );

  server.registerPrompt(
    "summarize_delivery_failures",
    {
      title: "Summarize Delivery Failures",
      description: "Summarize failed exports and outbound webhook deliveries.",
      argsSchema: projectPromptArgs,
    },
    ({ slug }) =>
      promptResult(`Summarize delivery failures for project "${slug}".

Use semblia_list_delivery_failures. Group issues by export versus webhook, identify likely retryability, and recommend the smallest safe next action.`),
  );
}

function promptResult(text: string) {
  return {
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text },
      },
    ],
  };
}
