# Progress Ledger

Last updated: 2026-05-08

## Current Snapshot

- Branch at last sync: `revamp/v2`.
- Git state after the V1 Task 3 checkpoint: `revamp/v2...origin/revamp/v2 [ahead 34]`.
- Worktree after the V1 Task 3 checkpoint: clean.
- Current stage: V1 Task 3 feedback integrity APIs complete; next implementation resumes at outbound webhooks and export foundation.
- Current checkpoint: V1 Task 3 feedback integrity APIs. Security hardening is already committed as `0bc7bd1`.
- Latest committed implementation checkpoint: V1 Task 3 added immutable feedback workflow APIs, display suggestions, submission annotations/moderation, and project actor audit.
- Next implementation checkpoint: V1 Task 4 outbound webhook and export foundation from `docs/plans/2026-05-03-v1-auth-integrations-agent-access-implementation-plan.md`.

Always re-run `git status --short --branch` and `git log --oneline -12` before using this snapshot as current state.

## Executive Status

The original `api_v2` rebuild has been completed through its cross-cutting validation phase. The newer backend-first continuation, driven by the consolidated API/UI/database decisions, has completed the first database/API foundation slices:

- normalized public trust and host foundations
- canonical form submission writes
- testimonial private metadata split
- shared server-side drafts for forms and widgets

The project is not yet at the main `web_v2` wiring pass. The correct path is to finish API-side canonical contracts and auxiliary surfaces first, then adapt `web_v2` to those contracts.

On 2026-05-03, the v1 product/architecture stance was locked: Clerk remains primary auth, Clerk Organizations become the workspace/account layer, Tresta projects remain the product/security boundary, v1 differentiates through in/out integrations and agent-native access, and original collected feedback remains immutable.

Also on 2026-05-03, the first two v1 control-plane implementation checkpoints landed: the Clerk organization/actor foundation is committed, and scoped private API keys plus scoped agent keys are committed in `apps/api_v2`.

On 2026-05-06, implementation paused for a fresh V2 security audit of the recently landed public trust, form submission, testimonial PII, draft, organization, and credential surfaces. The audit found no dependency advisories affecting the V2 workspaces and produced root hardening fixes for public-submit idempotency, invalid-submit throttling, and API-key prefix-collision handling. The UI gap map was refreshed against the new credential and agent-access API surface.

On 2026-05-08, V1 Task 3 landed the feedback integrity API surface. `CollectionFormSubmission` is now the immutable source record with workflow moderation state; annotations, display suggestions, and project actor audit rows are separate workflow/presentation layers. Agents and API keys can annotate, moderate, suggest display copy, and publish/unpublish only through scoped capability-gated routes; display-copy approval is restricted to user actors.

## Phase Ledger

### Original API Rebuild

| Phase | Status | Commit | Notes |
|---|---|---|---|
| 0 Discovery dossier | Done | `1e43be8` | Historical API rebuild discovery. |
| 1 Prisma schema refactor | Done | `bf05b49` | Initial v2 schema refactor. |
| 2 `api_v2` scaffolding and shared infra | Done | `6443bb6` | Nest v2 scaffold and shared infra. |
| 2.5 tooling hardening | Done | `b281279` | Nest CLI, ESLint, Prettier, smoke-start. |
| 2.6 `web_v2` Vitest compatibility | Done | `7a4d75d` | jest-dom to Vitest-native matcher cleanup. |
| 3a Users | Done | `35e8f08` | User domain. |
| 3b Projects | Done | `d8004b0` | Project domain and owner membership. |
| 3b.5 Public-route prerequisites | Done | `d562bb4` | Schema deltas, crypto, authz infra. |
| 3c Widgets | Done | `ecdea31` | Auth widgets, public embeds, public walls. |
| 3d Testimonials | Done | `5a9e784` | Auth and public testimonial APIs. |
| 3e Forms | Done | `88c200f` | Auth forms and public form submit. |
| 4a Webhooks | Done | `2de8edc` | Clerk and Razorpay idempotency ledgers. |
| 4b Alerts and ops/admin | Done | `f95e784` | Backend groundwork only; no `web_v2` wiring. |
| 5 Cross-cutting validation | Done | `cf4476f` | Validation-only close-out. |

### Backend-First API Surface Continuation

