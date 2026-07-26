# App shell refactor — one rail, no second level

Date: 2026-07-26 · Branch `feat/app-shell-refactor-2026-07`

Follows the 2026-07-25 sitemap restructure (`docs/ui-rework/2026-07-25-sitemap/`,
PR #50), which made routes root-scoped. That pass fixed the URLs; this one fixes
the chrome sitting on top of them.

## The problem

Reaching `/[project]/settings/branding` meant reading four separate pieces of
navigation chrome, two of them vertical rails side by side:

```
AppTopbar          mark › project switcher › section breadcrumb   (52px)
ProjectSidebar     7 sections                                     (224px rail)
PageHeader         "Settings"
SectionNav         8 settings destinations                        (208px rail)
```

Account settings ran a **parallel copy** of the whole stack — `AccountTopbar` +
`AccountSidebar` in a separate `(account-shell)` route group — so the same idea
was implemented twice and drifted.

Every destination inside Developers and Settings was invisible until you had
already committed to that section, and the two rails competed for the same
"where am I" question.

## The shape now

One sidebar. Full viewport height, always present, identical in every context.

```
┌ ⬢ Semblia ──────────┐
│ [AP Agency Portfolio ▾]        ← project switcher (project context only)
├─────────────────────┤
│  Forms              │
│  Responses          │  the work
│  Widgets            │
│  Analytics          │
│ ───────────────     │
│  Integrations       │
│  Developers         │  configure
│  Settings           │  ← active section reveals its children inline
│    General          │
│    Branding         │
│    …                │
│ ───────────────     │
│  Documentation ↗    │
├─────────────────────┤
│ [avatar] you   🔔 ? ☾│
└─────────────────────┘
```

Decisions behind it:

- **Sub-destinations are disclosure, not a second rail.** Sections expand in
  place, so the list stays ~15 rows: every top-level section is always visible,
  and every sub-destination of wherever you are is one click away. This is what
  removed the second rail rather than hiding it.
- **Grouping sections expand; they do not navigate.** "Developers" and
  "Settings" are the only rows with children, and neither is a page worth
  visiting — `/[project]/developers` only redirects to its first child, and
  `/[project]/settings` *is* the General child already listed underneath.
  Clicking them as links sent you somewhere the label never promised, so they
  are `<button aria-expanded aria-controls>` disclosure toggles instead. A
  section opens by default when the current page is inside it; a manual
  toggle wins until you navigate, then the route decides again. Sections are
  independent — opening one never closes another.
  The collapsed panel is `inert`, because a `0fr` grid row still leaves its
  links tabbable and readable to assistive tech.
- **One shell for every signed-in surface.** `AppShell` + `AppSidebar` render
  the account area too; the `(account-shell)` route group is deleted and
  `/account/*` moved under `(app)`. Consistency is now structural — there is
  no second implementation that can drift.
- **The sidebar owns viewport height; the content column is its own scroll
  container.** Page chrome sticks to `top-0` and no longer hard-codes the
  `3.25rem` topbar offset. That coupling is gone from the codebase.
- **The topbar is gone.** Its four jobs moved: brand mark and project switcher
  to the sidebar head; notifications/help/theme/user to the sidebar foot; the
  breadcrumb was redundant once one rail shows the full path. Mobile keeps a
  12px-tall bar with the drawer trigger and the current location.
- **`nav-model.ts` is the sitemap as code.** Two contexts (workspace, project),
  one model, one active-state rule. It is what the tests assert against.
- **Every internal navigation goes through `lib/routes.ts`.** That file already
  said "never hand-build an internal href," but fourteen call sites did anyway —
  auth links, the notification bell, the brand mark, not-found, the account
  index redirect, and every post-sign-out `router.push`. All swept, four missing
  builders added (`forgot-password`, `sso-callback`, legal terms/privacy), and
  the two Clerk hand-off URLs (`redirectUrl`, `signUp/signInFallbackRedirectUrl`)
  routed through the map as well — they were literal strings no restructure
  would have caught.

## Sitemap changes

- `/[project]/developers` was an overview page whose only content was link
  cards to the developer surfaces — navigation rendered twice. It now redirects
  to `/[project]/developers/keys`.
- `/[project]/developers/docs` (an internal redirect to the docs site) is
  deleted; the sidebar links the docs site directly.
- `/account/*` URLs are unchanged; only their route group moved.

Everything else from the 2026-07-25 restructure is untouched.

## Active-state rule

A section's own href doubles as its first child (`/settings` is also
"General"), so a prefix test lit up General on *every* settings page. Selection
uses **longest match** (`activeChildHref`) instead of first match, so no child
needs to declare how it should be compared. Regression-tested.

## Crispness pass

Removed app-wide, per the directive that nothing may read as a gradient or glow:

- radial brand wash and amber glow behind the projects empty state, plus its 3D
  `perspective`/`rotateX` card stack (now a flat, aligned stack)
- blurred hover shadows on `ItemShell`, `EmptyKindPicker`, project card/row
  avatars, and the onboarding hero card's glow rings
- `backdrop-blur` on page headers, page toolbars, the settings footer, modal
  overlays, and the studio's floating toolbars — solid `bg-background` instead.
  The modal veil was darkened (18% → 34% in light) so separation survives
  without the frosting.
- fade-out gradient overlays on widget/form preview crops and the widget mini
  preview; the Parcel template swatch is two solid halves, not a ramp
- inset white highlight on the analytics range chips

Kept deliberately: the dot-paper texture (`.bg-dot-grid`, `.tf-stage-grid` —
a repeating dot pattern, design canon), the shimmer skeleton (the canonical
loading texture), hard `0 0 0 Npx` focus/drop rings in the media uploader (no
blur radius — rings, not glows), and the legibility scrims over user-uploaded
media.

## Verification

- `pnpm pr:gate:local -- --base origin/main` → `blockers=0 warnings=0`
  (full monorepo build, api_v2 72 files / 565 tests, web_v2 33 files / 146).
- `pnpm review:local` → CodeRabbit `PASS`, 0 findings. CodeScene reports
  `SKIP` — its CLI is not installed locally, so the hosted reviewer is the gate.
- Live (Playwright harness against the running stack; Chrome extension was
  offline): projects home, forms, responses, analytics, widgets,
  settings/branding, settings/domains, developers/webhooks, account/billing,
  form studio — all 200, zero console errors, light + dark, 1440 and 390 wide.
  The double-selection bug above was caught by the dark-mode `/settings/domains`
  screenshot and fixed before commit.
- Disclosure driven live: clicking "Settings" from `/forms` expands with the
  URL unchanged; both sections stay open together; clicking a child navigates
  and leaves its section open; on arrival both collapsed panels carry `inert`
  and a keyboard-reachability probe reports their links `inert-blocked`.
