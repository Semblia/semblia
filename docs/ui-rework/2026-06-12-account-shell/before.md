# Account shell — before-audit (2026-06-12)

Surface: `(account-shell)/account/*` — Profile, Security, Billing, Notifications, Defaults.
Method: live dev-server walkthrough (agent-browser, dark theme) + source read.
Screenshots in `./shots/`.

## What already works

- Shell + nav: left rail with active-state, breadcrumb topbar, "Back to projects". Consistent with the app shell.
- Profile: full email lifecycle (add → OTP verify → primary/remove), connected accounts, avatar upload, danger zone, dirty-state Save/Discard footer. Solid.
- Security: password change with inline mismatch validation, real MFA setup (QR + backup codes, June 9 fix), sessions list with revoke. Solid.
- Page headers were already normalized in the June 7 sweep (plain `PageHeader`, no redundant descriptions).
- `SettingsSection` entrance stagger (60ms steps) on Profile/Security/Billing/Defaults.
- Notifications empty state is editorially correct (icon, orienting title, explanatory body).

## Findings

### P1 — functional UX gaps

1. **Billing: "Cancel subscription" offered on the FREE plan** (`PlanCard`).
   The destructive-styled button renders whenever `!cancelAtPeriodEnd`, including
   for free users who have nothing to cancel. Dead-end action; first thing a new
   user sees on Billing is an invitation to cancel.
2. **Billing: "FREE Plan · Active · Free plan · renews Jul 12, 2026"** — redundant
   ("FREE Plan" + "Free plan") and misleading (a free plan doesn't meaningfully
   "renew"). Also `{sub.userPlan} Plan` renders raw enum casing ("FREE Plan").
3. **Notifications: email preference is dead text.** Header card says
   "· Email on" but there is no control; `useUpdateNotificationPreferences`
   exists with **zero consumers**. A user who reads "Email off" has no way to
   turn it on.
4. **Notifications: no pagination affordance.** List fetches `pageSize: 20`;
   `V2PaginatedResponse.hasNext` is ignored — notification #21 is unreachable.

### P2 — visual-language / vocabulary breaks

5. **Plan cards say "testimonials"; the usage meter above says "Responses collected"** —
   same page, same quantity (25), two different words. The product renamed the
   surface to "Responses" on 2026-06-03; plan features were missed.
6. **Defaults → Visibility "Public" description uses the retired publish concept**:
   "New projects can publish approved testimonials publicly." Publish was removed
   from the product; sibling copy elsewhere says "view"/"showcase".
7. **Payment methods: permanently-disabled "Add card" decoy.** Cards are read-only
   webhook mirrors (B5); the button can never enable. Disabled-with-tooltip is a
   fake affordance (and tooltips don't fire on touch). The empty-state copy
   already explains the model.

### P3 — polish

8. **Usage meter at limit (1/1 projects, full red bar) offers no next action.**
   The alarm has no release valve — the Plans section is two scrolls below but
   nothing points there. "What shows is what sells": an at-limit row is the
   single best upgrade moment on the page.
9. Notifications page is the only account page with no entrance motion
   (hand-rolled header card + list, no `settings-section-enter`).

## Out of scope (recorded, not touched)

- `DEFAULT_CONFIG` public-form strings ("Submit testimonial", "Your testimonial
  has been received") are end-customer-facing form copy owned by the forms-v4
  rebuild — not account-shell vocabulary.
- Widget studio "approved testimonials" strings — widget surface decision
  (kept `WidgetTestimonial` naming) per 2026-06-03 rename scope.
- Global disabled-button contrast in dark theme — system-level Button concern.
