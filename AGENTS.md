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

## Scoped rules — read before editing the matching area

- `apps/web_v2` → `.claude/rules/web-v2.md`; UI work also
  `.claude/rules/design-system.md`
- `apps/api_v2` → `.claude/rules/api-v2.md`
- test files → `.claude/rules/testing.md`
- any debugging session → `.claude/rules/debugging.md`

Nested `AGENTS.md` files in `apps/*` repeat these pointers for their subtree.

## Codex-specific: orchestration & delegation

Codex acts as the senior engineer/orchestrator: owns security, quality,
architecture, contracts, and verification. Delegate simple-to-medium
exploration, scaffolding, and bounded implementation to native Codex
subagents via the `multi_agent_v1` flow when available; implement directly
only when work is extremely complex, tightly coupled,
security/architecture-critical, or delegation is blocked. Preserve user
ownership: stop and consult for business or architectural decisions.
Delegated runs take time — wait for the subagent instead of intervening; use
the native session/status surface for progress.

Model selection ladder:

1. `gpt-5.4` — all implementation, code review, architecture design
2. `gpt-5.4-mini` — exploration, scaffolding, simple implementations
3. Code reviews by the orchestrating model; delegable to `gpt-5.4` for
   non-critical code or when the orchestrator is overloaded
4. `claude-sonnet-4.6` — UI/UX design, copywriting, non-code tasks

Always pick the highest reasoning variant (`xhigh` for gpt-5.4/-mini, `high`
for claude-sonnet-4.6) for delegated tasks; expect latency and be patient.

Historical context only: `docs/codex-claude-memory-migration.md` (the
Claude → Codex handoff snapshot). `docs/continuity/` supersedes it.
