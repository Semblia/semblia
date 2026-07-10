# Studios rebuild — after-audit (2026-07-10)

Closes the loop on `before.md` (the diagnosis) and `principles.md` /
`decision.md` (the spec). Everything below is on disk on
`feat/studio-rebuild-2026-07`; `pnpm build --filter web_v2` green.

## Point-by-point against the before-audit

### 1. Control vocabulary — FIXED

`OptionCardGroup` (44 uses / 9 files) is **deleted**, not shimmed. The shared
vocabulary in `components/studio/controls.tsx` is now compact and monochrome:

- `Row` — label left, control right; the default shape for every knob.
- `IconSegment` — small monochrome glyph segments with tooltips (corners,
  density, buttons, fields, background, scheme, device).
- `GlyphTileGroup` — quiet line-art tiles, reserved for genuinely visual
  choices only (form layout, widget layout).
- `Segmented`, `SelectField`, `SwitchRow`, `Stepper` — slim text controls.
- `PanelSection` — collapsible section with animated grid-rows reveal and an
  optional header action.

Hierarchy exists now: primary decisions (layout, preset, brand color) get
tiles/swatches; minor knobs get a one-line row. Nothing shouts.

### 2. Preview — FIXED

- **One controlled canvas** (`components/studio/studio-canvas.tsx`) for both
  studios: true device widths (1280 / 768 / 393), transform-scale rendering,
  visible zoom percentage with a dropdown (fit / 25–200%), ctrl/cmd+wheel
  zoom, keyboard zoom (`0` → 100%, `!` → fit), device + scheme switching in a
  floating dock, dotted stage grid.
- **True full-page preview routes** (the Figma "present in new tab" pattern):
  `/projects/[slug]/forms/[formId]/preview` renders the answerable draft
  full-viewport; `/projects/[slug]/widgets/[id]/preview` renders the saved
  draft's real shadow-DOM fragment. Both read `?device=` / `?scheme=` query
  params (deep-linkable), both wear the auto-hiding `PreviewChrome` pill
  (idle-hide 2.5s, pinned on hover/focus, always visible under
  reduced-motion), both have `error.tsx` delegating to `RouteError` and
  robots noindex.
- Topbar Preview action saves the draft first (`onBeforeOpen`), then opens
  the route in a new tab — no publish required to see the real thing.

### 3. Interactions — FIXED

- Inspector tab/override changes crossfade (`tf-fade-in`, 130ms); panel
  sections animate open/closed via `grid-template-rows` (160ms); canvas zoom
  transitions at 180ms. All disabled under `prefers-reduced-motion`.
- Save state is an ambient whisper (dot + Saved/Saving…/Unsaved), not a
  control. Publish is the only filled button.
- Field selection in the forms canvas is direct: hover outline on
  `[data-tf-field]`, click selects, Esc deselects; the inspector swaps to the
  field's contextual editor with breadcrumb + duplicate/delete.

### 4. Structure — FIXED

`StudioFrame` gives both studios the Figma/Typeform split: structure left
(forms outline, 240px), canvas hero center, inspector right (290px) with a
text tab strip — no more icon rail guessing game. Mobile gets a bottom tab
bar with real views instead of `display:none` flips.

- Forms: outline with per-field icons, keyboard nav, move/duplicate/remove
  menu, field palette on `+`; tabs Content · Design · Flow; selected-field
  override panel.
- Widgets: tabs Layout · Style · Content (behavior lives under Layout, wall
  settings under Content); presets as
  engine-derived `WidgetThemeSwatch` miniatures; Content picker now lists the
  project's REAL approved responses (fixed a dormant bug — the old stub
  hardcoded an empty list, so hand-picking never worked).

### 5. Truthfulness — FIXED

- The widget canvas scheme toggle now changes the HOST page scheme;
  fixed-theme widgets keep their colors and `system` follows the page
  (replaces the misleading auto-flip pulse).
- Zoom is a number you can read and set; 100% means 100%.
- Frame label shows the real hosted URL.

## What was deliberately NOT touched

- Save/publish machinery: 1200ms debounced autosave, optimistic
  `expectedVersion` + 409 re-hydrate, explicit publish, leave guards — all
  preserved verbatim in both studios.
- Compile paths: `parseDraftDoc`/`compilePreviewSnapshot` → `FormRenderer`;
  `composePublishedWidgetDoc` → shadow fragment. Untouched.
- The forms themselves (renderer presets, field types) — explicitly another
  sprint.

## Deletions

`studio-shell.tsx`, `studio-rail.tsx`, `browser-chrome.tsx`,
`form-studio-preview.tsx`, `widget-studio-preview.tsx`,
`studio-primitives.tsx`, `OptionCardGroup`. Net −525 lines in the widget
phase alone.

## Gates

- `tsc` + eslint clean per phase; `pnpm build --filter web_v2` → 6/6 tasks
  successful (includes the two new preview routes).
- Indexes updated (`py -3.11 scripts/update-indexes.py`; graph 6828 nodes).
- Live in-browser verification: see PR body screenshots.
