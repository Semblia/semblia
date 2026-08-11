# Delegation — the subagent roster

Configs live in `.claude/agents/`. Descriptions there carry the routing detail; this
file is the cross-cutting contract that belongs to no single agent.

## Ownership boundary

Claude operates across the whole repo. Codex remains primary for substantial API, DB,
delivery, and infrastructure work — `assoc-api` exists only so a narrow backend edit
does not need a cross-agent handoff, and it hands back anything larger.

## The three rules that apply to every agent

1. **Subagents never commit.** The orchestrator reviews, updates continuity docs, and
   commits one checkpoint per named phase.
2. **Writers get `isolation: "worktree"`** when more than one runs at a time, or when a
   dev server holds `.next`/`dist`. Parallel writers on a shared tree EPERM.
3. **Reviewers are read-only.** No verification agent gets Edit/Write/Bash it does not
   need — write-capable reviewers have mutated the tree and killed dev servers here.

## Roster

| Tier | Agent | Called for |
|---|---|---|
| senior | `senior-design-review` | browser walk + taste critique, needs the stack up |
| senior | `senior-architect` | contract drift across app ↔ api ↔ packages ↔ env |
| senior | `senior-debug` | root cause + blast radius on a non-obvious defect |
| senior | `senior-security` | diff-scoped trust-boundary review |
| assoc | `assoc-pr` | drive a PR to mergeable |
| assoc | `assoc-app` | implement in `apps/app` |
| assoc | `assoc-api` | incidental backend edits only |
| assoc | `assoc-embed` | forms runtime / widgets / SDKs |
| assoc | `assoc-design-audit` | static canon audit, no stack needed |
| assoc | `assoc-test` | smallest regression test |
| assoc | `assoc-refactor` | wide mechanical edits, no behavior change |
| assoc | `assoc-docs` | continuity ledger + plan drift |
| intern | `intern-locate` | where does X live |
| intern | `intern-gates` | run gates, return only failures |
| intern | `intern-logs` | find a signal in a running process log |
| intern | `intern-libdocs` | current library docs via Context7 |

## Briefing

A subagent cannot see this conversation. Every delegation is a self-contained brief:
the goal, the files already known, the constraints that apply, and the return shape
expected. A vague brief costs more than doing the work inline.
