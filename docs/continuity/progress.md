# Progress Ledger

Last updated: 2026-05-13

## Current Snapshot

- Branch at last sync: `revamp/v2`.
- Git state before this docs sync: `revamp/v2...origin/revamp/v2` ahead 7, with uncommitted `web_v2` Phase 1b onboarding/empty-state work.
- Current stage: V1 API production contracts are committed and verified; `web_v2` contract adaptation is the active next leg.
- Current checkpoint: `web_v2` Phase 1b empty-state and new-user onboarding trigger implemented locally; awaiting user review/checkpoint. Billing UI must stay disabled, hidden, or explicitly read-only until the billing source-of-truth decision is made.
- Previous committed implementation checkpoint: `web_v2` Phase 1a shell navigation wiring landed as `4246ac8`; the approved execution plan landed as `f280b64`.
- Next implementation checkpoint: user review/refinement of the onboarding flow and project empty states, then capability-aware nav visibility and remaining live project metadata before moving to Phase 2a.

Always re-run `git status --short --branch` and `git log --oneline -12` before using this snapshot as current state.

## Executive Status

The original `api_v2` rebuild has been completed through its cross-cutting validation phase. The newer backend-first continuation, driven by the consolidated API/UI/database decisions, has completed the first database/API foundation slices:

- normalized public trust and host foundations
- canonical form submission writes
- testimonial private metadata split
- shared server-side drafts for forms and widgets

The project is now entering the main `web_v2` wiring pass. API-side canonical contracts and auxiliary surfaces are far enough along for UI adaptation, except for billing read projections, which remain blocked on the source-of-truth decision.

On 2026-05-03, the v1 product/architecture stance was locked: Clerk remains primary auth, Clerk Organizations become the workspace/account layer, Tresta projects remain the product/security boundary, v1 differentiates through in/out integrations and agent-native access, and original collected feedback remains immutable.

Also on 2026-05-03, the first two v1 control-plane implementation checkpoints landed: the Clerk organization/actor foundation is committed, and scoped private API keys plus scoped agent keys are committed in `apps/api_v2`.

On 2026-05-06, implementation paused for a fresh V2 security audit of the recently landed public trust, form submission, testimonial PII, draft, organization, and credential surfaces. The audit found no dependency advisories affecting the V2 workspaces and produced root hardening fixes for public-submit idempotency, invalid-submit throttling, and API-key prefix-collision handling. The UI gap map was refreshed against the new credential and agent-access API surface.

On 2026-05-08, V1 Task 3 landed the feedback integrity API surface. `CollectionFormSubmission` is now the immutable source record with workflow moderation state; annotations, display suggestions, and project actor audit rows are separate workflow/presentation layers. Agents and API keys can annotate, moderate, suggest display copy, and publish/unpublish only through scoped capability-gated routes; display-copy approval is restricted to user actors.

Later on 2026-05-08, V1 Task 4 added the outbound webhook and async CSV export foundation. Projects now have capability-gated webhook endpoint management, one-time encrypted webhook secrets, signed async delivery processing, delivery retries, and audit rows for mutating actions. CSV exports now create async database-backed delivery artifacts with display-safe testimonial fields only, download readiness checks, project isolation, and an `export.delivery_failed` webhook event hook.

On 2026-05-10, V1 Task 5 added native thin integrations. Projects can now store Slack, Notion, Linear, and GitHub integration connections, resolve user connected-account OAuth tokens through a Clerk-backed token-provider boundary, queue one-way native export deliveries, and map safe feedback/testimonial payloads into provider-native messages, pages, and issues without bidirectional sync.

Later on 2026-05-10, V1 Task 6 added the local stdio MCP server package for agent clients, a project analytics summary endpoint for agent-safe read workflows, and project-list credential boundary hardening. The MCP server uses `TRESTA_API_BASE_URL` and `TRESTA_AGENT_KEY`, calls the stable private API routes only, exposes safe tools/resources/prompts, and never connects directly to the database. At that checkpoint the summary endpoint was a read projection over existing daily rows and live submission/impression tables; the later API production contract checkpoint added event capture.

