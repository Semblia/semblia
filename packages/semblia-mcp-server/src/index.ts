import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  DEFAULT_AGENT_KEY,
  DEFAULT_API_BASE_URL,
  SERVER_NAME,
  SERVER_VERSION,
} from "./constants.js";
import { registerSembliaPrompts } from "./prompts.js";
import { registerSembliaResources } from "./resources.js";
import { SembliaClient } from "./semblia-client.js";
import { registerSembliaTools } from "./tools.js";

export function createSembliaMcpServer(client = createDefaultClient()) {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Use scoped Semblia agent-key APIs to inspect and manage safe project workflows. Never rewrite original feedback, reveal secrets, manage billing, or change organization membership.",
    },
  );

  registerSembliaTools(server, client);
  registerSembliaResources(server, client);
  registerSembliaPrompts(server);

  return server;
}

async function main() {
  const server = createSembliaMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function createDefaultClient() {
  return new SembliaClient({
    baseUrl: DEFAULT_API_BASE_URL,
    agentKey: DEFAULT_AGENT_KEY,
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
