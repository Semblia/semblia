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
- Revalidated 2026-07-19 against the rebuilt runtime: the server-side presign
  proxy remains available, but `apps/forms_runtime/src/browser.ts` still does
  not consume `data-presign-url`. Browser upload completion is a current,
  explicitly out-of-scope follow-up rather than a statement about the
  superseded forms-v4 runtime.

## Review follow-up

- Embed denial responses now set `Cache-Control: private, no-store` and
  `Vary: Origin, Accept-Encoding`; hosted/embed set no-store and noindex before
  routing, rate-limit, resolver, or snapshot work so every early branch carries
  the response boundary.
- Deep/malformed wildcard hosts and exact service-host requests without an
  explicit `projectId` are opaque 404s. Genuine unexpected failures remain
  opaque 503s.
- Resolver payloads are runtime-validated before authority: normalized exact
  requested/canonical host strings, plain HTTPS canonical origin, nonempty
  project id, `COLLECTION` feature, boolean `isCanonical`, and canonical-marker
  consistency are required before a snapshot request.
- Review RED: focused app tests added 7 failures for denial cache/Vary,
  rejected viewer identities, and malformed resolver contracts; a subsequent
  normalized-host regression failed 1/30 before the strict normalized string
  validation was added.
- Review GREEN: focused 30/30 and full forms runtime 57/57; typecheck, lint,
  build, and diff check passed.

## Re-review follow-up

- The exact-host missing-`projectId` guard now applies only in API mode.
  Mock local development retains `resolveRuntimeHost`'s localhost/127.0.0.1
  mapping and `project_mock` fallback, while API-mode exact-host requests still
  return opaque 404 without an explicit project id.
- RED: localhost mock without `projectId` returned 404 instead of rendering.
- GREEN: focused 31/31 and full forms runtime 58/58; typecheck, lint, build,
  and diff check passed.
