# Billing Phase B4 — Cancel + Switch via Razorpay API

Date: 2026-05-26
Owner: Codex (delegated by orchestrator)
Branch: `revamp/v2`

## Context

Phases B1-B3 (Razorpay) are committed. See `docs/continuity/progress.md` for the
full ledger and `docs/continuity/decisions.md` rows dated 2026-05-24 for locked
billing behaviour. Source of truth is Razorpay Subscriptions; local DB is a
webhook mirror. INR-only at launch.

Two locked decisions matter directly here:

- Plan switching = cancel current at period end + schedule new subscription
  for next cycle. No mid-cycle proration, no immediate charge, no downgrade
  refunds.
- Cancel = cancel at period end (no immediate stop, no refund).

## Scope (do exactly this)

### 1. `apps/api_v2/src/modules/billing/razorpay.service.ts`

Add two methods on `RazorpayService`. Match the existing
`createSubscription` style (await client method inside try/catch, throw
`ServiceUnavailableException` on failure, log via `this.logger.error`).

- `async cancelSubscription(subscriptionId: string, options?: { cancelAtCycleEnd?: boolean }): Promise<RazorpaySubscription>`
  - Calls `client.subscriptions.cancel(subscriptionId, options?.cancelAtCycleEnd ?? true)`.
    The official Razorpay Node SDK takes the boolean as the second positional
    argument; do not pass `{ cancel_at_cycle_end: 1 }` (that is the raw HTTP
    form, the SDK normalizes).
  - The boolean must default to `true` so we never request an immediate cancel
    in v1.
- `async createScheduledSubscription(input: RazorpayScheduledSubscriptionInput): Promise<RazorpaySubscription>`
  - Calls `client.subscriptions.create({ ...input })` with a `start_at` epoch
    (seconds) so Razorpay begins billing on the next cycle.
  - `RazorpayScheduledSubscriptionInput` is the same shape as
    `RazorpaySubscriptionCreateInput` plus a required
    `start_at: number` (UNIX seconds, integer).

Extend the `RazorpayClient` interface so the `subscriptions` object also
declares `cancel(id: string, cancelAtCycleEnd?: boolean): Promise<RazorpaySubscription>`.
Keep the type loose enough that the SDK-real client (which we already cast
via `require("razorpay")`) still satisfies it.

### 2. Schema change — schedule a "next subscription" slot

Add three nullable columns on `Subscription` in
`packages/database/prisma/schema.prisma`:

```prisma
scheduledRazorpaySubscriptionId String?  @unique
scheduledPlanId                 String?
scheduledStartAt                DateTime?
```

`scheduledPlanId` references `Plan.id` and should be added as an
optional relation (`scheduledPlan Plan? @relation("ScheduledPlan", fields: [scheduledPlanId], references: [id])`)
plus the inverse on `Plan` (`scheduledSubscriptions Subscription[] @relation("ScheduledPlan")`).
Match the existing relation style used for the current `plan` relation.

Create a new migration directory:
`packages/database/prisma/migrations/20260526_subscription_scheduled_slot/migration.sql`
that adds those three columns plus the unique index on
`scheduledRazorpaySubscriptionId` and the FK on `scheduledPlanId`. Use the
same SQL conventions as `20260524_plan_type_unique` (look at it for column
naming, FK action ordering, and quote style — likely `ALTER TABLE
"Subscription" ADD COLUMN ...`).

Do not write data migrations. All existing rows can leave the new columns
NULL.

### 3. `apps/api_v2/src/modules/billing/billing.service.ts`

Replace the two stubs.

#### `cancelSubscription(userId)`

New behaviour:
- Fetch the subscription via `getOrCreateSubscription`.
- If the user is on FREE (`subscription.userPlan === "FREE"`) — throw
  `BadRequestException("FREE plan has no subscription to cancel")`.
- If there is no `externalSubscriptionId` or the provider status is not
  active-ish (reuse `hasActiveProviderSubscription`) — throw
  `BadRequestException("No active subscription to cancel")`. Do **not**
  toggle anything when nothing is cancellable.
- Otherwise call `razorpay.cancelSubscription(externalSubscriptionId)`
  (the default `cancelAtCycleEnd=true`).
