# Decision — the Semblia template system (forms + widgets rebuild)

Date: 2026-07-13. Supersedes the presentation half of forms-v4/forms-rebuild
(the 2026-06-10 "parametric theming" knob model and the 2026-06-18 4-preset
layout model). The content/trust spine decisions stand.

## The reframe

Semblia stops being a form builder with themes and becomes a **white-label
template system**: a growing roster of finite, art-directed collection and
display templates, each a self-contained design project for a specific
feedback ritual. Owners contribute brand facts and words; templates supply
all taste.

## 1. Document contract (forms-core schema v3)

`FormDefinitionDoc` v3:

- **REMOVED:** `layoutPreset`; the entire 9-knob `design` object
  (radius/density/buttonStyle/fieldStyle/backgroundStyle/fontPairing/themeId/
  mode as free knobs); `flow.mode`, `flow.progressIndicator`,
  `flow.autoAdvance` (layout + pacing are template-owned per P6).
- **ADDED:**
  - `templateId: string` + `templateVersion: number` — the big knob.
  - `brand: { color: string; logoAssetId/logoUrl; name: string;
    appearance: "light" | "dark" | "system" }` — brand facts only. Color
    still enters exclusively through `@workspace/brand-theme` AA clamping.
  - `accents: Record<string, string>` — per-template named accent decisions,
    validated against the template's declared accent spec (≤3 accents per
    template, each an enum of art-directed options). Unknown keys/values
    normalize to template defaults — forward-compatible with roster updates.
  - `assets: { heroImageUrl/…: slot-based }` — only slots the template
    declares (e.g. Parcel's product image, Atrium-class ambient imagery).
- **KEPT:** `intent`, `fields` (13-type system), `flow.conditionalRules`,
  `content` (all words), `settings` (trust/protection). `consentPlacement`
  moves to template control.

Migration: `migrateFormDoc` v2→v3 is a lossy projection (pre-launch, no
production data): `design.brandColor/logo* → brand`, `intent → default
templateId`, fields/content/settings/conditionalRules carried verbatim.
Unknown future versions still throw.

## 2. Template pack contract

A template pack is a directory owning everything visual:

```
templates/<id>/
  manifest.ts    — id, version, name, tagline, niches, accent spec,
                   asset slots, font subsets, a11y notes
  composition.tsx— the template's own DOM: welcome → prompts → media
                   moments → consent → success. May share field *controls*
                   (inputs are commodity) but owns all arrangement.
  styles.ts      — static stylesheet factory: (derivedTheme, accents) → CSS.
                   Deterministic, cacheable by configEtag as today.
  motion.ts      — durations/eases/keyframes + reduced-motion variants.
  loader.tsx     — the branded loading moment (logo-as-loader capable).
```

Registry (`templates/registry.ts`) maps id → pack; the renderer routes on
`snapshot.templateId`. Adding a roster entry = adding a directory. Packs live
inside `packages/forms-renderer` (single consumer, SSR + client share it);
widget packs live inside `packages/widgets-core` symmetrically.

**Per-template Definition of Done** (adapted from Framer's template bar):
clear audience + ritual; original differentiated composition; cohesive
type/color/spacing; mobile-first responsive; purposeful motion with
reduced-motion variants; labeled fields + AA contrast (CI-tested across
sample brand colors); optimized assets only; designed success moment;
zero-typing first interaction; honest progress.

## 3. Launch roster

Form templates (collection):

| Template | Ritual / niche | Design world | First interaction |
|---|---|---|---|
| **Meridian** | universal default (CUSTOM) | quiet precision: calm card, restrained ink motion — at home with the app's Measured Ink language | choice chips / rating |
| **Aperture** | video praise — creators, SaaS (TESTIMONIAL) | a stage: near-black, one giant prompt at a time, teleprompter hints, recording ring, cinematic crossfades | tap to record (text escape always visible) |
| **Ledger** | written story — agencies, consultants (CUSTOMER_STORY) | an editorial letter: serif, paper-warm, prose-like flow, signature-style attribution, ink-draw motion | tap a sentence-starter |
| **Parcel** | post-purchase review — commerce (REVIEW) | show-and-tell: product image lead, star-first, "show it in the wild" photo moment, springy warmth | tap a star |
| **Terminal** | dev-tool feedback (PRODUCT_FEEDBACK) | an instrument: mono accents, grid paper, `2/5` progress, keyboard-first, instant crisp motion, dark-native | tap a scale key (1–9 keys work) |

Widget templates (display) — same contract (`templateId` + `brand` +
`accents`), replacing the layout×variant matrix: **Marquee** (cinematic
carousel), **Mosaic** (masonry wall), **Column** (editorial list), **Gallery**
(media-forward grid), **Ticker** (single-quote strip). Each owns its DOM,
type, and motion the same way.

The roster is a product surface that keeps growing (Atrium for hospitality,
Syllabus for courses, … later); the contract above is what makes additions
cheap and safe.

## 4. Studio v3 (owner surface)

Keeps the StudioFrame shell + draft/publish machinery. Inspector collapses to:

- **Template** — gallery of live-rendered miniatures + the template's accent
  decisions. Switching templates is always safe (content survives).
- **Brand** — logo, color (site-metadata prefill), name, appearance, domain.
- **Questions** — intent-seeded prompts; add/edit/reorder within the 13-type
  system; per-question settings only where they change meaning (required,
  options, consent), not appearance.
- **Delivery** — share link, QR, embed snippet, domain status.

DELETED: the Style panel, layout pickers, all appearance dropdowns/knobs.
Creation flow: intent → template (live previews) → brand prefill → live.
Target: under 3 minutes to a shareable branded link.

## 5. Media pipeline (server-side optimization)

New worker processor in api_v2 (BullMQ, existing worker process): on media
attach, images are derived via sharp into width tiers (320/640/1280/2560)
WebP + original-format fallback, stored on S3 under deterministic keys;
DTOs/fragments expose `srcset`-ready URLs; raw originals are never served to
widgets/hosted pages once derivatives exist. Video/audio v1: metadata +
poster extraction hook behind the same queue interface, transcode deferred
(documented), size caps enforced at presign. Templates only ever reference
optimized URLs.

## 6. Delivery

Unchanged addressing: hosted `/f/:slug`, `/embed/:slug`, widget fragments,
wall page, custom-domain schema. The renderer API (`FormRenderer(snapshot)`)
is preserved so `forms_runtime` and previews rewire without route changes.
Template packs make the loader moment branded (logo-as-loader) instead of
unstyled fallback. Embed loader completion and custom-domain rollout remain
their own passes (unchanged open items).

## 7. What this kills

- `FormDesign` 9-knob schema + `compileDesign` knob mapping (brand-theme
  engine itself survives — templates call it with template-chosen inputs).
- `LayoutShell` and the 4 layout presets; the single-skeleton renderer.
- `lib/forms/looks.ts` knob-preset gallery; the form Style panel;
  `form-style-panel.tsx`.
- Widget preset×variant matrix as the customization model (packs replace it).
