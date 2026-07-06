# Verification Gates

A task is not done until these pass. "Done and verified" means you ran them,
not that they should pass.

## Build / static gates

- Do not end a session before `pnpm build --filter <touched package>`
  succeeds — at minimum `pnpm build --filter web_v2` when `apps/web_v2`
  changed. Per-app typecheck/lint commands live in the scoped rule files
  (`web-v2.md`, `api-v2.md`).
- Report failures faithfully: if a gate fails, say so with the output —
  never mark a phase done around a red gate.

## Runtime verification

Exercise the affected flow in the real app, not just tests:

- Stack: `web_v2` on :3002, `api_v2` on :8100 (separate API **and** worker
  processes), Postgres/Redis via `docker-compose.yaml`.
- Verify UI changes visually in the browser; verify async/delivery changes by
  watching the worker actually process the job.

## Test credentials

- Sign-in: `test+clerk_test@semblia.com` / `Password@123`
- New users: any email ending `+clerk_test@semblia.com`, same password
- OTP for `+clerk_test` users is always `424242`
