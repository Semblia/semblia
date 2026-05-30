# v2 API Rebuild — Orchestration Handoff

> Canonical continuity note: `docs/continuity/progress.md` is now the live phase ledger. This file remains supporting evidence for the original API rebuild and related commit details.

> Last updated: 2026-05-02. Branch: `revamp/v2`. Read this before picking up the v2 API rebuild in a new session.

> Current continuation note: the latest live checkpoint is tracked in `docs/continuity/progress.md`. As of the latest doc refresh, Phase 1a through 1d of the backend-first continuation are complete, `docs/continuity/` is the canonical durable memory, and the next implementation checkpoint is Phase 1e auxiliary product data.

## Mission

The v2 UI (`apps/web_v2`) is finalized and runs on mocked data. We are now rebuilding the **database** and **API surface** to back it. Claude/Codex operates as a **senior engineer/orchestrator**: it owns security, quality, architecture, contracts, and verification; delegates simple to medium-complexity exploration, scaffolding, and bounded implementation to native Codex subagents through the `multi_agent_v1` flow; and implements directly only when the work is extremely complex, tightly coupled, security/architecture-critical, or delegation is unavailable/blocked. The user retains business and architectural ownership, so stop and consult before making those decisions.

- **Historical implementation model from original rebuild:** `github-copilot/gpt-5.4` (agent: `build`)
- **Historical heavy reading / discovery model from original rebuild:** `github-copilot/gpt-5.4-mini` (agent: `build`)
- **Live model selection policy:** follow `AGENTS.md`; use native Codex subagents through `multi_agent_v1` when delegation is appropriate.
- **Dispatch tool from original rebuild:** `mcp__opencode__opencode_delegate_task`
- **Branch:** `revamp/v2` (do NOT branch off; one checkpoint commit per sub-phase)
- **Committer:** the orchestrator (Claude), never the subagent. Reason: any subagent can mess up; granular orchestrator-authored commits keep revert points clean.

## Locked decisions from the original rebuild (do not re-ask for that scope)

The current backend-first continuation has superseded some scope boundaries here, especially auxiliary surfaces. Read `docs/continuity/decisions.md` before treating this table as current launch scope.

| # | Decision | Notes |
|---|---|---|
| 1 | DB strategy: refactor + rename in place inside `packages/database/prisma/schema.prisma` | Destructive migrations are acceptable. Out-of-scope models stay untouched. |
| 2 | API strategy: greenfield reimplementation in `apps/api_v2` | Historical original-rebuild context. The legacy `apps/api` tree has since been removed from this v2-only repo line. |
| 3 | Branch + commits: stay on `revamp/v2`, checkpoint commit per sub-phase | Orchestrator commits, never the subagent. |
| 4 | In-scope domains for the original rebuild pass | **users, projects, widgets, testimonials, forms, webhooks, alerts, ops-admin**. Billing/api-keys, notifications, dashboard analytics, and audit logs were out of scope for that completed pass; current continuation scope is tracked in `docs/continuity/decisions.md`. |
| 5 | Widget DB shape | **Fully normalized columns.** Studio code flattens/expands. Schema landed in Phase 1. |
| 6 | Form config | **Single Json column on `CollectionForm.config`.** Canonical type name is `FormConfig` (not `StudioConfig`) across UI/API/DB. Legacy `FormConfig` shape is dropped. |
| 7 | Tenancy | **`ProjectMember` table now**, single-owner-by-default. `MemberRole` enum (OWNER/ADMIN/EDITOR/VIEWER). Owner row is added by API at project creation in Phase 3b. |
| 8 | `User.id` | Clerk id is the PK verbatim. No `@default(cuid())`. |
| 9 | `base-v2` module | **Ignored entirely.** Treat as clean slate. Shared utilities live under `apps/api_v2/src/common/` (filter, interceptor, pipe, dto, utils). |
| 10 | Out-of-scope Prisma models | Left as-is. Don't refactor billing/notifications/etc. unless an in-scope relation forces a touch. |

## Phase ledger

| Phase | Description | Status | Commit |
|---|---|---|---|
| 0 | Discovery dossier (gpt-5.4-mini) | ✓ done | `1e43be8` |
| 1 | Prisma schema refactor (gpt-5.4) | ✓ done | `bf05b49` |
| 2 | api_v2 scaffolding + shared infra (gpt-5.4) | ✓ done | `6443bb6` |
| 2.5 | api_v2 tooling hardening (Nest CLI + ESLint + Prettier + smoke-start) | ✓ done | `b281279` |
| 2.6 | web_v2 jest-dom → vitest-native matchers (vitest 4 incompat) | ✓ done | `7a4d75d` |
| 3a | Users domain implementation | ✓ done | `35e8f08` |
| 3b | Projects domain implementation | ✓ done | `d8004b0` |
| 3b.5 | Public-routes prerequisites: schema deltas + crypto/authz infra | ✓ done | `d562bb4` |
| 3c | Widgets domain implementation | ✓ done | `ecdea31` |
| 3d | Testimonials domain implementation | ✓ done | `5a9e784` |
| 3e | Forms domain implementation | ✓ done | `88c200f` |
| 4a | Webhooks (Clerk + Razorpay if added) | ✓ done | `2de8edc` |
| 4b | Alerts + ops/admin | ✓ done | `f95e784` |
| 5 | Cross-cutting validation | ✓ done | `cf4476f` |

