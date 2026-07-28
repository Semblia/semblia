---
paths:
  - "apps/web_v2/**/*.tsx"
  - "apps/web_v2/**/*.css"
  - "packages/**/*.tsx"
---

# Design System

Design canon lives in `.impeccable.md` (users, brand, principles, shared
primitives) and `docs/DESIGN.md` (theming/derivation contract). The **structural**
layer over those tokens — surfaces, data states, lists, tables, status, metrics —
is `docs/ui-rework/2026-07-27-internal-ui/system.md`, with its rules in
`decision.md` and rationale in `principles.md` beside it. Read them — this file
only adds the operational rules around them.

## The rules that are not negotiable

These exist because each one names a defect that shipped:

- **Never hand-roll a container.** `rounded-* + border` is sanctioned only for
  `SettingsSection`, a grid tile where the tile *is* the entity, and a floating
  layer (dialog/popover/sheet/dropdown/toast). Group everything else with
  `Section`, dividers, and tint steps.
- **Never nest two bounded surfaces.** A bordered box inside `SettingsSection`
  or inside a dialog is the cards-on-cards defect.
- **No `box-shadow` on anything that scrolls with the page.**
- **Never write a state ladder by hand.** No
  `loading ? … : items.length === 0 ? <Empty/> : <Rows/>`. Compose
  `useDataState` + `DataState`, which makes "empty state while the query
  failed" impossible to express.
- **Never offer an action the API will refuse.** Disable it and state the reason
  in place via `disabledReason` — a tooltip on a disabled control is unreachable.
- **Absent ≠ zero.** `orDash()` for missing, plain `0` for a real zero.
- **Banned copy:** "Something went wrong", "Oops", "Get Started", "Continue",
  raw HTTP codes, raw enum values, and marketing prose between a page title and
  the first content element.

Every state of every primitive renders at `/design` under "Data surfaces" —
check a change against it before assuming a state is handled.

- Route UI work through the design skills: `/critique` or `/audit` before,
  the executor skills (`/normalize`, `/arrange`, `/typeset`, …) during,
  `/polish` after. Freehanding UI is how off-system patterns ship.
- The app is full-bleed app-wide. Do not reintroduce a contained/centered
  `max-w-*` page rail.
- Banned decoration: decorative streaks, mono-uppercase "eyebrow" labels used
  as ornament, one-off page headers outside the shared primitives.
- Logo/brand-mark previews default to `object-contain` — never cover-crop a
  brand mark.
- New surfaces must read as native to the rest of the app. When in doubt,
  find the closest existing surface and match its structure.
