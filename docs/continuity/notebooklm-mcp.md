# NotebookLM MCP Status

Last updated: 2026-05-02

## Summary

NotebookLM MCP is configured locally, but it is not exposed as a callable MCP namespace in this Codex session. The repo continuity system should not depend on NotebookLM until auth and tool exposure are verified.

## Evidence

- `C:\Users\anubhab\.codex\config.toml` contains an enabled `mcp_servers.notebooklm` entry using `npx notebooklm-mcp@latest`.
- Current tool discovery for this session did not expose NotebookLM tools. It exposed Playwright, node REPL, OpenCode delegation, GitHub, and Figma-related tools.
- `npm view notebooklm-mcp` reports latest version `2.0.0`.
- The package README says first-time auth is performed by the MCP tool `setup_auth` with `show_browser=true`; it is not documented as a standalone CLI subcommand.
- A local process is still running with command-line shape `notebooklm-mcp@latest setup-auth show_browser=true`. This appears to start the server with extra args rather than invoking the MCP tool, which explains why it can look "running" without opening an auth browser.
- A controlled HTTP probe started `notebooklm-mcp@latest --transport http --port 3337`; `/healthz` returned OK and the server logged 20 tools, including `setup_auth`.
- The same HTTP probe failed on JSON-RPC `initialize` with server error: `Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.`
- The HTTP probe process started by Codex was stopped after the test. The pre-existing `setup-auth` process was left alone.

## Current Hypothesis

There are two likely issues:

1. `setup-auth show_browser=true` is the wrong invocation path. `setup_auth` is an MCP tool call, so running it as a CLI argument does not perform auth.
2. The `notebooklm-mcp` server is not successfully attached to this Codex session as a tool namespace. It may require a Codex restart after config changes, a different transport setup, or a package/client compatibility fix.

## Safe Next Steps

1. Stop the stale manual `setup-auth` process if it is still present.
2. Restart Codex so the `mcp_servers.notebooklm` config can be loaded from a clean session.
3. Run tool discovery and confirm whether a NotebookLM namespace appears.
4. If the namespace appears, call the MCP tool `setup_auth` with `show_browser: true`.
5. If stdio still does not expose tools, test a direct local install or wrapper instead of `npx @latest`.
6. If HTTP transport is preferred, investigate the package's `Already connected to a transport` error before relying on it.

## Memory Policy

NotebookLM can become an optional research layer after auth works, but canonical project memory remains repo-local in `docs/continuity/`. NotebookLM answers are synthesized by another model over uploaded sources and should be treated as helpful but non-authoritative unless checked back against repo files.
