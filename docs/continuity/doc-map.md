# Documentation Map

Last updated: 2026-05-03

Use this map to avoid chasing stale docs.

## Canonical

| Path | Use For |
|---|---|
| `docs/continuity/README.md` | Fresh-session boot path and continuity rules. |
| `docs/continuity/progress.md` | Live phase ledger, current checkpoint, next move, known doc drift. |
| `docs/continuity/decisions.md` | Locked decisions and superseded decisions. |
| `docs/continuity/open-questions.md` | User-owned or architecture-sensitive questions. |

## Supporting Source Docs

| Path | Use For | Notes |
|---|---|---|
| `AGENTS.md` | Hard repo rules, exploration hierarchy, delegation policy, verification gates. | Read first every session. |
| `docs/plans/2026-05-02-api-ui-db-gap-map consolidated.md` | Consolidated product/API/database decisions. | Still authoritative for reasoning behind backend-first work. |
| `docs/plans/2026-05-02-api-surface-implementation-phases.md` | Phase/subphase module map. | Starting point text is stale; use `progress.md` for live status. |
| `docs/plans/2026-05-03-v1-auth-integrations-agent-access-implementation-plan.md` | Current implementation plan for Clerk org tenancy, project credentials, outbound integrations, and agent-native access. | Tasks 1 and 2 are implemented; use after continuity docs when starting Task 3. |
| `apps/api_v2/docs/orchestration/handoff.md` | Original API rebuild details and commit hashes. | No longer the canonical live ledger. |
| `docs/tresta-v2-architecture-handoff-public-routes.md` | Public route, host, widget, testimonial, form architecture background. | Use when public surface contracts are touched. |
| `docs/v2-security-audit-2026-04-29.md` | V2 security audit evidence and watch items. | Use for security-sensitive changes. |
| `apps/api_v2/docs/orchestration/discovery.md` | Original API rebuild discovery snapshot. | Snapshot only; verify against live files. |

## Historical Or Archival

| Path | Status | Notes |
|---|---|---|
| `docs/codex-claude-memory-migration.md` | Historical migration layer. | Useful for old Claude memory context; superseded as start point by `docs/continuity/`. |
| `memory/MEMORY.md` | Archival repo memory. | Contains older state, much of it predates the current backend-first continuation. |
| `memory/decisions.md` | Archival decisions. | Older decisions may be superseded by `docs/continuity/decisions.md`. |
| `API_GAPS_FOR_V2.md` | Historical gap list. | Use only as background; current gap map lives under `docs/plans/`. |
| `docs/plans/2026-05-01-api-ui-db-gap-map.md` | Older gap map. | Superseded by the 2026-05-02 consolidated gap map. |
| `docs/plans/2026-05-01-web-v2-api-wiring-requirements.md` | Older UI wiring requirements. | Still useful for UI inventory, but current backend-first decisions supersede open questions where they conflict. |

## Rule For New Docs

New durable docs go under `docs/continuity/` unless they are implementation plans with a short shelf life. If a plan creates long-lived decisions or progress, copy the durable part into `decisions.md`, `progress.md`, or `open-questions.md`.
