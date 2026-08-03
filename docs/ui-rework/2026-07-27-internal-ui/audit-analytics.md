# Audit — Analytics surface (2026-07-27)

Slice: `app/(app)/[slug]/analytics/page.tsx`, `components/analytics/*` (16
files), `lib/analytics/*` (3 files). Read end to end; no source edited.

Builds on `census-data-states.md`. **One correction to the census ledger:**
`analytics-dashboard.tsx` owns **2** queries, not 4 — `useProject` (`:127`)
and `useAnalyticsDashboard` (`:128`). The "zero error handling" conclusion
holds and is in fact worse than recorded: the census says "panels render as
zeroed/empty", but the verified code path renders a **permanent loading
skeleton** (see D-1). Every other census claim I could check held: 5 hand-rolled
bordered surfaces in `analytics-dashboard.tsx`, and `content-performance-table.tsx`
is a flex-`<Link>` stack that is not in the 4 files importing `ui/table`.

Directory-level counts I derived for this slice:

- **20** hand-rolled `rounded-* + border` surfaces across 16 files — i.e. ~13%
  of the app-wide 152 live in this one directory.
- **10** hand-rolled panel headers repeating the same `h3` + subtitle markup.
- **4** distinct empty-state dialects, plus **4** components with no empty state
  at all.
- **40** arbitrary off-scale font sizes (`text-[9px]`, `text-[10px]`,
  `text-[11px]`, `text-[22px]`) versus 24 uses of `text-sm`. The type scale is
  bypassed more often than it is used.
- **1** stock shadcn `Card*` import: none. The stock-reskin symptom here is not
  `<Card>` abuse — it is 20 copies of one hand-written card string.

Verdict on the two questions the brief asked directly:

- **Coherent hierarchy, or a grid of boxes?** A grid of boxes. Proof in D-11:
  the Overview tab states the same three numbers four times in four different
  visual idioms before showing anything new.
- **Is `sparkline.tsx` decorative?** Yes, unambiguously — and worse than
  decorative, it is mislabelled data. See D-9.

Severity: **P0** broken or misleading to a user · **P1** clearly
unprofessional · **P2** polish.

---

## `app/(app)/[slug]/analytics/page.tsx` (60 lines)

**Composition.** Correct at the server layer: composes `PageHeader` / `PageBody`
from `components/shared` (`:6`), awaits `props.params` per the Next 16 rule
(`:51`), `notFound()` on a missing project (`:53`). No hand-rolled chrome. This
file is the healthiest in the slice.

**Findings.**

- **P1 — two skeletons for one surface, and they disagree.**
  `AnalyticsSkeleton` (`:17-46`) renders a `PageHeader` with a 6-pill toolbar
  (`:24-29`), 4 tiles at `h-[108px]`, then `h-[248px]`, `h-[160px]`, and two
  `h-[200px]` blocks. The client's own loading branch
  (`analytics-dashboard.tsx:164-183`) renders **no toolbar at all**, 4 tiles at
  `h-28` (112px), and one `h-52`. So first paint is skeleton A → skeleton B →
  content: the tab strip appears, vanishes, and reappears, and every tile
  changes height mid-load. Two hand-maintained guesses at one layout.
- **P2 — the skeleton reserves a description that never arrives.** `:22`
  renders `description={<Skeleton className="h-3 w-48" />}`, and the client
  skeleton does the same (`analytics-dashboard.tsx:170`), but the real header
  (`analytics-dashboard.tsx:189-190`) passes only `title="Analytics"` — no
  description. Guaranteed layout shift on every load, in both skeletons.
- **P2 — no `error.tsx` in this route segment.** `.claude/rules/web-v2.md`
  requires "Every new route section adds an `error.tsx` delegating to the shared
  `RouteError`". The analytics directory contains only `page.tsx`; it inherits
  `app/(app)/[slug]/error.tsx`. Low impact (a parent exists) but it means a
  render throw blows away the whole project shell rather than the analytics body
  — which matters because D-3 makes a render throw reachable from a URL.

---

## `components/analytics/analytics-dashboard.tsx` (516 lines) — the worst file in the slice

**Composition.** Genuinely good primitive usage at the chrome layer:
`PageHeader`, `PageBody`, `PageTabs`, `FilterPills`, `RefreshingDataBadge` all
imported from `components/shared` (`:41-49`), URL-as-state with defaults
stripped (`:93-96`), `aria-pressed` on the compare toggle (`:205`). Then it
hand-rolls **5 bordered card surfaces inline** and a bespoke metric panel, and
owns every data state for 12 child components in a single `if (!data)` gate.

**Surface nesting.** Four byte-identical hand-rolled panels, one per tab, each
wrapping a chart:

```
:332  <div className="rounded-lg border border-border bg-card p-5">   (OverviewTab)
:374  <div className="rounded-lg border border-border bg-card p-5">   (CollectionTab)
:407  <div className="rounded-lg border border-border bg-card p-5">   (PipelineTab)
:433  <div className="rounded-lg border border-border bg-card p-5">   (EngagementTab)
:471  <div className="rounded-lg border border-border bg-card p-5">   (OAuth panel)
```

Each pairs with a hand-rolled header (`:334`, `:375-377`, `:408-410`,
`:434-436`) using `text-sm font-semibold text-foreground` — the same string the
10 child components each re-declare. `:471-498` goes further: 28 lines of
bespoke metric panel inlined into a tab function, including its own progress bar
(`:488-493`) that reimplements what `ui/progress` already does in
`api-usage-card.tsx:117`.

**Data states.** Two queries, and the branch is `if (!data)` at `:164` where
`data` is null unless **both** queries have resolved (`:137`).

- **D-1 · P0 — a failed fetch renders a permanent loading skeleton.** There is
  no `isError` branch anywhere in the file. On error `dashboardQuery.data` is
  `undefined` → `data` is `null` (`:137`) → `:164` returns the skeleton. After
  react-query exhausts retries nothing re-renders, so the user is left shimmering
  at `:168-179` **forever**, with no message, no retry, and no indication
  anything failed. This is materially worse than the census's "panels render as
  zeroed/empty": at least an empty state terminates. Missing states: error,
  partial/degraded (either query failing takes the whole page down — a working
  dashboard payload renders nothing if `useProject` fails, even though
  `projectQuery.data` is used for exactly one string at `:139`),
  permission-denied, not-found.
