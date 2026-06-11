# Forms v4 — Parametric Theming over Freeform Composition

> Status: **Committed for release** (product decision, 2026-06-10, Notion:
> "Tresta — Decision: Parametric Theming over Freeform Form Builder").
> This plan is the implementation contract for the fourth forms iteration.
> The theming model itself is specified in `docs/DESIGN.md` (2026-05-31) and is
> unchanged; this doc adds versioning, layout presets, the demolition map,
> embed delivery, and telemetry.

## 1. The decision (summary)

Drop the freeform/interactive form builder after 3–4 failed iterations. The
combinatorial ugliness problem is structural: arbitrary layout × arbitrary
style yields an output space where almost everything looks bad, and cohesion
is a property of the combination — polishing components cannot fix it.

Replace it with three separated concerns:

| Concern | Owner | User control |
|---|---|---|
| **Structure** | Versioned Zod schema (questions, order, required, conditional logic) | Edit *what's asked*, never *where things sit* |
| **Layout** | 3–5 hand-designed presets (card, inline, split, conversational) | Pick one, never rearrange |
| **Appearance** | Constrained theme object → derivation engine (`resolveTheme`) | A few knobs; everything else derived + AA-clamped |

Escape hatches, in tiers: presets (T1) → theme object (T2) → headless
API/SDK (T3, already shipped — agent keys + JSON reads).

Positioning tradeoff accepted: no drag-and-drop, ever. "Every Tresta form
looks professionally designed, guaranteed."

## 2. What exists today → what survives

| Today | Verdict |
|---|---|
| `forms-core` `FormTokens` (~25 raw knobs) × `FormLayoutConfig` (flow × container × hero) — the canonical render path | **Delete.** This is the combinatorial layer. |
| `forms-core` `resolveTheme` + `presets.ts` (AA-clamped OKLCH derivation, presets-as-seeds) — currently dead code off the render path | **Promote to canonical.** Extend the derived token map (hover/focus/border/text ramp, wire `density`/`surfaceStyle` which are reserved today). |
| `FormQuestion` / `ShowIfRule` (conditional logic) | **Survives** as the Structure schema — it was always pure data. |
| Loader/Success screen configs | **Survive in reduced form** — they become preset-owned with small content-only knobs (message, redirect); style knobs (7 loader styles, confetti, etc.) collapse into the layout preset. |
| `web_v2` Collect Studio freeform controls (design/shape/flow/loader/success/style-presets) + `studio-types.ts` / `studio-presets.ts` parallel token system | **Delete.** Studio route stays, renders a loud rebuild stub. Structure/content editing returns in the next (UI) session against the v4 contract. |
| `forms-core/react.tsx` renderer (898 lines, SSR + CSP-hashed vanilla runtime) | **Delete.** The SSR-HTML + zero-framework-on-wire *pattern* is kept for v4; the implementation is rebuilt per layout preset in the UI session. |
| `forms_runtime` resolve/submit pipeline, trust, throttling, CSP | **Survives unchanged.** Render path swaps to the v4 stub renderer. |
| `CollectionForm.config` untyped JSON, no schema version | **Migrated.** v4 envelope `{ schemaVersion, ... }` with write-time validation; one-way v1→v2 projection backfill. |

## 3. Versioned schemas + migrations

Everything persisted gets an explicit `schemaVersion` and a registered,
tested migration:

```
FormDefinitionDoc   { schemaVersion: 2, structure: FormStructure, layout: LayoutSelection, theme: ThemeDoc, content: FormContent }
FormStructure       { questions: FormQuestion[], ... }            — pure data, Zod-validated
LayoutSelection     { preset: "card" | "inline" | "split" | "conversational" }
ThemeDoc            { preset: PresetId, inputs: FormThemeInputs } — constrained knobs only (docs/DESIGN.md §2)
FormContent         { brandName, headline, subhead, submitLabel, logoUrl, successMessage, redirectUrl?, ... }
```

Rules:

- **Write-time validation**: a saved doc is guaranteed renderable. Publish
  additionally stamps a **derived snapshot** (resolved tokens) so the embed
  path never derives at request time and the studio preview/runtime can never
  disagree.
- **Migrations registry** in `forms-core` (`schema/migrate.ts`): pure
  functions `v1 → v2`, exhaustive tests, applied on read until backfill
  completes, then enforced at the boundary. The v1→v2 projection is lossy by
  design (freeform knobs map to nearest preset + theme inputs).
