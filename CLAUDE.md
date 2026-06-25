# CLAUDE.md

Session start checklist:
- For Semblia v2 continuation, canonical durable memory lives in `docs/continuity/`. Read `docs/continuity/README.md`, `docs/continuity/progress.md`, `docs/continuity/decisions.md`, and `docs/continuity/open-questions.md` before starting implementation.
- Codebase exploration MUST follow this intent-routed hierarchy:
  1. Accuracy-first file localization: `python scripts/codesearch.py query "<question>"`
  2. Speed-first structure traversal: `graphify query "<question>" --graph graphify-out/graph.json --budget 1200` + `graphify-out/GRAPH_REPORT.md`
  3. Cross-check with the other method before editing if primary results are ambiguous
  4. Raw file reads — last resort only

Benchmark snapshot (2026-04-16, 15 canonical retrieval cases):
- Vector (`scripts/codesearch.py`): Top-6 hit 100%, MRR 0.833, median latency 3.70s
- Graphify (`graphify query`): Top-6 hit 53.3%, MRR 0.258, median latency 0.39s, ~4.0x token reduction

After writing or modifying any source file in `apps/web_v2`, `apps/api_v2`, or `packages`, always run:
```bash
python scripts/update-indexes.py
```

Hard constraints:
- **Skills-first, always.** Before starting any task that a repo/user skill covers, invoke the relevant skill(s) via the Skill tool — never freehand ("raw-dog") work a skill exists for. UI/design work MUST route through the design skills (`/critique` or `/audit` before, `/normalize`/`/arrange`/`/typeset`/etc. during, `/polish` after); testing through the testing skills; framework questions through the docs skills. The skills encode the house taste and standards — bypassing them is how AI-slop patterns (decorative streaks, mono uppercase eyebrows, off-system one-off headers) get shipped.
- Do not end a session before `pnpm build --filter web_v2` succeeds.
- In `apps/web_v2`, use `/v2/` endpoints only.
- In Next.js 16 routes/layouts, `params` is a Promise: always `await props.params`.
- Typecheck `web_v2` with `cd apps/web_v2 && pnpm exec tsc --noEmit`.
- Ensure linting passes with `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`.
- If you ever need a deep research or implementation task delegated, use the **Codex plugin** (subagent type `codex:codex-rescue`). Codex is the canonical delegation target for this project. Brief it with a fully self-contained prompt; it has no conversation memory.

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