## 2026-05-02 backend-first API surface foundation

The current implementation source for the backend-first continuation is:

- `docs/plans/2026-05-02-api-ui-db-gap-map consolidated.md`
- `docs/plans/2026-05-02-api-surface-implementation-phases.md`

Phase 1a through 1d are now implemented and checkpointed on `revamp/v2`:

| Phase | Description | Status | Commit |
|---|---|---|---|
| 1 migration | Phase 1 database foundation migration catch-up | ✓ done | `01d0cae` |
| 1a | Public trusted origins, signing secrets, hosted public-surface trust, route-aware public CORS | ✓ done | `8b8c4a3` |
| 1b | Canonical `CollectionFormSubmission` writes for public form submit, with rating/answer/trust/idempotency linkage | ✓ done | `0c9f618` |
| 1c | `TestimonialPrivateMetadata` service, encrypted PII writes, hashed identifiers, public-submit PII removal, authenticated email compatibility shim | ✓ done | `7aae66d` |
| 1d | Shared `StudioDraft` service and `GET`/`PUT .../draft` endpoints for forms and widgets with optimistic concurrency | ✓ done | `c56cf68` |
| Phase 1 progress docs | Record Phase 1a-1d progress in the canonical continuity ledger | ✓ done | `0f14884` |
| Continuity docs structure | Establish `docs/continuity/` as canonical durable memory and doc map | ✓ done | `b7c88cf` |
| 1e | Auxiliary product data: API keys, billing projections, notifications, analytics capture/rollups | pending | n/a |

Operational notes:

- Public form submissions no longer store arbitrary answers only on testimonial rows. `CollectionFormSubmission` is the canonical source.
- New public testimonial/form submission writes keep email, IP, and user agent out of `Testimonial`; raw values are encrypted into `TestimonialPrivateMetadata` and normalized hashes are stored for abuse/support workflows.
- Public submit responses intentionally omit `authorEmail`; authenticated testimonial reads rehydrate `authorEmail` from private metadata while legacy row data remains as a compatibility fallback.
- Draft writes require `expectedVersion`; first save uses `expectedVersion: 0`, then each successful save increments `version`. Stale writes return `409 Conflict`.

Historical sequencing from the original API rebuild (completed):
1. **3a Users** → ✓ done.
2. **3b Projects** → ✓ done. Adds ProjectMember owner-row at create.
3. **3b.5 Public-routes prerequisites** → ✓ done. Schema deltas + crypto + capability guard (read `docs/tresta-v2-architecture-handoff-public-routes.md`).
4. **3d Testimonials** → ✓ done. `/v2/projects/:slug/testimonials/*` (capability-guarded) + canonical public submit/list at `/v2/testimonials/public/projects/:slug` with HMAC waterfall, Origin allowlist (derived default + stored allowlist), idempotency ledger (replay/409), 60s Redis-cached safe-projection list, split rate-limit buckets (10/min browser, 120/min HMAC), auto-mod honoring `project.autoModeration` + `autoApproveVerified`.
5. **4a Webhooks** → ✓ done. Idempotent ledger writes for Clerk (`ClerkWebhookEvent` keyed on `svix-id`) and Razorpay (`PaymentWebhookEvent`, deterministic `providerEventId = sha256(event.created_at.rawBody).slice(0,64)`); Razorpay is purely scaffolded (no billing logic), Clerk re-runs `upsertFromClerk` only on first delivery or after a previously-`failed` row, short-circuits otherwise. Svix + HMAC signature verification untouched.
6. **3e Forms** → ✓ done. Project-scoped CRUD `/v2/projects/:slug/forms[/:formId]` (MANAGE_PROJECT). Public render `GET /v2/forms/public/projects/:slug` (active forms only, safe projection, 60s Redis cache, single key per slug). Public submit `POST /v2/forms/public/projects/:slug/:formId/submissions` reuses the testimonials `PublicSubmitTrustService` + throttler guard, the `PublicSubmitIdempotency` ledger (24h, 409 on payload mismatch), and the same auto-mod policy — creates a `Testimonial` with `formId` set and busts the public testimonials cache. Submission flow duplicates the testimonials create path intentionally; consolidation is a follow-up. `body.answers` is validated but not yet persisted.
7. **3c Widgets** → ✓ done. Project-scoped CRUD `/v2/projects/:slug/widgets[/:widgetId]` (MANAGE_PUBLISH_SURFACES). Public embed payload `GET /v2/widget-embeds/:widgetId` and public wall payload `GET /v2/walls/:wallSlug` are split from dashboard management, use safe testimonial projections without author emails, short Redis TTL caching, normalized/reserved-word-protected global wall slugs, and best-effort cache busting on mutations. Hosted widget pages remain deferred; embeddable widgets stay script/embed-driven.
8. **4b Alerts + ops/admin** → groundwork only. No web_v2 client calls yet.
9. **5 Cross-cutting validation** → final.

