# AGENTS.md

The canonical rulebook is `.claude/rules/` — one topic per file, shared by
Claude Code (auto-loaded) and Codex (read per this file). Do not duplicate
rule content here; change the rule files instead.

## Session start — required reading, in order

1. `docs/continuity/README.md`, `progress.md`, `decisions.md`,
   `open-questions.md` — canonical durable memory. Verify the ledger against
   `git status` / `git log -12` before implementing.
2. `.claude/rules/task-approach.md` — workflow, branching, commit model
3. `.claude/rules/exploration.md` — codebase search hierarchy, index upkeep
4. `.claude/rules/verification.md` — gates before done, test credentials
5. `.claude/rules/pull-requests.md` and
   `.claude/rules/pr-quality-gates.md` — PR readiness, recurring-defect
   checklist, local reviewers, review-thread sweep, and `mergeStateStatus`
   proof before done

## Scoped rules — read before editing the matching area

- `apps/app` → `.claude/rules/app.md`; UI work also
  `.claude/rules/design-system.md`
- `apps/api` → `.claude/rules/api.md`
- test files → `.claude/rules/testing.md`
- any debugging session → `.claude/rules/debugging.md`

Nested `AGENTS.md` files in `apps/*` repeat these pointers for their subtree.