Later on 2026-05-10, the API production contract checkpoint added OpenAPI serving, developer-facing docs, backend-produced project access blocks, host-aware public surface resolution, public analytics event capture, notifications list/state/preference APIs, and project action audit reads. This checkpoint was committed as `f9df398`. The remaining backend-visible product blocker is billing read projections, which still need the user-owned source-of-truth decision.

On 2026-05-13, the continuity ledger was synced to the committed API production-contract state and the next implementation leg was opened for `web_v2` wiring. The first slice moved current-user loading to the typed `GET /v2/me` client and moved the projects list hook from the simulated mock API to the typed `GET /v2/projects` client, with project list/card components accepting API DTO date strings. Phase 1a then moved project layout validation, sidebar identity/badges, mobile project nav, topbar breadcrumbs, and the project switcher onto typed project data from `apps/web_v2/lib/tresta-api.ts` / `apps/web_v2/hooks/api`.

Later on 2026-05-13, Phase 1b started by making onboarding durable and project-empty-state driven. `User` now records `onboardingStep` and `onboardingData`, `PATCH /v2/me/onboarding` persists step progress, `POST /v2/me/onboarding/complete` marks the flow complete, and `web_v2` redirects incomplete users into `/welcome`. The welcome flow now resumes from the stored step, saves each completed step through `api_v2`, creates the first project through `POST /v2/projects`, and shows the generated hosted collection URL. `/projects` now has a more useful first-use empty state and `/projects/new` is a real project creation route instead of a dead link.

Later on 2026-05-13, the inbound Clerk webhook parser was corrected to accept Clerk's real snake_case `user.created`/`user.updated` payload shape after Svix signature verification. `POST /v2/webhooks/clerk` remains public at the Nest guard layer, valid signed Clerk payloads now map into the internal user DTO, schema failures return `400` instead of being mislabeled as webhook auth failures, and missing server-side webhook secrets now surface as server configuration errors instead of public-auth failures.

## Phase Ledger

### Original API Rebuild

| Phase                                   | Status | Commit    | Notes                                        |
| --------------------------------------- | ------ | --------- | -------------------------------------------- |
| 0 Discovery dossier                     | Done   | `1e43be8` | Historical API rebuild discovery.            |
| 1 Prisma schema refactor                | Done   | `bf05b49` | Initial v2 schema refactor.                  |
| 2 `api_v2` scaffolding and shared infra | Done   | `6443bb6` | Nest v2 scaffold and shared infra.           |
| 2.5 tooling hardening                   | Done   | `b281279` | Nest CLI, ESLint, Prettier, smoke-start.     |
| 2.6 `web_v2` Vitest compatibility       | Done   | `7a4d75d` | jest-dom to Vitest-native matcher cleanup.   |
| 3a Users                                | Done   | `35e8f08` | User domain.                                 |
| 3b Projects                             | Done   | `d8004b0` | Project domain and owner membership.         |
| 3b.5 Public-route prerequisites         | Done   | `d562bb4` | Schema deltas, crypto, authz infra.          |
| 3c Widgets                              | Done   | `ecdea31` | Auth widgets, public embeds, public walls.   |
| 3d Testimonials                         | Done   | `5a9e784` | Auth and public testimonial APIs.            |
| 3e Forms                                | Done   | `88c200f` | Auth forms and public form submit.           |
| 4a Webhooks                             | Done   | `2de8edc` | Clerk and Razorpay idempotency ledgers.      |
| 4b Alerts and ops/admin                 | Done   | `f95e784` | Backend groundwork only; no `web_v2` wiring. |
| 5 Cross-cutting validation              | Done   | `cf4476f` | Validation-only close-out.                   |

### Backend-First API Surface Continuation

