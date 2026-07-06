# CLAUDE.md

Repo rules are modular and live in `.claude/rules/` — Claude Code auto-loads
them (path-scoped rules load only when touching matching files). This file is
the session-start checklist only. **Do not grow this file**: new guidance goes
into an existing rule file, or a new one if it's a genuinely new topic. Codex
enters the same rulebook via `AGENTS.md`.

## Session start

1. Read the canonical durable memory: `docs/continuity/README.md`,
   `progress.md`, `decisions.md`, `open-questions.md`.
2. Verify the ledger against `git status --short --branch` and
   `git log --oneline -12`; if they disagree, update `progress.md` before
   writing code.

## Rulebook map (`.claude/rules/`)

Always loaded:

- `task-approach.md` — how to take on a task: workflow, branching, skills-first, commits
- `exploration.md` — how to find code: codesearch/graphify hierarchy, index upkeep
- `debugging.md` — how to debug: method + known repo failure modes
- `verification.md` — gates before done: build, runtime checks, test credentials

Path-scoped (load when touching matching files):

- `web-v2.md` — `apps/web_v2` framework constraints + commands
- `api-v2.md` — `apps/api_v2` process model, queues, security, contracts
- `design-system.md` — UI taste rules; canon in `.impeccable.md` + `docs/DESIGN.md`
- `testing.md` — test conventions
