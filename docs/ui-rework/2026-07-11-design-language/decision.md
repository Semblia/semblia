# Design-language pass — decision (2026-07-11)

## Direction: "Quiet Precision v2 — Measured Ink"

Semblia stays minimal, calm, warm, professional — and becomes recognizable
through a small **signature kit** applied identically everywhere, instead of
per-component styling. The elevator pitch: *a drafting desk for social
proof — ink on warm paper, one amber pen.*

The user's dithered/dot-matrix/grid idea **partially fits**: the
drafting-paper interpretation (dot-grid workbench, dot-matrix waiting
states) is adopted because the studio canvas already established it and it
reads editorial-warm. The dither/scanline/terminal interpretation is
rejected as off-brand (anti-reference: dark-terminal aesthetic).

## The signature kit (seven moves)

1. **Dot-paper workbench** — generalized `bg-dot-grid` texture token
   (from the studio's `tf-stage-grid`), applied where artifacts sit/will
   sit: studio stages, preview canvases, empty states. Nowhere else.
2. **Dot-matrix waiting** — new Spinner: three ink dots pulsing in
   sequence (SVG, `role="status"` preserved). Skeleton switches to the warm
   shimmer. One loading language product-wide.
3. **Amber focus signature** — `--ring` becomes brand amber (darker in
   light mode for ≥3:1, brighter in dark); all controls share
   border-accent + soft amber halo on `:focus-visible`.
4. **Ink-press physics** — pressables compress ~scale(0.98)/1px at 120ms
   strong-ease-out; primary button gains inked depth (inset top-light
   hairline + soft base shade). Hover = tint shift only.
5. **Rise, don't zoom** — overlay motion signature: menus/popovers/
   tooltips fade + 4px rise from Radix trigger origin (~160ms enter, ~100ms
   exit); dialogs/sheets settle from scale .98 + 8px rise (~240ms). Replaces
   `zoom-in-95` everywhere.
6. **Sliding amber underline** — tabs' line variant becomes the default
   identity with an animated underline; pill variant restyled to hairline
   segmented-control. Matches existing SectionNav/studio-rail language.
7. **One motion token layer** — durations 120/160/240ms + two easings as
   CSS tokens; the ~30 per-surface keyframes re-pointed onto shared
   `fade-rise` / `fade-slide` vocabulary in globals.css (consumer files
   keep their class names — single-file consolidation).

## Scope

- `apps/web_v2/app/globals.css` — token layer, texture, motion
  consolidation.
- `apps/web_v2/components/ui/*` — visual language only (class strings,
  presentation wrappers). Radix semantics, keyboard behavior, focus
  management, DOM structure untouched (Principle L8).
- `apps/web_v2/components/shared/*` + app chrome — align to the kit;
  remove ad-hoc motion.
- `.impeccable.md` — update the canon with the signature kit.

Out of scope: embeds/hosted-form theming engine (`docs/DESIGN.md` contract),
api_v2, marketing site, any behavioral change.

## Non-negotiables carried in

- WCAG: focus ≥3:1 non-text contrast, reduced-motion collapse to fades,
  status never color-alone.
- Banned decoration stays banned (streaks, ornamental mono-uppercase).
- Full-bleed layout stays.
- Emil rules: no scale(0), exits faster than enters, <300ms, no animation
  on keyboard-frequency paths.
