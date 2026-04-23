import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";

import {
  DEFAULT_AGENT,
  DEFAULT_AUTO_START,
  DEFAULT_BASE_URL,
  DEFAULT_COMMAND,
  DEFAULT_HOST,
  DEFAULT_MODEL_ID,
  DEFAULT_PORT,
  DEFAULT_PROVIDER_ID,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_START_TIMEOUT_MS,
  DEFAULT_WAIT_TIMEOUT_MS,
  type ResponseFormat,
  SERVER_NAME,
  SERVER_VERSION,
} from "./constants.js";
import { OpenCodeClient, summarizeMessage } from "./opencode-client.js";

const responseFormatSchema = z.enum(["markdown", "json"]);

const statusOutputSchema = z.object({
  cliAvailable: z.boolean(),
  cliVersion: z.string().nullable(),
  baseUrl: z.string(),
  serverReachable: z.boolean(),
  managedServerRunning: z.boolean(),
  autoStartEnabled: z.boolean(),
});

const agentOutputSchema = z.object({
  agents: z.array(
    z.object({
      name: z.string(),
      kind: z.string(),
    }),
  ),
});

const modelsOutputSchema = z.object({
  models: z.array(z.string()),
});

const sessionSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  created: z.number().nullable(),
  updated: z.number().nullable(),
  directory: z.string().nullable(),
});

const listSessionsOutputSchema = z.object({
  sessions: z.array(sessionSummarySchema),
});

const createSessionOutputSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  directory: z.string().nullable(),
});

const messageSummarySchema = z.object({
  id: z.string(),
  role: z.string().nullable(),
  agent: z.string().nullable(),
  modelID: z.string().nullable(),
  providerID: z.string().nullable(),
  text: z.string(),
});

const messagesOutputSchema = z.object({
  sessionId: z.string(),
  messages: z.array(messageSummarySchema),
});

const sendMessageOutputSchema = z.object({
  sessionId: z.string(),
  actualAgent: z.string().nullable(),
  modelId: z.string().nullable(),
  providerId: z.string().nullable(),
  finalText: z.string(),
});

const delegateOutputSchema = z.object({
  sessionId: z.string(),
  status: z.enum(["completed", "error"]),
  requestedAgent: z.string(),
  actualAgent: z.string().nullable(),
  providerId: z.string(),
  modelId: z.string(),
  eventTypes: z.array(z.string()),
  finalText: z.string(),
  messageCount: z.number(),
  errorMessage: z.string().nullable(),
});

const abortOutputSchema = z.object({
  sessionId: z.string(),
  aborted: z.boolean(),
  raw: z.unknown().optional(),
});

const client = new OpenCodeClient({
  baseUrl: DEFAULT_BASE_URL,
  host: DEFAULT_HOST,
  port: DEFAULT_PORT,
  command: DEFAULT_COMMAND,
  autoStart: DEFAULT_AUTO_START,
  requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  startTimeoutMs: DEFAULT_START_TIMEOUT_MS,
  defaultWaitTimeoutMs: DEFAULT_WAIT_TIMEOUT_MS,
});

const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  {
    instructions:
      "Delegate repository-local search, planning, and other coding subtasks to a local OpenCode instance. Prefer opencode_delegate_task when you want a task to start asynchronously and complete without status polling. Use opencode_send_message for synchronous one-shot prompts on an existing session.",
  },
);

server.registerTool(
  "opencode_get_status",
  {
    title: "OpenCode Status",
    description:
      "Check whether the local OpenCode CLI is installed and whether the local OpenCode server is reachable. Optionally ensure the server is started.",
    inputSchema: z.object({
      ensure_server: z
        .boolean()
        .default(false)
        .describe("Start or ensure the local OpenCode server before reporting status."),
      response_format: responseFormatSchema
        .default("markdown")
        .describe("Return markdown for humans or json for structured output."),
    }),
    outputSchema: statusOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ ensure_server, response_format }) => {
    const output = await client.getStatus(ensure_server);
    return successResult(output, formatStatus(output, response_format));
  },
);

