# Widgets v-next — Parametric Display over Flat-Knob Theming

> Status: **Committed for build** (planning run, 2026-06-14). Locked decisions:
> **(1) Unify** the theme engine with forms; **(2) Rewrite** the Widget Studio
> (not refactor); **(3) Embeds first** (hosted Wall page deferred).
> This plan is the implementation contract for the widget service. It mirrors
> the structure of `docs/plans/2026-06-11-forms-v4-parametric-theming.md` and
> reuses the appearance model specified in `docs/DESIGN.md §2`.

## 1. The decision (summary)

A widget is a **form, inverted**: forms *collect* input, widgets *display*
curated proof. The directions differ; the **theming and delivery problem is
identical** — brand coherence, WCAG AA, "impossible to ship something ugly,"
zero framework on a host page.

The current widget service is built on the exact model forms v4 demolished: a
flat `WidgetDesignTokens` bundle with five independent hex knobs, raw radius
px, and two font stacks (`apps/web_v2/lib/widgets/widget-types.ts:20`,
persisted as flat columns on the Prisma `Widget` model). That is the
combinatorial-ugliness trap and a *second* token system that will drift from
forms exactly as the old Collect Studio `DesignTokens` did (`DESIGN.md §1`).

We replace it with the same three separated concerns, re-labeled for a display
surface:

