# CLAUDE.md

Session start checklist:
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
- Do not end a session before `pnpm build --filter web_v2` succeeds.
- In `apps/web_v2`, use `/v2/` endpoints only.
- In Next.js 16 routes/layouts, `params` is a Promise: always `await props.params`.
- Typecheck `web_v2` with `cd apps/web_v2 && pnpm exec tsc --noEmit`.
- Ensure linting passes with `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`.
- If you ever need a deep research conducted, opt for using the opencode MCP to delegate tasks to the code-explorer agent using github-copilot/sonnet-4.6 as the model. Do not use the native subagents, but use the OpenCode agents as subagents.

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
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