server.registerTool(
  "opencode_list_agents",
  {
    title: "List OpenCode Agents",
    description:
      "List locally configured OpenCode agents as seen by `opencode agent list`. Useful for picking a target agent such as plan, build, explore, or product-opportunity-researcher.",
    inputSchema: z.object({
      response_format: responseFormatSchema
        .default("markdown")
        .describe("Return markdown for humans or json for structured output."),
    }),
    outputSchema: agentOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ response_format }) => {
    const output = { agents: await client.listAgents() };
    return successResult(output, formatAgents(output.agents, response_format));
  },
);

server.registerTool(
  "opencode_list_models",
  {
    title: "List OpenCode Models",
    description:
      "List OpenCode models available from configured providers. Optionally filter to a single provider, for example `opencode`, `openai`, or `amazon-bedrock`.",
    inputSchema: z.object({
      provider: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional()
        .describe("Optional provider filter, such as `opencode` or `amazon-bedrock`."),
      response_format: responseFormatSchema
        .default("markdown")
        .describe("Return markdown for humans or json for structured output."),
    }),
    outputSchema: modelsOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ provider, response_format }) => {
    const output = { models: await client.listModels(provider) };
    return successResult(output, formatModels(output.models, response_format));
  },
);

server.registerTool(
  "opencode_list_sessions",
  {
    title: "List OpenCode Sessions",
    description:
      "List recent OpenCode sessions. Useful for picking a session to continue, inspect, or abort.",
    inputSchema: z.object({
      max_count: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe("Maximum number of recent sessions to return."),
      response_format: responseFormatSchema
        .default("markdown")
        .describe("Return markdown for humans or json for structured output."),
    }),
    outputSchema: listSessionsOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ max_count, response_format }) => {
    const sessions = await client.listSessions(max_count);
    const output = {
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title ?? null,
        created: session.created ?? null,
        updated: session.updated ?? null,
        directory: session.directory ?? null,
      })),
    };

    return successResult(output, formatSessions(output.sessions, response_format));
  },
);

server.registerTool(
  "opencode_create_session",
  {
    title: "Create OpenCode Session",
    description:
      "Create a new OpenCode session through the local server. This is useful when you want to separate follow-up delegated tasks into a dedicated thread.",
    inputSchema: z.object({}),
    outputSchema: createSessionOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async () => {
    const session = await client.createSession();
    const output = {
      id: session.id,
      title: session.title ?? null,
      directory: session.directory ?? null,
    };

    return successResult(
      output,
      [`Created OpenCode session ${session.id}.`, output.title ? `Title: ${output.title}` : null]
        .filter(Boolean)
        .join("\n"),
    );
  },
);

server.registerTool(
  "opencode_get_messages",
  {
    title: "Get OpenCode Messages",
    description:
      "Fetch the messages in an OpenCode session and summarize each assistant or user turn. Useful for reviewing delegated task output or resuming work.",
    inputSchema: z.object({
      session_id: z.string().min(1).describe("The OpenCode session ID."),
      last_n: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe("Return only the last N messages after fetching the transcript."),
      response_format: responseFormatSchema
        .default("markdown")
        .describe("Return markdown for humans or json for structured output."),
    }),
    outputSchema: messagesOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ session_id, last_n, response_format }) => {
    const messages = await client.getMessages(session_id);
    const summarized = messages.slice(-last_n).map((message) => ({
      id: message.info.id,
      role: message.info.role ?? null,
      agent: message.info.agent ?? null,
      modelID: message.info.modelID ?? null,
      providerID: message.info.providerID ?? null,
      text: summarizeMessage(message).text,
    }));

    const output = {
      sessionId: session_id,
      messages: summarized,
    };

    return successResult(output, formatMessages(output, response_format));
  },
);