- **D-2 · P0 — changing the range or toggling compare blanks the entire page,
  including the controls you just used.** `queryKeys.analytics.dashboard`
  includes `params` (`hooks/api/keys.ts:81`), `params` is `{days, compare}`
  (`:128-131`), and `liveQueryOptions` returns `{}` with **no
  `placeholderData`/`keepPreviousData`** (`hooks/api/query-options.ts:8-10`). So
  every range change and every compare toggle mints a cold query key → `data`
  null → the `:164` skeleton, which renders `PageHeader` with **no `actions` and
  no `toolbar`** (`:167-172`). The `RangePicker`, the Compare button, and all six
  tabs disappear at the moment of interaction and return with a layout shift.
  The user cannot correct a mis-click or switch tabs until the network returns.
  This is census verification item 4 ("filter controls stay mounted during
  loading") failing harder than it does on Responses, because there the pills
  merely hide — here the whole header content is gone.
- **D-3 · P0 — a URL query param crashes the page.** `useAnalyticsState`
  (`:74-80`) casts raw `searchParams` strings straight to unions with zero
  validation. `?metric=bogus` → `metric` is `"bogus"` → `hero-chart.tsx:72`
  `const keys = METRIC_KEYS[metric]` is `undefined` → `:76`
  `for (const {key,label} of keys)` throws a TypeError → the whole route falls to
  the error boundary. `?tab=lol` renders the KPI strip and then nothing below it
  (no tab body matches `:265-299`), with no "unknown view" state.
  `?range=abc` leaves `RANGE_LABELS["abc"]` undefined so the RangePicker trigger
  renders an empty button (`range-picker.tsx:82`). `.claude/rules/web-v2.md`
  explicitly requires "API enum → union maps must end with `?? FALLBACK`"; the
  same discipline is absent for URL-sourced unions, and here it is a crash, not
  a blank.
- **P1 — the comment lies about the KPI strip.** `:247` says "KPI strip —
  always visible". It sits below the `:164` gate, so it is absent during every
  load and every range change, and absent forever on error.
- **P1 — `pointer-events-none` over focusable content.** `:244` applies
  `isPending && "opacity-60 pointer-events-none"` to a `PageBody` full of
  `<Link>`s. Keyboard users can still Tab into every link and activate it with
  Enter while the surface is visually disabled; mouse users cannot. No
  `aria-busy` is set on the region, so assistive tech is told nothing.
- **P1 — a >365-day custom range is silently truncated.** `:123` clamps to
  `Math.min(..., 365)`. `range-picker.tsx:146` only disables future dates, so a
  user can pick 2020→2026; the trigger label then reads the full span
  (`range-picker.tsx:44`) while the data covers 365 days. The label and the data
  disagree with no notice.
- **P1 — two of the four hero charts are mislabelled.** `:375-377`
  "Form impressions vs submissions" passes `metric="impressions"`, which
  `hero-chart.tsx:38-41` maps to `formImpressions` + `widgetImpressions` —
  **submissions are not in that chart at all**. `:434-436`
  "Widget impressions over time" uses the same `metric="impressions"`, so it
  plots form impressions too, contradicting its own title. Only
  `:408-410` "Moderation over time" (`metric="approvals"`) is honest.
- **P2 — off-canon selection styling on the Compare toggle.** `:202`
  `bg-brand/10 border-brand/40 ... font-semibold` is a brand-tinted filled pill.
  `.impeccable.md` signature kit item 6: "selection identity is the brand
  underline that draws in … **not a filled pill**."
- **P2 — dead prop.** `CollectionTab` declares `metric: string` (`:370`), is
  passed `metric="impressions"` (`:278`), and never reads it — the body
  hardcodes `metric="impressions"` at `:381`.
- **P2 — the OAuth panel has no zero/absent handling and editorialises.**
  `:481-483` renders `Math.round(data.oauthVerifiedShare)%` with no denominator
  and no branch for "no submissions yet", so a brand-new project reads a
  confident "0% of submissions". `:494-497` then renders marketing advice
  ("OAuth-verified testimonials typically have higher approval rates and stronger
  social proof") inside an analytics panel, unconditionally, including when the
  number is 0 or unknown.
- **P2 — the API tab is a tab wrapping one card.** `:509-515` renders a
  `space-y-4` div containing only `ApiUsageCard`, beneath a global KPI strip
  (form impressions / submissions / approval rate / approved) that has nothing to
  do with API usage yet is still rendered above it.

**Information hierarchy — D-11 · P1.** The Overview tab states the same facts
four times in four idioms before introducing anything new:

1. `:249-261` — StatTiles: Form impressions, Submissions, **Approval rate**,
   **Approved**. Two of four tiles are the same fact (a rate and its numerator);
   three of four describe one funnel stage.
2. `:342-347` — HeroChart, `metric="submissions"`, which per
   `hero-chart.tsx:28-32` actually plots approved/rejected/flagged — the
   moderation split again.
3. `:351` — FunnelCard: impressions → submitted → approved. The same three
   numbers a third time.
4. `:354` — PipelineCard: approved / pending / rejected / flagged. A fourth time.

Four panels, one story, no ranking between them, each in its own equal-weight
bordered box. Nothing on the page says which number the user should care about.

---

## `components/analytics/hero-chart.tsx` (222 lines)

**Composition.** Recharts `AreaChart`, no shared primitives, no container of its
own (the caller supplies the card). Tooltip is styled with tokens (`:180-188`) —
good.

- **D-6 · P0 — the "Submissions" and "Approvals" metrics are identical, and
  neither plots submissions.** `METRIC_KEYS.submissions` (`:28-32`) and
  `METRIC_KEYS.approvals` (`:33-37`) are byte-identical: both
  `approved`/`rejected`/`flagged`. The Overview `FilterPills`
  (`analytics-dashboard.tsx:323-327`) offers "Submissions" and "Approvals" as
  separate choices — clicking between them changes nothing on screen. And
  `TimeseriesPoint.submissions` exists (`lib/analytics/types.ts:35`) and is
  mapped from the API (`dto-adapter.ts:52`) but is **never plotted by any
  metric**. The chart labelled "Submissions" does not show submissions.
- **P0 — no empty state.** If `series` is `[]` (a project with zero events),
  `:112-219` renders a bare 200px axis frame: gridlines, an unlabelled Y axis,
  no message. Under a header reading "Trends" that is indistinguishable from a
  broken chart. Every sibling card has an empty state; the largest visual element
  on the page has none.
- **P1 — colour alone carries all series identity, and there is no legend.**
  Stacked areas are distinguished only by `STACK_COLORS` (`:45-53`):
  approved = `--color-success`, rejected = `--color-destructive`,
  flagged = `--color-warning`. There is **no recharts `<Legend>`**, no key, no
  text anywhere on or near the chart naming the series. The only way to learn
  which band is which is to hover a tooltip. `.impeccable.md` Design Principle 4:
  "Moderation status … must be instantly scannable. Use shape + colour, **never
  colour alone**." This is a direct violation on the densest chart in the app,
  and green/red/amber is the worst possible triad for deuteranopia.
- **P1 — no accessible representation at all.** The wrapper `:112` is a bare
  `<div>` with no `role="img"`, no `aria-label`, no `<figcaption>`, and no
  table alternative. A screen-reader user gets an unlabelled SVG. Combined with
  the tooltip-only legend, the chart is unreadable without a mouse and sighted
  colour vision.
- **P1 — previous-period comparison aligns by array index and silently
  truncates.** `:92-98` builds `prevData` by mapping the previous series and
  taking `series[i]?.date ?? p.date`; `:102-107` merges only where
  `prevData[i]` exists. If the previous period has fewer points (month-length
  boundaries, custom ranges, gaps in the API's daily rows), the dashed comparison
  line just stops partway across the chart with no indication that it is
  incomplete rather than zero.
- **P2 — dead assignment.** `:81-85` computes `totalCur` and writes
  `point["prev_total"]`, a key nothing ever reads (the real merge happens at
  `:104`).
- **P2 — dead metric branch.** `METRIC_KEYS.loadtime` (`:42`) is never
  reachable: no `FilterPills` option list includes `"loadtime"`.
- **P2 — Y axis has no unit label** (`:169-178`) and the axis silently means
  "count" for three metrics and "ms" for the unreachable fourth.
- **P2 — hardcoded locale.** `formatDateTick` (`:60-62`) pins
  `toLocaleDateString("en-US", …)`, and appends `"T12:00:00Z"` to a
  `YYYY-MM-DD` string then formats in the viewer's local timezone.

---

## `components/analytics/stat-tile.tsx` (77 lines) + `sparkline.tsx` (59 lines) + `lib/analytics/range.ts`

**Composition.** One hand-rolled bordered surface (`stat-tile.tsx:40`). Correct
`tabular-nums font-mono` on the headline (`:62`). No shared primitive exists for
a KPI tile, so this is the app's only one — it should be the primitive.

- **D-9 · P0 — the sparkline covers a different time span than the number
  above it, and never says so.** `dto-adapter.ts:75` builds every tile's series
  as `series.slice(-14)` — hardcoded to the last 14 points, **regardless of the
  selected range**. On a 90-day or YTD range the headline value covers the full
  range while the graphic beneath it covers 14 days, with no axis, no dates, and
  no caption. The two halves of one tile describe different periods. This is not
  decoration that is merely useless; it is decoration that misinforms.
- **P1 — `sparkline.tsx` is decorative by construction.** `aria-hidden="true"`
  at `:25`, no axis, no ticks, no min/max labels, no tooltip
  (`activeDot={false}`, `:52`), no scale. It cannot be read for any value — it is
  a 28px gradient wash. `.impeccable.md` Design Principle 3: "**No decorative
  flourishes. Every element must earn its place.**" It appears in `stat-tile.tsx:68`
  (×4 on every page load) and `api-usage-card.tsx:127` (×N keys), where it is the
  *only* view of the time distribution — so removing it loses nothing, and keeping
  it as-is communicates nothing.
- **D-10 · P0 — real growth from zero renders as "no change".**
  `range.ts:105-107`: when `prev === 0`, `formatDelta` returns
  `direction: "flat"`, `label: "—"`. `stat-tile.tsx:48` then gates on
  `direction !== "flat"`, so the delta element is **not rendered at all**. A
  project going 0 → 500 submissions shows no delta indicator whatsoever, visually
  identical to a project that did not move. The one moment a user most wants a
  delta is the one moment it is suppressed.
- **P0 — "comparison unavailable" is indistinguishable from "previous period
  was zero".** `dto-adapter.ts:87-88` and `:113-124` coerce a missing
  `dto.previous` to `0` via `?? 0`. That flows into `formatDelta(value, 0)` →
  flat → hidden. So `compare=none` at the API level, a previous period the API
  could not compute, and a genuine zero previous period all render identically:
  nothing. This is census verification item 5 failing at the adapter layer, not
  the component layer.
- **P1 — a legitimate `0` is indistinguishable from absent.**
  `formatMetricValue(0)` (`range.ts:127`) returns `"0"`. There is no `—`/"No
  data" path anywhere in the tile. A metric the API omitted, a metric that failed
  to aggregate, and a true zero all render `0` beside a flat sparkline.
- **P2 — off-system typography.** `:62` uses arbitrary `text-[22px]` and `:63`
  an inline `style={{ letterSpacing: "-0.02em" }}` rather than a token or a scale
  step.
- **P2 — `KpiTile.unit` (`types.ts:47`) is honoured by `formatMetricValue`
  (`range.ts:124`) but never set by any tile** the adapter builds
  (`dto-adapter.ts:99-125`). Dead path.

---

## `components/analytics/content-performance-table.tsx` (109 lines)

Orchestrator's findings **verified in full**, and each extends further.

**Composition.** Named `…Table`, titled "Top performing" (`:27`), and contains
no `<table>`, no `ui/table` import, and no `<Link>`-free row anatomy. One
hand-rolled bordered surface (`:23`), one hand-rolled header (`:24-39`), and
`CardEmpty` instead of the shared `EmptyState`/`NoResults` (`:41-46`).

**List quality — worse than "no shared column widths".**

```
:54  "group flex items-center gap-3 py-3 …"
:60  rank      → w-4 shrink-0            (the only fixed column)
:63  identity  → flex-1 min-w-0
:78  metrics   → flex items-center gap-2 shrink-0
:79  {row.rating !== null && ( …star + number… )}   ← CONDITIONAL
```

The trailing metric cluster is `shrink-0` with **no fixed width**, and the star
group at `:79-86` renders only when `row.rating !== null`. So the impressions
number — the value the panel claims to rank by — sits at a **different
x-position on every row** depending on whether that row happens to have a
rating. It is not that the columns lack shared widths; the primary metric column
actively jitters row to row. `top-countries-bar.tsx` and `ratings-distribution.tsx`
at least pin their numeric columns (`w-12`, `w-7`); this one does not.

- **D-12 · P0 — every ranked row links to the same unfiltered inbox, and no
  deep-link target exists.** `:52` `href={responsesPath(projectSlug)}` for all
  rows. `row.id` (the submission id) is available at `:52`'s scope and unused.
  Verified at the route layer: `lib/routes.ts:33` is
  `responsesPath = (slug) => \`${projectPath(slug)}/responses\`` — it takes no
  id and no filter — and `responses-list.tsx:67` reads only `?status=`. **There
  is no address for a single response anywhere in the app.** So the fix is not a
  lazier-href fix; the missing thing is a submission-detail address. Meanwhile
  the row renders an `ArrowUpRight` on hover (`:96-99`) that promises exactly the
  deep link it cannot deliver, and clicking rank #4 dumps the user at the top of
  an unsorted list with no way to locate that testimonial.
- **P1 — "View all" is a dead end.** `:31-38` shows the link only when
  `rows.length > 5` and points at the unfiltered inbox. There is no
  "all top-performing, sorted by impressions" view to go to; the inbox cannot
  sort by impressions.
- **P1 — a rejected response can be celebrated as "Top performing".**
  `dto-adapter.ts:191` maps `moderationStatus` and `:192` maps `createdAt`;
  **neither is ever rendered**. `V2AnalyticsContentRowDTO.moderationStatus` is an
  unconstrained `string` (`packages/types/src/v2.ts`), so this panel will happily
  rank a pending or rejected submission at #1 with no status marker — while
  `.impeccable.md` Principle 4 calls moderation status "sacred" and demands it be
  instantly scannable.
- **P1 — a rating with no scale.** `:82-84` renders the bare number beside a
  filled star: "4" with no "/5". Nothing on the row or in the header states the
  scale.
- **P1 — `authorName` has no fallback.** Typed non-nullable
  (`types.ts:88`, DTO likewise) but anonymous/OAuth-less submissions plausibly
  carry `""`, which renders an empty bold line at `:65-67`. Contrast `:68`, where
  the *nullable* `authorCompany` is correctly guarded — the nullable field is
  handled and the field that actually goes empty is not.
- **P1 — truncation with no way to read the full value.** `:74-76`
  `line-clamp-1` on the content, `:65` `truncate` on the name, `:69` `truncate`
  on the company — none carry a `title` attribute or tooltip, and the row's only
  action goes to an unfiltered list, so the full text is unreachable from here.
- **P2 — three font sizes inside one row.** `:65` `text-xs` (12px), `:69`
  `text-[10px]`, `:60`/`:74`/`:82`/`:92` `text-[11px]`. Confirmed as reported.
- **P2 — no sorting, and no pagination in the expanded view.** Header claims
  "By impressions" (`:29`) with no control to sort by rating, recency, or status.
  In `SourcesTab` the component renders non-compact
  (`analytics-dashboard.tsx:501-504`), so `displayed = rows` uncapped — however
  many rows the API returns all render, with no count, no page control, and no
  statement of the cap the API applied.

---

## `components/analytics/pipeline-card.tsx` (185 lines)

**Surface nesting — the canonical cards-on-cards proof in this slice.** A
bordered panel directly inside a bordered panel:

```
:64   <div className="rounded-lg border border-border bg-card p-5">        ← outer card
:147    <div className="mt-4 rounded-md bg-muted/50 px-3 py-2.5 border border-border/50">   ← inner card
```

- **D-5 · P0 — the auto-moderation percentage and its caption use different
  denominators.** `:23-24` computes
  `autoModPct = round(autoResolved / total * 100)` where `total` is
  `pending + approved + rejected + flagged` (`:22`). The caption at `:162-165`
  then reads "`{autoResolved}` of `{totalWithAutoMod}` resolved without manual
  review", and the whole block is gated on `totalWithAutoMod > 0` (`:146`). With
  `total = 100`, `totalWithAutoMod = 50`, `autoResolved = 25`, the headline and
  progress bar say **25%** while the caption directly beneath says **25 of 50**
  (= 50%). The number and its own explanation contradict each other, and the bar
  at `:156-160` is drawn from the wrong one.
- **D-4 · P0 — half the donut legend links to filters the destination silently
  discards.** `:46` links Flagged → `?status=flagged` and `:53` links Rejected →
  `?status=rejected`. `responses-list.tsx:40` defines
  `type Filter = "all" | "pending" | "approved" | "featured"` and `:68`
  validates with `FILTERS.some(...) ? raw : "all"`. So clicking "Flagged 12"
  navigates to the Responses inbox showing **all** responses with the pill
  reading "All" — the requested filter is dropped with no error, no toast, and no
  notice. Two of four legend rows are broken promises. (`?status=approved` from
  `:39`/`dto-adapter.ts:138` is valid; `?status=pending` is valid.)
- **D-13 · P1 — a zero-count status vanishes instead of reading zero.** `:55`
  `.filter((s) => s.value > 0)`. "Rejected: 0" is therefore indistinguishable
  from "rejected was not returned by the API" — the row simply is not there. The
  legend length varies 0–4, so the card's height jumps between range selections,
  and the user can never confirm that a status is genuinely empty.
  `ratings-distribution.tsx:47` does this correctly (always renders all five
  buckets) — the right pattern already exists eight files away.
- **P1 — a third empty-state dialect, hand-rolled inline.** `:109-111` renders
  a dashed circle containing the words "No data" at `text-[10px]`. That is
  neither `CardEmpty` (same directory), nor `EmptyState`, nor the dashed-card
  form used by `top-sources-list.tsx:26`. When `total === 0` the legend is empty,
  the auto-mod block is hidden and the median row is hidden, so the card renders
  as a title plus a small dashed circle — and says nothing about *why*.
- **P1 — the donut has no accessible representation.** `:77-92` is an
  unlabelled `<PieChart>`; no `role="img"`, no `aria-label`, no `<title>`. The
  adjacent legend (`:117-141`) does carry label + value + percent as text with a
  colour dot, which rescues the *information* — cite that pattern — but the chart
  itself is invisible to assistive tech, and the segments are distinguished by
  colour only.
- **P2 — `medianApprovalHours === null` silently removes the row** (`:170`), so
  "we have never approved anything" and "this was not measured" collapse to the
  same absence. No `—`.
- **P2 — the percent column is `tabular-nums` without `font-mono`** (`:136`)
  while the count beside it is `tabular-nums font-mono` (`:133`) at a different
  size. Two number families in one row (see the discipline note below).

---

## `components/analytics/submission-heatmap.tsx` (102 lines)

- **D-8 · P0 — with no data it renders a complete, authoritative heatmap of
  nothing.** `:19` `Math.max(...data.map(...), 1)` → `maxCount = 1` on an empty
  array; `:20` builds an empty `cellMap`; `:47-77` then renders the full 7 × 24
  grid where every cell resolves `count = 0` (`:54`) and paints
  `bg-muted/40` (`:63`), and `:80-96` renders a "Fewer → More" legend beneath it.
  A brand-new project with zero submissions sees a fully-formed, confident
  168-cell analytics visual. There is **no empty state and no error state**, so
  "no submissions yet", "every hour genuinely had zero", and "the fetch failed"
  are pixel-identical. This is the single most misleading surface in the slice.
- **P1 — colour-only encoding with an unlabelled scale and no text
  alternative.** Cells are bare `<div>`s (`:58-72`) whose only affordance is a
  `title` attribute (`:60`) — not focusable, no `role`, no `aria-label`, no
  keyboard path, and `title` is unreliable on touch and inconsistently announced
  by screen readers. The grid has no `role="img"`/`table` semantics and no
  accessible summary. Principle 4 ("shape + colour, never colour alone") is
  violated with no mitigating text anywhere.
- **P1 — the intensity scale is compressed and has no numbers.** `:68`
  `intensity * 85 + 15` gives any non-zero count ≥15% brand, so 1 submission and
  2 submissions are near-indistinguishable while the 0/non-zero step is the
  loudest jump in the chart. The legend (`:80-96`) shows five swatches labelled
  only "Fewer" and "More" — no counts, no max. The chart cannot be read
  quantitatively at all.
- **P2 — the hour labels drift out of alignment with their columns.** The label
  track is `flex … ml-8` with each of the 8 labels at
  `width: (3/24)*100%` (`:34-43`), i.e. eighths of *(container − 32px)*. The cell
  rows are `w-8` label + `flex-1 gap-px` over 24 cells (`:49-52`), so the cells
  occupy *(container − 32px − 23 gap pixels)*. The gaps are unaccounted for, so
  labels progressively drift right of their columns — roughly a full cell width
  by the 21:00 label at the 480px min-width (`:32`).
- **P2 — unverified day-index contract.** `DAYS` starts at "Sun" (`:9`) and is
  matched by array index against `d.day` (`:54`).
  `V2AnalyticsHeatmapCellDTO.day` is an undocumented bare `number`
  (`packages/types/src/v2.ts`); if the API ever emits ISO weekdays (1 = Monday)
  every row silently shifts. Contract risk, not a confirmed bug.

---

## `components/analytics/funnel-card.tsx` (87 lines)

- **P1 — no empty state.** `steps: []` renders a header and blank space
  (`:29-83` maps over nothing); `Math.max(...[], 1)` at `:16` keeps it from
  throwing, which is exactly why the emptiness is silent.
- **P1 — a missing conversion rate is rendered as absence, not as unknown.**
  `:32-35` returns `null` when the previous step is 0, and `:44` then omits the
  connector row entirely. So "step 1 had no traffic so no rate exists" and "we
  did not compute a rate" both render as nothing — and because the connector line
  (`:46`) disappears with it, the funnel visually loses its spine.
- **P2 — two navigation semantics behind identical-looking rows.** `:38-40`:
  `step.href.startsWith("?")` stays on the page, otherwise it prefixes
  `projectPath(slug)`. `dto-adapter.ts:133-138` hardcodes `"?tab=collection"`
  for `form_impressions` and `"responses…"` for the rest. So the first row
  switches an analytics tab and the rows below navigate out of Analytics
  entirely, with the same hover treatment and the same `ArrowRight` (`:75-78`)
  on both.
- **P2 — `toFixed(0)` on the conversion rate** (`:34`) turns 0.4% into "0%
  conversion", reading as total failure when it is rounding.
- **P2 — the percent uses `tabular-nums` without `font-mono`** (`:47`) while
  the value two lines down uses both (`:64`).

---

## `components/analytics/top-sources-list.tsx` (115 lines)

- **P1 — state-dependent container shape.** Empty renders
  `rounded-lg border border-dashed border-border bg-card p-5` (`:26`) wrapping
  `CardEmpty`; populated renders `rounded-lg border border-border bg-card p-5`
  (`:37`). The header (`:38-53`) exists only in the populated branch, so the
  empty card loses its own title — the user cannot tell what the empty box is
  for.
- **P1 — every row links to the unfiltered inbox** (`:63`
  `responsesPath(projectSlug)`) even though `src.source` is the exact value a
  `?source=` filter would need. (Per memory, the `?source=` filter was
  deliberately deferred on Responses for a PII boundary — so this is a known gap,
  but the row still renders a hover `ArrowRight` at `:102-105` promising a
  scoped destination.)
- **P1 — silent truncation in compact mode.** `:22` `sources.slice(0, 5)`, and
  the "View all" link at `:45` appears only when `sources.length > 5` — correct
  — but the non-compact render (`analytics-dashboard.tsx:467`) has no cap, no
  count, and no statement of the API's own limit.
- **P2 — `approvalRate` is shown with no sample size.** `:93-95`
  "{n}% approved" beside a count; a source with 1 submission and 1 approval reads
  "100% approved". The count is present at `:99` but visually detached from the
  percentage it governs.
- **P2 — `oauthVerified` is an unlabelled icon.** `:79-83` has
  `aria-label="OAuth verified"` (good) but no visible legend, so sighted users
  see an unexplained green shield.

---

## `components/analytics/ratings-distribution.tsx` (92 lines)

The best data-state behaviour in the slice, with one real bug.

- **P1 — an unformatted float in a headline metric.** `:29` renders
  `{data.average}` raw. `V2AnalyticsRatingsDTO.average` is an unbounded `number`,
  so `4.333333333333333` renders verbatim in a `text-sm font-semibold` slot.
  Every other number in the slice goes through `toLocaleString` / `toFixed` /
  `Math.round`; this one does not.
- **P1 — a rating with no scale.** `:28-30` shows a star and a number with no
  "/5" and no "out of 5" anywhere, and `:33` "{total} rated" gives the sample
  size but not the scale.
- **P2 — colour makes an editorial judgement with no legend.** `:67-71`
  paints ≥4 stars `bg-success/80`, 3 stars `bg-brand/60`, and ≤2 stars
  `bg-destructive/50` — encoding "good / neutral / bad" into a neutral
  distribution chart with nothing explaining the scheme. The rating number is
  present as text (`:55`) so Principle 4 is satisfied; the unexplained semantics
  are the issue.
- **Cite as the reference pattern:** `:47` always renders all five buckets and
  `:48` uses `data.distribution[rating] ?? 0`, so a genuinely empty bucket reads
  "0 (0%)" instead of vanishing — exactly what `pipeline-card.tsx:55` gets wrong.

---

## `components/analytics/top-countries-bar.tsx` (80 lines)

- **P1 — raw API values leak as country names.** `dto-adapter.ts:28-46` maps
  exactly 13 country codes and falls back to the bare code, so real traffic from
  Italy, Mexico, or Poland renders as "IT", "MX", "PL" in a column headed by
  full names like "United States". `Intl.DisplayNames` is a platform feature and
  would remove the table entirely.
- **P1 — silent truncation with no affordance.** `:33` `slice(0, 8)` with no
  "View all", no "+N more", and no total count. A project with 40 countries shows
  8 and says nothing.
- **P2 — off-by-one dangling divider.** `:45` uses
  `i < countries.length - 1` where every sibling correctly uses the *displayed*
  length (`content-performance-table.tsx:57`, `top-sources-list.tsx:69`). With
  more than 8 countries the 8th (last visible) row keeps its bottom border,
  leaving a divider under the final row with nothing beneath it.
- **P2 — the "Unknown" bucket ranks as a country.** `dto-adapter.ts:41` maps
  `UNKNOWN → "Unknown"`, which then competes for the #1 slot in a list titled
  "Top countries" with no visual separation from real data.
- **P2 — inconsistent percentage precision across sibling panels.** `:37`
  `toFixed(1)`, while `pipeline-card.tsx:119` uses `toFixed(0)`,
  `device-split-card.tsx:19` and `top-sources-list.tsx:58` use `Math.round`.
  Four panels on one screen, three precisions.
- **P2 — the numeric pair jitters.** `:57` percent (`text-[11px]`,
  `tabular-nums`, no mono) and `:60` count (`text-xs`, `tabular-nums font-mono`)
  share one right-aligned cluster with no fixed widths, so the boundary between
  them floats with digit count while only the outer edge aligns.

---

## `components/analytics/device-split-card.tsx` (99 lines)

- **P1 — percentages with the sample size deliberately computed and then
  discarded.** `s.value` is built for every segment (`:23`, `:30`, `:37`, `:46`)
  and **never rendered** — `:89-91` shows only `{s.pct}%`. One desktop visit
  renders "Desktop 100%", indistinguishable from a million. The dead `value`
  field is evidence the count was intended.
- **P1 — no empty state.** With all four counts at 0, `total = 0` (`:17`),
  every `pct` is 0 (`:19`), and the surface still renders: a full stacked-bar
  track (`:63-71`, three zero-width divs separated by `gap-px`) plus a
  three-row legend reading Mobile 0% / Desktop 0% / Tablet 0%. "No traffic yet"
  is presented as a confident breakdown.
- **P2 — a text token used as a data colour.** `:39` assigns Tablet
  `var(--color-muted-foreground)` — the token used for secondary *text*
  throughout the app — and the resulting swatch sits beside
  `text-muted-foreground` labels (`:86`). `--color-chart-*` tokens exist and are
  used at `:33` and `:48`.
- **P2 — four independent `Math.round` calls can sum to 99% or 101%** (`:19`),
  and the stacked bar widths (`:68`) are drawn from those rounded values, so the
  bar can visibly under- or over-fill its track.
- **Cite as the reference pattern (twice):** `:16-17` deliberately keeps
  `unknown` in the denominator with a comment explaining why, and shows the
  Unknown row only when it is non-zero (`:42-52`) — a considered
  absent-data decision, the only one in the slice. And `:77-91` is the slice's
  best accessibility: colour dot **plus** a distinguishing icon **plus** the text
  label **plus** the value, satisfying "shape + colour" properly.

---

## `components/analytics/widget-engagement-grid.tsx` (188 lines)

- **P1 — the container disappears between states.** Empty renders a bordered
  dashed card (`:45`); populated renders a bare `<div>` (`:58`) with a naked
  `h3` and a grid of individually bordered cards (`:87`). So the panel is a card
  when it has nothing to say and a headed group of cards when it does — a
  structural jump no sibling makes, and it means the Overview tab mixes carded
  and uncarded sections at the same level (`analytics-dashboard.tsx:357-361`).
- **Surface nesting.** Card-in-card, two levels deep: `:87`
  `rounded-lg border bg-card p-4` (a bordered card, itself inside the tab's
  stack) containing `:115` `rounded-md bg-muted/50 px-2.5 py-2` and `:132`
  `rounded-md … bg-warning/10 | bg-muted/50` — filled sub-panels inside a
  bordered panel inside a page section.
- **D-14 · P1 — raw API enums leak to the user.** `:100`
  `TYPE_LABELS[w.widgetType] ?? w.widgetType` and `:104`
  `LAYOUT_LABELS[w.layoutType] ?? w.layoutType`. The `?? FALLBACK` rule from
  `.claude/rules/web-v2.md` is satisfied in letter, but the fallback **is the raw
  value** — so the first widget type the API adds ships to users as
  `WALL_OF_LOVE`-style SCREAMING_SNAKE.
- **P1 — the subtitle promises data the card does not show.** `:64` reads
  "Load & impressions". `w.impressions` is mapped by the adapter
  (`dto-adapter.ts:163`) and **never rendered** — the card shows Loads (`:126`)
  and Avg load (`:154`) only.
- **P1 — "slow" is communicated by colour alone.** `:55` hardcodes
  `loadThreshold = 400`; `:80` derives `isSlowLoad`; the signal is then carried
  entirely by an amber border (`:90`), an amber tile background (`:133`), an
  amber icon (`:141`) and amber text (`:151`). No "Slow" label, no icon change
  (the `Clock` at `:137` is present in both states), no tooltip, and no statement
  anywhere of what threshold was crossed. Principle 4 violation, and the
  threshold is unknowable to the user.
- **P1 — a widget that has never loaded reports a perfect 0ms.** `:154` renders
  `{w.avgLoadMs}ms` unconditionally, so `totalLoads: 0` + `avgLoadMs: 0` reads as
  flawless performance rather than "no data". `lastLoadAt: null` then removes the
  timestamp row (`:174`), and zero errors renders an empty `<div />` spacer
  (`:172`) rather than an affirmative "no errors" — three separate absences that
  each look like a healthy zero.
- **P2 — hover lifts, and hover reduces contrast.** `:89`
  `hover:shadow-sm … active:scale-[0.99]` against `.impeccable.md` signature kit
  item 4: "Hover is a tint shift only — **nothing lifts or translates on
  hover**." And `hover:border-border/70` on a card whose resting border is
  `border-border` (`:90`) makes the border *fainter* on hover — the interaction
  reduces definition.
- **P2 — an analytics row opens an editor.** `:86` links each card to
  `widgetStudioPath(...)`, so drilling into a performance metric lands the user
  in the widget builder rather than a detail view of the numbers they clicked.

---

## `components/analytics/api-usage-card.tsx` (147 lines)

- **P1 — a fourth empty-state dialect, in the same directory as `CardEmpty`.**
  `:20-37` renders a bordered card containing a plain paragraph, "No API keys
  configured. Manage keys" — not `CardEmpty` (imported at `:13` and used nowhere
  in this file), not `EmptyState`, not the dashed-card form, not the dashed
  circle. Four dialects across 16 files.
- **P1 — "unlimited" is indistinguishable from "limit unknown".** `:59-62`:
  `usageLimit === null` → `usagePct` null → `:116` renders **no progress bar and
  no label**. A key with no quota shows a bare number with no context, identical
  to a key whose limit the API failed to return.
- **P1 — "near limit" is colour-only.** `:63` `usagePct > 80` drives a border
  colour (`:70`), a progress colour (`:121`) and a sparkline colour (`:129-131`).
  No "Near limit" text, no icon, no threshold stated. Principle 4 again.
- **P1 — no container in the populated state.** `:40` returns a bare
  `space-y-3` div, so the API tab is a naked heading plus a grid of cards while
  every other tab opens with a carded panel.
- **P2 — hand-rolled badge.** `:88-97` builds the Active/Inactive pill from
  scratch (`rounded-full px-1.5 py-0.5 text-[10px]`) instead of composing the
  `ui/badge` primitive that exists.
- **P2 — dead fields.** `rateLimit` (`dto-adapter.ts:176`) and `keyType`
  (`:180`) are mapped and never rendered, on a card whose entire subject is quota.
- **P2 — `lastUsedAt: null` removes the row** (`:135`), so a never-used key
  shows "0 requests" and no timestamp — two absences, no statement.
- **P2 — uncapped grid.** `:57` renders every key the payload contains with no
  cap, no count, and no pagination.
- **P2 — the sparkline (`:127`) is the only view of the usage distribution**,
  and it is `aria-hidden` and unlabelled (see D-9).

---

## `components/analytics/card-empty.tsx` (34 lines)

**P1 — this is the forked empty state.** Its own docstring (`:5-11`) argues the
fork: "Dashboard cards are small … so their empty state stays quiet … (The
richer ghost-preview pattern lives on the primary list surfaces …)". The
argument is reasonable; the execution is a parallel system.
`components/shared/empty-state.tsx` already ships exactly this case — `EmptyState`
takes an optional `preview` (`:97`, omit it and there is no ghost), an optional
`action`, and a `bordered` flag (`:99`), and `NoResults` (`:162-184`) is the
quiet variant. `CardEmpty` re-implements the icon chip
(`:23` `size-8 rounded-full bg-muted` vs `empty-state.tsx:129`
`size-10 rounded-xl bg-brand/12 text-brand`), so analytics empties are
grey-on-grey circles while the rest of the app uses amber-on-brand squares —
they read as a different product. `.impeccable.md` Principle 6: "never hand-roll
a page's own header, tabs, or **empty state** … If a primitive falls short,
extend the primitive; do not fork a per-page copy." The correct move was a
`size`/`density` prop on `EmptyState`.

Note also that `CardEmpty` has no `action` slot, so every analytics empty state
ends in advice with no button — against Principle 5 ("gives one action").

---

## `components/analytics/range-picker.tsx` (184 lines)

**Composition.** Good: composes `Popover`, `Button`, `Calendar` from
`components/ui`. No bordered surfaces of its own.

- **P1 — timezone off-by-one on the primary date control.** `:58-59`
  `pendingRange.from.toISOString().slice(0, 10)`. The `Calendar` yields local
  midnight, so a user at UTC+5:30 (this repo's own timezone) selecting July 27
  sends `2026-07-26`. `resolveRange` then compounds it by parsing `customFrom` as
  UTC midnight but `customTo` with an explicit `"T23:59:59.999Z"`
  (`lib/analytics/range.ts:31-33`) — mixed local/UTC handling on the two ends of
  one range.
- **P2 — no way back to a preset without reopening the custom pane.** Once
  `value === "custom"`, the trigger shows the date span (`:43-45`); the presets
  are still listed (`:104-119`) so recovery is possible, but `pendingRange`
  persists in local state (`:35-39`) and is only cleared on a preset click
  (`:50`), so reopening custom after a preset shows the stale prior selection
  pre-highlighted.
- **P2 — banned eyebrow motif.** `:100-102`
  `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
  ("Quick ranges") is exactly the mono-uppercase eyebrow that
  `.claude/rules/design-system.md` lists under "Banned decoration". It is
  functional as a group label here, but the styling is the banned motif and
  appears nowhere else in the slice.
- **P2 — future-only date guard.** `:146` `disabled={(date) => date > new Date()}`
  permits arbitrarily distant past dates, feeding the silent 365-day clamp at
  `analytics-dashboard.tsx:123`.

---

## `lib/analytics/*` (3 files)

- **`dto-adapter.ts:75` — P0**, the sparkline range mismatch (D-9).
- **`dto-adapter.ts:87-88`, `:113-124` — P0**, `?? 0` collapses "no previous
  period" into "previous period was zero" (see D-10 discussion).
- **`range.ts:105-107` — P0**, `prev === 0` returns `flat`/`"—"`, which
  `stat-tile.tsx:48` then suppresses entirely.
- **`dto-adapter.ts:28-46` — P1**, the 13-country lookup table; use
  `Intl.DisplayNames`.
- **`dto-adapter.ts:191-192` — P1**, `moderationStatus` and `createdAt` mapped
  and never rendered.
- **`dto-adapter.ts:163`, `:176`, `:180` — P2**, `impressions`, `rateLimit`,
  `keyType` mapped and never rendered.
- **`range.ts:89`, `:127` — P2**, hardcoded `"en-US"` locale for both dates and
  numbers (repeated at `hero-chart.tsx:62` and six `toLocaleString("en-US")`
  call sites across the components).
- **`types.ts:47` — P2**, `KpiTile.unit` is honoured by
  `range.ts:124` but never set by any tile the adapter builds.
- **`packages/types/src/v2.ts` — P2**, `V2AnalyticsDashboardDTO.alerts: []` is
  a contract field typed as the empty tuple and never consumed. Either the
  surface owes an alerts panel or the contract owes a deletion.

---

## Numeric alignment and `tabular-nums` discipline

`tabular-nums` is applied nearly everywhere — the discipline problem is that
**`font-mono` is applied to only half of the numbers**, and the halves sit
side by side:

| Location | Treatment |
| --- | --- |
| `top-countries-bar.tsx:57` percent | `text-[11px] tabular-nums` (proportional) |
| `top-countries-bar.tsx:60` count | `text-xs tabular-nums font-mono` |
| `pipeline-card.tsx:136` percent | `text-[11px] tabular-nums` |
| `pipeline-card.tsx:133` count | `text-xs tabular-nums font-mono` |
| `funnel-card.tsx:47` conversion | `text-[11px] tabular-nums` |
| `funnel-card.tsx:64` value | `text-xs tabular-nums font-mono` |
| `ratings-distribution.tsx:55` rating | `text-[11px] tabular-nums` |
| `ratings-distribution.tsx:77` count | `text-[11px] tabular-nums font-mono` |

So in four separate panels a percentage in the system font sits immediately
beside a count in the mono font, at different sizes. The convention appears to
be "counts are mono, percentages are not", but it is nowhere stated, it is
broken at `ratings-distribution.tsx:81` (`(NN%)` at `text-[10px]`,
non-tabular), and it defeats the point: within a column the numbers align, but
the reader's eye crosses two type families per row.

Only two right-hand numeric columns in the entire slice have fixed widths —
`ratings-distribution.tsx:76` (`w-12`) and `pipeline-card.tsx:136` (`w-7`).
Everywhere else numeric clusters are `shrink-0` with content-derived widths, so
nothing aligns row to row (worst case: `content-performance-table.tsx:78-95`,
where a conditional element shifts the primary metric).

---

## Stock-shadcn leakage

Not the classic form. There is **no** `Card`/`CardHeader` scaffolding, **no**
default `Table`, **no** default `Tabs` pill, **no** `Alert`, and **no**
`dl/dt/dd` in this slice. The leakage is the *shadcn-demo composition habit*
rather than shadcn components:

- **20 copies of one card string.** `rounded-lg border border-border bg-card p-5`
  appears in 11 of 16 files plus 5 times inside `analytics-dashboard.tsx` — a
  "wrap everything in an equal-weight box" layout with no primitive behind it,
  which is precisely what a stock demo grid looks like.
- **10 hand-rolled panel headers** (`funnel-card.tsx:21-26`,
  `pipeline-card.tsx:66-69`, `content-performance-table.tsx:27-29`,
  `top-sources-list.tsx:40-43`, `ratings-distribution.tsx:19-22`,
  `top-countries-bar.tsx:19-22`, `device-split-card.tsx:58-59`,
  `submission-heatmap.tsx:25-28`, `widget-engagement-grid.tsx:61-65`,
  `api-usage-card.tsx:43-46`) — each an `h3.text-sm.font-semibold` plus a
  `p.text-xs.text-muted-foreground.mt-0.5`, plus a conditional "View all" link in
  three of them.
- **Hand-rolled badge** at `api-usage-card.tsx:88-97` instead of `ui/badge`.
- **Four hand-rolled progress bars** — `funnel-card.tsx:68-72`,
  `top-sources-list.tsx:87-91`, `top-countries-bar.tsx:65-69`,
  `analytics-dashboard.tsx:488-493` — while `ui/progress` is used correctly at
  `api-usage-card.tsx:117`. Five bars, two implementations.
- **Every panel is the same visual weight.** Twelve equal cards, equal borders,
  equal padding, equal `text-sm font-semibold` headers, no size or emphasis
  hierarchy. That flatness is what reads as "unstructured reskin" more than any
  individual component does.

---

## Copy quality

- **P1 — raw enums shown to users**: `widget-engagement-grid.tsx:100`, `:104`
  (`WALL_OF_LOVE`, `MASONRY`, … whenever the API adds a value).
- **P1 — raw country codes shown as names**: `dto-adapter.ts:45`.
- **P1 — truncation with no way to read the full value**:
  `content-performance-table.tsx:65`, `:69`, `:74` (no `title`, no tooltip, and
  the row's only action goes elsewhere).
- **P1 — a rating with no scale**: `content-performance-table.tsx:82-84`,
  `ratings-distribution.tsx:28-30`.
- **P1 — the subtitle promises data the panel omits**:
  `widget-engagement-grid.tsx:64` ("Load & impressions", impressions never
  rendered).
- **P1 — chart titles that misdescribe the plotted series**:
  `analytics-dashboard.tsx:375-377`, `:434-436`.
- **P2 — tautological subtitles.** Nine of ten panel subtitles restate the
  title and add nothing: "Collection funnel" / "Funnel conversion"
  (`funnel-card.tsx:22`/`:25`); "Device split" / "By device"
  (`device-split-card.tsx:58`/`:59`); "Top sources" / "Submission sources"
  (`top-sources-list.tsx:40`/`:42`); "Approval pipeline" / "By status"
  (`pipeline-card.tsx:67`/`:69`); "Ratings" / "Score distribution"; "Top
  countries" / "By widget impressions"; "Submission activity" / "Day × hour";
  "Top performing" / "By impressions"; "API usage" / "Requests by key". They
  occupy a line of vertical rhythm in every card to convey nothing.
- **P2 — marketing advice inside an analytics panel**, rendered even at 0%:
  `analytics-dashboard.tsx:494-497`.
- **P2 — no error copy exists at all**, so the "error copy that tells the user
  to retry something that can never succeed" category is vacuously clean. The
  replacement defect is D-1: silence.
- **P2 — humanised dates are handled well.** `timeAgo` from `lib/format` is
  used at `widget-engagement-grid.tsx:176` and `api-usage-card.tsx:137`. No raw
  ISO strings leak anywhere in the slice. Cite as the good baseline.

---

## Top defects, ranked

| # | Sev | Defect | Location |
| --- | --- | --- | --- |
| D-1 | **P0** | A failed analytics fetch renders a **permanent loading skeleton** — no error state, no retry, forever shimmering. Either query failing takes the whole page down. | `analytics-dashboard.tsx:164` (+ `:137`) |
| D-2 | **P0** | Changing the range or toggling Compare blanks the entire page **including the RangePicker, the Compare button and all six tabs** — cold query key, no `placeholderData`, and the loading header renders no actions or toolbar. | `analytics-dashboard.tsx:164`, `:167-172`; `hooks/api/keys.ts:81`; `hooks/api/query-options.ts:8-10` |
| D-3 | **P0** | `?metric=<anything>` crashes the route: unvalidated URL cast → `METRIC_KEYS[metric]` undefined → iterating undefined throws. `?tab=` renders a headless page. | `analytics-dashboard.tsx:74-80` → `hero-chart.tsx:72`, `:76` |
| D-4 | **P0** | Two of four pipeline legend rows link to filters the destination silently discards — "Flagged 12" lands on the **unfiltered** inbox reading "All". | `pipeline-card.tsx:46`, `:53` vs `responses-list.tsx:40`, `:68` |
| D-5 | **P0** | The auto-moderation percentage and the caption directly beneath it use different denominators — the card contradicts itself (25% vs "25 of 50"). | `pipeline-card.tsx:23-24` vs `:162-165` |
| D-6 | **P0** | The "Submissions" and "Approvals" metric pills render **identical** charts, and neither plots submissions — `TimeseriesPoint.submissions` is mapped and never charted. | `hero-chart.tsx:28-37`; `analytics-dashboard.tsx:323-327` |
| D-7 | **P0** | Two chart titles misdescribe their own series: "Form impressions vs submissions" plots no submissions; "Widget impressions over time" plots form impressions too. | `analytics-dashboard.tsx:375-377`, `:434-436` |
| D-8 | **P0** | With zero data the heatmap renders a complete, authoritative 7×24 grid plus a legend — "no submissions", "all hours truly zero" and "fetch failed" are pixel-identical. | `submission-heatmap.tsx:19-20`, `:47-77` |
| D-9 | **P0** | Every KPI sparkline is hardcoded to the last 14 points regardless of range, so on a 90d/YTD view the number and the graphic in one tile describe different periods, unlabelled. | `dto-adapter.ts:75` → `stat-tile.tsx:68` |
| D-10 | **P0** | Growth from zero shows **no delta at all** (`prev === 0` → `flat` → suppressed), and `?? 0` makes "no previous period" identical to "previous period was zero". | `range.ts:105-107`; `stat-tile.tsx:48`; `dto-adapter.ts:87-88` |
| D-11 | **P1** | No information hierarchy: the Overview tab states the same three numbers four times in four equal-weight boxes before showing anything new. | `analytics-dashboard.tsx:249-261`, `:342`, `:351`, `:354` |
| D-12 | **P1** | Every "Top performing" row links to the unfiltered inbox while showing a deep-link hover arrow — and **no per-response address exists in the app** to link to. | `content-performance-table.tsx:52`, `:96`; `lib/routes.ts:33` |
| D-13 | **P1** | A zero-count status disappears from the pipeline legend instead of reading `0`, so legitimate zero is indistinguishable from missing — and the card's height jumps. | `pipeline-card.tsx:55` |
| D-14 | **P1** | Raw API enums reach users because the required `?? FALLBACK` falls back to the raw value. | `widget-engagement-grid.tsx:100`, `:104` |
| D-15 | **P1** | Four data panels have **no empty state**, three have no container in one of their states, and there are **four** competing empty-state dialects. | `hero-chart.tsx` (none), `submission-heatmap.tsx` (none), `funnel-card.tsx` (none), `device-split-card.tsx` (none); dialects at `card-empty.tsx:22`, `top-sources-list.tsx:26`, `pipeline-card.tsx:109`, `api-usage-card.tsx:26` |
| D-16 | **P1** | Charts carry meaning by colour alone: the hero chart has **no legend of any kind**, and slow-load and near-limit warnings are amber-only. Direct violation of "shape + colour, never colour alone". | `hero-chart.tsx:45-53` (no `<Legend>`); `widget-engagement-grid.tsx:90`, `:133`, `:151`; `api-usage-card.tsx:70`, `:121` |
| D-17 | **P1** | No chart in the slice has any accessible representation — no `role="img"`, no `aria-label`, no table alternative; the heatmap's only affordance is a `title` attribute on a non-focusable div. | `hero-chart.tsx:112`; `pipeline-card.tsx:77`; `submission-heatmap.tsx:58-72` |
| D-18 | **P1** | Percentages without denominators: device split computes counts and discards them (100% from n=1); OAuth share and approval rates likewise. | `device-split-card.tsx:89-91` (values at `:23`, `:30`, `:37`); `analytics-dashboard.tsx:481-483`; `top-sources-list.tsx:93-95` |
| D-19 | **P1** | Zeros that mean "no data" are rendered as achievements: a never-loaded widget reports `0ms` avg load; an unformatted float renders as `4.333333333333333`. | `widget-engagement-grid.tsx:154`; `ratings-distribution.tsx:29` |
| D-20 | **P1** | Silent truncation with no affordance: countries capped at 8 with no "View all"; a >365-day custom range clamped while the label shows the full span. | `top-countries-bar.tsx:33`; `analytics-dashboard.tsx:123` |
| D-21 | **P1** | `pointer-events-none` over live `<Link>`s during transitions — keyboard users can activate what mouse users cannot, and no `aria-busy` is exposed. | `analytics-dashboard.tsx:244` |
| D-22 | **P1** | Timezone off-by-one in the primary date control: `toISOString()` on a locally-constructed date sends the previous day at UTC+. | `range-picker.tsx:58-59`; `range.ts:31-33` |
| D-23 | **P1** | Two divergent hand-maintained skeletons for one surface, neither matching the content, both reserving a description that never renders. | `page.tsx:17-46` vs `analytics-dashboard.tsx:164-183` |
| D-24 | **P1** | "Top performing" can rank a rejected or pending response with no status marker — `moderationStatus` is fetched and dropped, against "status is sacred". | `dto-adapter.ts:191`; `content-performance-table.tsx:49-101` |
| D-25 | **P2** | 40 arbitrary off-scale font sizes (`text-[9px]`/`[10px]`/`[11px]`/`[22px]`) vs 24 `text-sm`; three sizes inside one table row; `font-mono` on half the numbers so proportional percentages sit beside mono counts in four panels. | `content-performance-table.tsx:60-92`; `top-countries-bar.tsx:57-60`; `pipeline-card.tsx:133-136`; `funnel-card.tsx:47-64` |
| D-26 | **P2** | Canon violations: `hover:shadow-sm` lift (hover must be tint-only) with a border that *fades* on hover; brand-tinted filled pill for selection (must be the underline); banned mono-uppercase eyebrow. | `widget-engagement-grid.tsx:89-90`; `analytics-dashboard.tsx:202`; `range-picker.tsx:100-102` |
| D-27 | **P2** | Heatmap hour labels drift out of alignment with their columns (the label track ignores 23 `gap-px`), reaching ~one cell width by the right edge. | `submission-heatmap.tsx:34-43` vs `:49-52` |
| D-28 | **P2** | Off-by-one dangling divider under the last visible country row (`countries.length` where siblings correctly use `displayed.length`). | `top-countries-bar.tsx:45` |
| D-29 | **P2** | Nine of ten panel subtitles are tautologies restating their own titles; one panel renders marketing advice as analytics. | `funnel-card.tsx:25`; `device-split-card.tsx:59`; `pipeline-card.tsx:69`; `analytics-dashboard.tsx:494-497` |

---

## Duplication and reuse opportunities

Named by the primitive that should exist. The first two would absorb roughly
half the findings above.

### 1. `DataPanel` — the missing card primitive (absorbs 20 surfaces, 10 headers, D-15)

Every panel in the slice hand-rolls the same three things: the surface string
`rounded-lg border border-border bg-card p-5` (20 occurrences across 12 files),
a header of `h3.text-sm.font-semibold` + `p.text-xs.text-muted-foreground.mt-0.5`
(10 occurrences), and an optional trailing "View all" link (3 occurrences, three
slightly different treatments at `content-performance-table.tsx:32-38`,
`top-sources-list.tsx:46-52`, `widget-engagement-grid.tsx:69-75`).

The primitive must own **the state matrix, not just the chrome** — this is the
structural fix the census demands, applied at panel granularity:

```
<DataPanel
  title="Approval pipeline"
  action={<ViewAllLink … />}
  state={panelState}      // loading | error | empty | filtered-empty | ready
  onRetry={…}
/>
```

with the invariant the census asks for: **rendering an empty state while
`isError` is true must be unrepresentable**. Making `state` a discriminated union
that a panel cannot bypass fixes D-1, D-15, and the four missing empty states in
one place, and removes the "container in one state, no container in the other"
jump (`widget-engagement-grid.tsx:45` vs `:58`; `api-usage-card.tsx:22` vs `:40`;
`top-sources-list.tsx:26` vs `:37`). It also kills the nesting defect: with a
real panel primitive, `pipeline-card.tsx:147` becomes a `<PanelFooter>` slot
instead of a bordered box inside a bordered box.

`card-empty.tsx` should then be **deleted** in favour of a `density="compact"`
prop on the shared `EmptyState` — the fork's own docstring
(`card-empty.tsx:5-11`) states the requirement (quiet, small, no ghost preview),
and `EmptyState` already supports all of it by omitting `preview`
(`empty-state.tsx:97`). Extending the primitive also fixes the visual divergence
(grey `bg-muted` circle vs the app's amber `bg-brand/12` square) and gives
analytics empties the `action` slot they currently lack.

### 2. `Metric` — one number renderer (absorbs D-9, D-10, D-18, D-19, D-25)

Numbers are formatted six different ways across the slice: `toLocaleString("en-US")`
(6 sites), `formatMetricValue` (`range.ts:118`), `Math.round` (4 sites),
`toFixed(0)` (`pipeline-card.tsx:119`), `toFixed(1)`
(`top-countries-bar.tsx:37`), and raw interpolation
(`ratings-distribution.tsx:29`, `widget-engagement-grid.tsx:154`). The mono/
proportional split is applied by hand and inconsistently.

One component that takes `{ value, previous, unit, scale, denominator, precision }`
and owns:

- **absent vs zero** — `value == null` renders `—`, never `0` (fixes D-19, and
  the `formatMetricValue(0)` → `"0"` collapse);
- **"no comparison available" vs "previous was zero"** — requires
  `previous: number | null` rather than the adapter's `?? 0`
  (`dto-adapter.ts:87-88`), and renders "new" for 0→N instead of hiding the
  delta (fixes D-10);
- **scale and denominator are structural, not optional** — a rating cannot be
  rendered without `/5`, a percentage cannot be rendered without its `n` (fixes
  D-18 and the two rating-without-scale sites);
- **one numeric type treatment** — `tabular-nums font-mono` for every number,
  percentages included (fixes D-25's two-families-per-row problem);
- **locale from the platform**, not hardcoded `"en-US"` in nine places.

### 3. `Chart` wrapper — legend + accessibility + empty, once (absorbs D-16, D-17, and D-8's silence)

Four recharts surfaces (`hero-chart.tsx`, `sparkline.tsx`,
`pipeline-card.tsx:77-105`, `submission-heatmap.tsx`) each independently ship:
no legend, no `role="img"`/`aria-label`, no text alternative, no empty branch,
and their own duplicated `contentStyle` tooltip token block
(`hero-chart.tsx:180-188` and `pipeline-card.tsx:94-101` are the same object,
copied). One wrapper should own the series→colour→**label** registry (so a
legend is impossible to omit), the accessible name, a `<figcaption>`/table
fallback, and the "no data in range" state. `STACK_COLORS`
(`hero-chart.tsx:45-53`) should become that shared registry rather than a
private map — and `submissions`/`approvals` collapsing to the same key set
(D-6) is a bug a single registry would have made obvious.

**`sparkline.tsx` should be deleted, not wrapped.** It is `aria-hidden`,
axis-less, scale-less and tooltip-less by construction (`:25`, `:52`), and its
data is silently the wrong time span (D-9). Either promote it to a labelled
micro-chart with the range it actually covers, or remove it — `.impeccable.md`
Principle 3 does not admit a third option.

### 4. `ProgressBar` — five bars, two implementations

`ui/progress` is used correctly at `api-usage-card.tsx:117`, and then
hand-rolled four more times: `funnel-card.tsx:68-72`,
`top-sources-list.tsx:87-91`, `top-countries-bar.tsx:65-69`,
`analytics-dashboard.tsx:488-493` — plus a fifth variant at
`pipeline-card.tsx:156-160`. All five are
`h-{1,1.5,2} w-full rounded-full bg-muted overflow-hidden` wrapping a
`transition-all duration-500` fill. Use the primitive; extend it with a `size`
if `h-1` is missing.

### 5. `RankedList` — the real table (absorbs D-12, and D-25's alignment defect)

`content-performance-table.tsx`, `top-sources-list.tsx`, and
`top-countries-bar.tsx` are the same component three times: rank number, an
identity block with a progress bar, a right-hand numeric cluster, an optional
hover arrow, `border-b border-border/40` between rows, and a `slice(0, N)` +
"View all" cap. All three implement it differently, all three misalign, and one
gets the divider off-by-one (D-28).

The primitive should take a **column schema** so widths are shared across rows
by construction — which is the only real fix for
`content-graph-table.tsx:78-95`, where a conditional cell shifts the primary
metric on every row — plus a required `href` builder per row (so D-12's
"every row goes to the same place" is visible in the call site) and a single
truncation policy that guarantees a `title` on every clamped string.

For `content-performance-table.tsx` specifically, the primitive is not enough:
**`lib/routes.ts` needs a response-detail address** (`responsesPath` at `:33`
takes only a slug), and `responses-list.tsx:40` needs its `Filter` union
widened to `flagged`/`rejected` before D-4's links can mean anything.

### 6. Delete, don't refactor

- `hero-chart.tsx:81-85` — `prev_total` dead assignment.
- `hero-chart.tsx:42` — unreachable `loadtime` metric.
- `analytics-dashboard.tsx:370` + `:278` — `CollectionTab`'s unused `metric` prop.
- `dto-adapter.ts:163`, `:176`, `:180` — `impressions`, `rateLimit`, `keyType`
  mapped and never rendered (or render them; `widget-engagement-grid.tsx:64`
  already promises `impressions`).
- `types.ts:47` — `KpiTile.unit`, never set.
- `packages/types/src/v2.ts` — `alerts: []`, never consumed.
- `device-split-card.tsx` — the discarded `s.value` (`:23`, `:30`, `:37`) should
  be rendered, not deleted; it is the denominator D-18 is missing.
