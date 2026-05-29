# Collect Studio — Decision

Converts [before.md](./before.md) NOs + [principles.md](./principles.md) into concrete,
numbered acceptance criteria. **Scope: visual / UX refinement only.** No form-builder
functionality, no new draft state, no API change, no new design-system primitives.

## Architectural facts established before deciding (verified, not assumed)

- The preview is already fully decoupled from the controls: `StudioPreview` only reads
  `draft.tokens` + `draft.brandName` and renders presentational markup
  (`studio-preview.tsx:184-490`). Making it render a representative form instead of
  placeholder boxes touches presentation only — no new state, no new control wiring.
- Every `--f-*` var needed for a representative form already exists in
  `tokensToCssVars` (`studio-token-css.ts:110-166`): field radius/pad, button
  bg/color/radius/shadow/border, surface, ink, accent, fonts, section/field gaps.
- `draft.brandName` is already resolved with fallbacks (`studio-preview.tsx:209-210`).
- Loading: `useStudioDraft()` returns `draft` (null until loaded). A skeleton can key
  off `!draft` in `StudioShellInner` without changing the context.
- The four `TokenChip`s, the "static shell" copy, the live-dot, and the accent wash are
  all self-contained presentational blocks — removable without side effects.

## Acceptance criteria

### AC-1. Single, consistent surface name (resolves NO-Q1, NO-Q8-naming)
- The surface is named **Form Studio** everywhere it self-identifies:
  topbar center (`studio-topbar.tsx:81`) and controls header
  (`studio-controls.tsx:33`). "Back to forms" stays. Remove the `v0.5` version badge
  from the panel header.

### AC-2. De-narrate the surface; humanize remaining copy (resolves NO-Q3, NO-Q9)
- Delete the "Static shell mode. Styling controls only." caption box
  (`studio-controls.tsx:71-75`).
- Stage label "TOKEN PREVIEW" → "PREVIEW" (or remove entirely with the live-dot, see
  AC-5). Stage tip "Static shell · token changes apply instantly · Cmd+S to save" →
  a single human line, e.g. "Changes apply live · ⌘S to save".
- Inside the preview card: remove the "Static studio shell" eyebrow and the
  "Tune the visual tokens now. Templates and fields return in the next pass." heading
  and the "Placeholder content only…" caption. Replace with representative form copy
  (AC-4).
- The deferral, if stated at all, appears **once** as a quiet helper framed positively
  ("Style your form — fields are configured elsewhere"). Acceptable to omit entirely
  since AC-4 makes the surface self-evident.

### AC-3. Controls panel leads with the first real choice (resolves NO-Q2, NO-Q6-panel)
- After removing the disclaimer box (AC-2), House styles becomes the first section
  directly under the Remix/Reset actions. No new ordering work beyond the deletion.

### AC-4. Preview renders a representative styled form (resolves NO-Q7, NO-Q6-stage, conditional #2)
- `TokenPreviewShell` renders a believable, **static** testimonial form driven by the
  live `--f-*` tokens:
  - brand/eyebrow line using `brandName`,
  - a heading (real testimonial-prompt copy, e.g. "Share your experience"),
  - a short sub-line,
  - a star/rating row (static, presentational),
  - one styled single-line field (e.g. "Your name") and one styled multi-line field
    (e.g. "Your testimonial") using `--f-field-*` tokens,
  - a primary submit button using the `--f-btn-*` tokens (no longer `disabled`-styled
    as a dead control; it's a visual sample, so render it non-interactive via
    `pointer-events:none` + `aria-hidden` on the form, not a `disabled` button that
    reads as broken).
- Remove the dashed placeholder boxes and the "no live fields here" caption.
- Remove the 4-up `TokenChip` row entirely (`studio-preview.tsx:472-486`) — it
  restates sidebar state.
- The whole preview form is decorative: wrap in `aria-hidden="true"` /
  `inert`-equivalent so SR users aren't told there's a fillable form here.

### AC-5. Quiet the stage chrome; map to tokens (resolves NO-Q6-stage, NO-Q8-hex, mech #3)
- Remove the pulsing amber live-dot (`studio-preview.tsx:518-528`) and the
  `stage-pulse` keyframes. Keep a small static "PREVIEW" + device-dims label.
- Remove the decorative diagonal accent wash (`studio-preview.tsx:216-221`).
- Stage chrome colors: replace raw `#eae7df / #8d8b83 / #b8b7b1` and hard-coded
  `"Geist Mono"` with the app's tokens — stage bg → `bg-muted`, chrome/tip text →
  `text-muted-foreground` (fixes the contrast NO; muted-foreground meets contrast on
  muted), mono → the app mono token / `font-mono` utility. The dark-mode override
  block stays in spirit but uses tokens so it tracks the theme automatically.

### AC-6. Loading skeleton (resolves NO-Q4)
- When `!draft`, `StudioShellInner` renders a lightweight skeleton (topbar shell +
  panel placeholder + stage placeholder) instead of the children returning `null` into
  a blank screen. Reuse existing skeleton/`animate-pulse` patterns; no new primitive.

### AC-7. Focus-visible on preset cards (resolves mech #2)
- Add a `focus-visible` ring to the preset `<button>`s
  (`controls-style-presets.tsx:24-33`) using existing ring tokens
  (`focus-visible:ring-2 focus-visible:ring-ring` pattern already used app-wide).

## In scope
studio-controls.tsx, studio-preview.tsx, studio-topbar.tsx, controls-style-presets.tsx,
and the shell's loading branch in studio-shell.tsx.

## Out of scope (anti-goals)
- Any form-builder functionality (fields/steps/branching), draft schema, or API.
- New tokens, new shared primitives, new motion for personality.
- Touching the `--f-*` token application logic in `studio-token-css.ts` (correct as-is).
- Desaturating Tresta chrome toward grayscale.

## Verification gates
`pnpm exec tsc --noEmit` · `pnpm exec eslint . --ext .ts,.tsx` ·
`pnpm prettier --write` on touched files · `pnpm build --filter web_v2` ·
`python scripts/update-indexes.py`. Any mechanical-gate NO from before.md must be
cleared in after.md.