- Locally set `cancelAtPeriodEnd: true` and `providerStatus` to the value
  returned by Razorpay. Do not change `status`, `userPlan`, `planId`, or
  the period dates. The webhook (`subscription.cancelled`) is still the
  authority for the final `CANCELED` flip.
- Return the updated `V2SubscriptionDTO`.
- This endpoint is **one-way**: there is no "uncancel" path. The previous
  toggle behaviour is removed.

#### `switchSubscriptionPlan(userId, body)`

New behaviour:
- Fetch the subscription.
- Reject `body.planId === "FREE"` with
  `BadRequestException("Use cancel to downgrade to FREE")`. Downgrading is
  modeled as cancel-at-period-end; we don't schedule a FREE subscription.
- Reject when the target plan equals the current `userPlan` with
  `BadRequestException("Already on this plan")`.
- Reject when no `currentPeriodEnd` is set or it has already elapsed —
  `BadRequestException("Cannot schedule plan switch without an active period")`.
  In that case the user should re-checkout.
- Resolve the target plan via `resolveCheckoutPlan(body.planId)` — same
  helper B2 uses. This ensures the local row has a Razorpay plan id; if
  not, surface the existing `ServiceUnavailableException`.
- If the subscription already has a scheduled switch
  (`scheduledRazorpaySubscriptionId` set), cancel the previously scheduled
  Razorpay subscription first via
  `razorpay.cancelSubscription(scheduledRazorpaySubscriptionId, { cancelAtCycleEnd: false })`
  so we do not stack multiple scheduled subs. Swallow Razorpay failures
  for this cleanup branch — log a warning, do not throw — because the
  previously scheduled sub may already be invalid.
- Cancel the current Razorpay subscription at cycle end:
  `razorpay.cancelSubscription(subscription.externalSubscriptionId)` (default
  true). This is the same call as `cancelSubscription` above, but **always
  pass `cancelAtCycleEnd: true`** here.
- Create a new scheduled Razorpay subscription:
  `razorpay.createScheduledSubscription({
     plan_id: nextPlan.razorpayPlanId,
     customer_id: subscription.externalCustomerId, // required
     total_count: 12,
     customer_notify: 1,
     start_at: Math.floor(subscription.currentPeriodEnd.getTime() / 1000),
     notes: { semblia_user_id: userId, semblia_plan: body.planId },
   })`. If `externalCustomerId` is missing, throw
   `ServiceUnavailableException("Missing Razorpay customer for subscription switch")`.
- Persist the mirror in a single update:
  - `cancelAtPeriodEnd: true`
  - `scheduledRazorpaySubscriptionId: newSubscription.id`
  - `scheduledPlanId: nextPlan.id`
  - `scheduledStartAt: subscription.currentPeriodEnd`
- Do **not** flip `userPlan` or `planId` here — that happens in the
  `subscription.activated` webhook for the scheduled id.
- Return the updated `V2SubscriptionDTO`. The DTO itself does not need new
  fields for B4; the schedule is internal until the webhook activates it.

### 4. Webhook handler update

`apps/api_v2/src/modules/webhooks/webhooks.service.ts` —
`findRazorpaySubscription` currently looks up by
`externalSubscriptionId`. Extend it: if no row matches by
`externalSubscriptionId`, also try
`tx.subscription.findUnique({ where: { scheduledRazorpaySubscriptionId } })`.
That lets `subscription.activated` for the scheduled id resolve to the
correct local row.

In `handleRazorpaySubscriptionActivated`, when the incoming entity id
matches the subscription's `scheduledRazorpaySubscriptionId` (and is
different from `externalSubscriptionId`), promote it: set
`externalSubscriptionId = entity.id`, `razorpaySubscriptionId = entity.id`,
`planId = scheduledPlanId`, `userPlan` from the resolved snapshot or notes
(existing helper), and clear all three scheduled columns
(`scheduledRazorpaySubscriptionId: null`, `scheduledPlanId: null`,
`scheduledStartAt: null`). Also clear `cancelAtPeriodEnd: false` because
the scheduled sub has taken effect. The existing `user.update` for plan
promotion still fires.

In `handleRazorpaySubscriptionCompleted` and the cancellation lifecycle
path, do **not** flip `userPlan = FREE` if a `scheduledRazorpaySubscriptionId`
exists on the row — the user has a pending plan switch and should not
spend a moment on FREE in the local mirror. The eventual
`subscription.activated` for the scheduled sub will handle plan
promotion. Easiest implementation: read the local row first, branch on
`scheduledRazorpaySubscriptionId`. If set: leave `userPlan` alone, do not
touch `User.plan`. If null: existing behaviour.

