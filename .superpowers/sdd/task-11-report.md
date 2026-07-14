# Task 11 Report

- Resolved every wildcard forms request by normalized hostname before its
  snapshot cache is read; the configured exact service host remains the sole
  projectId compatibility path and skips the public resolver.
- Wildcard aliases redirect only safe GET page/embed requests to a validated
  plain HTTPS canonical origin, preserving path and every query parameter.
  POST proxy routes resolve authority but never redirect.
- Snapshot cache keys bind requested host, resolved project, surface, and slug;
  entries expire after 60 seconds and use deterministic bounded eviction.
  Snapshot project mismatch is an opaque 404.
- Hosted and embed output is private/no-store and noindex. Hosted documents
  include robots meta; hosted/embed, including denied/embed error paths, carry
  `X-Robots-Tag: noindex, nofollow`.
- Rate limits bind normalized host and slug, prune expired buckets, and cap
  bucket growth. Runtime API status classes become opaque 401/404/429/503
  responses with `private, no-store`.

## TDD evidence

- RED: `pnpm.cmd --filter forms_runtime exec vitest run src/app.spec.ts`
  failed 10 assertions before the app change: host resolution/cache isolation,
  canonical redirect, project mismatch, noindex/no-store, and runtime status
  boundaries were absent.
- GREEN: the same focused test command passed 22/22 after implementation,
  including adversarial canonical-origin validation, resolver revalidation on
  cache hits, exact-host resolver bypass, cache expiry/eviction, and host-aware
  rate buckets.

## Verification

- `pnpm.cmd --filter forms_runtime exec vitest run src/app.spec.ts` — 1 file,
  22 tests passed.
- `pnpm.cmd --filter forms_runtime test` — 4 files, 49 tests passed.
- `pnpm.cmd --filter forms_runtime typecheck` — passed.
- `pnpm.cmd --filter forms_runtime lint` — passed with zero warnings.
- `pnpm.cmd --filter forms_runtime build` — passed.
- `git diff --check` — passed.

## Scope and follow-up

- Changed only `apps/forms_runtime/src/app.ts` and `app.spec.ts`; `browser.ts`
  already derives action URLs from the rendered attributes and needs no change.
- Browser upload completion remains intentionally unimplemented: the browser
  still does not consume `data-presign-url`.