## Files of record

- `apps/api_v2/docs/orchestration/discovery.md` — full v2 contract dossier (1595 lines). **The contract source for every domain.** Do not regenerate; iterate on it if needed.
- `apps/api_v2/docs/orchestration/handoff.md` — this file.
- `packages/database/prisma/schema.prisma` — schema source of truth (Phase 1 result).
- `apps/api_v2/src/common/` — shared infra. Filter / interceptor / Zod pipe / pagination DTO / paginate / slugify.
- `apps/api_v2/src/modules/<domain>/` — domain skeletons. Service methods throw `NotImplementedException` until their phase runs.
- Memory pointer: `feedback_orchestrator_mode.md` (auto-loaded) — describes orchestrator workflow.

## Orchestration playbook (per phase)

1. **Update `TaskList`** — set the phase to `in_progress`, owner = `orchestrator`.
2. **Write a self-contained brief** for the build agent. It has zero context. Include:
   - Locked decisions verbatim
   - Reference to `discovery.md` as contract source
   - Exact deliverables + file paths
   - Hard constraints (don't touch X, don't commit, don't add deps)
   - Verification gates (the agent runs them, reports PASS/FAIL)
   - "Stop and report; do not commit broken state" clause
3. **Dispatch via native Codex subagents (`multi_agent_v1`)** with `gpt-5.4` for implementation or `gpt-5.4-mini` for read-only research, using the highest available reasoning variant.
4. **Verify the agent's report.** Run:
   - `git status --short` — confirm scope is what was promised
   - `git diff --stat` — confirm no unintended sprawl
   - Sample 1–2 representative files to confirm quality
   - **Do not** re-run all gates yourself; trust the agent's report unless something looks off
5. **Commit** with a HEREDOC message summarizing the phase, its locked decisions, and the green gates. End with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
6. **Mark task `completed`** in TaskList.

## Verification gates (per CLAUDE.md hard constraints)

These are non-negotiable; every build phase must end with all of these green:
- `cd packages/database && pnpm exec prisma format && pnpm exec prisma generate && pnpm build` (only when schema touched)
- `cd apps/api_v2 && pnpm exec tsc --noEmit -p tsconfig.json`
- `cd apps/api_v2 && pnpm test`
- `cd apps/api_v2 && pnpm build`
- `cd apps/api_v2 && pnpm lint` (added Phase 2.5 — must pass with zero warnings)
- `cd apps/api_v2 && pnpm format:check` (added Phase 2.5 — Prettier must show no diffs)
- `cd apps/web_v2 && pnpm exec tsc --noEmit`
- `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`
- `pnpm build --filter web_v2` (CLAUDE.md says: "Do not end a session before this succeeds")
- `python scripts/update-indexes.py` (after any source change in web_v2 / api_v2 / packages)
- `python scripts/rebuild-graphify.py` (after any source change)

**Format-before-finish rule (added 2026-04-29):** Every phase brief must explicitly run `pnpm format` (Prettier) and the lint command before reporting green gates. The orchestrator must also re-format if it makes any post-agent edits. No phase commits with formatting drift.

## Findings & concerns (from Phase 0–2)

- **`base-v2` orphans**: `apps/api_v2/dist/src/modules/base-v2/*` had compiled artifacts with no source counterpart in git history. Already deleted in Phase 1; future builds regenerate `dist/` clean.
- **`web_v2` widgets/forms UI uses local state, not API.** The studio editors mutate Zustand-style stores directly. The dossier's per-domain `api*` inventory for these two domains is sparse. The build agent in Phase 2 inferred conservative routes (`/v2/widgets`, `/v2/forms` CRUD + public/embed) based on legacy patterns. This will need contract validation when 3c/3e run.
- **Testimonials public surface inferred**: routes `POST /v2/testimonials/public/projects/:slug` and `GET /v2/testimonials/public/projects/:slug` were scaffolded based on legacy + dossier hints, not from a confirmed web_v2 client call.
- **Alerts + ops-admin have no web_v2 client calls.** They're scaffolded with placeholder `_status` endpoints. Phase 4b is groundwork only — schema + service contracts in service of future UI.
- **Razorpay webhooks scaffolded** even though monetization is out of scope. Historical reason: the former legacy API and the schema both tracked payment webhook events, and the `webhooks` module was the natural home. Implementation was left inert until billing returned to scope.
- **`pnpm-lock.yaml` is gitignored** in this repo (root `.gitignore` line 72). Don't be alarmed when dependency changes don't show up in `git status`.

## Open questions for the next session

Historical note: the table below records original rebuild questions and answers. Current open questions live in `docs/continuity/open-questions.md`.

Ask the user before dispatching the listed phase:

| Phase | Question | Answer |
|---|---| --- |
| 3b (Projects) | Should `/v2/projects/:slug/members` (list/add/remove) endpoints ship in 3b or be held for a follow-up since web_v2 has no membership UI yet? Default plan: scaffold them in 3b, return real data, no UI consumer required. | Keep the endpoints ready. We shall add the UI in future refinements. |
| 3c (Widgets) | Confirm widget public-embed route shape. Phase 2 scaffolded `/v2/widgets/:widgetId/public`, `/v2/widgets/walls/:wallSlug`, and `/v2/widgets/embed/:widgetId` based on legacy. Are those the right URLs? | We will adopt a new architecture of subdomain hostings. Or custom domains if the user add and verifies one. No legacy URLs will be used. The default subdomains will be at `<project-slug>.<feature[forms \| widgets \| walls]>.tresta.app` and an embed code for each widget will be provided. An SDK is also planned, but I need more research to start that development. |
| 3d (Testimonials) | Confirm public submission route is `POST /v2/testimonials/public/projects/:slug` (slug-keyed, no API key) — or should it require an embed token / API key? | We will provide with self hosted endpoints, or a custom domain like how clerk operates. So, we will need to handle both the situations, the one where we are ones that hosts and collects the forms, and also, another way for the public endponits, that a user will send requests to programatically. If one single endpoint is able to handle both cases, well and good. But it would be better to actually follow the best priciples. |
| 3e (Forms) | Same question for `POST /v2/forms/:formId/submissions` — is this expected to be unauthenticated and rate-limited only, or token-gated? | Same as above. |
| 4a (Webhooks) | Razorpay webhook is scaffolded but billing is out of scope. Implement now (idempotency + ledger only, no business logic) or stub it until billing returns? | Purely scaffold now. |
| 4b (Alerts/ops) | These have no web_v2 client calls. Confirm the orchestration plan: implement read-only Slack delivery + alert config persistence, leave UI surface entirely for a later pass. | Implement read-only Slack delivery + alert config persistence, leave UI surface entirely for a later pass. |
| Cadence | Run remaining phases on autopilot (one delegation each, sequential, with checkpoint commits — user can revert any), or pause between phases for review? |  Pause between phases for review. |

## Open questions for future-me (Claude)

- **Validate the dossier before each domain phase.** Re-read the relevant section of `discovery.md` and the actual web_v2 client file (`apps/web_v2/lib/api*.ts`, plus any per-domain stores in `apps/web_v2/lib/<domain>/`). The dossier is a snapshot from 2026-04-29; if web_v2 evolves, the contract may drift.
- **Don't trust the build agent's "all gates green" without spot-checking the diff.** Sample one controller and one DTO per domain; verify the contract matches the dossier; only then commit.
- **If a delegated phase exceeds its wallclock budget**, inspect the native Codex subagent session/status output for the `multi_agent_v1` run, see how far it got, then either send a follow-up through the same native subagent channel or commit verified partial work and re-dispatch with narrower scope.
- **Cross-cutting renames** (like the `StudioConfig` → `FormConfig` rename in Phase 1) are touchy across web_v2 + api_v2 + database. Have the agent grep first, then list every file before editing — guard against half-finished renames.
- **The `dist/` directory is gitignored**, so `git status` won't show stale build artifacts. After any schema change, manually `rm -rf apps/api_v2/dist` to avoid Vitest picking up stale output.

## Reverting a bad phase

Each phase is exactly one commit. To roll back the latest phase:

```bash
git reset --hard HEAD~1
```

Then update `TaskList` to mark the phase `pending` again and re-dispatch with a corrected brief. This is the entire failure-recovery loop — no migrations have been run against a real DB by the agents, so the working tree + git is the only state.

## When to add a new phase

If a delegated agent surfaces a contract gap that requires a separate cross-cutting change (e.g., "widgets need a new column"), don't fold it into the current phase. Stop, file a new task between the current phase and the next, and dispatch it as its own checkpoint commit. Phases are atomic for a reason.

## Final note

This is a one-way street. The v2 API rebuild is a full rewrite; the legacy API tree has since been removed from this repo line. Do not attempt to backport changes from `revamp/v2` into `main` or vice versa.
