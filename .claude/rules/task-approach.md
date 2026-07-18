# How to Take On a Task

## Before touching code

- Read the continuity ledger first (`docs/continuity/`) so you know the live
  state, locked decisions, and open questions. Never re-litigate a decision in
  `decisions.md` without the user.
- Understand before editing: trace the real flow end to end — every file the
  change touches — before picking a solution. A small diff in the wrong place
  is a second bug, not efficiency.
- Locate code via the exploration hierarchy (see `exploration.md`), not ad-hoc
  file reads.
- Stop and consult the user for business or architectural decisions: anything
  that changes product behavior, security posture, launch scope, or public
  contracts. Everything else, proceed.

## Choosing the solution

- Prefer, in order: delete the need for the code → reuse what exists in this
  repo → stdlib/platform feature → already-installed dependency → new code.
  Never add a dependency for what a few lines can do.
- Reuse > extend > create for UI components. If a shared primitive falls
  short, extend the primitive — never fork a per-page copy.
- Skills-first: before starting work a repo/user skill covers, invoke it.
  UI/design work routes through the design skills, testing through the testing
  skills, framework questions through the docs skills. Bypassing them is how
  off-system patterns get shipped.
- New UI pages start mocks-first: build against mocked data, defer API surface
  changes to a separate pass.

## Workflow

- Every task works through a fresh branch and pull request. No new task
  changes directly on `main`. Open the PR and drive it to mergeable per
  `pull-requests.md` before considering the task done.
- One checkpoint commit per named phase or subphase. Subagents do not commit —
  the orchestrator reviews, verifies, updates continuity docs, and commits.
- Fix lints in the slice that surfaces them; don't let warnings pile up.
  Format + lint before marking any phase done.
- Security is first-class on every change, not a later pass. Reference
  `docs/v2-security-audit-2026-04-29.md` for the standing watch items.
- Keep `docs/continuity/progress.md` current after every phase, verification
  close-out, or redirect. Locked choices go to `decisions.md`; unresolved
  ones to `open-questions.md`, not buried in chat.
- Before ending: run the gates in `verification.md`.
