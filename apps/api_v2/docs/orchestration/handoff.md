# v2 API Rebuild — Orchestration Handoff

> Last updated: 2026-04-29. Branch: `revamp/v2`. Read this before picking up the v2 API rebuild in a new session.

## Mission

The v2 UI (`apps/web_v2`) is finalized and runs on mocked data. We are now rebuilding the **database** and **API surface** to back it. Claude operates as an **orchestrator**: it does not implement code directly — it commissions OpenCode-delegated subagents, verifies their output, and commits checkpoints.

- **Implementation model:** `github-copilot/gpt-5.4` (agent: `build`)
- **Heavy reading / discovery model:** `github-copilot/gpt-5.4-mini` (agent: `build`)
- **Dispatch tool:** `mcp__opencode__opencode_delegate_task`
- **Branch:** `revamp/v2` (do NOT branch off; one checkpoint commit per sub-phase)
- **Committer:** the orchestrator (Claude), never the subagent. Reason: any subagent can mess up; granular orchestrator-authored commits keep revert points clean.

## Locked decisions (do not re-ask)

| # | Decision | Notes |
|---|---|---|
| 1 | DB strategy: refactor + rename in place inside `packages/database/prisma/schema.prisma` | Destructive migrations are acceptable. Out-of-scope models stay untouched. |
| 2 | API strategy: greenfield reimplementation in `apps/api_v2` | Legacy `apps/api` keeps serving v1 until cutover. Do not invest in `apps/api`. |
| 3 | Branch + commits: stay on `revamp/v2`, checkpoint commit per sub-phase | Orchestrator commits, never the subagent. |
| 4 | In-scope domains this pass | **users, projects, widgets, testimonials, forms, webhooks, alerts, ops-admin**. Out of scope: billing/api-keys, notifications, dashboard analytics, audit logs. |
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
| 3a | Users domain implementation | ✓ done | `35e8f08` |
| 3b | Projects domain implementation | pending | — |
| 3c | Widgets domain implementation | pending | — |
| 3d | Testimonials domain implementation | pending | — |
| 3e | Forms domain implementation | pending | — |
| 4a | Webhooks (Clerk + Razorpay if added) | pending | — |
| 4b | Alerts + ops/admin | pending | — |
| 5 | Cross-cutting validation | pending | — |

Recommended sequencing for remaining phases (cleanest contract first, deepest last):
1. **3a Users** → cleanest. Mostly already wired; needs Clerk webhook upsert handler restored from `users.service.upsertFromClerk()`.
2. **3b Projects** → clean. Adds ProjectMember owner-row at create.
3. **3d Testimonials** → moderate. Mock-data shape is well-defined.
4. **4a Webhooks** → clean. Svix verification already working.
5. **3e Forms** → moderate. Studio config is now normalized as `FormConfig`; submission endpoint feeds testimonials.
6. **3c Widgets** → deepest. Normalized scalar columns; embed/wall public surface.
7. **4b Alerts + ops/admin** → groundwork only. No web_v2 client calls yet.
8. **5 Cross-cutting validation** → final.

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
3. **Dispatch via `mcp__opencode__opencode_delegate_task`** with `model_id: "gpt-5.4"` (or `gpt-5.4-mini` for read-only research) and `wait_timeout_ms: 1500000` (25 min — leaves margin under the 30 min cap).
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
- `cd apps/web_v2 && pnpm exec tsc --noEmit`
- `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`
- `pnpm build --filter web_v2` (CLAUDE.md says: "Do not end a session before this succeeds")
- `python scripts/update-indexes.py` (after any source change in web_v2 / api_v2 / packages)
- `python scripts/rebuild-graphify.py` (after any source change)

## Findings & concerns (from Phase 0–2)

- **`base-v2` orphans**: `apps/api_v2/dist/src/modules/base-v2/*` had compiled artifacts with no source counterpart in git history. Already deleted in Phase 1; future builds regenerate `dist/` clean.
- **`web_v2` widgets/forms UI uses local state, not API.** The studio editors mutate Zustand-style stores directly. The dossier's per-domain `api*` inventory for these two domains is sparse. The build agent in Phase 2 inferred conservative routes (`/v2/widgets`, `/v2/forms` CRUD + public/embed) based on legacy patterns. This will need contract validation when 3c/3e run.
- **Testimonials public surface inferred**: routes `POST /v2/testimonials/public/projects/:slug` and `GET /v2/testimonials/public/projects/:slug` were scaffolded based on legacy + dossier hints, not from a confirmed web_v2 client call.
- **Alerts + ops-admin have no web_v2 client calls.** They're scaffolded with placeholder `_status` endpoints. Phase 4b is groundwork only — schema + service contracts in service of future UI.
- **Razorpay webhooks scaffolded** even though monetization is out of scope. Reason: the legacy `apps/api` and the schema both already track payment webhook events, and the `webhooks` module is the natural home. Implementation is `NotImplementedException` until billing comes back into scope.
- **`pnpm-lock.yaml` is gitignored** in this repo (root `.gitignore` line 72). Don't be alarmed when dependency changes don't show up in `git status`.

## Open questions for the next session

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
- **If a phase exceeds 25 min wallclock**, the delegation will time out. Recovery path: `mcp__opencode__opencode_get_messages` on the session id, see how far it got, then either `opencode_send_message` to nudge it forward or commit partial work and re-dispatch with narrower scope.
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

This is a one-way street. The v2 API rebuild is a full rewrite; there is no plan to merge it back into the legacy `apps/api`. Do not attempt to backport changes from `revamp/v2` into `main` or vice versa. Treat `revamp/v2` as an isolated line of development until cutover.