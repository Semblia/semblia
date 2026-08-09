# Phase 5 Validation Matrix

## Scope

Focused cross-cutting validation for shared response/error contracts, pagination metadata stability, and webhook route metadata.

## Verified Contracts

| Area | Validation |
|---|---|
| Response envelope | `ResponseInterceptor` wraps plain values into `{ success: true, data, meta: { timestamp } }`, preserves already-wrapped success payloads, and hoists service `meta` from `{ data, meta }` results. |
| Error envelope | `AllExceptionsFilter` returns the v2 error envelope for `HttpException` and unknown errors, preserving `details` when present. |
| Pagination | `paginate()` returns stable v2 pagination metadata for empty, middle, and final pages. |
| Webhook metadata | `WebhooksController` exposes public `POST /webhooks/clerk` and `POST /webhooks/razorpay` handlers and keeps the controller-level `60/min` throttle metadata. |

## Deferred / Non-goal Risks

| Area | Status |
|---|---|
| `app` widget/forms studio state | Deferred. The studio/editor flows still rely on local state, so this phase validates API-side contracts only. |
| Alerts / ops-admin UI contract | Deferred. Phase 4b was groundwork-only and still has no `app` consumer contract to validate here. |
| End-to-end route execution | Non-goal. This phase verifies controller metadata and common contract helpers, not full HTTP integration behavior. |

## Phase Close Gates

Run before closing the phase:

1. `cd apps/api && pnpm format`
2. `cd apps/api && pnpm test -- common webhooks`
3. `cd apps/api && pnpm test`
4. `cd apps/api && pnpm exec tsc --noEmit -p tsconfig.json`
5. `cd apps/api && pnpm lint`
6. `cd apps/api && pnpm format:check`
7. `pnpm build --filter api`
8. `cd apps/app && pnpm exec tsc --noEmit`
9. `cd apps/app && pnpm exec eslint . --ext .ts,.tsx`
10. `pnpm build --filter app`
11. `python scripts/update-indexes.py`
12. `python scripts/rebuild-graphify.py`
