# Billing Security Audit — 2026-05-26

## Summary

One P0 finding fixed inline: the user-scoped `/v2/account/*` billing
routes were guarded only by the global `ClerkAuthGuard`, which accepts
project-bound API keys and agent keys as well as Clerk user sessions.
A project credential could therefore read or mutate its owner's
subscription, payment methods, invoices, and billing profile. Fixed by
adding a controller-level `UserActorGuard` that rejects any non-`user`
actor with `403`. All other audit items pass; new dependency
advisories (Next.js cache poisoning, Prisma minor) recorded as P2 for
the next dependency-hardening pass.

| Severity | Found | Fixed inline | Deferred |
|----------|-------|--------------|----------|
| P0       | 1     | 1            | 0        |
| P1       | 0     | 0            | 0        |
| P2       | 2     | 0            | 2        |
| P3       | 0     | 0            | 0        |

## Methodology

Walked the audit checklist from `docs/plans/2026-05-26-billing-b7-spec.md`
section "Audit checklist": auth + actor isolation, webhook signature +
idempotency, secret handling, race conditions, money + currency, CORS +
CSRF, dependency advisories, hosted Razorpay checkout / CSP. Code-read
the billing + webhook + auth + guard modules in `apps/api_v2/src` and
the billing surfaces in `apps/web_v2`. Re-ran the full v2 verification
suite after the inline fix.

## Findings

