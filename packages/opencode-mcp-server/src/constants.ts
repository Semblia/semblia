export const SERVER_NAME = "opencode-mcp-server";
export const SERVER_VERSION = "0.1.0";

export const DEFAULT_HOST = process.env["OPENCODE_MCP_HOST"] ?? "127.0.0.1";
export const DEFAULT_PORT = Number(process.env["OPENCODE_MCP_PORT"] ?? "4317");
export const DEFAULT_BASE_URL = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;

export const DEFAULT_COMMAND = process.env["OPENCODE_MCP_COMMAND"] ?? "opencode";
export const DEFAULT_AUTO_START =
  process.env["OPENCODE_MCP_AUTO_START"]?.toLowerCase() !== "false";
export const DEFAULT_START_TIMEOUT_MS = Number(
  process.env["OPENCODE_MCP_START_TIMEOUT_MS"] ?? "15000",
);
export const DEFAULT_REQUEST_TIMEOUT_MS = Number(
  process.env["OPENCODE_MCP_REQUEST_TIMEOUT_MS"] ?? "20000",
);
export const DEFAULT_WAIT_TIMEOUT_MS = Number(
  process.env["OPENCODE_MCP_WAIT_TIMEOUT_MS"] ?? "300000",
);

export const DEFAULT_PROVIDER_ID =
  process.env["OPENCODE_MCP_DEFAULT_PROVIDER_ID"] ?? "opencode";
export const DEFAULT_MODEL_ID =
  process.env["OPENCODE_MCP_DEFAULT_MODEL_ID"] ?? "nemotron-3-super-free";
export const DEFAULT_AGENT =
  process.env["OPENCODE_MCP_DEFAULT_AGENT"] ?? "build";

export type ResponseFormat = "markdown" | "json";