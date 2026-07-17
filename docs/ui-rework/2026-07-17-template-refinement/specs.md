# Template re-cut specs (2026-07-17)

Derived from `research.md` (the canon) + the live audit of every pack.
Each pack keeps its WORLD (identity, composition idea) — this pass buys
refinement: fold discipline, void-killing, type scale, feedback-system cues.
All values still flow from the AA-clamped `--tf-*` / `--semblia-widget-*`
vars; tuning (radius/density/surface) must keep working.

## Audit failures being fixed

- Split-pane packs (Meridian, Parcel): left pane ~70% empty void.
- Aperture: vast dark emptiness, no cue-card/spotlight craft, small type.
- Ledger: one floating question in an oversized card; no vertical balance.
- Terminal: tiny shrink-wrapped card lost on an endless full-bleed grid.
- All forms: rating stars too small (38px max vs 44–60px industry), generic
  CTAs, weak recorder moment, brand color nearly absent.
- Widgets: stars as illegible micro-glyphs (0.62rem), marquee chips slice
  hard at frame edges, editorial/mosaic voids, no source-glyph slot, flat
  initial avatars.

## Forms — per-pack briefs

### Meridian — the split-pane conversation (quiet, precise)
Left pane becomes a composed column (space-between): logomark at top; a
middle block with title clamp(34px,3.8vw,46px)/1.05/-0.03em weight 640,
description 16.5/1.6 muted max 42ch, then the trust list restyled as
NUMBERED guidance prompts (01/02/03 tabular numerals, hairline separators,
14.5px — they prime the writer, per canon #10); foot = time-expectation line
+ attribution. Pane background: current brand-tint gradient + a very quiet
radial brand glow (≤6% mix) top-left — presence, not decoration.
Right pane: labels 20/600; baseline-rule inputs stay (the pack's device) at
22px; rating stars 46px gap 8; primary button 48px tall radius-field, brand
fill. Fold discipline: flow pane centers content vertically at viewport
height; taller content scrolls (frame handles it).
Embed: keep the earned card; padding tightens, no other change.

### Aperture — the stage (dark, video-first)
Give the void a job: a SPOTLIGHT. Radial gradient cone from top center
(accent ≤10% mix into the stage bg) behind the question. Cue chrome: film
progress at top stays, add cue number "01 — 04" (mono, 12px, tracking
0.08em, functional not decorative) above the question. Question
clamp(30px,4vw,44px)/1.15 weight 650 centered; helper 17px muted.
Inputs: dark ring-style — surface-raised bg, radius 12, no border, focus =
accent halo (0 0 0 4px focus-ring). Textarea 18px/1.6 min 180px.
Rating: 54px stars center stage. Recorder is the hero: 16:9 stage max 560px
centered, reassurance line under it: "It doesn't have to be perfect —
unlimited takes." Continue: brand pill 48px centered. Footer bar stays.
Embed: compact dark card, same input language.

### Ledger — the letter (paper, serif ink)
Vertical balance: the letter card (max 680px, padding clamp(36px,6vw,64px))
distributes letterhead / body / footer with the body vertically centered —
one question can no longer float in a void. Letterhead: monogram + business
name small-caps + hairline rule; title serif 34/600; description serif
italic 17 muted. Ask numbering "No. 01" stays. Labels serif 21/600.
Signature device: the testimonial textarea becomes RULED PAPER — borderless,
line-height 34px, repeating-linear-gradient hairlines every 34px, serif 18px.
Other inputs: single baseline rule. Rating: ink-colored stars 44px (amber is
off-world here; ink = text color, selected = accent). Footer: "Page 1 of 4"
centered small serif + short center rule. Button: ink-solid (text color bg,
paper text), radius 2px — letterpress. Embed: letter fragment card on cream.

### Parcel — the receipt (commerce, star-first)
Left pane void → the RECEIPT device: a dashed-border receipt card (bg
surface-raised, dashed 1.5px border-strong, radius 8) listing the steps as
receipt lines with dotted leaders: "01 Rate us …… 10 sec / 02 Your words ……
1 min / 03 Done …… ✓"; below it the star-stamp: a rotated (-8deg) circular
stamp outline with 5 stars + "VERIFIED WORDS" ring text — ONE stamp, corner
of the receipt. Title 34–42 weight 700; description 16/1.6.
Right pane: commerce inputs — filled (surface bg, radius-field, 1px ring
border-strong→accent on focus, 48px tall); rating FIRST inside a soft panel
(accent-soft bg, radius, 52px stars). CTA full-width brand fill 50px.
Embed: compact receipt-flavored card (dashed top rule).

### Terminal — the session (keyboard-first, mono)
Kill the infinite grid: page bg = flat --tf-bg; the SESSION WINDOW is the
composition: max 720px, min-height 72% of viewport, centered; title bar
(three 8px dots + "~/testimonials" mono + [1/4] right) 40px; grid paper
lives INSIDE the window body only (24px cell, border-color at 40%).
Question: "▸" prompt glyph + mono label 17/600; answers mono 15.5.
Keycap stars: 46px keycaps (radius 6, border, digit + tiny star), pressed =
accent fill + translateY(1px). Hint line: "↵ enter to continue" 12px muted.
Inputs: mono, transparent, bottom rule 1.5px; caret accent. Button: keycap
style. Progress: dotted line under title bar filled per step.
Embed: mini session card with title bar, no grid.

## Widgets — per-pack briefs (single-file css.ts + index.ts markup)

Shared atoms first: SVG stars (crisp, amber #f59e0b, sized per slot,
omitted when unrated); avatar initials get a per-name pastel hue (hash →
`--sw-avatar-h`, oklch bg/text); source glyph slot (20px, top-right,
bare); quote clamp everywhere (6–8 lines) with omitted-overflow fade;
masthead aggregate: score numeral 2.6× + stars 18px + count.

- **Marquee**: rails get side insets on wall + wider edge masks (12%);
  chips 360px, radius-card, hairline + ≤7% whisper shadow, header row
  (avatar 34 + name/meta + source glyph), stars 15px fixed slot above
  quote, quote clamp 4; spotlight chips 480px/quote 17px.
- **Gallery**: double-mat frame (outer hairline + inner hairline inset
  10px), stars 14px top of frame, quote 16.5/1.6; plaque below frame keeps
  small-caps name (museum device) + muted meta, 30px square avatar.
- **Mosaic**: Tally-wall spec: column width 330px, gaps 14px both axes,
  radius 12, hairline + 7% shadow, header (avatar 36 + name 15/650 + one
  muted line + source glyph), quote 15.5/1.55 clamp 8, footer = stars 13px
  amber + date, dense weave −1 step.
- **Column**: serif praise column: quote 1.24rem/1.7; hanging mark stays
  (editorial device); signature row: avatar 30 + name small-caps + stars
  13px right; separators: 56px center hairline at border-strong; first
  entry 1.38rem.
- **Editorial**: tighten: lead pad ×1.2 (was 1.6), rule margins ×1.4;
  lead stars 18px amber; lead quote keeps marks (spotlight device) at
  clamp(1.5rem,3.2cqw,2rem); deck items: 3px accent tick on the hairline
  left border top; bylines small-caps 11.5px; wall masthead nameplate +
  dateline row (edition date · N stories · avg).

## Studio

Fixed-height frames now scroll internally (real viewport). Marquee slicing
handled in-pack (masks/insets).
