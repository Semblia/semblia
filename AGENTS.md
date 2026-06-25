# AGENTS.md

Session start checklist:

- Codebase exploration MUST follow the intent-routed hierarchy below.
- Canonical durable memory now lives in `docs/continuity/`. For Semblia v2 continuation, read `docs/continuity/README.md`, `docs/continuity/progress.md`, `docs/continuity/decisions.md`, and `docs/continuity/open-questions.md` before starting implementation. Older handoff docs are supporting evidence, not the live ledger.
- For Semblia v2 API continuation after the Claude -> Codex handoff, use `docs/codex-claude-memory-migration.md` only as historical migration context. It captures migrated Claude project memories, phase cadence, public-route decisions, and security watch items, but `docs/continuity/` is the canonical start point.
- For Semblia v2 API work, Codex/Claude acts as the senior engineer/orchestrator: owns security, quality, architecture, contracts, and verification; delegates simple to medium-complexity exploration, scaffolding, and bounded implementation to native Codex subagents through the `multi_agent_v1` flow when available; and implements directly only when the work is extremely complex, tightly coupled, security/architecture-critical, or delegation is unavailable/blocked. Preserve user ownership: stop and consult the user for business or architectural decisions. The implementations or explorations might take time, so wait for the subagent to respond before intervening. If you want a status report, use the native Codex subagent session/status surface for the `multi_agent_v1` run.
  - For model selections, prefer this checklist order:
    1. gpt-5.4 for all implementation work, including code generation, code review, and architecture design.
    2. gpt-5.4-mini for codebase exploration, scaffolding, and simple implementations.
    3. Code reviews are to be done by the orchestrating model (Codex/Claude) to ensure quality and security standards, but can be delegated to a native Codex subagent on gpt-5.4 for non-critical code or when the orchestrator is overloaded.
    4. claude-sonnet-4.6 for UI/UX design, copywriting, and other non-code tasks.
  - Always opt for the highest variant (e.g. `xhigh` for gpt-5.4 and gpt-5.4-mini or `high` for claude-sonnet-4.6) for delegation tasks. This will also significantly increase latency, so be patient and wait for the agent to complete before intervening or asking for status updates.

## Codebase Exploration — Intent-Routed Hierarchy

Benchmark snapshot (2026-04-16, 15 canonical retrieval cases):

- Vector (`scripts/codesearch.py`): Top-6 hit 100%, MRR 0.833, median latency 3.70s
- Graphify (`graphify query`): Top-6 hit 53.3%, MRR 0.258, median latency 0.39s, ~4.0x token reduction

**Level 1 — Pick primary traversal by intent:**

Accuracy-first file localization (default for implementation lookup):

```
python scripts/codesearch.py query "<your question>"
```

Use this when the goal is to identify exact files/functions for edits.

Speed-first structural orientation (architecture, relationships, cross-module flow):

```
graphify query "<your question>" --graph graphify-out/graph.json --budget 1200
```

Also read `graphify-out/GRAPH_REPORT.md` for god nodes/community structure.

**Level 2 — Cross-check with the secondary traversal:**

If you started with vector and results are ambiguous/multi-hop, use graphify for relationship context:
Read `graphify-out/GRAPH_REPORT.md` for architecture and relationships.
Fall back to `graphify-out/graph.json` only if GRAPH_REPORT.md lacks sufficient detail.

If you started with graphify and need exact file targeting for code edits, run vector search before editing.

**Level 3 — Raw file reads (last resort only):**
Only when levels 1 and 2 are both insufficient to unblock the task, or when explicitly asked.
Never read a file that wasn't returned by vector search or referenced in the graph.

If Ollama is unreachable (`ollama serve` to start it), use graphify-only traversal and explicitly note reduced file-level precision.

## After Creating or Modifying Files — MANDATORY

After writing or modifying **any** source file in `apps/web_v2`, `apps/api_v2`, or `packages`, always run:

```bash
python scripts/update-indexes.py
```

This updates both the vector store (incremental, seconds) and the knowledge graph (AST for code changes). Never skip this — stale indexes mean the next query returns wrong files.

Hard constraints:

- Do not end a session before `pnpm build --filter <subpackage where you made changes>` succeeds.
- In `apps/web_v2`, use `apps/api_v2` endpoints only.
- In Next.js 16 routes/layouts, `params` is a Promise: always `await props.params`.
- Typecheck `web_v2` with `cd apps/web_v2 && pnpm exec tsc --noEmit`.
- Ensure linting passes with `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`.

Next.js warning:

- Treat framework behavior as version-sensitive. Check docs in `node_modules/next/dist/docs/` when uncertain.

Test credentials:

When testing the application the test user credentials are as follows:

email: test+clerk_test@semblia.com
password: Password@123

For creating a new user, use any email appended with +clerk_test@semblia.com. Use the common test password "Password@123". OTP for this test user format is always 424242.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

- Before answering architecture/relationship questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- Use `graphify query` / `graphify path` for topology and dependency-flow questions
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python scripts/rebuild-graphify.py` to keep the graph current with a compatible interpreter
