# opencode-mcp-server

A local stdio MCP server that lets clients such as Claude Code delegate work to a local OpenCode installation.

This package is optimized for the behavior verified in this repo:

- OpenCode delegated tasks can be started through the local HTTP server.
- Async work can complete without status polling by waiting on the SSE `/event` stream for `session.idle` or `session.error`.
- The server API can directly target agent names like `plan`, `product-opportunity-researcher`, `explore`, and `general`.

## What It Exposes

- `opencode_get_status`: inspect CLI/server availability
- `opencode_list_agents`: list locally configured OpenCode agents
- `opencode_list_models`: list available OpenCode models
- `opencode_list_sessions`: list recent OpenCode sessions
- `opencode_create_session`: create a session explicitly
- `opencode_get_messages`: inspect a session transcript
- `opencode_send_message`: send a synchronous prompt to an existing session
- `opencode_delegate_task`: create or reuse a session, send `prompt_async`, and internally wait for `session.idle`
- `opencode_abort_session`: abort an in-flight session

## Requirements

- `opencode` CLI installed and available on `PATH`
- OpenCode authentication configured for the models you intend to use

## Environment Variables

- `OPENCODE_MCP_COMMAND`: command to start OpenCode, defaults to `opencode`
- `OPENCODE_MCP_HOST`: host for managed `opencode serve`, defaults to `127.0.0.1`
- `OPENCODE_MCP_PORT`: port for managed `opencode serve`, defaults to `4317`
- `OPENCODE_MCP_AUTO_START`: `true` or `false`, defaults to `true`
- `OPENCODE_MCP_START_TIMEOUT_MS`: managed server startup timeout, defaults to `15000`
- `OPENCODE_MCP_REQUEST_TIMEOUT_MS`: HTTP timeout, defaults to `20000`
- `OPENCODE_MCP_WAIT_TIMEOUT_MS`: async task wait timeout, defaults to `300000`
- `OPENCODE_MCP_DEFAULT_PROVIDER_ID`: defaults to `opencode`
- `OPENCODE_MCP_DEFAULT_MODEL_ID`: defaults to `nemotron-3-super-free`
- `OPENCODE_MCP_DEFAULT_AGENT`: defaults to `build`

## Claude Code Example

Example stdio configuration:

```json
{
  "mcpServers": {
    "opencode": {
      "command": "pnpm",
      "args": [
        "--filter",
        "@workspace/opencode-mcp-server",
        "exec",
        "opencode-mcp-server"
      ],
      "env": {
        "OPENCODE_MCP_AUTO_START": "true",
        "OPENCODE_MCP_PORT": "4317"
      }
    }
  }
}
```

## Build

```bash
pnpm --filter @workspace/opencode-mcp-server build
```