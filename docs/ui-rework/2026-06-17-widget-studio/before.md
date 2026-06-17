# Widget Studio — before-audit (2026-06-17)

Surface: `apps/web_v2/components/widgets/studio/*` (the parametric widgets-core studio).
Method: code read (studio is behind Clerk auth; `agent-browser` can't attach to the
logged-in Chrome — see `docs/research/2026-06-15-studio-competitors/`). Grounded in
the real component source, the `@workspace/widgets-core` contract, and `.impeccable.md`.

This is the companion pass to the Form Studio rebuild (`b05c1131` + `b6d07aae`).
That session's after-note flagged the widget gap explicitly: *"still needs … the same
dropdown→visual-picker treatment."* This audit confirms and scopes it.

## What it is today

`widget-studio-shell.tsx`: topbar over a body of
`[widget-switcher rail 56px] | [controls 380px] | [WidgetStudioPreview flex-1]`.

The preview (`widget-studio-preview.tsx`) is genuinely good: it runs the **production
render path** — `publishWidgetDefinition` → `composePublishedWidgetDoc` →
`renderPublishedWidgetFragment` mounted in a real shadow root. Preview == what ships.
**Keep it.** The engine (`@workspace/widgets-core` + `@workspace/brand-theme`) is solid
and identical to the forms engine. **Keep it.**

The controls (`widget-studio-controls.tsx`) are a **6-deep collapsible accordion**:
Layout · Appearance · Wall · Content · Behavior · Card fields — every section open by
default, one long scroll.

The appearance section (`controls-appearance.tsx`) is *partly* visual already — style
preset cards (flat color chips), a brand-color swatch row, a mode segmented control,
surface swatch tiles, radius/density/accent pills — but it still falls back to **three
text dropdowns** (Type, Neutral, Buttons) and its "visual" previews are flat color
squares, not the real themed render.

## Design Health — Nielsen heuristics (~25/40, "functional but reads like settings")

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of status | 3 | Live shadow-DOM preview is excellent; per-knob feedback weak |
| 2 | Match real world | 2 | "Neutral tone / accent intensity / button style" are jargon; previews are flat chips, not the themed card |
| 3 | User control & freedom | 3 | Reset + Remix exist; unsaved guard solid |
| 4 | Consistency | 2 | Mixes segmented + pills + swatch tiles + dropdowns for the *same kind* of choice |
| 5 | Error prevention | 4 | AA clamp + Zod at the boundary — a saved doc is always renderable |
| 6 | **Recognition vs recall** | **2** | Type/Neutral/Buttons are text dropdowns; preset/surface previews don't show the real theme |
| 7 | Flexibility & efficiency | 3 | Remix + presets are nice; everything in one scroll dilutes focus |
| 8 | **Aesthetic / minimalist** | **2** | 6 accordions open at once; control vocabulary is inconsistent; flat-chip swatches read cheap |
| 9 | Error recovery | 3 | Fine |
| 10 | Help & docs | 2 | Hints exist; jargon knobs have no worked example |

## Anti-patterns verdict

Not AI-slop in the gradient/glass sense — palette is restrained and on-brand. The tells
are subtler: **inconsistent control vocabulary** (four different widgets for eight
same-shaped choices) and **decoration-grade previews** (flat color squares standing in
for a themed testimonial card). It reads as a *settings panel that grew*, not a studio.

## Priority issues

- **[P0] Three appearance choices are still text dropdowns.** Type / Neutral / Buttons
  use `StudioSelect`. Recognition-over-recall is violated — you can't see what you're
  picking. → visual pickers (typeface specimens, neutral-tint swatches, button-style tiles).
- **[P0] "Visual" previews don't use the real engine.** Preset cards show four flat
  color chips; the surface tiles show an abstract box. We can derive a faithful mini
  *testimonial card* from `resolveBrandTheme` (the same function the production renderer
  uses) so every tile shows the true accent/surface/radius/type. → `WidgetThemeSwatch`.
- **[P1] Inspector reads as a settings page, not a studio.** Six accordions open in one
  scroll, no focus. The Form Studio moved to a focused, section-switched inspector. →
  match it: a section nav (Layout · Style · Content) showing one concern at a time.
- **[P1] Control vocabulary is inconsistent.** Segmented, pills, swatch-buttons, and
  dropdowns all appear for mutually-exclusive picks. → one vocabulary, shared with the
  Form Studio (`Segmented`, `OptionCardGroup`).
- **[P2] Accent/density pills carry no visual cue.** Text-only. → keep segmented but let
  the live preview + swatch tiles carry the meaning.

## Constraints carried into the rebuild (locked, do not violate)

- No drag-and-drop, ever. No freeform token/composition editor (raw hex/px/font knobs).
  New visual capability = better *affordance* over the existing constrained knobs, never
  new free CSS. (`docs/continuity/decisions.md`, roadmap §0.)
- The studio preview MUST keep using the production widgets-core render path.
- Backward compatible with stored `WidgetDefinitionDoc` v1 and the local draft store.
- Engine / schema / API wiring untouched (API-backed save/publish parity is a separate
  Codex-lane track — `docs/plans/2026-06-15-studios-reconciliation-and-roadmap.md`).
