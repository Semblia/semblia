# Tresta Credential Model

Status: current v2 API contract checkpoint, last reconciled 2026-06-03.

Tresta deliberately separates collection trust, private API access, outbound webhook verification, and agent access. These credentials are not interchangeable.

## Browser collection

Browser collection uses a public surface ID plus a trusted domain.

- Public surface ID: the public route/resource identifier used by hosted collection, widget, and wall surfaces.
- Route family: public testimonial, public form, public widget, and public wall routes.
- Trust evidence: browser `Origin`.
- Allowed origins: project trusted origins plus the derived default hosted Tresta origin.
- Not valid here: private API keys and agent keys.

Default hosted origins are derived from the project slug:

```text
https://<project-slug>.testimonials.tresta.app
https://<project-slug>.walls.tresta.app
```

Custom domains are represented by `PublicSurfaceHost` and `ProjectTrustedOrigin` records, but self-serve verification remains a later workflow. Hosted public pages should resolve their hostname through `GET /v2/public-surfaces/resolve` before rendering.

## Server submission

Server submission uses a server submit secret plus HMAC.

- Server submit secret: the project-scoped HMAC secret used by backend submitters.
- Secret owner: project.
- Storage: encrypted server-side; raw secret is shown only when generated or rotated.
- Header: `X-Tresta-Signature: v1=<hex_hmac_sha256>` (`v1` is the signature scheme version).
- Signature input: `<timestamp>.<raw_body>`.
- Timestamp header: `X-Tresta-Timestamp`.
- Replay control: send `X-Idempotency-Key` for public submission retries.

If `X-Tresta-Signature` is present, HMAC validation is authoritative. Failed HMAC must hard-reject and must not fall through to browser origin trust.

## Private API

Private API access uses a project-bound private API key plus scopes.

- Secret prefix: `tresta_sk_...`.
- Storage: scrypt hash only.
- Raw value: shown once on create or rotate.
- Route family: authenticated project APIs under `/v2/projects/:slug/...`.
- Authorization: API key maps into `ActorContext` as `api_key`.
- Boundary: the key can only access its bound project.
- Not valid here: public submit trust.

Private API keys may inspect and operate only within their scopes. They cannot create projects, manage members, manage billing, delete projects, or reveal stored secrets.

## Outbound webhooks

Outbound webhooks use a webhook signing secret used by receivers to verify Tresta.

- Secret prefix: `whsec_...`.
- Storage: encrypted server-side; raw secret is shown only on create or rotate.
- Delivery headers:
  - `X-Tresta-Event`
  - `X-Tresta-Delivery`
  - `X-Tresta-Timestamp`
  - `X-Tresta-Signature`
- Route family: `/v2/projects/:slug/outbound-webhooks`.

Webhook endpoint secrets verify events sent by Tresta. They are not accepted as private API credentials.

## Agent access

Agent access uses an agent key plus the MCP server over private API.

- Secret prefix: `tresta_agent_...`.
- Storage: scrypt hash only.
- Raw value: shown once on create.
- Route family: `/v2/projects/:slug/agent-access` and safe private project APIs.
- Authorization: agent key maps into `ActorContext` as `agent_key`.
- MCP adapter: `@workspace/tresta-mcp-server`.

Agent presets are intentionally constrained:

| Preset               | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `READ_ONLY`          | Inspect project state and summarize feedback.                               |
| `CONTENT_MANAGER`    | Review submissions, moderate, and publish/unpublish when scoped.            |
| `AUTOMATION_MANAGER` | Trigger exports and inspect webhook/export delivery.                        |
| `DEVELOPER`          | Help wire Tresta into an app with scoped credential and integration access. |

Excluded agent actions include project deletion, billing/member management, secret reveal, and source feedback rewrite.
