# Codex Handoff From Claude Memory

> Historical note: the canonical durable memory location is now `docs/continuity/`. Start with `docs/continuity/README.md` and `docs/continuity/progress.md`; use this file only for migrated Claude-era context.

Created on 2026-04-30 from:

- `C:\Users\anubhab\.claude\projects\C--workspace-semblia\memory\*.md`
- `<repo-root>\AGENTS.md`
- `<repo-root>\CLAUDE.md`
- `<repo-root>\.claude\settings*.json`
- `apps/api_v2/docs/orchestration/handoff.md`
- `apps/api_v2/docs/orchestration/discovery.md`
- `docs/semblia-v2-architecture-handoff-public-routes.md`
- `docs/v2-security-audit-2026-04-29.md`

This document is the Codex-readable migration layer for the Claude project memory. The original Claude sidecar files remain the source archive, but future Codex sessions should be able to start here without depending on Claude.

## Start Here

For historical Semblia v2 API context, read in this order:

1. `AGENTS.md`
2. `docs/continuity/README.md`
3. `docs/continuity/progress.md`
4. `docs/continuity/decisions.md`
5. `docs/continuity/open-questions.md`
6. This file, only when the migrated Claude memory is relevant
7. `apps/api_v2/docs/orchestration/handoff.md`, only for original API rebuild details
8. The relevant section of `apps/api_v2/docs/orchestration/discovery.md`
9. For public routes, widgets, testimonials, forms, or collaboration: `docs/semblia-v2-architecture-handoff-public-routes.md`
10. For security-sensitive changes: `docs/v2-security-audit-2026-04-29.md`

Treat `docs/continuity/progress.md` as the live phase ledger. Verify it against `git log --oneline -12` before continuing a phase. If the ledger and git history drift, update `docs/continuity/progress.md` before dispatching or implementing more work.

## User Preferences Migrated From Claude

- The user is building Semblia, a testimonial-management SaaS, and is currently focused on v2.
- They expect clear architectural decisions to be followed exactly. Do not invent contracts when an open question exists.
- They prefer project-first product architecture: no global dashboard by default; project-scoped workflows and routes are the center of the app.
- They prefer phased, reviewable delivery with one checkpoint commit per named phase. Do not consolidate phases into one commit.
- UI work should follow reuse-first discipline: reuse existing components, extend when a small variant is enough, create only when the existing primitives do not fit.
- New UI pages should use mocked data first, then wire APIs in a separate pass.
- Before marking any v2 API phase done, format and lint must pass in addition to typecheck, tests, and build.
- Security is now a continuous review dimension for every v2 API/web/database change, not a later audit sweep.

## Codebase Exploration Rules

The repo-level exploration hierarchy is mandatory:

- For exact file/function localization, start with `python scripts/codesearch.py query "<question>"`.
- For architecture, topology, or relationship questions, use `graphify query "<question>" --graph graphify-out/graph.json --budget 1200` and read `graphify-out/GRAPH_REPORT.md`.
- Cross-check with the secondary traversal when the primary result is ambiguous or multi-hop.
- Raw file reads are a last resort, except when the user explicitly asks for a named file/doc.

After modifying source files under `apps/web_v2`, `apps/api_v2`, or `packages`, run:

```bash
python scripts/update-indexes.py
```

For code changes that affect graphable source, also run:

```bash
python scripts/rebuild-graphify.py
```

## Current V2 API Phase State

At migration time, the working branch was `revamp/v2`. Claude's v2 API rebuild ledger and the repo handoff agree on this high-level state:

- Phase 0 discovery dossier: done.
- Phase 1 Prisma schema refactor: done.
- Phase 2 api_v2 scaffolding and shared infra: done.
- Phase 2.5 api_v2 tooling gates: done.
- Phase 2.6 web_v2 Vitest/jest-dom compatibility fix: done.
- Phase 3a Users: done.
- Phase 3b Projects: done.
- Phase 3b.5 public-route prerequisites: done.
- Phase 3d Testimonials: done.
- Phase 4a Webhooks: done.
- Phase 3e Forms: done.
- Phase 3c Widgets: pending and next in recommended sequencing.
- Phase 4b Alerts/ops-admin: pending.
- Phase 5 cross-cutting validation: pending.

Important: verify exact commit hashes from `apps/api_v2/docs/orchestration/handoff.md` before continuing. At migration time, recent phase commits included `d562bb4` for Phase 3b.5, `5a9e784` for Phase 3d, `2de8edc` for Phase 4a, and `88c200f` for Phase 3e.

## V2 API Orchestration Pattern

Claude had been operating as an orchestrator for the v2 API rebuild:

