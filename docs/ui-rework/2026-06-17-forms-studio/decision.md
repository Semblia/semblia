# Form Studio rebuild — decision (2026-06-17)

User brief: "rework the entire studio, a full rebuild … the config options are
very poorly designed … full redesign of the form studio." Working autonomously
(user away). Scope = **all** issues; tone = the established Quiet Precision
(warm/credible), references Linear/Vercel/Notion + the builder polish of
Tally/Framer/Webflow within the locked parametric model.

## What changes (UI / web_v2 only)

New shell + inspector, all visual controls. **Engine, doc contract, API wiring,
and the production-renderer preview are untouched** — backward compatible.

### Shell (`studio-client.tsx`)
- Refined topbar: back, inline-feeling form title, status chip, Save draft,
  Publish (primary). Keep the draft/publish/dirty/hasUnpublished logic verbatim.
- Body becomes `[section rail] [inspector] [PreviewCanvas]`. Rail is a 76px
  vertical icon+label nav on `lg`, a horizontal segmented bar on small screens.

### Inspector sections (same 4 concerns, re-expressed)
- **Compose** (was Content): brand/headline/subhead/submit, branding card,
  after-submit — grouped into labelled sections with rhythm.
- **Questions**: an icon **type-picker** (popover grid) for quick-add; rows show
  a type glyph + inline label + required pip; expandable detail; reorder controls;
  per-type option/condition editors retained but cleaner.
- **Layout**: visual preset cards (themed `FormCardPreview` miniatures, not text)
  + contextual knobs as segmented/visual controls.
- **Style**: live themed **preset cards** (derived via `resolveThemeSnapshot`);
  appearance/radius/density/typeface/surface/accent/neutral/button each become a
  **visual picker** (segmented + swatch tiles + live mini-form); brand color +
  guided overrides with the live AA badge retained.

### New control primitives (`studio-controls.tsx`, `theme-swatch.tsx`)
- `Section`, `Field`, `Segmented<T>` (icon+label), `OptionCardGroup<T>`
  (radio-semantic visual cards), `SwatchRow`, `ColorField` (with AA badge).
- `ThemeSwatch` — a faithful mini-form rendered from `resolveThemeSnapshot(inputs)`
  output (real accent/surface/text/radius/buttonStyle), the visual referent for
  preset cards + surface/button/radius/accent tiles. Cannot drift from the engine.

## Non-goals this session
- No engine/schema changes, no new knobs, no API/DB work (would be Codex's lane).
- No drag-and-drop. No freeform styling. Widget Studio untouched (separate track).

## Verification gate
`tsc --noEmit`, `eslint . --ext .ts,.tsx`, `vitest`, `pnpm build --filter web_v2`,
`python scripts/update-indexes.py`. Commit per milestone.
