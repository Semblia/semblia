# Semblia Agent Access

Status: current v2 API contract checkpoint, last reconciled 2026-06-03.

Agent access is a first-class launch surface. Agents operate through scoped agent keys and the official local MCP adapter. The MCP server calls private APIs; it never connects directly to the database.

## Agent access routes

All routes are under `/v2`.

```text
GET  /projects/:slug/agent-access
POST /projects/:slug/agent-access/keys
POST /projects/:slug/agent-access/keys/:keyId/revoke
GET  /projects/:slug/agent-access/actions
```

Agent-safe project APIs include:

```text
GET  /projects
GET  /projects/:slug
GET  /projects/:slug/submissions
GET  /projects/:slug/submissions/:submissionId
POST /projects/:slug/submissions/:submissionId/annotations
POST /projects/:slug/submissions/:submissionId/moderation
GET  /projects/:slug/testimonials
GET  /projects/:slug/testimonials/:submissionId
PATCH /projects/:slug/testimonials/:submissionId/publish
GET  /projects/:slug/analytics/summary
GET  /projects/:slug/action-audit
GET  /projects/:slug/exports/deliveries
POST /projects/:slug/exports/csv
POST /projects/:slug/integrations/connections/:connectionId/exports
GET  /projects/:slug/outbound-webhooks/deliveries
```

## Presets

| Preset               | Scope                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `READ_ONLY`          | Project, submission, testimonial, analytics, export, webhook, and integration reads.          |
| `CONTENT_MANAGER`    | Review submissions, annotate, moderate, and publish/unpublish submission-backed testimonials. |
| `AUTOMATION_MANAGER` | Manage export and webhook delivery workflows without billing or member powers.                |
| `DEVELOPER`          | Read/write integration and credential setup surfaces needed to wire Semblia safely.            |

Agent keys are project-bound and cannot list or mutate other projects.

## MCP setup

Example MCP config:

```json
{
  "mcpServers": {
    "semblia": {
      "command": "npx",
      "args": ["@workspace/semblia-mcp-server"],
      "env": {
        "SEMBLIA_API_BASE_URL": "https://api.semblia.com/v2",
        "SEMBLIA_AGENT_KEY": "semblia_agent_..."
      }
    }
  }
}
```

For local development:

```json
{
  "mcpServers": {
    "semblia": {
      "command": "pnpm",
      "args": [
        "--dir",
        "<repo-root>",
        "--filter",
        "@workspace/semblia-mcp-server",
        "exec",
        "node",
        "dist/index.js"
      ],
      "env": {
        "SEMBLIA_API_BASE_URL": "http://localhost:8100/v2",
        "SEMBLIA_AGENT_KEY": "semblia_agent_..."
      }
    }
  }
}
```

## Safety boundaries

Agents may annotate, moderate, publish/unpublish when scoped, and trigger exports. Agents must not:

- Rewrite original collected submission answers.
- Recreate or approve presentation/projection suggestions outside a future intentionally designed workflow.
- Reveal stored secrets.
- Manage billing.
- Invite, remove, or change members.
- Delete projects.

Every mutating agent action should leave an audit trail.
