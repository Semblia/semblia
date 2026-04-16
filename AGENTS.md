# AGENTS.md

Session start checklist:

- Codebase questions MUST follow the 3-level hierarchy below — never skip levels.

## Codebase Exploration — STRICT HIERARCHY

**Level 1 — Vector search (DEFAULT, always try first):**
```
python scripts/codesearch.py query "<your question>"
```
Read only the files it returns. This is the cheapest and fastest path.

**Level 2 — Knowledge graph (if vector results are ambiguous or structural):**
Read `graphify-out/GRAPH_REPORT.md` for architecture and relationships.
Fall back to `graphify-out/graph.json` only if GRAPH_REPORT.md lacks sufficient detail.

**Level 3 — Raw file reads (last resort only):**
Only when levels 1 and 2 are both insufficient to unblock the task, or when explicitly asked.
Never read a file that wasn't returned by vector search or referenced in the graph.

If Ollama is unreachable (`ollama serve` to start it), fall to Level 2 and note the degradation.

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

Next.js warning:

- Treat framework behavior as version-sensitive. Check docs in `node_modules/next/dist/docs/` when uncertain.

Test credentials:

When testing the application the test user credentials are as follows:

email: test+clerk_test@tresta.app
password: Password@123

For creaing a new user, use any email appened with +clerk_test@tresta.app. Use the common test password "Password@123". OTP for this test user format is always 424242.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
