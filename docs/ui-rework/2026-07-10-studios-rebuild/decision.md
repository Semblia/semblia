# Studios rebuild — design brief + execution plan (2026-07-10)

Derived from `before.md` (failure audit) + `principles.md` (P1–P10, live
research: Typeform, Tally, Figma, Senja, Framer). This document is the
canonical spec for the rebuild; a fresh agent should be able to execute from
it alone.

## The one-sentence thesis

Rebuild both studios as **one quiet instrument**: structure on the left
(forms), a controlled zoomable canvas in the middle, a contextual compact
inspector on the right, and a real full-viewport preview in its own tab —
with the existing save/publish machinery untouched underneath.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar 48px: ‹ Back · Name(rename) · status──── Preview↗ Share Publish │
├───────────┬──────────────────────────────────┬───────────────┤
│ Outline   │  Canvas stage (dot grid, hero)   │ Inspector     │
│ (forms    │  ┌─ frame label: URL · 1280 ─┐   │ ┌ tab strip ┐ │
│ only,     │  │  artifact at TRUE size,   │   │ │Content∙De…│ │
│ 240px)    │  │  transform-scaled         │   │ └───────────┘ │
│ fields    │  └───────────────────────────┘   │ compact rows  │
│ list +    │                                  │ in collapsible│
│ add       │  ⌄ floating dock: device · zoom  │ sections      │
│           │     −/fit%/+ · scheme            │ (280px)       │
└───────────┴──────────────────────────────────┴───────────────┘
```

- **Inspector moves to the RIGHT** (Figma/Framer/Typeform convention);
  section nav becomes a compact text tab strip at the top of the panel. The
  72px icon rail is deleted.
- **Forms gain a left Outline panel** (the structure): field rows (type
  icon + label + drag/keyboard reorder + duplicate/delete on hover), Add
  field (popover palette, flat text list Tally-style), plus Header/Ending
  pseudo-items that jump to Content. Selecting a row (or clicking the field
  on the canvas) opens the contextual Field editor in the inspector.
- **Widgets**: no outline; two-pane (canvas + inspector).
- Mobile (<lg): topbar + canvas, inspector as a bottom sheet behind a
  segmented bar (same content), outline behind a "Fields" sheet.

## Canvas system (shared `StudioCanvas`)

- Artifact renders at TRUE device width (desktop 1280 / mobile 393; forms
  hosted page identical) inside a plain rounded-rect frame with a floating
  **frame label** above it: `semblia.com/f/slug · 1280` (P6 — honest
  rectangles, no bezels/notches; BrowserChrome + phone shells deleted).
- **Zoom**: default *Fit*; Ctrl/Cmd+wheel zooms around the pointer's frame
  point; dock shows `− [98%] +`; the % opens a menu: Zoom to fit ⇧1 ·
  50% · 100% ⇧0 · 200%. Manual zoom disables auto-fit until Fit is chosen
  again. Scale via `transform: scale()` from top-center, 180ms ease-out
  (respect reduced motion). Range 25%–200%.
- **Dock** (floating bottom-center dark pill, Framer-style): device
  segment (desktop/mobile) · zoom cluster · scheme toggle (sun/moon).
  Widgets keep the auto-theme pulse behavior when theme = system.
- Stage background: subtle dot grid on muted bg (Senja artboard), no
  persistent tips, no "Live preview" pill (P7).
- Forms canvas keeps `data-tf-field` click-to-select + hover outline;
  hover outline restyled to a quiet 1px brand line + name tag.

## Preview is a place (new routes)

- `projects/[slug]/forms/[formId]/preview` and
  `projects/[slug]/widgets/[id]/preview`.
- Opened from the topbar Preview (play) button with `target="_blank"`
  (flush pending save first — autosave already persists the draft server-side,
  so the preview tab reads the saved draft via the existing draft hooks).
- Full-viewport, **functional** artifact (forms: FormRenderer mode
  "preview", answerable; widgets: real fragment on a clean page).
- Chrome = one floating pill that **auto-hides** after ~2.5s idle and
  returns on mouse move (Figma Present): ✕ back-to-studio · device ·
  scheme · restart. State in query params (`?device=mobile&scheme=dark`) so
  it's deep-linkable/shareable (P5).
- Route is client-side, reuses studio auth/hooks; add `error.tsx` per repo
  rule.

## Inspector control language (rewrite `components/studio/controls.tsx`)

The row is the unit (P2). New primitives, design-system tokens only:

- `PanelSection` — collapsible: 32px header row (chevron + 12px semibold
  title + optional trailing action), animated open/close (grid-rows trick),
  default open, state kept per mount.
- `Row` — `grid-cols-[1fr_auto]` label left (12px, muted-foreground) +
  control right; `RowStack` for full-width controls (inputs, textareas).
- `IconSegment` — segmented control of small monochrome glyphs (18px), for
  alignment/corner/density/device; tooltip = label; active = bg-background
  + shadow-sm (no brand fill).
- `Segmented` — text version, slimmed (24px high).
- `Stepper` — numeric with −/+ and inline unit.
- `CompactSelect` — 28px-high select (fonts render their own specimen).
- `SwatchRow` — label + small round swatch + value text; popover with the
  constrained palette choices.
- `GlyphTileGroup` — the ONLY tile control: small (≈64×44) line-art
  monochrome glyph tiles, 3–4 per row, for genuinely visual choices
  (layout preset, widget variation, scheme). Active = 1.5px brand ring.
  NO 16:10 preview cards, NO hints inside tiles, NO badges, NO check
  bubbles. Rich galleries stay in the creation pickers (Senja P2).
- `SwitchRow` — borderless, 28px row.
- `AaBadge` — keep as is.

`OptionCardGroup` is **deleted**; every call site re-lands on the above.

## Panel maps (no knob may be lost)

**Forms** — inspector tabs `Content · Design · Flow`, plus contextual
`Field` view (breadcrumb back) when a field is selected from outline/canvas:

- Content: Header (title, subtitle) · Submission (button label, success
  mode message/redirect + fields).
- Design: everything in today's `form-style-panel.tsx` (layout preset,
  scheme, corners, density, buttons, background, type scale/pairing, AA
  clamp badge) re-skinned onto Rows/GlyphTiles/SwatchRows.
- Flow: mode (single/step), consent placement, behavior, Protection
  (captcha off/suspicious/always, min-time, honeypot, blocked words),
  conditional rules (`flow-rules.tsx` re-skinned).
- Field (contextual): label/required/placeholder + per-type settings
  (`field-settings.tsx`) + privacy/publish toggles + duplicate/delete.

**Widgets** — inspector tabs `Layout · Style · Content`:

- Layout: kind-aware preset + variation (GlyphTiles) + behavior
  (autoRotate etc.).
- Style: `controls-appearance.tsx` re-skinned (theme, brand color source,
  typography, corners, density…).
- Content: source mode all/hand-picked + picker, card fields visibility,
  wall settings (wall kind), visibility.

## Interaction + motion spec (P10)

- Inspector tab switch: 130ms crossfade + 4px slide (`data-[state]`
  CSS, `prefers-reduced-motion` disables).
- PanelSection open/close: 160ms grid-rows animation.
- Zoom/device: 180ms transform ease-out.
- Preview pill: opacity/translate fade 200ms, idle-hide 2.5s.
- Field hover on canvas: 80ms outline fade.
- Nothing else moves. No pulses (except widget auto-theme), no tours.

## De-hand-holding (P7/P9)

- Delete stage tips ("⌘S to save…", "changes auto-deploy"), "Live preview"
  status line, section descriptions-as-prose where a label suffices.
- Save state = one muted word in the topbar ("Saved"/"Saving…"/"Unsaved")
  next to a 6px dot; conflicts still toast.
- Publish is the only filled button. Preview/Share are ghost/icon.
- StudioHelp popover stays behind `?` + a small icon; shortcut list gains
  zoom keys.

## What must NOT change (machinery)

- Draft/save/publish lifecycle in `form-studio.tsx` +
  `widget-studio-shell.tsx` (debounce 1200ms, expectedVersion, 409
  rehydrate, beforeunload + leave guard, rename, share drawer, first-run).
- `compilePreviewSnapshot`/`FormRenderer` path incl. deferred doc +
  structural-key remount discipline; widgets
  `renderPublishedWidgetFragment` → shadow root + deferred draft memo.
- `useApprovedResponses` preview items path; `HostPageChrome` stays as the
  optional embed context INSIDE the canvas frame for embed widgets (it is
  the "on a real page" truth; wall + forms render as plain hosted pages).
- Hotkeys (digits→tabs, ⌘⏎ publish, ⌘S save, `?` help) + roving tabindex +
  aria roles; extend with ⇧1/⇧0 zoom, Esc deselect.

## Execution phases (one commit each)

- **A — shared bones**: new `controls.tsx`, `studio-frame.tsx`,
  `studio-topbar.tsx`, `studio-canvas.tsx`, hotkeys ext; delete
  `studio-rail.tsx`, `browser-chrome.tsx`, old shell.
- **B — Form Studio**: outline panel, inspector re-org (tabs+Field view),
  style/flow/field panels re-skinned, canvas adoption, preview route.
- **C — Widget Studio**: shell recomposition, inspector tabs, controls-*
  re-skin, canvas adoption, preview route.
- **D — sweep**: kill dead exports, lint/format, `update-indexes`,
  after.md.
- **E — verify + ship**: build gates, live browser pass (both studios,
  light+dark, zoom/device/preview routes), continuity docs, PR.
