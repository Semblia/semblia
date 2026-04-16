# CLAUDE.md

Session start checklist:
- Codebase questions MUST follow the 3-level hierarchy:
  1. `python scripts/codesearch.py query "<question>"` — vector search (always first)
  2. `graphify-out/GRAPH_REPORT.md` — structure/relationships
  3. Raw file reads — last resort only

After writing or modifying any source file in `apps/web_v2`, `apps/api_v2`, or `packages`, always run:
```bash
python scripts/update-indexes.py
```

Hard constraints:
- Do not end a session before `pnpm build --filter web_v2` succeeds.
- In `apps/web_v2`, use `/v2/` endpoints only.
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