### 5. Tests — `apps/api_v2/src/modules/billing/billing.service.spec.ts`

Add these cases (mirror the existing `vi.fn` patterns and the
`razorpayMock` shape from B2):

- `cancelSubscription` happy path: active paid sub → Razorpay cancel
  called with `(externalSubscriptionId, true)`, local row updated with
  `cancelAtPeriodEnd: true` and the new `providerStatus`.
- `cancelSubscription` rejects FREE: throws `BadRequestException`.
- `cancelSubscription` rejects when no active provider sub: throws
  `BadRequestException`.
- `switchSubscriptionPlan` happy path: active PRO → BUSINESS with a
  current period in the future. Verify (a) cancel called for current sub
  with `true`, (b) createScheduledSubscription called with the correct
  `start_at` (seconds) + customer_id + plan id + notes, (c) the local
  row stores `scheduledRazorpaySubscriptionId`, `scheduledPlanId`,
  `scheduledStartAt`, and flips `cancelAtPeriodEnd`. (d) `userPlan` is
  unchanged.
- `switchSubscriptionPlan` rejects FREE target.
- `switchSubscriptionPlan` rejects same-plan.
- `switchSubscriptionPlan` rejects when `currentPeriodEnd` is in the
  past.
- `switchSubscriptionPlan` with a pre-existing
  `scheduledRazorpaySubscriptionId`: verify the prior scheduled sub is
  cancelled with `cancelAtCycleEnd: false` and the swallow-on-error path
  does not propagate.

Add the new state fields to the in-memory `SubscriptionRecord` test type
and the `subscriptionSelect` reducer in the test harness. Don't add a
new Prisma test database — keep using the in-memory store.

### 6. Webhook tests — `apps/api_v2/src/modules/webhooks/webhooks.service.spec.ts`

Add cases:

- `subscription.activated` for a scheduled id: the row's
  `scheduledRazorpaySubscriptionId` matches, no row matches
  `externalSubscriptionId`. After processing, the local row has the new
  external id promoted, the scheduled columns cleared, and
  `cancelAtPeriodEnd: false`.
- `subscription.completed` / `subscription.cancelled` while a scheduled
  sub exists: `userPlan` is NOT flipped to FREE, `User.plan` is NOT
  touched.

### 7. Verification (must all pass)

Run from repo root with PowerShell wrappers (`pnpm.cmd` works in this
repo):

```
pnpm.cmd --filter @workspace/database generate
pnpm.cmd --filter @workspace/database exec prisma validate
pnpm.cmd --filter @workspace/types build
pnpm.cmd --filter api_v2 typecheck
pnpm.cmd --filter api_v2 lint
pnpm.cmd --filter api_v2 test
pnpm.cmd build --filter api_v2
python scripts/update-indexes.py
```

The `api_v2 test` count should rise from 327 to at least 340 (roughly
+13 new cases across billing.service and webhooks.service).

### 8. Continuity doc update

Edit `docs/continuity/progress.md`:
- Update the "Last updated" header to `2026-05-26 (Billing Phase B4 — cancel + switch via Razorpay API)`.
- Update the "Billing track" bullet under "Current Snapshot" to record B4
  in the same shape used for B1/B2/B3. State the new schema columns, the
  webhook handler change for scheduled subs, and the new test count.
- Append a new "Billing Phase B4 verification passed" bullet under
  "Latest Verification" with the actual test count and graph numbers
  printed by `update-indexes.py`.

Do **not** edit `decisions.md`. The 2026-05-24 row already covers the
locked switch/cancel behaviour.

Do **not** create a commit. The orchestrator will commit after reviewing
your changes.

## Non-goals (do NOT do in B4)

- No `web_v2` work. UI stays read-only/disabled.
- No "uncancel" or "resume cancelled subscription" endpoint.
- No proration. No mid-cycle charge. No FREE-target schedule.
- No payment method writes (that is B5).
- No invoice URL exposure (also B5).

## Done definition

All verification commands pass, `progress.md` is updated, and the diff
contains the schema migration, the two RazorpayService methods, the two
rewritten billing.service methods, the webhook handler changes, and the
new tests.
