# Plan — template system rebuild (forms + widgets)

Date: 2026-07-13. Branch `feat/template-system-rebuild-2026-07`. One commit
per phase. Research/principles/decision in
`docs/ui-rework/2026-07-13-forms-widgets-template-rebuild/`.

Goal: replace the parametric knob/preset presentation system with the
white-label template system per `decision.md`. Content/trust spine untouched.

## Phases

1. **forms-core v3 contract** — `FormDefinitionDoc` v3 (`templateId`,
   `brand`, `accents`, `assets`; design/layoutPreset/flow-pacing removed),
   template accent-spec validation, `migrateFormDoc` v2→v3, snapshot compile
   carries the template reference + derived theme. Tests updated.
2. **forms-renderer template engine** — pack contract + registry; delete
   `LayoutShell`/single skeleton/`buildFormStylesheet` knob CSS; ship
   Meridian, Aperture, Ledger, Parcel, Terminal as full packs (composition,
   styles, motion, loader, success moment); shared field *controls* kept as
   commodity inputs restyled per pack. Contrast CI test across sample brand
   colors × packs; render + interaction tests updated.
3. **studio v3** — inspector → Template · Brand · Questions · Delivery;
   template gallery w/ live miniatures; site-metadata brand prefill in
   creation flow (intent → template → brand → live); delete Style panel +
   looks.ts. Preview routes/hotkeys/draft machinery kept.
4. **runtime + loader moment** — verify hosted/embed SSR against packs
   (renderer API unchanged), branded loader (logo-as-loader) replaces
   unstyled fallback, snapshot CSS caching still keyed by configEtag.
5. **widget template packs** — widgets-core: definition gains
   `templateId`+`accents` (migrate from layout×variant), packs Marquee,
   Mosaic, Column, Gallery, Ticker; widget studio inspector simplified to
   Template · Brand · Content · Behavior.
6. **media optimization worker** — api_v2 BullMQ processor: sharp image
   derivatives (320/640/1280/2560 WebP + fallback) on attach, deterministic
   S3 keys, DTO/fragment `srcset` URLs; video/audio poster+metadata hook
   behind same interface (transcode documented as follow-up).
7. **gates + close-out** — per-app typecheck/lint/tests/build, live browser
   verification (both studios, hosted form, embed, widget fragment),
   update-indexes, continuity docs, PR.

## Session-boundary note

Phases 1–4 are the forms rebuild proper and the session priority. 5–6 follow
the same locked contract; if a session boundary lands mid-plan, the ledger
records the exact phase edge — the contract in `decision.md` is the durable
artifact.
