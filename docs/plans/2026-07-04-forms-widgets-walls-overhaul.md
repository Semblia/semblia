# Forms + Widgets + Walls Overhaul — 2026-07-04

Branch: `feat/forms-widgets-walls-overhaul`. One commit per phase (~300 LOC target). Gate per
phase: `cd apps/web_v2 && pnpm exec tsc --noEmit` + eslint on touched dirs; package tests where a
package changes; `pnpm build --filter web_v2` before session end; `python scripts/update-indexes.py`
after source changes.

## Diagnosis

1. **Sluggish previews.** `form-studio-preview.tsx` keys `FormRenderer` on the full content
   checksum → full remount per keystroke. `widget-studio-preview.tsx` calls
   `renderStudioFragment` (theme derivation × 2 schemes + full HTML string) unmemoized in the
   render body → shadow-DOM rebuild per store tick.
2. **Forms engine ≫ studio.** forms-core has 14 field types with per-type settings, conditional
   rules, redirect success action, and anti-abuse settings; the studio can only edit
   label/help/placeholder/required on the fields the template seeded. No add-field.
3. **Bases without divergence.** 5 intent templates are real "bases", but creation is a text
   dialog and every form starts with identical design tokens.
4. **Widget variety capped.** 5 layout presets (mirrored into the Prisma `LayoutType` enum — new
   presets = migration) and 6 style presets. No per-layout variance.
5. **Walls don't exist.** `WallUrlPill` advertises `semblia.com/wall/:slug`; the public API
   (`GET /v2/walls/:wallSlug`, Redis-cached, returns definition + publishedSnapshot +
   testimonials) exists; **no page renders it**.

## Phases

- **P0** — this plan; branch.
- **P1 perf** — structural-only renderer key + `useDeferredValue` (forms); memoized fragment +
  deferred draft (widgets).
- **P2 forms fields** — (a) add-field palette for all types + duplicate + type icons;
  (b) per-type settings editors (select options, rating scale/style, lengths, upload
  constraints, hidden source, consent copy, publishable/private/widget-eligible with
  `ALWAYS_PRIVATE_TYPES` guard).
- **P3 forms flow** — conditional-rules builder UI; success action (message/redirect);
  Protection group (captcha mode, min completion, honeypot, blocked words).
- **P4 canvas + keyboard** — `data-tf-field` markers in forms-renderer; click-a-field-in-preview
  → selects + expands its editor; shared `useStudioHotkeys` (digits = sections, `?` = help,
  ⌘⏎ = publish); Fields-panel roving focus + Alt-arrow reorder.
- **P5 bases** — (a) FormIntentPicker → visual gallery with per-intent mini-preview + "starting
  look" seeds (curated FormDesign presets, names shared with widget presets); creation applies
  look by saving the seeded draft. (b) Widget creation picker → same gallery treatment with
  real `WidgetLayoutPreview` renders.
- **P6 widget variance** — widgets-core `layout.variant` (additive, defaulted — old docs parse
  unchanged; no DB change; embeds inherit via the shared renderer): per-preset variant sets +
  CSS/render implementation + tests; studio variant picker; +2–3 new style presets.
- **P7 walls** — public `wall/[wallSlug]` route in web_v2: SSR fetch of `/v2/walls/:slug`
  (revalidate 60), hero (title/subhead/brand/rating summary), widgets-core SSR fragment for
  render parity, `generateMetadata` (canonical/OG/Twitter), JSON-LD (Organization + Review +
  AggregateRating), robots, not-found, middleware allowlist, `wallUrl()` helpers; optional
  dynamic OG image.
- **P8 sweep** — /polish pass, full gates, update-indexes + rebuild-graphify, continuity docs,
  PR.

## Locked-in choices (session)

- Widget variety ships as **variants inside the definition doc**, not new `LayoutType` enum
  values (no migration; mirrors untouched).
- The wall page lives in **web_v2** (Next metadata/SSR is the SEO tooling); canonical display
  URL stays `semblia.com/wall/:slug` via `semblia-urls.ts`.
- Forms "uniqueness" = intent base × starting look × full field/flow editing; no freeform
  builder (respects the 2026-06-10 parametric decision).
