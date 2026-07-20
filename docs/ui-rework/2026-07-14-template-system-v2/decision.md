# Template System v2 — Decision (2026-07-14)

Supersedes the presentation layer of PR #44 (rejected). The contract plumbing
from that pass is kept: template manifests (`forms-core/templates.ts`,
`widgets-core/templates.ts`), schemaVersion 6 docs, accent normalization, the
AA-clamped brand-theme recipes, the contrast gate, and the media-optimize
worker. Everything the respondent or visitor *sees* is rebuilt.

## The two root causes being fixed

1. **Personality was paint, not composition.** Every form pack rendered
   `page > centered card > commodity fields > action row`; every widget
   template arranged the *same* card in a different container. v2 rule: **a
   template owns its skeleton and its item markup.** If two templates share a
   page structure, one of them is wrong.
2. **No per-surface design.** Hosted pages and embeds rendered identically.
   v2 rule: every pack designs `hosted` and `embed` (forms) / `wall` and
   `embed` (widgets) as distinct compositions.

## Contract changes

- `FormRendererProps.surface?: "hosted" | "embed"` (default `hosted`),
  surfaced as `data-tf-surface` on the root and passed to Compositions.
  `forms_runtime` passes `embed` on `/embed/:slug` + `__embed` fragments;
  studio previews can toggle it.
- `RenderWidgetOptions.surface?: "embed" | "wall"` replaces `omitWallHead`.
  Wall pages get richer chrome (head, rating summary hooks); embeds compact.
- Per-template item renderers in widgets-core — the shared `renderCard` dies.
- Fields stay commodity **controls** (a11y/state machine) but expose stable
  hooks (`data-tf-*`, class seams) so packs restyle them beyond recognition.

## Form template worlds

### Meridian — the considered ask (SaaS split)
Anchors: Senja hosted collect, Typeform split, conversion levers 1/2/4/5.
- **Hosted:** full-viewport two-pane. Left (sticky, ~42%): tone surface with
  logo, display-type title, description as a personal note, and a trust ledger
  (honest time estimate; "you decide where it's shared" when consent exists).
  Right: the journey — staged moments with a hairline progress track, huge
  typographic baseline-rule inputs (no boxes), accent pill actions.
- **Embed:** compact column in a bordered card (the card boundary is *earned*
  inside a host page), slim logo+title header row, same input idiom tightened.
- Motion: 240ms settle/rise. Type: Inter.

### Aperture — the stage (video-first, dark)
Anchors: VideoAsk portrait stage, Senja video step, lever 3.
- **Hosted:** full-viewport dark stage with a tone-colored glow vignette.
  Prompts are cue-card display headlines, centered. Record-or-write = giant
  record pill (red dot) + quiet "write instead" reveal. Options are floating
  pills. Progress = film-strip segments across the top. Logo small, bottom.
- **Embed:** a portrait stage panel (min-aspect) with the same cue-card type
  scaled down; glow contained by the panel.
- Motion: 300ms cinema fades. Type: Geist.

### Ledger — the letter (editorial document)
Anchors: Tally document idiom, editorial print, Typeform 404 serif.
- **Hosted:** a paper sheet on a backdrop. Serif display title, prose intro,
  numbered asks ("01 —") set as manuscript run-ins, **writing-line inputs**
  (underline only), letter-keycap chips, page-numbered pagination
  ("Page 1 of 3"), and a closing "signature" moment for consent + send.
- **Embed:** the sheet without the backdrop; hairline frame + top rule ribbon.
- Motion: ink fade only. Type: serif-editorial.

### Parcel — the receipt (commerce)
Anchors: Stripe Checkout, lever 3 (star-first), show-and-tell reviews.
- **Hosted:** two-pane commerce. Left: brand pane with hero image slot,
  star-first hero (the giant star row is the first interaction), and a
  dashed-rule receipt of what happens next. Right: white card, compact
  labeled inputs (Stripe density), photo upload styled as a polaroid frame.
- **Embed:** one receipt card — dashed top rule, star row first, compact
  fields, polaroid upload.
- Motion: crisp 160ms; stars pop. Type: Inter + tabular-nums.

### Terminal — the instrument (dev tools)
Anchors: Supabase aesthetic, Typeform keycaps, terminal chrome.
- **Hosted:** grid-paper field with a centered **session panel**: mono bar
  (`~/feedback · [2/5]`), and the flow is a *transcript* — answered asks
  accumulate above as dimmed log lines (`> rating: 5`), the current ask sits
  at the prompt with a caret. Keycap digits 1–9 select options; hint row
  (`↵ continue · 1–9 select`). Keyboard-first.
- **Embed:** the panel alone, auto-height.
- Motion: instant 80ms linear; caret blink. Type: Geist/mono.

## Widget template worlds

Every template owns item markup + composition, per surface.

### Marquee — the rail
Two counter-scrolling rows of compact quote chips (avatar, one-line quote,
name), edge-fade masks, pause on hover; `prefers-reduced-motion` → static
scrollable row. Spotlight accent = single row, larger cards.
**Wall:** full-bleed rails + masthead (title, subhead, rating summary, CTA).

### Gallery — the exhibition
Uniform framed tiles with gallery-plaque attribution (small caps under a
hairline). Featured accent = lead tile spans 2×. Quiet borders, no shadows.
**Wall:** exhibition spacing + masthead.

### Mosaic — the feed
Masonry (CSS columns) of authentic-feed cards: avatar + name + source/date
row, plain text, **no star theatrics**. Embed caps height with a bottom fade.
**Wall:** filterless full feed + "show more" expander + masthead.

### Column — the praise column
A magazine praise column: oversized hanging serif quotation marks, generous
leading, author signature line (— Name, Role), hairline separators between
entries. Single column, reads as editorial content.
**Wall:** adds a masthead and a wider measure.

### Editorial — the front page
Lead story: the first (featured) item as a hero blockquote in display serif;
supporting deck: 3-column newspaper grid under a rule, with column dividers.
**Wall:** full front page — masthead with rating-summary "stats bar".

## Accessibility (all packs)

Focus-visible rings on every interactive; labels/for + fieldset/legend for
option groups; `aria-live` step/err announcements; progress semantics;
keyboard advance (Enter) everywhere and digit selection in Terminal;
`prefers-reduced-motion` collapses all marquee/cinema motion; AA contrast
already gated in forms-core (35-combo spec).

## Delivery

- `forms_runtime`: hosted routes render `surface="hosted"`, embed routes
  `surface="embed"` (SSR + hydrate).
- web_v2 `/wall/:slug` renders widgets with `surface="wall"`; embeds fragment
  API stays `surface="embed"`.
- Studio previews get a hosted/embed surface toggle (forms) and use real
  surface parity for widgets.
