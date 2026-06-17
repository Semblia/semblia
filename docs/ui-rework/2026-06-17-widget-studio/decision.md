# Widget Studio rebuild — decision (2026-06-17)

Brief: "use the same workflow for the Widget Studio as well … focus on the widgets studio
this turn." Mirror last session's Form Studio visual-inspector rebuild. Working
autonomously (user away). Tone = the established Quiet Precision (Measured · Credible ·
Warm), within the locked parametric model. The Form Studio is **not** touched this pass.

## What changes (UI / web_v2 only)

All visual controls + a focused section inspector. **Engine, `WidgetDefinitionDoc` v1,
the local draft store, API wiring, and the production-renderer preview are untouched** —
backward compatible.

### Shared control primitives (reuse > extend > create)
The Form Studio's `components/collect/studio/studio-controls.tsx` already exports the exact
generic vocabulary — `Section`, `Field`, `Segmented`, `OptionCardGroup`, `SwitchRow`,
`SelectField`, `AaBadge`. None of it is forms-specific. Re-export it through the widget
studio's existing `studio-primitives.tsx` boundary so the widget code reads cleanly with
zero duplication (matches the existing `studio-input-primitives` re-export pattern).

### New: `widget-theme-swatch.tsx`
`WidgetThemeSwatch` — a faithful mini *testimonial card* rendered from
`resolveBrandThemeSnapshot(inputs)` (the same engine the renderer uses): real accent,
surface, border, radius, button style, type. The visual referent for preset cards and the
surface / radius / button / accent / neutral / typeface tiles. Cannot drift from the engine.
(Widget analog of the forms `ThemeSwatch`, which renders a mini form.)

### Rebuilt: `controls-appearance.tsx`
Every appearance choice becomes visual:
- **Style presets** → `OptionCardGroup` of `WidgetThemeSwatch` cards (themed, not flat chips) + Remix.
- **Brand color** → keep the color input + quick-palette swatch row (already visual).
- **Mode** (light/dark/system) → `Segmented` w/ sun/moon/system icons.
- **Surface / Radius / Button / Accent / Neutral / Typeface** → `OptionCardGroup` of
  `WidgetThemeSwatch` tiles (each renders the card with one knob changed). The three
  `StudioSelect` dropdowns are deleted.

### Rebuilt: inspector shell (`widget-studio-controls.tsx`)
Six-deep accordion → focused, section-switched inspector with a top section nav
(**Layout · Style · Content**, matching the proven mobile-tab taxonomy):
- **Layout**: layout preset cards (themed where cheap) + layout-coupled behavior knobs.
- **Style**: the rebuilt appearance section.
- **Content**: source/handpick curation + card-field visibility + wall settings (wall kind).
Desktop and mobile now share one section model. Sibling-switcher rail, preview, share
drawer, guard, `⌘S` unchanged.

## Non-goals this session
- No engine/schema changes, no new knobs, no API/DB work (Codex's lane).
- No drag-and-drop. No freeform styling. Form Studio untouched.
- API-backed save/publish parity is the separate deferred track (not this pass).

## Verification gate
`tsc --noEmit`, `eslint . --ext .ts,.tsx`, `vitest`, `pnpm build --filter web_v2`,
`python scripts/update-indexes.py`. Per-milestone commits.