| # | Severity | Area                  | Description                                                                                                                                                                                                                                                                                                              | Status                                              |
|---|----------|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------|
| 1 | P0       | Auth / actor isolation | `BillingController` (`@Controller("account")`) had no route-level guards and relied on the global `ClerkAuthGuard`, which delegates Tresta-prefixed tokens to `ApiKeyAuthenticator` and sets `request.user = { id: credential.userId }`. Any active project-bound API key or agent key for the user's project could then call `/v2/account/subscription/checkout` / `/cancel` / `/switch`, `/v2/account/payment-methods`, `/v2/account/invoices`, and `/v2/account/billing-profile`. The launch agent-preset scope set explicitly excludes billing, so this was a privilege-escalation path. | Fixed inline (`UserActorGuard` + new spec, 5 tests) |
| 2 | OK       | Webhook signature     | `POST /v2/webhooks/razorpay` verifies `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET` with `verifyRazorpayWebhookSignature` before any DB write. Missing secret returns `500`; missing/invalid signature returns `400`/`401`. No fall-through to the service handler.                                              | Pass                                                |
| 3 | OK       | Webhook replay        | `paymentWebhookEvent.create({ providerEventId })` is the first write of every webhook turn. `providerEventId` = `sha256(event + created_at + rawBody)` is `@unique`; replays surface as `P2002` and short-circuit to `{ replayed: true }`. Test coverage in `webhooks.service.spec.ts`.                                                            | Pass                                                |
| 4 | OK       | Webhook subscription resolution | `findRazorpaySubscription` requires the `externalSubscriptionId` OR the new B4 `scheduledRazorpaySubscriptionId` to match a local row. The notes-based fallback runs ONLY for `subscription.activated` and resolves to a real local `Subscription.userId`. Notes are never used to alter a row owned by a different `userId`. | Pass                                                |
| 5 | OK       | Cross-user data leakage | All `BillingService` reads and writes are bound to `userId` (Subscription has `userId @unique`). `PaymentMethod` and `Invoice` are filtered by `userId`. No `findFirst({ where: { id } })` without `userId`.                                                                                                            | Pass                                                |
| 6 | OK       | Secret handling       | `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are referenced only in `apps/api_v2/src/config/env.ts`, `razorpay.service.ts`, and `webhooks.controller.ts`. Zero occurrences in `apps/web_v2`. The publishable `razorpayKeyId` is exposed only via `V2SubscriptionCheckoutDTO`, never via subscription/invoice reads. Logs use `Logger.error(message, stack)` without echoing secrets. | Pass                                                |
| 7 | OK       | Money + currency      | No `* 100`, `/ 100`, `parseFloat`, or `Number(` conversions across `apps/api_v2/src/modules/billing/` or `webhooks.service.ts` (the only `/ 1000` and `* 1000` matches are epoch seconds <-> ms). All amounts read/write as integer paise. `V2InvoiceDTO`/`V2SubscriptionDTO` lock currency to `"INR"`.                          | Pass                                                |
| 8 | OK       | CORS / CSRF           | `/v2/account/*` uses Clerk JWT bearer; no cookie-auth fallback. `/v2/webhooks/razorpay` is intentionally public, with no echo of arbitrary request fields in the response (just `{ received, replayed }`).                                                                                                              | Pass                                                |
| 9 | OK       | Race conditions       | Payment upserts key on `provider_externalPaymentId` and `provider_externalInvoiceId`; concurrent retries dedupe. Repeat checkout while a sub is active returns the existing `subscriptionId` (B2). B4 switch cleanup cancels a prior scheduled sub before creating a new one; failure to cancel a stale scheduled sub is swallowed by design. | Pass                                                |
| 10 | OK | Subscription activation window | Documented edge case: a `subscription.activated` for a newly scheduled sub arriving exactly when a user re-issues a switch will overwrite the scheduled slot. Last-write-wins is acceptable for v1; documented below in Open items.   | Acceptable for v1                                   |
| 11 | OK | Razorpay Checkout script | `apps/web_v2/lib/razorpay-checkout.ts` pins `SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js"` and falls back to `window.location.assign(shortUrl)` if the script cannot load. No other Razorpay JS is loaded.                                                                                                                                 | Pass                                                |
| 12 | P2       | CSP                   | No `Content-Security-Policy` is configured in `apps/web_v2/next.config.*` or middleware. With Razorpay Checkout now live, a future hardening pass should add a CSP that allows `script-src https://checkout.razorpay.com` and `frame-src https://api.razorpay.com https://checkout.razorpay.com`. Not a billing-track blocker. | Deferred to open-questions.md                       |
| 13 | P2       | Dependency advisories | `pnpm audit --prod` shows new advisories that now touch V2 workspaces: `apps/web_v2 > next` (multiple low/moderate cache-poisoning notes, patched in 15.5.16/16.2.5/16.2.6) and `packages/database > @prisma/client > prisma > @prisma/*` (patched 3.1.1/3.1.2). None of these vulnerabilities are billing-specific. The Razorpay SDK has zero advisories. | Deferred to open-questions.md                       |

## Fixes applied

- `apps/api_v2/src/common/guards/user-actor.guard.ts` — new
  `UserActorGuard` that rejects any non-`user` actor with
  `ForbiddenException`.
- `apps/api_v2/src/common/guards/user-actor.guard.spec.ts` — 5 new
  unit cases covering user actor allow, api_key reject, agent_key
  reject, missing actor reject, raw-user-id allow.
- `apps/api_v2/src/modules/billing/billing.controller.ts` — applies
  `@UseGuards(UserActorGuard)` at the controller level. Affects every
  route on the controller: `GET/POST /account/subscription[/checkout|cancel|switch]`,
  `GET /account/payment-methods`, `GET /account/invoices`, `GET/PATCH
  /account/billing-profile`.

## Final verification

| Command                                                       | Result                       |
|---------------------------------------------------------------|------------------------------|
| `pnpm --filter @workspace/database generate`                  | pass                         |
| `pnpm --filter @workspace/database exec prisma validate`      | pass                         |
| `pnpm --filter @workspace/types build`                        | pass (cached)                |
| `pnpm --filter api_v2 typecheck`                              | pass                         |
| `pnpm --filter api_v2 lint`                                   | pass                         |
| `pnpm --filter api_v2 test`                                   | 51 files / 355 tests passing |
| `pnpm build --filter api_v2`                                  | pass                         |
| `cd apps/web_v2 && pnpm exec tsc --noEmit`                    | pass                         |
| `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx`         | pass                         |
| `pnpm --filter web_v2 format`                                 | pass                         |
| `pnpm --filter web_v2 test`                                   | 21 files / 79 tests passing  |
| `pnpm build --filter web_v2`                                  | pass                         |
| `python scripts/update-indexes.py`                            | merged graph 5047 / 8439     |
| `python scripts/rebuild-graphify.py`                          | pass (semantic skipped)      |

## Open items (referenced into `docs/continuity/open-questions.md`)

- **CSP for web_v2** — add `Content-Security-Policy` covering
  `https://checkout.razorpay.com` and `https://api.razorpay.com` once
  the rest of the trust UI is settled.
- **Next.js advisory hygiene** — bump `next` in `apps/web_v2` past
  the latest 16.2.x patched version, and bump `@prisma/client` / `prisma`
  past 3.1.2 in `packages/database` in a dedicated dependency PR
  unrelated to billing.
- **Scheduled-activation race** — if a `subscription.activated`
  webhook for a previously scheduled Razorpay subscription arrives while
  the user is re-issuing a plan switch, the new scheduled id can be
  written before the activation promotion completes. Last-write-wins is
  acceptable for v1 because both branches converge on a valid local row;
  future hardening could add a row-version compare-and-swap.
