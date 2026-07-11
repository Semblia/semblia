# Design-language pass — after (2026-07-11)

## What shipped

**Foundations (globals.css)**
- One motion vocabulary: `--duration-fast/base/slow` = 120/160/240ms;
  `--ease-standard` (strong ease-out, 0.23,1,0.32,1) for enters,
  `--ease-exit` for exits. Legacy `--ease-out/--ease-in` alias the same
  curves so nothing drifts.
- ~20 per-surface keyframe families (auth-*, onboard-*, detail-*,
  settings-*, step-*, help-fab-*, tf-*) collapsed onto four shared
  gestures: `ink-fade`, `ink-rise`/`ink-drop` (+ exits), `ink-slide-*`,
  `ink-pop`. Consumer class names unchanged; exits are now uniformly
  faster than enters.
- `--ring` is the amber focus signature: `oklch(0.55 0.12 55)` light
  (≈4.9:1 on paper), `oklch(0.74 0.13 55)` dark (≈8.7:1) — WCAG 2.2
  focus-appearance safe.
- New tokens: `bg-dot-grid` (drafting-paper texture), `ink-raised`
  (primary-CTA material w/ press-in shadow), `ink-veil` (warm modal
  backdrop), `spinner-dot`/`ink-dot` (dot-matrix loader).

**Primitives (components/ui)**
- Overlays (dropdown, select, popover, hover-card, tooltip, context-menu,
  menubar, combobox, navigation-menu): `zoom-in-95` removed everywhere;
  enter = fade + side-aware rise from trigger origin at 150ms
  ease-standard; exit = fade at 100ms ease-exit.
- Dialog / alert-dialog: settle from an 8px rise (200ms), exit 150ms;
  backdrops use `ink-veil`. Sheet/drawer follow tokens.
- Button: default variant carries `ink-raised` + hover tint; base gets
  ease-standard. Press stays translate-y-px (+ ink sinks on primary).
- Spinner: dot-matrix triad (SVG, `role="status"` kept). Skeleton:
  `animate-shimmer` (never pulse). Sonner loading icon uses Spinner.
- Tabs: line-variant underline now draws in (scale+opacity, 150ms);
  trigger transitions tokenized.
- Checkbox check pops in; switch thumb, badge, progress, inputs, select
  trigger all speak the token transitions; every focus halo normalized
  to `ring-ring/30` (amber via token).
- Empty: sits on `bg-dot-grid` paper.

**App sweep**
- All five hand-rolled loader dialects (auth svg spinner, sso-callback
  svg, 4× border-spinner divs in studios/previews, avatar/media upload
  ArrowClockwise spins, share-drawer CircleNotch, refreshing badge)
  → shared Spinner. Last inline `animate-pulse` → shimmer.
- PageTabs / SectionNav / FilterPills underline easing + welcome
  progress rail re-pointed at `ease-standard`.
- `/design` showcase duration table updated; `.impeccable.md` gains the
  Measured Ink signature-kit canon (7 rules).

## Gates

- `tsc --noEmit` ✓ · `eslint .` ✓ · `vitest run` 29 files / 93 tests ✓ ·
  `pnpm build --filter web_v2` 6/6 ✓ · `update-indexes.py` ✓ (AST merge;
  semantic extraction deferred as usual).
- Visual verification: see progress ledger entry for this date.

## Honest deltas / watchpoints

- Reduced-motion remains the global "instant everything" collapse —
  simple and safe, but Emil-style selective fades could be a later
  refinement.
- `.tf-stage-grid` kept as an alias of the dot-grid recipe (studio call
  sites unchanged); could migrate to `bg-dot-grid` cosmetically later.
- Widget/forms *embed* renderers (widgets-core fragment CSS) keep their
  own 280–380ms curves — same bezier family, out of app-chrome scope by
  design (public embed surface).
- `studio-topbar` unsaved-dot keeps `animate-pulse` deliberately: it is a
  status pulse, not a skeleton.
