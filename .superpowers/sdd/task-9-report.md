# Task 9 Report

- Implemented a reusable dry-run-first public-hosting audit/backfill executor, a typechecked CLI, and configurable wall-base hostname generation.
- Dry run performs no transactions or writes. Apply mode locks each project, re-reads projects and global host reservations, recomputes the plan, and only counts/logs committed operations after the transaction resolves.
- Implemented normalization/collision safeguards, tombstone reservation, resource repair/manual mismatch handling, legacy default demotion, managed-only verification, deterministic primary cleanup, safe allowlisted logs, and hostname-target-only whole-transaction P2002 handling.

## TDD evidence

- RED: `pnpm.cmd --filter api_v2 exec vitest run src/modules/public-surfaces/public-hosting-backfill.spec.ts` initially failed 4/4 because the new executor did not map persisted `publicSurfaceHosts` into its planner model.
- GREEN: the same focused command passed 12/12 after the executor and regression cases were completed.

## Verification

- `pnpm.cmd --filter api_v2 exec vitest run src/modules/public-surfaces/public-hosting-backfill.spec.ts` — 1 file, 12 tests passed.
- `pnpm.cmd --filter api_v2 typecheck` — passed.
- `pnpm.cmd --filter api_v2 lint` — passed with zero warnings.
- `pnpm.cmd build --filter api_v2` — passed (6/6 tasks).
- `pnpm.cmd --filter api_v2 public-hosting:backfill -- --dry-run` — no mutation attempted; stopped because the local database lacks `PublicSurfaceHost.retiredAt`. The CLI emitted its sanitized database/configuration-unavailable boundary.

## Files changed

- `apps/api_v2/src/modules/public-surfaces/public-hosting-backfill.ts`
- `apps/api_v2/src/modules/public-surfaces/public-hosting-backfill.spec.ts`
- `apps/api_v2/src/scripts/backfill-public-hosting.ts`
- `apps/api_v2/src/modules/public-surfaces/public-hostname.ts`
- `apps/api_v2/src/modules/public-surfaces/public-hostname.spec.ts`
- `apps/api_v2/src/modules/projects/projects.service.ts`
- `apps/api_v2/package.json`

## Self-review

- No provider, DNS, activation, or apply-mode database operation was run.
- The disposable database fixture proof remains Task 15 work.

## Review follow-up

- Added `createPrismaClient` to `@workspace/database/prisma`; the public-hosting CLI owns a one-shot `log: []` client and disconnects it in `finally`, avoiding the shared singleton's raw Prisma error logging.
- Re-ran database build, focused backfill tests, API typecheck/lint/build, and the dry-run-only CLI. The live CLI output now contains only `public-hosting-backfill failed: database or configuration unavailable`; no Prisma query, source path, or schema detail is emitted.
