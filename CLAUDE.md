# CLAUDE.md

Session start checklist:
- Read `./memory/MEMORY.md`, `./memory/user.md`, and `./memory/decisions.md`.
- Read the relevant files in `.claude/rules/`.

Hard constraints:
- Do not end a session before `pnpm build --filter web_v2` succeeds.
- In `apps/web_v2`, use `/v2/` endpoints only.
- In Next.js 16 routes/layouts, `params` is a Promise: always `await props.params`.
- Typecheck `web_v2` with `cd apps/web_v2 && pnpm exec tsc --noEmit`.

Next.js warning:
- Treat framework behavior as version-sensitive. Check docs in `node_modules/next/dist/docs/` when uncertain.
