# Documentation Map

Last updated: 2026-05-30

Use this map to avoid chasing stale docs.

## Canonical

| Path                                | Use For                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `docs/continuity/README.md`         | Fresh-session boot path and continuity rules.                      |
| `docs/continuity/progress.md`       | Live phase ledger, current checkpoint, next move, known doc drift. |
| `docs/continuity/decisions.md`      | Locked decisions and superseded decisions.                         |
| `docs/continuity/open-questions.md` | User-owned or architecture-sensitive questions.                    |

## Supporting Source Docs

| Path                                                                             | Use For                                                                                                                                                           | Notes                                                                                                                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                                                                      | Hard repo rules, exploration hierarchy, delegation policy, verification gates.                                                                                    | Read first every session.                                                                                                              |
| `docs/plans/2026-05-02-api-ui-db-gap-map consolidated.md`                        | Consolidated product/API/database decisions.                                                                                                                      | Still authoritative for reasoning behind backend-first work.                                                                           |
| `docs/plans/2026-05-08-web-v2-api-types-gap-inventory.md`                        | UI/API/shared-types gap inventory after the feedback integrity APIs.                                                                                              | Historical inventory; verify against `progress.md` and live code before reusing.                                                       |
| `docs/plans/2026-05-02-api-surface-implementation-phases.md`                     | Phase/subphase module map.                                                                                                                                        | Starting point text is stale; use `progress.md` for live status.                                                                       |
| `docs/plans/2026-05-03-auth-integrations-agent-access-implementation-plan.md` | Historical plan for Clerk org tenancy, project credentials, outbound integrations, native integrations, agent-native access, developer contracts, and `web_v2` friendly UX. | Implemented; keep for implementation evidence only. Current continuation is v2-only.                                                   |
| `docs/api/credential-model.md`                                                   | Credential/trust model for browser collection, server submit HMAC, private API keys, webhook signing, and agent keys.                                             | Use before wiring credential UX or public submit docs.                                                                                 |
| `docs/api/webhooks.md`                                                           | Outbound webhook verification headers, signature input, retry semantics, and event catalogue.                                                                     | Developer-facing webhook contract.                                                                                                     |
| `docs/api/agent-access.md`                                                       | Agent access routes, presets, MCP setup, and safety boundaries.                                                                                                   | Developer-facing MCP and agent key contract.                                                                                           |
| `docs/api/integrations.md`                                                       | CSV exports and native one-way Slack/Notion/Linear/GitHub export behavior.                                                                                        | Developer-facing integrations contract.                                                                                                |
| `docs/api/public-surfaces.md`                                                    | Public hostname resolution, default hosted origins, and public data route contract.                                                                               | Use before hosted public page wiring.                                                                                                  |
| `docs/api/analytics-notifications.md`                                            | Analytics summary/events and notifications route/preference contracts.                                                                                            | Use before analytics, bell, and account notification wiring.                                                                           |
| `docs/plans/2026-05-14-api-only-wiring-ui-deferrals.md`                          | API-only `web_v2` client/hook wiring coverage and the UI surfaces intentionally skipped because they require component or flow rework.                              | Current for the 2026-05-14 API-only wiring slice; fold durable conclusions back into `progress.md` as work lands.                      |
| `apps/api_v2/docs/orchestration/handoff.md`                                      | Original API rebuild details and commit hashes.                                                                                                                   | No longer the canonical live ledger.                                                                                                   |
| `docs/tresta-v2-architecture-handoff-public-routes.md`                           | Public route, host, widget, testimonial, form architecture background.                                                                                            | Use when public surface contracts are touched.                                                                                         |
| `docs/v2-security-audit-2026-04-29.md`                                           | V2 security audit evidence and watch items.                                                                                                                       | Use for security-sensitive changes.                                                                                                    |
| `apps/api_v2/docs/orchestration/discovery.md`                                    | Original API rebuild discovery snapshot.                                                                                                                          | Snapshot only; verify against live files.                                                                                              |

## Historical Or Archival

| Path                                                      | Status                        | Notes                                                                                                            |
| --------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `docs/codex-claude-memory-migration.md`                   | Historical migration layer.   | Useful for old Claude memory context; superseded as start point by `docs/continuity/`.                           |
| `memory/MEMORY.md`                                        | Archival repo memory.         | Contains older state, much of it predates the current backend-first continuation.                                |
| `memory/decisions.md`                                     | Archival decisions.           | Older decisions may be superseded by `docs/continuity/decisions.md`.                                             |
| `API_GAPS_FOR_V2.md`                                      | Historical gap list.          | Use only as background; current gap map lives under `docs/plans/`.                                               |
| `docs/plans/2026-05-01-api-ui-db-gap-map.md`              | Older gap map.                | Superseded by the 2026-05-02 consolidated gap map.                                                               |
| `docs/plans/2026-05-01-web-v2-api-wiring-requirements.md` | Older UI wiring requirements. | Still useful for UI inventory, but current backend-first decisions supersede open questions where they conflict. |

## Rule For New Docs

New durable docs go under `docs/continuity/` unless they are implementation plans with a short shelf life. If a plan creates long-lived decisions or progress, copy the durable part into `decisions.md`, `progress.md`, or `open-questions.md`.