| Phase                                             | Status             | Commit    | Notes                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gap map and locked decisions                      | Done               | docs only | Consolidated in `docs/plans/2026-05-02-api-ui-db-gap-map consolidated.md`.                                                                                                                                                                                     |
| Implementation phase map                          | Done               | docs only | Stored in `docs/plans/2026-05-02-api-surface-implementation-phases.md`.                                                                                                                                                                                        |
| 1 migration                                       | Done               | `01d0cae` | Phase 1 database foundation migration catch-up.                                                                                                                                                                                                                |
| 1a Public trust and host models                   | Done               | `8b8c4a3` | Trusted origins, signing secrets, hosted public-surface trust, route-aware public CORS.                                                                                                                                                                        |
| 1b Canonical form submissions                     | Done               | `0c9f618` | `CollectionFormSubmission` writes with rating, answers, trust, idempotency linkage.                                                                                                                                                                            |
| 1c Testimonial private metadata                   | Done               | `7aae66d` | Encrypted PII writes, hashed identifiers, public-submit PII removal, authenticated email compatibility shim.                                                                                                                                                   |
| 1d Studio drafts                                  | Done               | `c56cf68` | Shared `StudioDraft` service and form/widget `GET`/`PUT .../draft` endpoints with optimistic concurrency.                                                                                                                                                      |
| Phase 1 progress docs                             | Done               | `0f14884` | Recorded Phase 1a-1d progress.                                                                                                                                                                                                                                 |
| Continuity docs structure                         | Done               | `b7c88cf` | Made `docs/continuity/` the canonical durable memory and doc map.                                                                                                                                                                                              |
| V1 control-plane plan                             | Planned            | docs only | `docs/plans/2026-05-03-v1-auth-integrations-agent-access-implementation-plan.md` defines the next implementation track: Clerk org mirror, actor model, private/agent keys, outbound webhooks, exports, native integrations, MCP agent access, and friendly UX. |
| V1 Task 1 Clerk organization and actor foundation | Done               | `ffae2cf` | Added local organization schema/migration, request actor context, current organization endpoint, org-aware project listing/creation/access checks, and v1 capability presets.                                                                                  |
| V1 Task 2 Scoped private API keys and agent keys  | Done               | `5ac7c34` | Added `ApiKeyType.AGENT`, project-bound scrypt-hashed private/agent keys, one-time secret responses, revocation/rotation/usage metadata, API-key actor auth, agent presets, and read/write scope capability mapping.                                           |
| Deprecated design helper cleanup                  | Done               | `63aec50` | Removed unused `docs/tresta_claude_design/src/*` helper module files.                                                                                                                                                                                          |
| Security audit refresh                            | Done               | `0bc7bd1` | Fresh dependency/CVE and code audit before continuing V1 Task 3. Fixed surface-scoped public idempotency, invalid-submit and mode-specific public throttling, API-key prefix collision handling, and refreshed the UI gap map for credentials/agent access.    |
| V1 Task 3 Feedback integrity APIs                 | Done               | `09fa77a` | Added immutable submission workflow state, submission annotations/moderation APIs, testimonial display suggestions, human-only display approval, and project actor audit.                                                                                      |
| V1 Task 4 Outbound webhooks and async CSV exports | Done               | `3742765` | Added encrypted webhook endpoints, signed async deliveries/retries, async DB-backed CSV export deliveries/downloads, shared DTOs, webhook dispatch hardening, Hono override refresh, and audit rows.                                                           |
| V1 Task 5 Native thin integrations                | Done               | `8e82c74` | Added `IntegrationConnection`, Clerk connected-account token provider boundary, native export queueing, Slack/Notion/Linear/GitHub one-way adapters, shared DTOs, and provider tests.                                                                          |
| V1 Task 6 Agent access and MCP server             | Done               | `adf651f` | Added `@workspace/tresta-mcp-server`, safe MCP tools/resources/prompts over private API routes, `GET /v2/projects/:slug/analytics/summary`, and project-scoped credential hardening for project list/create.                                                   |
| V1 Task 7 API production contracts                | Done               | `f9df398` | Added OpenAPI serving, docs under `docs/api/`, project access blocks, notifications API, project action audit reads, public surface host resolution, and public analytics event capture.                                                                       |
| 1e Auxiliary product data                         | Partially complete | n/a       | API key, agent key, feedback integrity, outbound webhook, async CSV export, native thin integration, notification, and analytics capture foundations are implemented. Remaining auxiliary slice: billing projections after source-of-truth confirmation.       |
| 2 Common API contracts                            | Mostly complete    | n/a       | Project access blocks, shared DTO/client contracts, error envelope, idempotency, concurrency, and OpenAPI/developer docs now exist for the production wiring pass.                                                                                             |
| 3 Public surface API                              | Mostly complete    | n/a       | Host-aware public resolution, trusted public submission, hosted-page analytics capture, public form/testimonial/widget/wall reads, and idempotent submit handling are now implemented.                                                                         |
| 4 Studio API                                      | Pending            | n/a       | Form/widget studio persistence and explicit mappings.                                                                                                                                                                                                          |
| 5 Auxiliary API surfaces                          | Mostly complete    | n/a       | API keys, agent keys, analytics summary/events, notifications, exports, webhooks, integrations, and audit reads exist. Billing read projections remain blocked on source-of-truth choice.                                                                      |
| 6 `web_v2` adaptation                             | In progress        | `4246ac8` | Current user, projects list, and Phase 1a project shell/navigation are wired to typed API clients. Phase 1b onboarding trigger, durable progress, project empty state, and `/projects/new` are implemented locally but not checkpoint-committed. Keep billing disabled/hidden/read-only until its source of truth is confirmed. |
| 7 Verification and hardening                      | Pending            | n/a       | Security, performance, migration, and end-to-end checks.                                                                                                                                                                                                       |