- Codex/Claude is the senior engineer/orchestrator: it owns security, quality, architecture, contracts, and verification, while the user retains business and architectural ownership.
- Simple to medium-complexity exploration, scaffolding, and bounded implementation should be delegated to OpenCode agents by default.
- The orchestrator should implement directly only when the work is extremely complex, tightly coupled, security/architecture-critical, or when delegation is unavailable or blocked.
- Implementation tasks were delegated to OpenCode.
- Heavy reading/discovery was delegated before implementation so build agents had a self-contained dossier.
- Delegated prompts had to include scope, locked decisions, deliverables, hard constraints, verification gates, and "do not commit".
- The orchestrator verified results with `git status` and diff samples before committing.
- One checkpoint commit per sub-phase is the recovery model.
- If a phase exceeds the OpenCode timeout, recover by inspecting messages, then either nudge the same session or re-dispatch with narrower scope.

For Codex, keep the same product discipline: self-contained briefs for delegated work, no blind trust in subagent reports, and checkpoint commits only after local verification.

## Verification Gates

For v2 API phases, the handoff makes these non-negotiable:

- Prisma format/generate/build when schema changes.
- api_v2 typecheck.
- api_v2 tests.
- api_v2 build.
- api_v2 lint with zero warnings.
- api_v2 format check with no diffs.
- web_v2 typecheck/lint/build when contracts or web-facing types change.
- root/package builds as required by the touched subpackage.
- `python scripts/update-indexes.py` after source changes under `apps/web_v2`, `apps/api_v2`, or `packages`.

Repo-specific web_v2 commands:

```bash
cd apps/web_v2 && pnpm exec tsc --noEmit
cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx
pnpm build --filter web_v2
```

## Locked Public Route And Collaboration Decisions

The public-route/collaboration architecture is locked by `docs/semblia-v2-architecture-handoff-public-routes.md` and supersedes older open questions in the discovery dossier where they conflict.

