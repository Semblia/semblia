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
- **Run `pnpm test` through bash at least once before pushing, not only
  PowerShell.** CI runs on Linux, and the shells disagree about globs: a
  `--exclude dist/**` in a package's test script reaches vitest untouched
  from PowerShell but is expanded by bash into positional filters, which
  vitest reads as an allowlist rather than an exclusion. That combination
  passed every local run and failed the required check on PR #55. Any gate
  argument containing `*` is shell-sensitive — prefer expressing it in
  `vitest.config.ts` over the command line.

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