## Operational Notes

- Public form submissions now use `CollectionFormSubmission` as the canonical answer/rating/trust record.
- New public testimonial/form writes keep email, IP, and user agent out of `Testimonial`; sensitive raw values move to encrypted private metadata with normalized hashes.
- Public submit responses omit `authorEmail`; authenticated testimonial reads rehydrate it from private metadata with a legacy row fallback.
- Draft writes require `expectedVersion`; first save uses `expectedVersion: 0`; stale writes return `409 Conflict`.
- `web_v2` still has major mock-backed surfaces and should not be treated as broadly wired.
- The organization/actor foundation from the 2026-05-03 v1 control-plane plan is checkpoint-committed as `ffae2cf`.
- Active Clerk organization sessions now resolve project access by `project.organization.clerkOrgId`; mismatches hard-fail instead of falling back to legacy user ownership.
- Projects created while a Clerk organization is active are attached to the local organization mirror.
- Prisma migrations are no longer ignored by the root or package-local `.gitignore` files; the organization migration and previously hidden migration artifacts are now visible to Git.
- Private API keys and agent keys are distinct from public submit trust and server submit HMAC secrets.
- Private/agent key raw secrets are generated once, stored as scrypt hashes, exposed only in create/rotate responses, and list/event endpoints return metadata only.
- API-key bearer auth maps valid project-bound credentials into `ActorContext` as `api_key` or `agent_key`, then `CapabilityGuard` resolves access from scopes.
- API-key bearer auth checks every active row matching the public key prefix and accepts only the row whose stored scrypt hash matches the supplied secret.
- Agent presets are `READ_ONLY`, `CONTENT_MANAGER`, `AUTOMATION_MANAGER`, and `DEVELOPER`; disallowed source-write, billing, member, credential-reveal, and project-delete scopes are not in the launch scope set.
- Read-only export/webhook/integration scopes map to `VIEW_INTEGRATIONS`, not `MANAGE_INTEGRATIONS`.
- Public submit idempotency is now surface-scoped; form and testimonial idempotency keys no longer collide, and duplicate requests only replay completed response bodies.
- Invalid public submit trust attempts are counted by the custom public-submit throttler before the trust error is rethrown, and public list/browser submit/HMAC submit buckets stay separate.
- Submission annotations, moderation updates, display suggestions, display approvals/rejections, and testimonial publish/unpublish actions now create project actor audit rows.
- Display suggestions are presentation-layer records. User actors can approve them into `Testimonial.content`; agent/API-key actors can suggest but cannot approve display copy.
- Rejecting or flagging a linked submission unpublishes the projected testimonial and does not mutate submission answers, rating values, or private metadata.
- Outbound webhook endpoint secrets are encrypted with `API_V2_SECRET_ENCRYPTION_KEY`; raw `whsec_...` values are exposed only in create and rotate responses.
- Outbound webhook deliveries are signed with `X-Tresta-Event`, `X-Tresta-Delivery`, `X-Tresta-Timestamp`, and `X-Tresta-Signature: v1=<hmac>`.
- Outbound webhook dispatch has a bounded network wait and bounded response capture: requests time out after 10 seconds, and stored response snippets are capped without reading arbitrary-size remote bodies.
- V1 webhook subscriptions require explicit event names only; no wildcard subscription exists in Task 4.
- CSV export deliveries store artifacts in the database for v1 and include display-safe testimonial fields only. Private metadata, IP, user agent, raw answers, and email are excluded by default.
- Export delivery failures emit the generic `export.delivery_failed` outbound webhook event for subscribed endpoints.
- Native integration connections are project-scoped `IntegrationConnection` records with provider, auth strategy, connected user, optional Clerk provider name, scopes, status, and provider config.
- Native integration exports reuse `ExportDestination` and `ExportDelivery` records, with a separate `native-integration-export` queue for Slack, Notion, Linear, and GitHub deliveries.
- Clerk connected OAuth tokens are resolved server-side through `ClerkConnectedAccountTokenProvider`; missing or revoked connected tokens fail as connect-required authorization errors.
- V1 native integrations are intentionally one-way. They create Slack messages, Notion pages, Linear issues, or GitHub issues from safe export payloads and do not import remote edits, sync provider membership, or depend on provider webhooks for core Tresta state.
- Project-scoped API keys and agent keys can list only their bound project from `GET /v2/projects` and cannot create projects. Creation remains a user-session action.
- `GET /v2/projects/:slug/analytics/summary` is a project-scoped read endpoint over analytics daily rows and live submission/impression counts.
- Public analytics event capture now exists under `POST /v2/analytics/events/*` for form views, widget loads, testimonial impressions, and hosted page views. These routes validate resource relationships, write event rows where a raw table exists, and increment `ProjectAnalyticsDaily`.
- `GET /v2/public-surfaces/resolve` is the API-owned host resolver for public pages. It normalizes hostnames, requires an active `PublicSurfaceHost`, returns project branding, and exposes the public forms/testimonials/wall endpoints the frontend should render.
- Project list/detail/update responses now include a backend-produced `access` block with role and capabilities for user, Clerk organization, private API key, and agent key actors.
- `GET /v2/projects/:slug/action-audit` exposes a project-scoped paginated audit stream for capability-gated project actors.
- Authenticated notification routes now exist for list, unread count, mark-read, mark-all-read, and preference management under `/v2/notifications`.
- OpenAPI is served at `GET /v2/openapi.json`, with Swagger UI at `GET /v2/openapi`.
- `packages/tresta-mcp-server` is the official local stdio MCP adapter for Task 6. It uses `TRESTA_API_BASE_URL` and `TRESTA_AGENT_KEY`, exposes safe feedback/testimonial/export/delivery tools, resources, and prompts, and calls private APIs instead of the database.
- MCP export triggering uses the actual Task 4/5 API shapes: CSV via `POST /v2/projects/:slug/exports/csv`, native integrations via `POST /v2/projects/:slug/integrations/connections/:connectionId/exports`.
- Root `pnpm.overrides.hono` is pinned to `4.12.18` so the Prisma tooling path no longer matches the May 2026 Hono advisories.
- Broad `web_v2` wiring can now begin from the API production contract checkpoint. Billing UI must remain disabled/hidden or explicitly read-only until the billing source-of-truth decision is made.
- `apps/web_v2/lib/tresta-api.ts` is the typed client direction for the wiring pass: it unwraps `{ success, data, meta }`, uses shared DTOs from `@workspace/types`, and already exposes `fetchCurrentUser()` for `GET /v2/me`. Older `apps/web_v2/lib/api-client.ts` and `apps/web_v2/lib/api.ts` references should be retired deliberately as pages are wired.
- `apps/web_v2/hooks/use-current-user.ts` now uses `fetchCurrentUser()` from the typed client. `apps/web_v2/hooks/use-projects.ts` now uses `useProjectsList({ pageSize: 100 })` instead of `apiGetProjects()`. Project layout/sidebar/mobile nav/topbar/switcher now use typed project detail/list data, but many project subpages still use `getProjectBySlug()` from mock data.
- New-user onboarding state is backend-owned, not localStorage-owned: `User.onboardingStep`, `User.onboardingData`, `User.onboardingCompletedAt`, `PATCH /v2/me/onboarding`, and `POST /v2/me/onboarding/complete` are the current resume/complete contract. `/welcome` should remain the guided setup route; `/projects/new` is the direct post-onboarding project creation route.