- Canonical testimonial public submit endpoint: `POST /v2/testimonials/public/projects/:slug`.
- One endpoint supports two trust modes: browser `Origin` allowlist or programmatic HMAC.
- If `X-Semblia-Signature` is present, perform HMAC verification first. A failed HMAC must hard-reject and must not fall back to `Origin`.
- HMAC algorithm: HMAC-SHA-256.
- Public submit requires replay protection and idempotency support.
- Browser public submit validates `Origin`, not `Host`.
- Allowed origins use strict origin equality. No wildcard matching.
- Default hosted origin is derived from `project.slug`, not redundantly stored.
- Custom-domain verification is shaped for later but not fully self-serve in this build pass.
- `Project.allowedOrigins` and encrypted project signing secret fields are part of the schema direction.
- Public-submit signing secrets are separate from `ApiKey`; do not reuse API-key semantics for HMAC signing.
- Public routes must use safe serializers/projections and must not leak verifier metadata or sensitive internals.
- Collaboration is project-scoped with `ProjectMember` and `MemberRole` (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`).
- Use hardcoded role-to-capability mapping in this phase, not a policy engine.
- Capability checks must distinguish review from publish authority.
- Widget/public wall configuration requires `manage_publish_surfaces`.

## Widgets Phase Notes

Phase 3c Widgets is the next v2 API implementation phase unless the handoff has changed.

Key constraints:

- Widgets are the deepest remaining domain because web_v2 currently uses local widget-studio state rather than a mature API contract.
- The discovery dossier says the UI exposes `apiGetWidgets(projectId)` but widget studio mutations are local-store driven.
- The final public widget/wall contract should not preserve early scaffolded legacy routes if they conflict with the public-routes handoff.
- Public embed addressing uses `widgetId` for embeddable widgets.
- Wall/public publish addressing uses `wallSlug` for hosted wall surfaces.
- Public wall reads must be clearly separate from authenticated widget management.
- `wallSlug` remains globally unique while public wall routes are slug-only.
- Public widget and wall payloads should use short TTL caching initially.
- Do not prematurely lock every widget-studio persistence detail. `docs/semblia-v2-architecture-handoff-public-routes.md` explicitly defers the canonical widget-studio persistence shape.
- Hosted surface domain conventions from the architecture handoff matter for 3c. Embeddable widgets stay script/embed-driven in this phase; hosted widget pages can be added later if promoted.

Before Phase 3c implementation, re-read:

- `apps/api_v2/docs/orchestration/discovery.md` Widgets section.
- `docs/semblia-v2-architecture-handoff-public-routes.md` sections 10, 11, 13.2, and 17.8.
- Current `apps/web_v2/lib/widgets/*` and `apps/web_v2/lib/api*.ts` through the repo exploration hierarchy.

## Security Watch

The 2026-04-29 v2 security audit found and remediated major issues, and this should remain active context:

- Clerk packages were upgraded after a critical advisory.
- Clerk token verification now supports `CLERK_AUTHORIZED_PARTIES` and `CLERK_JWT_AUDIENCE`.
- V2 CORS moved from open CORS to explicit `API_V2_CORS_ORIGINS`.
- `@nestjs/throttler` is used for server-side rate limiting.
- Razorpay webhook HMAC verification was added with raw-body verification.
- Next.js was upgraded to a patched range.
- `shadcn` was moved out of production dependencies.
- Historical widget-package audit findings were superseded when the legacy `packages/widget` workspace was removed from the v2-only repo line.

When changing controllers, endpoints, webhooks, auth paths, or public surfaces, explicitly check:

- authentication and authorization
- input validation
- rate limiting
- CORS/origin behavior
- signature verification
- idempotency/replay behavior
- secret storage and response projection

## Web V2 Architecture Memory

Older Claude memory contains useful web_v2 context:

- Project-first routing: after login, users go to `/projects`.
- No global dashboard as the default product shape.
- New features belong under `/projects/[projectSlug]/` unless they are account-wide.
- Route groups:
  - `(auth)` for login/signup/sso-callback
  - `(onboarding)` for profile/new-project/done
  - `(console)` for `/projects`
  - `(project-shell)` for `/projects/[projectSlug]/*`
  - `(account-shell)` for `/account/*`
- `(app)/layout.tsx` is auth guard only, not a global shell wrapper.
- `/sso-callback` is public and required for OAuth.
- Active project state is stored in Zustand via `stores/project-store.ts`; `ProjectStoreSync` syncs by slug.
- Active project cookie is `semblia-active-project`, 30-day, `SameSite=Lax`, path `/`.
- In Next.js 16, route/layout `params` is a Promise and must be awaited.
- Use generated `LayoutProps<"/projects/[projectSlug]">`/`PageProps` helpers where appropriate.
- `middleware.ts` is deprecated in this setup; use `proxy.ts`.
- Clerk is `@clerk/nextjs` v7, signals-based, with v7 sign-in/OAuth behavior.
- The design system from the "Lively rain" file uses token prefix `--t-*`, terracotta brand color `#C4563A`, Geist UI, Instrument Serif display/quotes, Geist Mono code, and tight radii (`sm=2px`, `md=6px`, `lg=8px`, `xl=12px`).

Older legacy Express v2 API notes in `project_web_v2.md` refer to `apps/api/src/routes/v2`. Do not use those as the source of truth for the current Nest `apps/api_v2` rebuild.

## Operational Gotchas

- If Nest 11 runtime startup fails with a misleading "Named export 'Reflector' not found" or similar `@nestjs/core` ESM/CJS-looking error, check for VS Code Console Ninja corruption before changing module architecture. The extension previously replaced `node_modules/.pnpm/@nestjs+core@*/node_modules/@nestjs/core/index.js` with a tiny build-hook shim. Recovery was disabling/excluding Console Ninja for `node_modules/**`, then `pnpm install --force`.
- The Clerk MCP was configured in Claude as `claude mcp add clerk --transport http https://mcp.clerk.com/mcp`; use Clerk tooling when auth config, users, OAuth, JWT templates, or webhook endpoints need inspection.
- The repo has `.claude/settings.local.json` permissions for OpenCode MCP operations. This is a clue to preferred orchestration, not proof that Codex has the same MCP tools loaded.
- `graphify-out/GRAPH_REPORT.md` on 2026-04-30 showed major v2 abstractions including `BaseV2Service`, `ProjectsService`, `FormsService`, `Widget`, `AppModule`, `ClerkAuthGuard`, `ApiError`, public testimonials/forms controllers, and OpenCode delegation utilities.

## Source Memory Inventory

Claude memory files migrated:

- `MEMORY.md`: index for all Claude memory files.
- `user.md`: user profile and project-first preferences.
- `project_web_v2.md`: web_v2 routing, shells, Clerk v7, design tokens, onboarding, and older legacy v2 API notes.
- `project_v2_api_handoff.md`: v2 API rebuild ledger and current phase state.
- `project_v2_public_routes_architecture.md`: locked public submit, widget public addressing, collaboration, and pre-3d schema/authz decisions.
- `feedback_commits_and_reuse.md`: per-phase commits and UI component reuse policy.
- `feedback_mocks_first.md`: mocked-data-first UI development.
- `feedback_orchestrator_mode.md`: OpenCode-delegated v2 API rebuild workflow.
- `feedback_format_before_phase.md`: permanent format/lint gates before phase completion.
- `feedback_v2_security_watch.md`: continuous v2 security review posture.
- `reference_clerk_mcp.md`: Clerk MCP setup and usage.
- `reference_console_ninja_corruption.md`: Console Ninja node_modules corruption diagnosis and recovery.

## Session Kickoff Checklist For Future Codex

When continuing v2 API work:

1. Confirm current branch and status with `git branch --show-current` and `git status --short`.
2. Read `apps/api_v2/docs/orchestration/handoff.md`.
3. Verify the phase ledger against `git log --oneline -12`.
4. If working on architecture, read `graphify-out/GRAPH_REPORT.md` and query graphify.
5. If targeting exact files, run `python scripts/codesearch.py query "<question>"`.
6. Re-read the relevant discovery-domain section and current web_v2 client/store files.
7. Apply public-route/security decisions from the architecture and security docs.
8. Keep phase boundaries crisp; commit each named phase separately only after gates pass.
