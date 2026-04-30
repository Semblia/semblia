# AGENTS.md

Session start checklist:

- Codebase exploration MUST follow the intent-routed hierarchy below.
- For Tresta v2 API continuation after the Claude -> Codex handoff, read `docs/codex-claude-memory-migration.md` before starting implementation. It captures migrated Claude project memories, phase cadence, OpenCode orchestration preferences, public-route decisions, security watch items, and links to the authoritative in-repo handoff docs.

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

email: test+clerk_test@tresta.app
password: Password@123

For creating a new user, use any email appended with +clerk_test@tresta.app. Use the common test password "Password@123". OTP for this test user format is always 424242.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture/relationship questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- Use `graphify query` / `graphify path` for topology and dependency-flow questions
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python scripts/rebuild-graphify.py` to keep the graph current with a compatible interpreter
