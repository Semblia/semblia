# Template refinement — live visual research (2026-07-17)

Live-browser walkthroughs (Playwright/Chromium, screenshots studied per site)
of the testimonial-platform field, run before the template re-cut. Sites:
Senja (marketing + live wall + live collect form), Testimonial.to (wall,
collect space, widget taxonomy), Tally (form craft + their Senja-powered
wall), Famewall + Shoutout (the anti-pattern budget tier), Trustmary +
Trustpilot TrustBox + Elfsight (enterprise trust visuals). Complements the
2026-07-14 research (Typeform/Stripe/Supabase/Resend).

## The refinement canon (rules our packs must obey)

1. **Border OR shadow, never both.** Two coherent schools: institutional =
   1px warm-grey hairline, radius 12–16, zero shadow, off-white card on warm
   page; friendly-SaaS = no border, one soft diffuse shadow, white card on
   tinted canvas. Famewall's shadow+gray-card+gradient-bg mush is the cheap
   look.
2. **Two text colors per card, total.** Name + quote share one near-black;
   role/date/meta share one grey (~#6b7280 family). Hierarchy comes from
   weight at the same size (16/700 name vs 16/400 quote), meta steps down to
   13–14px. >3 text colors reads amateur.
3. **One accent + amber stars.** Brand hue appears in ≤2 places (CTA/link,
   maybe name or highlight). Stars are a single warm hue (amber #FBBF24 /
   #FFB621 family, or brand), 14–20px in cards, one FIXED slot per template
   (below header, above quote — Senja/Tally/Trustmary all converge), and are
   OMITTED entirely when unrated — never render empty stars.
4. **Quotes have no quotation-mark glyphs** on cards (Senja, Testimonial.to,
   Tally-wall, Trustmary all: quote starts bare at 16px/1.5, letter-spacing
   ~-0.2..-0.4px). Oversized decorative marks are a spotlight/editorial-only
   device. **Clamp at ~6–8 lines** with an expand affordance or fade; a
   10:1 card-height ratio (Famewall) kills masonry rhythm.
5. **Avatar 36–48px circle** with a DESIGNED initials fallback (2 letters on
   a pastel/per-name tint — flat gray reads broken). Identity = name
   15–16/600–700 + exactly ONE muted line ("Role · Company" or @handle,
   never both). Source = a bare 20px platform glyph pinned top-right, no
   chrome, no label.
6. **Masonry rhythm**: uniform column width (330–420px), tight even gaps
   (12–18px BOTH axes; Senja 18, Tally-wall 12, Testimonial.to 15), rail
   max ~1100–1140px. Variety comes from content length + card SPECIES
   (text / media / pull-quote accent tile), never from width variation.
7. **Aggregate trust header**: big numeral (2.5–3× body, extra-bold) + star
   row + count ("Based on 3,275 reviews") always co-located. Enterprise
   signature move; belongs in wall mastheads and any compact badge.
8. **Forms: the ask is typographically enormous, the chrome is nearly
   absent.** Tally/Notion school: no card, 640–700px column, H1 36–40/800,
   labels 20/600, ONE text color + accent; inputs are borderless with a 1px
   ring (box-shadow) and a 4px accent halo at 36% alpha on focus; controls
   36–48px tall, radius 6–10. Trustmary school: floating 640px card
   (radius 16, layered shadow) on a full-bleed brand canvas, one question
   per screen, centered.
9. **Rating input is huge**: 44–60px hit areas (Senja 54px, Trustmary 60px
   with fill-to-cursor hover), grey→amber. Rating goes FIRST (lowest
   friction; Testimonial.to even pre-fills 5).
10. **Collection flow psychology**: guidance bullets ("What problem did we
    solve? Would you recommend us?") prime the writer; recorder steps carry
    reassurance microcopy ("doesn't have to be perfect — unlimited takes,
    up to 2 minutes") and never dead-end on permission denial (upload
    fallback always visible); time-expectation stated up front; personal
    details are asked AFTER the testimonial is written.
11. **Buttons**: one primary (brand fill, radius 8–20, 36–48px tall,
    15–18/500–600 label), one secondary (outline/near-black). Never 4 hues
    (Famewall). Left-aligned in document-style forms, full-width in
    card/immersion forms.
12. **Attribution** is a quiet detached pill below the widget, never inside
    cards, never colored.

## Anti-pattern kill-list (Famewall/Shoutout, enforce as lint)

Unclamped quotes; highlighter-on-everything; 4 button hues on one card;
border+shadow combos; hard offset shadows; saturated gradient/grid canvases
behind cards; clipart & emoji decoration; Twitter-clone hearts/reply counts;
mixed alignment between packs' surfaces; metadata present on one surface and
absent on another; fixed floating badges that overlap content at 390px; flat
gray initial-avatars; repeating prompt copy twice in one flow.

## Per-site headlines (measured)

- **Senja wall**: cards radius 8, bg contrast separation (shadow ≈7%
  opacity), avatar 42, name 16/500, meta 14 #E6E6E6-on-dark, stars 20px
  amber gap 1.6, quote 16/24 no marks, date footer; 2×543px columns,
  18px gutters; amber `<mark>` phrase highlights as scan anchors; CTA card
  injected per screenful; video cards = poster + gradient overlay carrying
  stars+name ON the video.
- **Senja collect**: H1 36/700, helper 18 grey, stars 54px, Continue
  full-width 62px double-layer (brand fill inside 4px tint ring), textarea
  640×262 radius 16 bg #F4F4F4 borderless 18px text, personal details last,
  photo picker shows the future avatar live (64px circle).
- **Tally form**: content column 700px, H1 40/800 ~150px from top, labels
  20/600 #37352F, inputs h36 radius 8 ring rgba(61,59,53,.16), focus halo
  4px accent@36%; label→input 12px, block gap ~28; keyboard-letter badges
  on choice chips; black pill CTA left-aligned.
- **Tally's wall (Senja-powered)**: 3×369px cols, 12px gaps BOTH axes,
  card radius 12 + 1px #E5E7EB + 0 1px 2px @7%; stars only where source has
  them (natural variety); name+quote one color, role+date the other.
- **Testimonial.to**: 24px card padding, radius 8, border #D9E3EA, NO
  shadow; video caption band 96px in brand color with white 19/800 name;
  dual CTA (video primary / text secondary); QUESTIONS block with short
  accent underline; consent modal copy explicit; theming via flat token
  params (radius/border/shadow/starColor) — validates our tuning scope.
- **Trustpilot**: stars as white glyphs in solid color squares (green
  #00B67A), radius-16 hairline cards, 44px score numeral + distribution
  bars (green→red), verification pills, "big numeral + small caption"
  pairing everywhere.
- **Trustmary**: aggregate strip as its own card above the carousel;
  equal-height cards via bottom-anchored identity footer; name in brand
  amber; one-question brand-immersion form (60px stars, segmented progress,
  score-conditional copy).

Full agent notes: workflow wf_ee4a66ba-1c1 journal (session artifacts).
Research screenshots: session scratchpad `research/<site>/`.