| Phase | Status | Commit | Notes |
|---|---|---|---|
| Gap map and locked decisions | Done | docs only | Consolidated in `docs/plans/2026-05-02-api-ui-db-gap-map consolidated.md`. |
| Implementation phase map | Done | docs only | Stored in `docs/plans/2026-05-02-api-surface-implementation-phases.md`. |
| 1 migration | Done | `01d0cae` | Phase 1 database foundation migration catch-up. |
| 1a Public trust and host models | Done | `8b8c4a3` | Trusted origins, signing secrets, hosted public-surface trust, route-aware public CORS. |
| 1b Canonical form submissions | Done | `0c9f618` | `CollectionFormSubmission` writes with rating, answers, trust, idempotency linkage. |
| 1c Testimonial private metadata | Done | `7aae66d` | Encrypted PII writes, hashed identifiers, public-submit PII removal, authenticated email compatibility shim. |
| 1d Studio drafts | Done | `c56cf68` | Shared `StudioDraft` service and form/widget `GET`/`PUT .../draft` endpoints with optimistic concurrency. |
| Phase 1 progress docs | Done | `0f14884` | Recorded Phase 1a-1d progress. |
| Continuity docs structure | Done | `b7c88cf` | Made `docs/continuity/` the canonical durable memory and doc map. |
| V1 control-plane plan | Planned | docs only | `docs/plans/2026-05-03-v1-auth-integrations-agent-access-implementation-plan.md` defines the next implementation track: Clerk org mirror, actor model, private/agent keys, outbound webhooks, exports, native integrations, MCP agent access, and friendly UX. |
| V1 Task 1 Clerk organization and actor foundation | Done | `ffae2cf` | Added local organization schema/migration, request actor context, current organization endpoint, org-aware project listing/creation/access checks, and v1 capability presets. |
| V1 Task 2 Scoped private API keys and agent keys | Done | `5ac7c34` | Added `ApiKeyType.AGENT`, project-bound scrypt-hashed private/agent keys, one-time secret responses, revocation/rotation/usage metadata, API-key actor auth, agent presets, and read/write scope capability mapping. |
| Deprecated design helper cleanup | Done | `63aec50` | Removed unused `docs/tresta_claude_design/src/*` helper module files. |
| Security audit refresh | Done | `0bc7bd1` | Fresh dependency/CVE and code audit before continuing V1 Task 3. Fixed surface-scoped public idempotency, invalid-submit and mode-specific public throttling, API-key prefix collision handling, and refreshed the UI gap map for credentials/agent access. |
| V1 Task 3 Feedback integrity APIs | Done | checkpoint commit | Added immutable submission workflow state, submission annotations/moderation APIs, testimonial display suggestions, human-only display approval, and project actor audit. |
| 1e Auxiliary product data | Partially complete | n/a | API key, agent key, and feedback integrity foundations are implemented. Remaining auxiliary slices: billing projections, notifications, analytics capture/rollups. |
| 2 Common API contracts | Pending | n/a | Access block, shared DTO/client contracts, errors, idempotency, concurrency conventions. |
| 3 Public surface API | Pending | n/a | Host-aware public rendering/submission and event capture. |
| 4 Studio API | Pending | n/a | Form/widget studio persistence and explicit mappings. |
| 5 Auxiliary API surfaces | Pending | n/a | Analytics, notifications, billing read projections, API keys. |
| 6 `web_v2` adaptation | Pending | n/a | Replace mocks and adapt UI to backend-canonical contracts. |
| 7 Verification and hardening | Pending | n/a | Security, performance, migration, and end-to-end checks. |

## Operational Notes

- Public form submissions now use `CollectionFormSubmission` as the canonical answer/rating/trust record.
- New public testimonial/form writes keep email, IP, and user agent out of `Testimonial`; sensitive raw values move to encrypted private metadata with normalized hashes.
- Public submit responses omit `authorEmail`; authenticated testimonial reads rehydrate it from private metadata with a legacy row fallback.
- Draft writes require `expectedVersion`; first save uses `expectedVersion: 0`; stale writes return `409 Conflict`.
- `web_v2` still has major mock-backed surfaces and should not be treated as wired.
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
- Broad `web_v2` wiring stays deferred until the remaining backend-canonical V1 differentiator surfaces are complete.

## Latest Verification

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

## Known Doc Drift

- `docs/plans/2026-05-02-api-surface-implementation-phases.md` has been annotated so its original starting point does not override this live ledger.
- `apps/api_v2/docs/orchestration/handoff.md` has been annotated so original-rebuild scope language does not override the current auxiliary-surface decisions.
- `memory/` and `docs/codex-claude-memory-migration.md` are historical context, not the live progress ledger.
- `docs/plans/2026-05-03-v1-auth-integrations-agent-access-implementation-plan.md` expands the earlier Phase 1e auxiliary product scope and should be treated as the current plan for auth, integrations, and agent access.

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
