# Task 13 report

## Delivered

- Routes normalized one-label `*.walls.semblia.com` hosts before Clerk, with opaque private no-store failures.
- Adds no-store, timeout-bounded host resolver and wall adapters with strict API-envelope validation.
- Leaves legacy `/wall/:slug` as a separate no-cache adapter and removes ISR.
- Omits Clerk and query providers in the root layout on recognized project wall hosts.

## Verification

- `pnpm.cmd --filter web_v2 exec vitest run tests/walls/host-routing.test.ts tests/walls/public-wall.test.ts` — 15 passed
- `pnpm.cmd --filter web_v2 exec tsc --noEmit` — passed
- `pnpm.cmd --filter web_v2 exec eslint proxy.ts app/layout.tsx lib/walls tests/walls --ext .ts,.tsx` — passed
- `git diff --check` — passed
- Prettier was run across all Task 13 web files.
