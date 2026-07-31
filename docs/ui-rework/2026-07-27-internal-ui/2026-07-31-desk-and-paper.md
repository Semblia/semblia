# Desk and paper — the visual-depth pass

Date: 2026-07-31. Branch `feat/internal-ui-rework-2026-07`.

## Why this pass exists

The user reviewed the branch and refused it: "Pages look flat, there's no
liveliness to the entire app, honestly feels worse from where we started."
They were right, and the cause was measurable: every plane in light mode sat
within 1.5% lightness of every other (`--background` 0.985, `--surface` 0.975,
`--sidebar` 0.97, `--card` 1.0), separated by hairlines alone. The Measured
Ink kit — dot-paper, `ink-raised`, amber accent, the motion vocabulary —
existed in `globals.css` but the composition layer barely used it. The
structure from the redo was sound; the screens were wireframes of it.

This pass was driven visually: a Playwright harness over live pages
(`state.json` Clerk test login, screenshots at 1440/390, light and dark),
critique of each rendered screen, then the smallest token- or primitive-level
change that fixed what the screenshot showed.

## The move — build the desk

The brand story was always "a drafting desk for social proof — ink on warm
paper, one amber pen." The screens had paper and ink but no desk. Now:

- **The desk**: `--background` deepened to 0.967 warm linen; `--sidebar` one
  hair deeper (0.956) as the desk edge; `--surface` sits between desk and
  paper (0.982). Bordered content (`bg-card` lists, tiles, panels) reads as
  white paper resting on the desk. Depth is tonal, not shadowed — the
  no-shadow-on-scroll rule holds.
- **The amber pen marks where you are**: active sidebar rows carry a
  `bg-brand/12` wash with a deep-amber icon (`--brand-ink`, new token, both
  schemes); the queue's active row keeps its ink bar and trades the gray wash
  for the same amber; the active filter pill is a lifted paper chip.
- **Paper chips**: outline buttons and the active filter pill paint `bg-card`
  so they stay paper on the desk instead of dissolving into it.

## Per-surface corrections

- **Project card**: one left-anchored block (V1) — avatar beside stacked
  title + meta, pending-review badge under the title, not pinned across a
  void. Grids mount with `animate-fade-up` + stagger (first 8).
- **Widget card**: the preview well is a `bg-dot-grid` + `bg-surface`
  canvas, so a floating embed reads as an artifact on the workbench.
- **Empty states**: page-owning empties get a radially-masked dot-grid
  workbench backdrop; the API-keys first-run joined the centred composition
  (it was `align="start"` while owning the page).
- **Plan-limited CTAs**: a disabled primary at 50% opacity reads as a
  rendering bug. Blocked-by-plan create buttons ("New project", "New form",
  "Create embed") render as a quiet locked outline chip with a lock glyph;
  transient busy keeps the ink fill. Same for the billing tile: "Current
  plan" is a quiet outline fact, and the recommended upgrade carries the
  section's one filled CTA.
- **Metric band**: `MetricRow` is one bordered paper strip divided by
  hairlines (the Plausible reference V-language cites), values one step
  larger (`text-2xl` / `text-3xl` lead). Funnel bars draw in brand amber via
  a new `Progress` `tone="brand"`.
- **Responses split**: record column carries `bg-card` — list on desk,
  record on paper — and the split now stretches to the viewport (`PageBody`
  is not a flex container; without `flex flex-col` on it both columns ended
  at their content and the desk showed through under the decision bar).
  Search placeholder no longer clips.
- **Settings footer**: shares the form's `max-w-5xl` measure so Save sits on
  the form's right edge instead of the viewport's (the two-right-edges
  defect, this time between body and footer).

## Verified

`tsc` clean · `eslint` clean (2 pre-existing warnings) · 332 tests green ·
`pnpm build --filter web_v2` green. Screenshot-verified per change and in a
full sweep: projects home, responses split, analytics, forms, widgets,
integrations, settings general/branding, developers keys/webhooks, account
profile/billing — light + dark at 1440, responses + home at 390.

Not done here: studios (still out of scope); the index tooling
(`update-indexes.py`) could not run in this environment (chromadb/graphify
modules unavailable) — indexes are stale for this pass's diffs.
