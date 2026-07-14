# Template System v2 — Live Research (2026-07-14)

PR #44 was rejected: every template rendered the same centered card on a flat
background with commodity controls — personality was paint, not composition —
and embeds/hosted pages rendered identically. This pass started over from live
research in Chrome. Every claim below was observed directly this session.

## Live walkthroughs

### Senja hosted collection form (`senja.io/p/senja`)
- **Split-pane hosted layout**: left = white content pane with a personal note
  from a named human ("Olly from Senja here!"), one giant CTA; right =
  full-height autoplay video of the founder making the ask on camera.
- Trust reducers directly under the CTA: "Only takes 5 minutes." and "You have
  full control over where your testimonial is shared."
- Step 2 collapses to a single decision ("Record a video" + small upload
  affordance). One decision per screen; back arrow; huge whitespace.
- Sender identity chrome: requester avatar **|** product logo, top-left.

### Typeform live form (`tfproductops.typeform.com/to/f9ErlyGj`)
- Split layout: left half full-bleed atmospheric photography, right half a warm
  off-white question pane, content vertically centered.
- **Typographic inputs**: no box — a hairline baseline rule with ~24px input
  text and muted placeholder. The input is typography, not chrome.
- Small dark pill button under the input (not full-width); up/down chevrons
  bottom-right; question label small, answer huge.
- Their 404 is itself a form: editorial serif headline + keycap letter options
  (A–E) — personality carried by the interaction idiom.
- Template marketing copy: testimonial asks should draw out a story — "the
  before, the after, and the emotional takeaway"; one-question-at-a-time
  "keeps it conversational, so responses feel natural instead of forced."

### Tally template form (`tally.so/templates/customer-feedback-form-template`)
- **The form is a document**: no card, no panel — a white page with a bold
  ~40px document title, *italic prose paragraphs*, fields inline in the flow.
- Options are auto-width chips with letter keycaps (A/B/C/D).
- Interstitial conversational copy between fields; small dark left-aligned
  "Next →" paginates document pages; soft blue focus ring.

### VideoAsk (`videoask.com`)
- **Portrait video stage**: a vertical rounded video card of a real person is
  the entire interface; answer pills float over the bottom of the video with
  keycap letters. The conversational metaphor is literal.

### Stripe Checkout (`checkout.stripe.dev`)
- **Receipt left / action right**: left pane is an order summary (logo, line
  items, discount chip, tabular totals); right is a white elevated card.
- Express-lane-first: Apple Pay is the dominant element, then an "OR" divider,
  then compact labeled fields. Quiet labels, compact bordered inputs.

### Senja Wall of Love (`love.senja.io`)
- Hero = **one hand-picked killer quote as an editorial headline** with
  attribution, then the stream. Curation leads; volume follows.
- Speech-bubble cards: avatar outside the bubble, thick border, purple offset
  shadow, floating heart particles — a committed, playful personality.
- **Yellow highlighter marks on key phrases inside quotes** — skimming lands
  on the money phrase; the hero quote is one of these highlights, promoted.
- Audience filter pills ("Love from SaaS / creators / Agencies / People who
  switched"); the wall page carries its own CTA — it is a landing page.

### Supabase community wall (`supabase.com`)
- Dark masonry of tweet-style cards: quiet 1px borders, avatar + @handle + X
  glyph, **no star ratings** — trust through authenticity, not decoration.
- **Edge columns fade toward the viewport edges** implying infinite
  continuation; center columns full opacity.
- Section = big title + one-line sub + single community CTA.

### Resend (`resend.com/home`)
- Spotlight pattern: one large case-study quote at a time with person +
  company; serif display type on near-black. One voice, full attention.

## Written grounding (conversion)

- Multi-step forms convert **86% better** than single-step (HubSpot) and up to
  **300%** in CXL/VentureHarbour tests — momentum + one decision at a time.
- Response-rate levers for testimonial collection: remove friction (no
  account, no typing before the first commitment), a personal on-camera ask,
  time honesty, and showing existing testimonials as social proof
  (testimonial.to, dubb.com guides).

## What actually converts a visit into a submission

1. **A human asks** — a named person, a face, a personal note. Not a form
   title. (Senja, VideoAsk, dubb)
2. **One decision at a time with momentum** — staged flows outperform walls of
   fields; progress must be honest. (HubSpot/CXL data; Typeform/Senja builds)
3. **The first act is trivial** — a star tap or a single pill, never a text
   area. Commitment compounds. (Stripe express-first; Parcel star-first)
4. **Time honesty** — "Only takes 5 minutes" printed where the decision
   happens. (Senja)
5. **Control reassurance** — "you decide where it's shared" kills the main
   silent objection. (Senja)
6. **The input should feel like talking, not filing** — huge typographic
   inputs, conversational labels, interstitial copy. (Typeform, Tally)
7. **Keyboard is a personality** — keycaps/digit hints turn filling into
   operating for technical audiences. (Typeform 404, Tally chips)

## What makes displayed proof credible

1. **Curation leads, volume supports** — a hero quote first, the stream after.
   (Senja wall, Resend spotlight)
2. **Authenticity beats decoration** — real handles/sources/dates out-trust
   star rows; keep stars for commerce contexts only. (Supabase)
3. **Highlight the money phrase** — emphasis inside quotes directs the skim.
   (Senja highlighter)
4. **Imply abundance** — edge fades / marquee motion suggest "there's more,"
   which is itself proof. (Supabase fades, marquee idiom)
5. **A wall is a landing page** — head, rating summary, CTA, filters; not a
   naked grid. (love.senja.io)