- The DB column stays `Json`; the envelope owns versioning. No Prisma change
  for the doc itself.

## 4. Delivery architecture (embeds are the product)

The form is served and injected into other people's sites, so delivery is a
first-class design constraint, enforced from the code level up:

1. **Zero framework on the wire.** The embed payload is SSR'd HTML + a small
   vanilla runtime (the proven 2026-06-10 hosted pattern). React/Preact never
   ships to a host page.
2. **Shadow DOM custom element** (`<tresta-form project="…" form="…">`):
   declarative Shadow DOM SSR fragment fetched from `forms_runtime`, so host
   CSS cannot bleed in and ours cannot leak out. Mount strategy kept pluggable
   (iframe mode possible later for hostile hosts).
3. **One round trip.** The fragment response carries config, derived theme
   (CSS vars from the publish-time snapshot), and markup together. No
   client-side theme resolution, no config fetch waterfall.
4. **Code-level budgets, CI-enforced** (size-limit):
   - `embed.js` loader: **≤ 3 KB** gzipped, dependency-free, ESM + IIFE builds.
   - SSR fragment (markup + inline runtime + CSS vars): **≤ 15 KB** gzipped
     budget for the stub/card preset path.
5. **Package hygiene as a delivery feature**: `forms-core` becomes
   multi-entrypoint (`./schema`, `./theme`, `./render`, `./telemetry`) with
   `sideEffects: false`, so consumers (embed loader, runtime, studio, api)
   tree-shake to exactly what they use. Schema/theme entrypoints are
   DOM-free and isomorphic.
6. **HTTP**: content-hashed immutable `embed.js` (CloudFront, long max-age),
   `ETag` on fragments keyed by published config version, brotli, system
   fonts by default (webfonts are an explicit theme opt-in with
   `display=swap`).

## 5. Telemetry (the validation plan)

The granular-builder idea is unvalidated, not dead. The theming layer is
instrumented from day one:

```
forms_theme.knob_changed     { formId, knob, from, to, presetId }
forms_theme.preset_selected  { formId, presetId, previousPresetId }
forms_theme.reset_to_preset  { formId, presetId, changedKnobCount }
forms_theme.published        { formId, presetId, knobsDiverged: string[] }
```

Event types live in `forms-core/telemetry`; capture is an authenticated
project-scoped batch endpoint wired into the existing analytics events
pipeline. Expected outcome to test: ~80% of users pick a preset, change two
colors, ship. Signals for a deeper builder tier: maxed-out theme objects,
inspect-element on embeds, "can I move X" support asks.

## 6. Phasing (this session)

| Phase | Lane | Deliverable | Commit shape |
|---|---|---|---|
| 0 | Claude | This doc | 1 docs commit |
| 1 | Claude | forms-core v4 contract: schemas, migrations registry, derivation promotion, telemetry types, multi-entrypoint package | 2–3 additive commits, all green |
| 2 | Claude | Demolition: studio freeform controls → loud stub; delete `FormTokens`/`FormLayoutConfig`/old renderer; runtime renders loud v4 stub | 2 ordered commits (web_v2 first, then forms-core/runtime), each green |
| 3 | Codex | api_v2: publish-time validation + derived snapshot, v1→v2 backfill, runtime resolve v2 + ETag/Cache-Control, telemetry capture endpoint | per-slice commits |
| 4 | Claude | `packages/forms-embed`: loader + custom element + fragment endpoint + size budgets | 1–2 commits |
| 5 | Claude | Full gates, indexes, continuity docs | 1 docs commit |

**Loud stubs:** actual form rendering (all four layout presets) is *deferred
to the next session* and stubbed unmistakably — the runtime/embed render a
clearly-labeled "This form is being rebuilt on Tresta Forms v4" panel, and
preset render entries throw `FormsV4NotImplementedError` with the preset id
in dev contexts. No silent fallbacks to the old renderer (it no longer
exists).

## 7. Out of scope (this session)

- Studio UI rebuild against the v4 contract (next session, UI-focused).
- The four layout preset implementations + visual regression matrix
  (presets × representative themes) — lands with the renderer.
- Conversational flow mechanics (Phase 2 of the product phasing).
- Per-tenant custom embed domains (existing CDK guard stays).
