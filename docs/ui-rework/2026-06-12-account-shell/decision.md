# Account shell — decision (2026-06-12)

Principles applied (Quiet Precision + house rules):

- **No dead affordances.** A control that can never do anything is removed, not
  disabled. Explanation lives in copy, not tooltips.
- **Every alarm needs a release valve.** At-limit state must point at the action
  that resolves it.
- **One vocabulary per page.** In-app word is "responses"; "publish" is retired.
- **Motion parity within a shell.** Sibling pages share the same entrance
  treatment (`settings-section-enter`, 60ms stagger).

## Changes

1. `PlanCard` (billing): hide Cancel button + "renews" date on FREE; subtitle
   becomes "Free plan · no billing". Display plan name title-cased ("Free plan",
   not "FREE Plan"). Paid behavior unchanged.
2. `UsageMeter`: rows at 100% get an inline brand "Upgrade →" anchor to `#plans`.
3. `PlanSwitcher` features: "testimonials" → "responses".
4. `PaymentMethodsSection`: remove the disabled "Add card" decoy; the
   how-cards-appear explanation moves into the section description on the page.
5. Defaults → Visibility "Public" desc: "New projects showcase approved
   responses publicly."
6. `NotificationsClient`: "· Email on/off" dead text becomes a real labeled
   Switch wired to `useUpdateNotificationPreferences` (busy-disabled, error
   toast + cache rollback via invalidate). Add "Show more" when `hasNext`
   (pageSize growth, keeps a single query). Add `settings-section-enter`
   stagger for motion parity.

Decision gate: all changes are client-side copy/affordance/wiring against
already-shipped API contracts — no new endpoints, no DTO changes. Proceed.
