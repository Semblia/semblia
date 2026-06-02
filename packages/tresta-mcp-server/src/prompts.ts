import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

export const TRESTA_PROMPT_NAMES = [
  "review_recent_feedback",
  "prepare_testimonial_candidates",
  "debug_project_collection_setup",
  "summarize_delivery_failures",
] as const;

type PromptServer = Pick<McpServer, "registerPrompt">;

const projectPromptArgs = {
  slug: z.string().trim().min(1).describe("Tresta project slug."),
};

export function registerTrestaPrompts(server: PromptServer) {
  server.registerPrompt(
    "review_recent_feedback",
    {
      title: "Review Recent Feedback",
      description:
        "Inspect recent submissions and propose safe workflow actions.",
      argsSchema: {
        ...projectPromptArgs,
        limit: z.number().int().min(1).max(50).default(20),
      },
    },
    ({ slug, limit }) =>
      promptResult(`Review the ${limit} most recent feedback submissions for project "${slug}".

Use tresta_list_recent_submissions first. Summarize themes, flag urgent issues, and suggest annotations or moderation changes. Do not rewrite original submission answers.`),
  );

  server.registerPrompt(
    "prepare_testimonial_candidates",
    {
      title: "Prepare Testimonial Candidates",
      description: "Find promising testimonials and propose workflow actions.",
      argsSchema: projectPromptArgs,
    },
    ({ slug }) =>
      promptResult(`Prepare testimonial candidates for project "${slug}".

Use tresta_list_testimonials and tresta_list_recent_submissions. For strong candidates, propose annotation, moderation, or publish/unpublish actions without rewriting original submission answers.`),
  );

  server.registerPrompt(
    "debug_project_collection_setup",
    {
      title: "Debug Collection Setup",
      description:
        "Inspect project setup, recent submissions, and delivery failures.",
      argsSchema: projectPromptArgs,
    },
    ({ slug }) =>
      promptResult(`Debug the collection setup for project "${slug}".

Use tresta_get_project, tresta_list_recent_submissions, tresta_get_project_analytics, and tresta_list_delivery_failures. Separate confirmed API facts from hypotheses, and avoid changing credentials or billing.`),
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

Use tresta_list_delivery_failures. Group issues by export versus webhook, identify likely retryability, and recommend the smallest safe next action.`),
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
