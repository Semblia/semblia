# Billing Phase B6 — web_v2 Razorpay Checkout integration

Date: 2026-05-26
Owner: Codex (delegated by orchestrator)
Branch: `revamp/v2`
Depends on: B4 + B5 already landed.

## Context

Locked decisions (`docs/continuity/decisions.md`, 2026-05-24):

- Razorpay Subscriptions are the source of truth; the local DB is a webhook
  mirror.
- Frontend never POSTs to Razorpay directly. The API issues a checkout
  session (`POST /v2/account/subscription/checkout`) returning
  `{ subscriptionId, shortUrl, razorpayKeyId, planId }`. The browser opens
  Razorpay Standard Checkout with that data.
- Saved cards are read-only — populated by webhooks. No add-card UI.
- Cancel is one-way (cancel-at-period-end). To resume, the user re-checks
  out.
- Plan switch = cancel current at period end + schedule new sub for next
  cycle. Switch does not redirect to checkout when the existing
  subscription is still active; the API handles scheduling end-to-end
  without browser-side payment.

`apps/web_v2/components/account/plan-switcher.tsx` already calls
`useSwitchPlan` and shows a confirmation dialog whose message reads
"Razorpay checkout will be integrated once the billing API is ready." That
ready signal is now this phase.

## Scope

### 1. Typed API client — `apps/web_v2/lib/semblia-api.ts`

- Add `createSubscriptionCheckout(token: string | null, planId: V2UserPlan)`:
  POSTs to `/account/subscription/checkout`, body `{ planId }`, returns
  `V2SubscriptionCheckoutDTO`. Model after the existing
  `switchSubscriptionPlan` shape.
- Delete the `deletePaymentMethodApi` and `setDefaultPaymentMethodApi`
  functions — the API no longer exposes those routes after B5. Remove
  unused imports.

### 2. Billing hooks — `apps/web_v2/hooks/api/use-billing-api.ts`

- Add a `useCreateCheckoutSession` mutation. On success it returns the
  `V2SubscriptionCheckoutDTO` to the caller (no automatic redirect — the
  caller handles opening Checkout, so unit tests can mock the launcher).
  Invalidate `billingQueryKeys.subscription` after success.
- Delete `useDeletePaymentMethod` and `useSetDefaultPaymentMethod` (and
  their imports). Keep `usePaymentMethods`.

### 3. Razorpay Checkout launcher — `apps/web_v2/lib/razorpay-checkout.ts` (new file)

A small browser-only helper that ensures the Razorpay JS is loaded once
and opens the checkout for a subscription. Sketch:

```ts
const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only load in a browser"));
  }
  if ((window as any).Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load")), { once: true });
      return;
    }
    const tag = document.createElement("script");
    tag.src = SCRIPT_SRC;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => { scriptPromise = null; reject(new Error("Razorpay script failed to load")); };
    document.head.appendChild(tag);
  });
  return scriptPromise;
}

export type OpenSubscriptionCheckoutInput = {
  subscriptionId: string;
  razorpayKeyId: string;
  shortUrl: string | null;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  onDismiss?: () => void;
};

export async function openSubscriptionCheckout(input: OpenSubscriptionCheckoutInput): Promise<void> {
  await loadRazorpayScript();
  const Razorpay = (window as any).Razorpay;
  if (!Razorpay) {
    if (input.shortUrl) {
      window.location.assign(input.shortUrl);
      return;
    }
    throw new Error("Razorpay Checkout unavailable");
  }

  const checkout = new Razorpay({
    key: input.razorpayKeyId,
    subscription_id: input.subscriptionId,
    name: "Semblia",
    description: "Subscription",
    prefill: input.prefill,
    notes: input.notes,
    modal: { ondismiss: () => input.onDismiss?.() },
    theme: { color: "#0F172A" },
  });
  checkout.open();
}
```

Keep the file in `lib/` (not `components/`) so it can be imported from
any client component. Mark the script src as a constant exported for
tests. The dynamic `(window as any).Razorpay` cast is acceptable —
Razorpay's checkout JS is not typed and we don't want to ship the
@types/razorpay shim for one call.

Add a typed `Window` declaration in a `apps/web_v2/types/razorpay.d.ts`
file so we don't need `any`:

```ts
interface RazorpayCheckoutInstance { open(): void }
interface RazorpayCheckoutOptions { /* the props we use */ }
interface RazorpayCheckoutConstructor { new(o: RazorpayCheckoutOptions): RazorpayCheckoutInstance }
declare global { interface Window { Razorpay?: RazorpayCheckoutConstructor } }
export {};
```

### 4. PlanSwitcher rewrite — `apps/web_v2/components/account/plan-switcher.tsx`

Replace the existing `switchPlan` direct call with the new branched
behaviour:

- Read the current subscription. Compute `isPaid = sub.userPlan !== "FREE"`.
- "Switch to ..." button label & dialog copy now depends on the
  transition:
  - **FREE → paid**: dialog reads "You'll be redirected to Razorpay
    Checkout to complete payment with cards, UPI, or net banking. Your
    plan switches to ${name} after the first successful charge." Confirm
    label "Continue to Razorpay".
  - **Paid → other paid (upgrade or downgrade across PRO/BUSINESS)**:
    dialog reads "Your plan will change to ${name} at the start of your
    next billing cycle (${formatted current_period_end}). No charge
    today." Confirm label "Schedule plan switch".
  - **Paid → FREE**: dialog reads "Your subscription will cancel at the
    end of the current period (${formatted current_period_end}). You'll
    keep ${currentPlanName} until then." Confirm label "Cancel
    subscription". On confirm, call `useCancelSubscription`, NOT
    `useSwitchPlan` (the API rejects FREE-target switch).