## Latest Verification

- V1 API production contract checkpoint database verification passed: `pnpm.cmd --filter @workspace/database generate` and `pnpm.cmd --filter @workspace/database exec prisma validate`.
- V1 API production contract checkpoint shared types verification passed: `pnpm.cmd --filter @workspace/types build`.
- V1 API production contract checkpoint docs grep passed: `rg -n "Public surface ID|Server submit secret|Agent access|X-Tresta-Signature" docs/api docs/plans docs/continuity`.
- V1 API production contract checkpoint API typecheck passed: `pnpm.cmd --filter api_v2 typecheck`.
- V1 API production contract checkpoint API lint passed: `pnpm.cmd --filter api_v2 lint`.
- V1 API production contract checkpoint full API tests passed: `pnpm.cmd --filter api_v2 test` reported 45 files and 249 tests passing.
- V1 API production contract checkpoint API build passed: `pnpm.cmd build --filter api_v2`.
- V1 API production contract checkpoint index refresh passed: `python scripts/update-indexes.py` indexed 26 changed files, skipped 0, and increased the vector store to 1189 chunks while refreshing the AST knowledge graph.
- V1 API production contract checkpoint graph refresh passed: `python scripts/rebuild-graphify.py`; semantic extraction remains skipped because it requires Claude.
- First `web_v2` wiring slice verification passed: targeted hook tests for current-user/projects passed, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit` passed, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx` passed, full `cd apps/web_v2 && pnpm.cmd test` passed with 7 files and 32 tests, and `pnpm.cmd build --filter web_v2` passed.
- First `web_v2` wiring slice index refresh ran: `python scripts/update-indexes.py` completed AST graph refresh but skipped vector embedding because Ollama was unreachable, leaving the vector store at 1181 chunks. `python scripts/rebuild-graphify.py` passed; semantic extraction remains skipped because it requires Claude.
- `web_v2` Phase 1a shell/navigation verification passed: `cd apps/web_v2 && pnpm.cmd test -- tests/nav/project-shell.test.tsx` passed, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit` passed, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx` passed, full `cd apps/web_v2 && pnpm.cmd test` passed with 8 files and 34 tests, and `pnpm.cmd build --filter web_v2` passed.
- `web_v2` Phase 1a index refresh passed: `python scripts/update-indexes.py` indexed 14 changed files, skipped 0, and increased the vector store to 1196 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4332 nodes and 7053 edges; semantic extraction remains skipped because it requires Claude.
- `web_v2` Phase 1b onboarding/empty-state local verification passed before docs/index refresh: `pnpm.cmd --filter @workspace/database generate`, `pnpm.cmd --filter @workspace/database exec prisma validate`, `pnpm.cmd --filter @workspace/database build`, `pnpm.cmd --filter @workspace/types build`, `pnpm.cmd --filter api_v2 test` passed with 45 files and 252 tests, `pnpm.cmd --filter api_v2 typecheck`, `pnpm.cmd --filter api_v2 lint`, `pnpm.cmd build --filter api_v2`, targeted and full `web_v2` tests passed with 9 files and 36 tests, `cd apps/web_v2 && pnpm.cmd exec tsc --noEmit`, `cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx`, and `pnpm.cmd build --filter web_v2` passed. The `web_v2` build completed with an existing Next/Turbopack warning about querying metadata for `.next/diagnostics/route-bundle-stats.json`.
- `web_v2` Phase 1b index refresh passed: `python scripts/update-indexes.py` indexed 16 changed files, skipped 0, and increased the vector store to 1207 chunks while refreshing the AST graph. `python scripts/rebuild-graphify.py` passed and left the merged graph at 4356 nodes and 7103 edges; semantic extraction remains skipped because it requires Claude.
- Clerk inbound webhook fix verification passed: `pnpm.cmd --filter api_v2 test -- --run modules/webhooks modules/users` passed with 45 files and 256 tests, `pnpm.cmd --filter api_v2 typecheck` passed, `pnpm.cmd --filter api_v2 lint` passed, and `pnpm.cmd build --filter api_v2` passed.
- `pnpm.cmd audit --prod --json` refreshed: 64 repo-wide advisories (`low:3`, `moderate:34`, `high:26`, `critical:4`), with 0 advisories matching `apps/api_v2`, `apps/web_v2`, `packages/database`, or `packages/types`. Affected root paths were legacy/admin/widget/tooling paths: `apps__admin`, `apps__api`, `packages__opencode-mcp-server`, and `packages__widget`.
- `pnpm.cmd audit --json` refreshed: 99 repo-wide advisories (`low:6`, `moderate:45`, `high:50`, `critical:6`), with 0 advisories matching `apps/api_v2`, `apps/web_v2`, `packages/database`, or `packages/types`. Affected root paths were `apps__admin`, `apps__api`, `packages__opencode-mcp-server`, `packages__ui`, and `packages__widget`.
- `pnpm.cmd --filter @workspace/database generate` passed after adding `PublicSubmitSurface.FORM`.
- `pnpm.cmd --filter @workspace/database exec prisma validate` passed.
- `pnpm.cmd --filter api_v2 lint` passed after removing one stale unused import warning in `projects.service.ts`.
- `pnpm.cmd --filter api_v2 test` passed: 34 files, 199 tests.
- `pnpm.cmd build --filter api_v2` passed: database package build plus Nest build succeeded.
- `python scripts/update-indexes.py` passed after the final source change: 2 changed files indexed, 1024 chunks total.
- `python scripts/rebuild-graphify.py` passed and refreshed `graphify-out/GRAPH_REPORT.md`. Semantic extraction remains skipped because the script reports it requires Claude.
- V1 Task 3 schema verification passed: `pnpm.cmd --filter @workspace/database generate` and `pnpm.cmd --filter @workspace/database exec prisma validate`.
- V1 Task 3 shared types verification passed: `pnpm.cmd --filter @workspace/types build`.
- V1 Task 3 API targeted verification passed: `pnpm.cmd --filter api_v2 test -- --run modules/submissions modules/testimonials modules/forms modules/agent-access common/authz` reported 36 test files and 206 tests passing.
- V1 Task 3 lint passed: `pnpm.cmd --filter api_v2 lint`.
- V1 Task 3 build passed: `pnpm.cmd build --filter api_v2`.
- V1 Task 3 index refresh passed: `python scripts/update-indexes.py` indexed 3 changed files, 1047 chunks total, and refreshed the graph incrementally.
- V1 Task 3 graph refresh passed: `python scripts/rebuild-graphify.py`; semantic extraction remains skipped because it requires Claude.
- V1 Task 4 database schema verification passed: `pnpm.cmd --filter @workspace/database generate` and `pnpm.cmd --filter @workspace/database exec prisma validate`.
- V1 Task 4 shared types verification passed: `pnpm.cmd --filter @workspace/types build`.
- V1 Task 4 dependency audit refresh passed for active V2 workspaces after the Hono override update: `pnpm.cmd audit --prod --json` reported 67 repo-wide advisories and 0 advisory paths matching `apps/api_v2`, `apps/web_v2`, `packages/database`, or `packages/types`; `pnpm.cmd audit --json` reported 108 repo-wide advisories and 0 matching active V2 workspace paths.
- V1 Task 4 targeted API verification passed after webhook dispatch hardening: `pnpm.cmd --filter api_v2 test -- --run modules/outbound-webhooks modules/exports` reported 40 test files and 218 tests passing.
- V1 Task 4 full API tests passed after webhook dispatch hardening: `pnpm.cmd --filter api_v2 test` reported 40 test files and 218 tests passing.
- V1 Task 4 API typecheck passed: `pnpm.cmd --filter api_v2 typecheck`.
- V1 Task 4 API lint passed: `pnpm.cmd --filter api_v2 lint`.
- V1 Task 4 build passed: `pnpm.cmd build --filter api_v2`.
- V1 Task 4 index refresh passed: `python scripts/update-indexes.py` indexed the initial Task 4 changes, then was rerun successfully after the webhook dispatch hardening and docs refresh.
- V1 Task 4 graph refresh passed: `python scripts/rebuild-graphify.py`; the final rerun refreshed 199 changed files, and semantic extraction remains skipped because it requires Claude.
- V1 Task 5 database schema verification passed: `pnpm.cmd --filter @workspace/database generate` and `pnpm.cmd --filter @workspace/database exec prisma validate`.
- V1 Task 5 shared types verification passed: `pnpm.cmd --filter @workspace/types build`.
- V1 Task 5 API typecheck passed: `pnpm.cmd --filter api_v2 typecheck`.
- V1 Task 5 API lint passed: `pnpm.cmd --filter api_v2 lint`.
- V1 Task 5 full API tests passed: `pnpm.cmd --filter api_v2 test` reported 41 test files and 229 tests passing.
- V1 Task 5 build passed: `pnpm.cmd build --filter api_v2`.
- V1 Task 5 index refresh completed after the final source change, but vector embedding was skipped because Ollama was unreachable; `python scripts/update-indexes.py` reported 20 files skipped and kept the vector store at 1100 chunks while refreshing the AST knowledge graph.
- V1 Task 5 graph refresh passed: `python scripts/rebuild-graphify.py`; the final rerun refreshed 199 changed files, and semantic extraction remains skipped because it requires Claude.
- V1 Task 6 MCP package tests passed: `pnpm.cmd --filter @workspace/tresta-mcp-server test` reported 4 files and 9 tests passing.
- V1 Task 6 MCP package build passed: `pnpm.cmd --filter @workspace/tresta-mcp-server build`.
- V1 Task 6 API typecheck passed: `pnpm.cmd --filter api_v2 typecheck`.
- V1 Task 6 API lint passed: `pnpm.cmd --filter api_v2 lint`.
- V1 Task 6 full API tests passed: `pnpm.cmd --filter api_v2 test` reported 42 files and 233 tests passing.
- V1 Task 6 API build passed: `pnpm.cmd build --filter api_v2`.
- V1 Task 6 index refresh passed: `python scripts/update-indexes.py` indexed 8 changed files, skipped 0, and increased the vector store to 1156 chunks while refreshing the AST knowledge graph.
- V1 Task 6 graph refresh passed: `python scripts/rebuild-graphify.py`; the final rerun refreshed 478 changed files, and semantic extraction remains skipped because it requires Claude.

