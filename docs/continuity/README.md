# Semblia Continuity Memory

Last updated: 2026-06-13

This directory is the canonical durable memory for Semblia v2 work. It exists so a fresh stateless agent can recover the current state without chasing scattered handoff files, old plans, app-local notes, or assistant-side memory.

## Start Here

At the start of every Semblia v2 session, read these in order:

1. `AGENTS.md` for hard repo rules, exploration hierarchy, verification gates, and delegation policy.
2. `docs/continuity/README.md` for the continuity system.
3. `docs/continuity/progress.md` for the live phase ledger and next checkpoint.
4. `docs/continuity/decisions.md` for locked product, architecture, security, and process decisions.
5. `docs/continuity/open-questions.md` for decisions that still need user input.
6. `docs/continuity/doc-map.md` only when deeper historical context is needed.

The legacy `apps/api`, `apps/web`, and `packages/widget` workspaces have been removed. Current continuation work should stay on the v2-only workspaces listed in `progress.md`; use older plans only as historical evidence, especially where they mention removed legacy/projection database surfaces such as the old `Testimonial` table.

Before implementation, verify the live progress ledger against:

```bash
git status --short --branch
git log --oneline -12
```

If git and `docs/continuity/progress.md` disagree, update the progress ledger before dispatching agents or writing code.

## Canonical Files

| File                | Purpose                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| `progress.md`       | Live state, phase ledger, current checkpoint, latest verification, known drift. |
| `decisions.md`      | Locked decisions that should not be re-litigated without the user.              |
| `open-questions.md` | Pending user/business/architecture choices, grouped by phase.                   |
| `doc-map.md`        | Index of older docs and whether they are canonical, supporting, or archival.    |

## Maintenance Rules

- Keep `docs/continuity/progress.md` current after every phase, subphase, verification close-out, or important redirect.
- Add new locked choices to `docs/continuity/decisions.md` with date, owner, and source.
- Add unresolved user/business/architecture choices to `docs/continuity/open-questions.md` instead of burying them in chat.
- Do not create new long-lived handoff ledgers outside `docs/continuity/`.
- Older docs can stay where they are for evidence and detail, but this directory decides which one is current.
- For progress reports, use the format in `progress.md`: status, completed since last checkpoint, current work, next move, blockers, verification, and doc drift.

## Operating Model

Codex/Claude is the senior engineer and orchestrator for v2: own security, quality, architecture, contracts, and verification. Delegate simple to medium-complexity exploration, scaffolding, and bounded implementation to native Codex subagents through the `multi_agent_v1` flow when available. Keep business and architecture ownership with the user: stop and ask when a decision changes product behavior, security posture, launch scope, or public contracts.

One checkpoint commit per named phase or subphase remains the recovery model. Subagents do not commit. The orchestrator reviews, verifies, updates continuity docs, and commits.
