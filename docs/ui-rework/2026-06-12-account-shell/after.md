# Account shell — after-audit (2026-06-12)

All decided changes shipped and verified live on the dev server
(screenshots `shots/after-*.png`).

## Shipped

1. **Billing / PlanCard** — FREE plan no longer offers "Cancel subscription";
   header reads "Free plan" (title-cased via `planDisplayName`), subtitle
   "₹0 / month · no billing" (parallel with paid price subtitles, no fake
   "renews" date). Paid behavior unchanged.
2. **Billing / UsageMeter** — rows at 100% of limit render an inline brand
   "Upgrade" anchor to `#plans` next to the count. Verified live on the
   1/1-projects row.
3. **Billing / PlanSwitcher** — plan features now say "responses"
   (25 / 1,000 / 10,000), matching the usage meter on the same page.
4. **Billing / Payment methods** — removed the permanently-disabled "Add card"
   decoy + hover-only tooltip; the read-only-mirror explanation moved to the
   section description; empty state tightened to "No saved cards yet."
5. **Defaults / Visibility** — "Public" description no longer uses the retired
   publish concept: "New projects showcase approved responses publicly."
6. **Notifications** — "· Email on" dead text replaced with a labeled, live
   `Switch` wired to `useUpdateNotificationPreferences` (busy-disabled,
   success/error toasts; cache updated from the PUT response). "Show more"
   appears when `hasNext` (pageSize growth keeps a single query). Header card,
   list, and empty state adopt `settings-section-enter` stagger for motion
   parity with sibling account pages.

## Found & fixed beyond the surface (P0)

- **api_v2 CORS omitted `PUT`** (`src/config/security.ts`): every browser
  preflighted PUT — notification preferences, form draft save, draft publish —
  failed with a network error. The live toggle test surfaced it. Added `PUT`
  to the method list + a covering assertion in `security.spec.ts`.
  This is why the email toggle had zero consumers' worth of field testing:
  the first real consumer found the door was never open.

## Verified

- Live: email toggle off→toast→on (state restored), upgrade anchor, vocabulary
  sweep (`grep` of rendered page text: zero "testimonials" on Billing).
- web_v2: `tsc --noEmit` ✓, `eslint` ✓ (zero warnings), Vitest 26 files /
  94 tests ✓ (2 new: email-toggle, show-more), production build ✓.
- api_v2: `typecheck` ✓, `lint` ✓, `security.spec.ts` 6/6 ✓.

## Noted, not addressed (backend, out of scope)

- `billing.service.ts:382` — concurrent lazy FREE-subscription creation hits
  the `userId` unique constraint when Billing-page queries race
  (`subscription.create` P2002 in dev log). Needs upsert/`P2002`-catch in a
  backend slice.