## Known Doc Drift

- `docs/plans/2026-05-08-web-v2-api-types-gap-inventory.md` was current after V1 Task 3, but is now stale for outbound webhooks, exports, native integrations, project access blocks, notifications, analytics event capture, public host resolution, OpenAPI/docs, Prisma models, and shared DTOs after the Task 4 through Task 7 implementations.
- `docs/plans/2026-05-02-api-surface-implementation-phases.md` has been annotated so its original starting point does not override this live ledger.
- `apps/api_v2/docs/orchestration/handoff.md` has been annotated so original-rebuild scope language does not override the current auxiliary-surface decisions.
- `memory/` and `docs/codex-claude-memory-migration.md` are historical context, not the live progress ledger.
- `docs/plans/2026-05-03-v1-auth-integrations-agent-access-implementation-plan.md` expands the earlier Phase 1e auxiliary product scope and remains the current plan; Tasks 1 through 7 are implemented and verified, and Task 8 `web_v2` friendly UX/wiring is now the active implementation leg.

## Progress Report Format

Use this shape for future updates:

```markdown
Status: [one sentence]

Completed since last checkpoint:

- [phase/subphase, commit, result]

Current work:

- [phase/subphase, owner, scope]

Next move:

- [the next concrete action]

Blockers or decisions:

- [user-owned or technical blockers]

Verification:

- [commands run and result, or exact blocker]

Doc drift:

- [docs updated or stale docs found]
```