- Implement these three branches using the existing
  `useCreateCheckoutSession`, `useSwitchPlan`, and `useCancelSubscription`
  mutations.
- On the FREE → paid branch, after `useCreateCheckoutSession` resolves,
  call `openSubscriptionCheckout({...})` with prefill from the current
  user query (`useCurrentUser`). After Checkout closes successfully the
  webhook flips state; show a toast "Activating your subscription…" and
  invalidate `billingQueryKeys.subscription` + `usage` every 5s for the
  next 30s (use a simple `setInterval` cleared on unmount or first
  successful flip).
- Remove the obsolete comment "Razorpay checkout will be integrated once
  the billing API is ready."

### 5. PlanCard cancel button — `apps/web_v2/app/(account-shell)/account/billing/page.tsx`

The current `toggleCancel` text in `PlanCard()` reads:
"Subscription will cancel at period end." vs "Subscription renewal
restored.". Update it for the one-way cancel:
- Button label: "Cancel subscription" when `!cancelAtPeriodEnd`;
  "Cancellation scheduled" (disabled) when `cancelAtPeriodEnd`.
- Confirmation dialog before mutation (use the existing
  `ConfirmationDialog` component): "Cancel your subscription at the end
  of the current period? You'll keep paid features until ${period end}.
  To resume, you'll need to start a new subscription."
- On success toast: "Subscription will cancel at period end."
- Do NOT call the mutation a second time to un-cancel.

### 6. PaymentMethodsSection trim — `apps/web_v2/components/account/payment-method-row.tsx`

- Drop the row dropdown menu items "Set as default" and "Remove" and the
  whole `<DropdownMenu>`. Each row now renders brand/last4/exp and a
  small "Default" badge if `isDefault`; no actions.
- Drop the `deleteTarget` confirmation dialog block and the
  `useDeletePaymentMethod` / `useSetDefaultPaymentMethod` references.
- Keep the disabled "Add card" tooltip with text changed to:
  "Cards are saved automatically after your next paid charge."
- Empty state copy: "No saved cards yet. We'll save your card here after
  your first paid charge."

### 7. Invoice table

`apps/web_v2/app/(account-shell)/account/billing/page.tsx` — the
existing invoice table likely renders a download icon. Wire it to
`invoice.downloadUrl` (Razorpay hosted invoice). If `downloadUrl` is
null, render the icon disabled with a tooltip "Hosted invoice pending".
If present, render an `<a href={downloadUrl} target="_blank" rel="noopener noreferrer">`
around the icon.

### 8. Tests

`apps/web_v2/tests/billing/plan-switcher.test.tsx` (new):
- FREE → paid path calls `createCheckoutSession` then
  `openSubscriptionCheckout` with the returned subscriptionId/keyId.
  Mock the launcher.
- PRO → BUSINESS path calls `useSwitchPlan` and does NOT load Razorpay.
- PRO → FREE path calls `useCancelSubscription`.

`apps/web_v2/tests/billing/payment-methods.test.tsx` (new):
- The dropdown menu trigger does not render. The "Add card" button is
  disabled with the new tooltip text. An empty methods array renders the
  new empty-state copy.

`apps/web_v2/tests/lib/razorpay-checkout.test.ts` (new):
- `openSubscriptionCheckout` calls `new window.Razorpay({...}).open()`
  with the correct fields. Mock `window.Razorpay`.
- When `window.Razorpay` is unavailable (script load fails) but
  `shortUrl` is provided, falls back to `window.location.assign(shortUrl)`.

Update `apps/web_v2/tests/live-query-policy.test.ts` if it imports any
removed hook re-exports. (It probably doesn't, but verify.)

### 9. Verification

```
pnpm.cmd --filter @workspace/types build
pnpm.cmd --filter web_v2 format
cd apps/web_v2 && pnpm.cmd exec tsc --noEmit
cd apps/web_v2 && pnpm.cmd exec eslint . --ext .ts,.tsx
pnpm.cmd --filter web_v2 test
pnpm.cmd build --filter web_v2
python scripts/update-indexes.py
```

All must pass. Report the final test count.

### 10. Doc updates

`docs/continuity/progress.md`:
- Bump "Last updated" header to `2026-05-26 (Billing Phase B6 — web_v2 Razorpay Checkout integration)`.
- Update the "Current Snapshot" bullet to remove the "Billing UI must
  stay disabled, hidden, or explicitly read-only" caveat. Replace it
  with a brief description of the live PlanSwitcher behaviour and the
  three transition branches.
- Add a B6 line in the "Billing track" bullet under "Current Snapshot",
  in the same shape as B1-B5.
- Append a "Billing Phase B6 verification passed" entry under "Latest
  Verification" with the actual test count.

Do **not** create a commit.

## Non-goals

- No Razorpay webhook changes.
- No backend API additions beyond what B4/B5 already shipped.
- No analytics/event capture for checkout open/close (defer).
- No mobile-app-style modal for checkout — using Razorpay's own modal.
- No retry UI for failed payments (Razorpay handles the user-facing
  retry flow).

## Done definition

`web_v2` build, lint, typecheck, and tests pass. PlanSwitcher launches
Razorpay Checkout for FREE → paid, schedules switches for paid → paid,
and cancels for paid → FREE. PaymentMethodsSection has no mutator UI.
Invoice download links resolve to Razorpay hosted URLs. Continuity docs
record the lifted UI freeze.
