# AGENTS.md

Session start checklist:

- Read `./memory/MEMORY.md`, `./memory/user.md`, and `./memory/decisions.md`.
- Read the relevant files in `.claude/rules/`.
- When writing in `./memory/`, make sure to drop your names.
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