server.registerTool(
  "opencode_send_message",
  {
    title: "Send OpenCode Message",
    description:
      "Send a synchronous prompt to an existing OpenCode session and wait for the assistant response. This is a direct wrapper over `POST /session/:id/message`.",
    inputSchema: z.object({
      session_id: z.string().min(1).describe("Existing OpenCode session ID."),
      prompt: z.string().min(1).describe("Prompt to send to OpenCode."),
      agent: z
        .string()
        .min(1)
        .default(DEFAULT_AGENT)
        .describe("Agent to target, for example `build`, `plan`, `explore`, or `code-searcher`."),
      provider_id: z
        .string()
        .min(1)
        .default(DEFAULT_PROVIDER_ID)
        .describe("Model provider ID, such as `opencode`."),
      model_id: z
        .string()
        .min(1)
        .default(DEFAULT_MODEL_ID)
        .describe("Model ID, such as `nemotron-3-super-free`."),
      system: z
        .string()
        .min(1)
        .optional()
        .describe("Optional system instructions applied to this prompt."),
    }),
    outputSchema: sendMessageOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ session_id, prompt, agent, provider_id, model_id, system }) => {
    const message = await client.sendMessage({
      sessionId: session_id,
      prompt,
      agent,
      model: { providerID: provider_id, modelID: model_id },
      system,
    });

    const output = {
      sessionId: session_id,
      actualAgent: message.info.agent ?? null,
      modelId: message.info.modelID ?? null,
      providerId: message.info.providerID ?? null,
      finalText: summarizeMessage(message).text,
    };

    return successResult(
      output,
      [
        `OpenCode responded in session ${session_id}.`,
        output.actualAgent ? `Agent: ${output.actualAgent}` : null,
        output.finalText,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  },
);

server.registerTool(
  "opencode_delegate_task",
  {
    title: "Delegate OpenCode Task",
    description:
      "Create or reuse an OpenCode session, dispatch a task through `prompt_async`, and internally wait for SSE `session.idle` or `session.error`. This is the primary workflow tool for Claude Code because it hides OpenCode's async completion mechanics behind a single tool call.",
    inputSchema: z.object({
      prompt: z.string().min(1).describe("Task prompt to delegate to OpenCode."),
      session_id: z
        .string()
        .min(1)
        .optional()
        .describe("Optional existing session ID. If omitted, a new session is created."),
      agent: z
        .string()
        .min(1)
        .default(DEFAULT_AGENT)
        .describe("Agent to target, for example `plan`, `build`, `explore`, or `product-opportunity-researcher`."),
      provider_id: z
        .string()
        .min(1)
        .default(DEFAULT_PROVIDER_ID)
        .describe("Model provider ID, such as `opencode`."),
      model_id: z
        .string()
        .min(1)
        .default(DEFAULT_MODEL_ID)
        .describe("Model ID, such as `nemotron-3-super-free`."),
      wait_timeout_ms: z
        .number()
        .int()
        .min(1000)
        .max(1800000)
        .default(DEFAULT_WAIT_TIMEOUT_MS)
        .describe("How long to wait for `session.idle` before returning an error result."),
    }),
    outputSchema: delegateOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async ({ prompt, session_id, agent, provider_id, model_id, wait_timeout_ms }) => {
    const output = await client.delegateTask({
      prompt,
      sessionId: session_id,
      agent,
      model: { providerID: provider_id, modelID: model_id },
      waitTimeoutMs: wait_timeout_ms,
    });

    return successResult(output, formatDelegateResult(output));
  },
);

server.registerTool(
  "opencode_abort_session",
  {
    title: "Abort OpenCode Session",
    description:
      "Abort a running OpenCode session. Useful when a delegated task is stuck or no longer needed.",
    inputSchema: z.object({
      session_id: z.string().min(1).describe("The OpenCode session ID to abort."),
    }),
    outputSchema: abortOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ session_id }) => {
    const raw = await client.abortSession(session_id);
    const aborted = typeof raw === "boolean" ? raw : true;
    const output = {
      sessionId: session_id,
      aborted,
      raw,
    };

    return successResult(
      output,
      aborted
        ? `Abort request sent for OpenCode session ${session_id}.`
        : `OpenCode reported that session ${session_id} was not aborted.`,
    );
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const shutdown = () => {
  client.dispose();
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

process.on("exit", () => {
  shutdown();
});

main().catch((error) => {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  shutdown();
  process.exit(1);
});

function successResult<T>(output: T, text: string) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: output as Record<string, unknown>,
  };
}

function formatStatus(
  output: z.infer<typeof statusOutputSchema>,
  format: ResponseFormat,
): string {
  if (format === "json") {
    return JSON.stringify(output, null, 2);
  }

  return [
    "# OpenCode Status",
    "",
    `- CLI available: ${output.cliAvailable}`,
    `- CLI version: ${output.cliVersion ?? "unknown"}`,
    `- Base URL: ${output.baseUrl}`,
    `- Server reachable: ${output.serverReachable}`,
    `- Managed server running: ${output.managedServerRunning}`,
    `- Auto-start enabled: ${output.autoStartEnabled}`,
  ].join("\n");
}

function formatAgents(
  agents: z.infer<typeof agentOutputSchema>["agents"],
  format: ResponseFormat,
): string {
  if (format === "json") {
    return JSON.stringify({ agents }, null, 2);
  }

  if (agents.length === 0) {
    return "No OpenCode agents found.";
  }

  return [
    "# OpenCode Agents",
    "",
    ...agents.map((agent) => `- ${agent.name} (${agent.kind})`),
  ].join("\n");
}

function formatModels(models: string[], format: ResponseFormat): string {
  if (format === "json") {
    return JSON.stringify({ models }, null, 2);
  }

  if (models.length === 0) {
    return "No OpenCode models found.";
  }

  return ["# OpenCode Models", "", ...models.map((model) => `- ${model}`)].join(
    "\n",
  );
}

function formatSessions(
  sessions: z.infer<typeof listSessionsOutputSchema>["sessions"],
  format: ResponseFormat,
): string {
  if (format === "json") {
    return JSON.stringify({ sessions }, null, 2);
  }

  if (sessions.length === 0) {
    return "No OpenCode sessions found.";
  }

  return [
    "# OpenCode Sessions",
    "",
    ...sessions.map((session) => {
      const parts = [session.id];
      if (session.title) parts.push(session.title);
      if (session.directory) parts.push(session.directory);
      return `- ${parts.join(" | ")}`;
    }),
  ].join("\n");
}

function formatMessages(
  output: z.infer<typeof messagesOutputSchema>,
  format: ResponseFormat,
): string {
  if (format === "json") {
    return JSON.stringify(output, null, 2);
  }

  if (output.messages.length === 0) {
    return `No messages found for session ${output.sessionId}.`;
  }

  return [
    `# Messages for ${output.sessionId}`,
    "",
    ...output.messages.flatMap((message) => [
      `## ${message.role ?? "unknown"} (${message.id})`,
      message.agent ? `- Agent: ${message.agent}` : null,
      message.modelID ? `- Model: ${message.providerID ?? "unknown"}/${message.modelID}` : null,
      message.text || "(no text content)",
      "",
    ]),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function formatDelegateResult(
  output: z.infer<typeof delegateOutputSchema>,
): string {
  return [
    `Delegated OpenCode task in session ${output.sessionId}.`,
    `Status: ${output.status}`,
    `Requested agent: ${output.requestedAgent}`,
    `Actual agent: ${output.actualAgent ?? "unknown"}`,
    `Model: ${output.providerId}/${output.modelId}`,
    `Events: ${output.eventTypes.join(", ") || "none"}`,
    output.errorMessage ? `Error: ${output.errorMessage}` : null,
    "",
    output.finalText || "(no text content)",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}