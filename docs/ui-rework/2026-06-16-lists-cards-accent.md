# Lists & cards — remove the left-accent stripe (B1)

Date: 2026-06-16 · Surface: every list row / gallery card app-wide

## Before (audit)
`ItemShell` rendered a 3px brand- (or destructive-) colored **left stripe** via
`accentColor` / `stripeStyle`, applied across forms, widgets, and every developer
surface (keys, agents, webhooks, integrations, exports, audit). A colored edge-bar
keyed to "active" is a decorative streak — the banned AI-slop motif. It also
double-encoded state that each item already shows explicitly.

## Principles
- No decorative edge streaks. State is communicated, not painted on a border.
- Use on-system cues already present: the `Badge` ("Active"/"Paused"/status pills),
  muted text, and the `inactive` fade.
- Keep legitimate states: `selected` (master-detail) and `bulkSelected` keep their
  background-tint / border / shadow cues — no stripe needed.

## Decision
Delete `stripeStyle` and the `accentColor` prop from `ItemShell` at the source so the
motif can't return, then remove every `accentColor=` call site. Verified each item
that used the stripe as a state cue already renders an explicit badge/pill, so no
legibility is lost. Updated the `/design` showcase to demo `selected` instead of the
stripe.

## After
- `accentColor` removed from `ItemShell` and all ~13 call sites; build + 108 tests
  green, tsc + eslint clean.
- Rows/cards now read as one native, un-striped system.
- Live screenshot verification deferred (the logged-in app can't be driven from this
  environment); change is purely subtractive + token-safe.