| Concern | Owner | User control |
|---|---|---|
| **Content** (≈ forms' Structure) | Curation rules over responses (source, ordering, count) + field-visibility toggles | Choose *which proof* and *what fields show*, never raw layout |
| **Layout** | Hand-designed display presets (carousel, grid, masonry, list, wall) | Pick one, never arrange |
| **Appearance** | The **shared** derivation engine (`resolveTheme`) | A few brand inputs; everything else derived + AA-clamped |

Knob budget: the **~10 raw style knobs → 7–9 safe source inputs**, all
derived-and-clamped. Control goes up (can't break contrast), surface goes down.

The unification payoff is a product feature, not just hygiene: a customer's
form and their Wall-of-Love derive from **one brand identity** and look like the
same brand automatically — the "Match-the-Embed" roadmap item in `DESIGN.md §2`
becomes real instead of aspirational.

## 2. What exists today → what survives

### web_v2 (the rewrite target)

| Today | Verdict |
|---|---|
| `lib/widgets/widget-types.ts` `WidgetDesignTokens` (5 hexes + raw radius + 2 font stacks + `cardStyle`) | **Delete.** Replace with shared `BrandThemeInputs`. |
| `components/widgets/studio/controls-color.tsx`, `controls-shape.tsx`, `controls-typography.tsx`, `controls-style.tsx`, `controls-theme.tsx`, `controls-density.tsx` (flat-token controls) | **Delete.** Collapse into one derived-input control set (brandColor + appearance + radius scale + density + typePairing + surfaceStyle + accentIntensity). |
| `controls-visibility.tsx`, `controls-content.tsx`, `controls-behavior.tsx`, `controls-layout.tsx` | **Survive** (rebuilt against the v-next doc). These are the Content + Layout axes — widget-specific, kept. |
| `controls-wall.tsx` | **Survives, hidden/stubbed** — hosted Wall page is deferred (§9). Doc field reserved. |
| `widget-studio-store.ts` token handling | **Rework** — store the doc, derive theme through the shared engine for preview. |
| `widget-studio-preview.tsx` | **Rework to true WYSIWYG** — render through the same `widgets-core` render path as production, not a hand-rolled preview. |
| `lib/widgets/widget-fallback-testimonials.ts`, `widget-row.tsx`, list view-models | **Survive** — content fixtures + management surface unaffected by the theming rewrite. |

### packages / api_v2 / db

| Today | Verdict |
|---|---|
| `forms-core/src/theme.ts` + `color.ts` (`FormThemeInputs`, `resolveTheme`, OKLCH + AA clamp) | **Promote to shared** (§3). Extract to `@workspace/brand-theme`; `forms-core/theme` re-exports (forms stay byte-for-byte green). |
| `apps/api_v2/.../widgets.dto.ts` flat-knob `createWidgetBodySchema` (`accent/text/bg/line/surface/radius/fontFamily/fontHead/cardStyle`) | **Replace** with `WidgetDefinitionDoc` envelope; `theme: BrandThemeInputs`. |
| `packages/types/src/v2.ts` `V2WidgetConfig` / `V2WidgetDesignTokens` | **Rework** to the envelope DTO. |
| Prisma `Widget` model — flat theme columns | **Migrate.** Add `config Json` (versioned doc) + `publishedSnapshot Json?` (derived theme at publish). Flat columns → backfilled into doc v1, then read-deprecated, dropped in a later migration. `wallSlug` (unique idx), `isActive`, `projectId`, `name` **stay columns** (relational/queryable). |
| Prisma `WidgetAnalytics` model (loadTime, layoutType, device, country, version…) | **Survives + wire real.** The mock `totalLoads/avgLoadMs/lastLoadAt` on `V2WidgetListEntry` become real reads (best-effort; can defer if it bloats the pass). |
| `widgets.service.ts` persistence + public resolve | **Rework** to read/write the envelope and stamp the publish snapshot. |

## 3. Unification: the shared brand-theme engine

Extract `forms-core/src/theme.ts` + `color.ts` into a new DOM-free, isomorphic
package **`@workspace/brand-theme`** (`sideEffects: false`):

- Canonical exports: `BrandThemeInputs`, `resolveBrandTheme()`, `DerivedTheme`.
- Back-compat: `forms-core/theme` re-exports these as `FormThemeInputs`,
  `resolveTheme`, `DerivedFormTheme` — **forms code does not change; tests stay
  green** (the extraction is pure motion + re-export).
- The engine is **var-name-agnostic**: `resolveBrandTheme` returns a
  `DerivedTheme` *object*. Each surface's render layer emits its own CSS-var
  namespace — forms keeps `--semblia-form-*`; widgets emit `--semblia-widget-*`.
  The engine never hardcodes a prefix, which is what makes it shareable.

Inputs widgets adopt **as-is** (`theme.ts` already defines all of these):

| Input | Widget meaning |
|---|---|
| `brandColor` | The one identity color → whole accent system |
| `appearance` (`light\|dark\|system`) | Replaces `WidgetTheme` (`light\|dark\|auto`) |
| `radius` (0–4 scale) | Replaces raw `radius` px |
| `density` (`compact\|cozy\|spacious`) | Replaces `WidgetDensity` |
| `typePairing` (incl. `inherit`) | Replaces `fontFamily`/`fontHead`; `inherit` lets an embed adopt the host font |
| `surfaceStyle` (`flat\|bordered\|elevated`) | **Replaces `cardStyle`** (shadow/bordered/flat/elevated → merge) |
| `accentIntensity` | How prominently brand is used |
| `neutralTone`, `buttonStyle` | Card undertone; `buttonStyle` drives carousel nav / "load more" controls |

Collapse map: `accent/text/bg/line/surface` (5 hexes) → **all derived** from
`brandColor` + `appearance` + `surfaceStyle`, AA-clamped. The user sets one
color; the rest is computed and guaranteed coherent.

## 4. Versioned doc + migrations

Introduce `@workspace/widgets-core`, mirroring `forms-core`'s layout
(multi-entrypoint `./schema ./theme ./render ./telemetry`, `sideEffects: false`;
`./theme` re-exports `@workspace/brand-theme`).

```
WidgetDefinitionDoc  { schemaVersion: 1, kind, layout, content, display, behavior, theme: BrandThemeInputs, branding, wall? }
WidgetLayoutSelection { preset: "carousel" | "grid" | "masonry" | "list" | "wall" }
WidgetContent        { mode: "all" | "handpicked", pickedIds: string[], order: "recent"|"rating"|"manual"|"shuffle", minRating?, maxItems }
WidgetDisplay        { showRating, showAvatar, showCompany, showDate, showSource }   — field-visibility toggles
WidgetBehavior       { autoRotate, rotateInterval }                                  — layout-conditioned
WidgetBranding       { logoUrl?, watermark }                                         — watermark forced true on free tier
WidgetWallConfig?    { slug, title, subhead }                                        — RESERVED; hosted page deferred (§9)
```

Rules (same guarantees as forms v4 §3):

- **Write-time validation** — a saved doc is guaranteed renderable (Zod at the
  boundary).
- **Publish stamps a derived snapshot** — `publishedSnapshot { derivedTheme:
  DerivedTheme, version, resolvedAt }`. The embed path reads the snapshot and
  **never resolves theme at request time**, so studio preview and production
  can't disagree.
- **Migrations registry** in `widgets-core` (`schema/migrate.ts`): the
  flat-columns → doc v1 projection is a pure, tested function. Applied on read
  until the backfill completes, then enforced at the boundary.
- **Prisma change required** (unlike forms, which already had a Json column):
  add `Widget.config Json` + `Widget.publishedSnapshot Json?`; backfill;
  deprecate flat theme columns; drop them in a follow-up migration once the
  backfill is verified. Queryable/relational fields stay as columns.

## 5. Delivery architecture (embeds are the product)

Embeds-first. Mirror the forms-v4 delivery contract (§4) exactly:

1. **Zero framework on the wire** — SSR'd HTML + a small vanilla runtime.
2. **Shadow DOM custom element** `<semblia-widget project="…" widget="…">` —
   declarative Shadow DOM fragment so host CSS can't bleed in and ours can't
   leak out. Mount strategy pluggable (iframe fallback later).
3. **One round trip** — the fragment carries config, derived theme (CSS vars
   from the publish snapshot), and markup together. No client-side resolution.
4. **Code-level budgets, CI-enforced** (size-limit):
   - `packages/widgets-embed` loader: **≤ 3 KB** gzipped, dependency-free,
     ESM + IIFE (mirror `forms-embed/loader.ts`).
   - SSR fragment budget is layout-dependent (a grid renders N cards): start at
     **≤ 25 KB** gzipped for the carousel/grid default path; revisit per preset.
5. **HTTP** — content-hashed immutable loader; `ETag` on fragments keyed by
   published doc version; brotli; system fonts by default (webfonts an explicit
   `typePairing` opt-in with `display=swap`).
6. **Layout preset renderers** live in `widgets-core/render`, one pure fn per
   preset consuming `(DerivedTheme, ResolvedContent)`. Ship **carousel, grid,
   masonry, list, and wall-as-embed-layout** for real this pass. Any
   not-yet-built preset throws `WidgetNotImplementedError(presetId)` in dev and
   renders a clearly-labeled stub panel in the embed — **no silent fallback**.

Consolidating the forms + widget loaders into a shared `packages/embed-core` is
attractive (both now ship identically) but is a **stretch**, not committed —
the committed path is to mirror `forms-embed`.

## 6. Telemetry + analytics

- **Theming telemetry** mirrors forms (`widgets-core/telemetry`): events
  `widgets_theme.knob_changed`, `.preset_selected`, `.reset_to_preset`,
  `.published` (with `knobsDiverged`).
- **View analytics** are first-class for a marketing surface (widgets, unlike
  forms, are measured by impressions not submit-rate): `widgets_view.impression`,
  `.item_view`, `.cta_click`. These flow into the existing `WidgetAnalytics`
  table; wiring the real `totalLoads/avgLoadMs/lastLoadAt` is best-effort this
  pass and may be deferred a slice if it bloats the backend lane.

## 7. Tiering

Rides the existing entitlements capability object (resolved server-side, read by
studio + runtime — **not** hardcoded in `widgets-core`), identical policy to
forms (`DESIGN.md §4`): free gets all theme inputs + free presets, watermark
always on; logo upload, remove-watermark, custom domain, and paid presets are
high-impact paid levers.

## 8. Phasing

Lanes follow repo norms: backend/DB → **Codex** (`codex:codex-rescue`); UI →
**Claude** through the design skills (`/critique` or `/audit` before,
`/normalize`/`/polish` after); new UI is **mocks-first**; every phase
**formats + lints + typechecks green** before it's marked done; per-phase
commits only.

| Phase | Lane | Deliverable | Commit shape |
|---|---|---|---|
| 0 | Claude | This doc | 1 docs commit |
| 1 | Claude | Extract `@workspace/brand-theme` from `forms-core` theme+color; `forms-core/theme` re-exports; forms tests unchanged & green | 1–2 additive commits |
| 2 | Claude | `@workspace/widgets-core`: `WidgetDefinitionDoc` schema + Zod, migrations registry (flat→v1), derived-snapshot publish, telemetry types, layout-preset render fns, multi-entrypoint package | 2–3 additive commits |
| 3 | Codex | api_v2 + Prisma: migration (`config`/`publishedSnapshot` Json + backfill + deprecate flat cols), DTO rework to envelope + write-time validation + publish snapshot, public resolve + `ETag`/`Cache-Control`, wire `WidgetAnalytics` | per-slice commits |
| 4 | Claude | web_v2 Widget Studio **rewrite** (mocks-first): rip flat controls, build derived-input control set + layout picker + content/visibility/behavior, true-WYSIWYG preview via `widgets-core/render` | ordered commits, each green |
| 5 | Claude | `packages/widgets-embed`: loader + `<semblia-widget>` custom element + fragment endpoint wiring + size budgets | 1–2 commits |
| 6 | Claude | Full gates (`pnpm build --filter web_v2`, tsc, eslint, vitest), indexes (`scripts/update-indexes.py`), continuity + memory | 1 docs commit |

Parallelism: Phases 3 (Codex backend) and 4 (Claude studio, mocks-first) can run
concurrently once the Phase-2 contract types exist — the studio binds to
`widgets-core` types, not the live API.

## 9. Out of scope (this pass)

- **Hosted Wall page** (`semblia.com/wall/[slug]`) — embeds-first; the `wall`
  doc field + slug machinery are reserved, the page is deferred. (The `wall`
  *layout as an embed* is in scope; the standalone hosted *page* is not.)
- Custom embed domains (existing CDK guard stays).
- AI brand-import into widget theme (shareable later via `brand-theme`; defer).
- `spotlight` / `marquee` layout presets (guarded with `WidgetNotImplementedError`).
- Video-testimonial rendering polish beyond a poster frame.
- `packages/embed-core` loader consolidation (stretch).
