# Widget Studio — Decision (scoped normalize pass)

The full-rework gate did **not** trigger ([before.md](./before.md)). This is a bounded
consistency/normalize pass against the Q8 NOs only. Every change below maps to a
specific enumerated defect; nothing else is touched.

## Verified facts before deciding

- `--brand` is the warm amber-sand accent and `bg-brand` is already used in this surface
  (`widget-studio-rail.tsx:132`). `text-brand` / brand ring utilities exist in the same
  token family. Confirm with a grep at execution time before relying on a given utility.
- `StudioMark` (`components/shared/studio-mark.tsx`) renders its caption only when
  `version || status` is truthy; `status` defaults to `"preview"`. Passing
  `status="Layout & style"` (and no `version`) gives a purposeful caption; passing
  `status=""` would suppress it. Collect uses a purposeful caption, so Widget matches.
- The stage `--stage-*` hex vars are defined inline in `STAGE_CSS`
  (`widget-studio-preview.tsx:150-169`) and consumed in two spots
  (`:246` outer bg, `:249` chrome text). Self-contained — safe to retokenize.
- The emerald dot, indigo pulse, and emerald badges are isolated presentational classes;
  swapping their color has no behavioral effect.

## Acceptance criteria

### AC-1. Panel header matches Collect (resolves Q8-caption, Q1-minor)
- `widget-studio-controls.tsx` `Header`: drop `version="0.1"`, set
  `status="Layout & style"` (parallel to Collect's `status="Brand & style"`).

### AC-2. Stage chrome onto tokens (resolves Q8-hex, mech #3)
- Replace `--stage-bg:#ebe8e0` / `--stage-chrome:#8d8b83` (and the dark override) usage
  with Tailwind tokens: outer stage `bg-muted`; chrome + tip text
  `text-muted-foreground` (tip may keep a `/70` softening). Remove the now-unused
  `--stage-*` declarations from `STAGE_CSS`. Keep `.widget-stage-frame` transition and
  the reduced-motion guard.

### AC-3. Live-dot on-brand and quiet (resolves Q8-emerald, Q6-minor)
- The preview live-dot: emerald `#10b981` + green glow → the brand accent. Keep the
  "LIVE PREVIEW" label (the preview is genuinely live: auto-theme cycling + rotation).
  Drop the heavy colored glow; the dot may keep its gentle pulse (already
  reduced-motion-guarded) but tinted via `--brand`, or render static. Prefer a small
  static `bg-brand` dot for parity with the quieted Collect stage.

### AC-4. Wall-kind accents drop emerald (resolves Q8-emerald)
- Topbar wall-URL pill status dot (`widget-studio-topbar.tsx:106`): emerald → `bg-brand`
  with a brand-tinted ring (it signals a live public URL — brand is the warm equivalent).
- Rail type-badge (`widget-studio-rail.tsx:152`): wall `bg-emerald-500/85 text-white` →
  `bg-brand text-background` (or a neutral `bg-foreground/80`); embed stays
  `bg-foreground/80 text-background`. The Globe/Code icon keeps doing the real
  differentiating work.

### AC-5. First-run share-pulse on-brand (resolves Q8-indigo)
- `widget-studio-topbar.tsx` keyframe: indigo `rgba(99,102,241,…)` →
  `color-mix(in oklch, var(--brand) <pct>, transparent)` so the nudge pulses in the
  brand color. Keep the existing `prefers-reduced-motion` opt-out.

### AC-6. Humanize preview tip copy (resolves Q3-minor)
- `widget-studio-preview.tsx:321`: "Embedded inside a faux site" →
  e.g. "Shown on a sample page" (embed) / keep "Wall preview" (wall). Keep
  "⌘S to save · changes auto-deploy".

### AC-7 (minor, optional). QR reads as placeholder (resolves Q7-minor)
- If cheap: soften the fake `QRGlyph` (reduced opacity / muted fill) so it reads as a
  sample beside its "Coming next" caption. Skip if it risks scope creep — the caption
  already prevents deception.

## In scope
`widget-studio-controls.tsx` (header only), `widget-studio-preview.tsx` (stage chrome +
dot + tip), `widget-studio-topbar.tsx` (pill dot + pulse), `widget-studio-rail.tsx`
(type badge), optionally `widget-share-drawer.tsx` (QR glyph).

## Out of scope (anti-goals)
- Any control section, the preview renderer, share snippets, the store, behavior.
- Product domain change (`semblia.com` → follow-up).
- The emerald "success" greens on copy-confirmation / auto-deploy callouts in the share
  drawer — those are defensible semantic success feedback; leaving them avoids
  over-reach. (Recorded as an observation, not a change.)
- New tokens / primitives / motion.

## Verification gates
`tsc --noEmit` · `eslint` (touched files) · `prettier --write` · `build --filter web_v2`
· `update-indexes.py`.
