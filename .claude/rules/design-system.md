---
paths:
  - "apps/web_v2/**/*.tsx"
  - "apps/web_v2/**/*.css"
  - "packages/**/*.tsx"
---

# Design System

Design canon lives in `.impeccable.md` (users, brand, principles, shared
primitives) and `docs/DESIGN.md` (theming/derivation contract). Read them —
this file only adds the operational rules around them.

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
