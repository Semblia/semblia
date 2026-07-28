# Decision — the canonical internal-UI system

Date: 2026-07-27. Branch `feat/internal-ui-rework-2026-07`.
Supersedes nothing in `decisions.md`; it *adds* the structural layer that
`.impeccable.md` principle #6 ("one system, derived everywhere") always implied
but never defined precisely enough to be enforceable.

Evidence base, all primary-sourced in this directory:

- `research-data-states.md` — 92 testable rules (Polaris, Carbon, Primer, Geist,
  Material 3, Atlassian, Radix, NN/g)
- `research-control-planes.md` — 50 testable rules (Geist, Linear, Attio, Notion,
  Raycast, Height)
- `research-moderation.md` — 45 rules + documented anti-patterns (Reddit +
  academic moderator survey, YouTube, Twitch, Discord, Hive, Checkstep, OpenAI,
  Trustpilot, Meta, Senja)
- `census-data-states.md` — the verified defect baseline
- `principles.md` — P1–P8

## The decision in one line

**One system: Geist's structural discipline, applied over the existing Measured
Ink tokens, with ShadCN kept strictly as the behaviour layer.**

Not a new design language — the tokens, palette, typeface, and signature kit stay
locked. What changes is that *structure becomes governed*: surfaces, states,
lists, and status stop being per-page decisions.

Why Geist rather than Polaris/Carbon/Material as the structural model: it is the
only one of the three whose product is the same shape as ours (a project-scoped
developer control plane), its rules are prescriptive rather than descriptive, and
its surface law is the one that actually forbids the defect we have. Carbon
supplies the state taxonomy and table mechanics; Polaris supplies the
card-nesting and spacing ladder; Primer supplies degraded-state behaviour. Linear
supplies the sweep strategy and list interaction model.

## 1. Surface law — the fix for cards-on-cards

The whole defect class comes from 152 call sites each inventing a container.
Containers are now a closed vocabulary.

**Three background roles, and no call site may add a fourth:**

| Token | Role | Where |
| --- | --- | --- |
| `--background` | the page | default for everything |
| `--surface` | rationed differentiation | one tint step, sparingly |
| `--card` | component background | only inside a sanctioned container |

**A bordered/filled container is sanctioned in exactly three cases.** Anywhere
else, content sits directly on the page background:

1. **A settings section** grouping form controls (the Geist `Fieldset` role) —
   `SettingsSection` is this and only this.
2. **A grid tile** in a deliberate card-grid view (projects / forms / widgets
   gallery), where the tile *is* the entity.
3. **A floating layer** — dialog, popover, dropdown, sheet, tooltip, toast.

Lists, tables, metadata pairs, detail properties, and **analytics panels** are
*not* sanctioned containers. They sit on the page background, separated by
hairline rules and section headings. This single change removes most of the 152.

**Hard rules, all automatable:**

- **No `box-shadow` on anything that scrolls with the page.** Elevation is
  hairline border + tint. Shadow belongs to floating layers only.
  *(Geist Materials: Surface vs Floating; Linear's opacity-based elevation.)*
- **Never nest two bounded surfaces.** Max **one** bordered container between the
  page background and a row. A card inside a card is a build error, not a style.
  *(Geist: "Don't stack two Materials on the same element.")*
- **Grouping inside a bounded region**, in order of preference: stack-gap →
  section heading → hairline divider → one tint step → inset/bleed. Never a
  second card. *(Polaris card-layout; Carbon layers.)*
- **List items are never individually wrapped** in their own card or sub-card
  inside a list. *(Polaris, verbatim Don't.)*
- **Padding only on containers with a visible boundary.** Spacing between
  unbounded elements comes from stack gaps. *(Polaris.)*
- **When nesting is genuinely unavoidable, inner padding is strictly smaller than
  outer.** *(Polaris.)*
- **Sibling containers in a group share one variant and one shape.** *(Carbon.)*
- Max nesting depth counted in the DOM: **3 background steps** from the page base,
  and in practice we target 2. *(Carbon.)*

## 2. Data state — one primitive, states unrepresentable-if-wrong

The root cause of the flagship P0 is that pages own their state ladder. They stop
owning it.

**The canonical state union** — every data surface renders from this, never from
`data?.length === 0`:

`loading-initial` · `loading-refresh` · `loading-more` · `empty-first-run` ·
`empty-filtered` · `error` · `forbidden` · `not-found` · `partial`

Enforced mechanically: the primitive derives the state from the query result, so
**`empty` while `isError` cannot be constructed.** Primer's rule, verbatim, is the
one that matters: *"If we know the user has data, a failed load never renders an
empty state."*

**Loading**

- Nothing indicates loading under 200ms. *(M3, Primer, NN/g.)*
- Cold load of a known layout → skeleton matching final dimensions and shape,
  zero layout shift. Refresh over rendered data → keep the rows, indicate
  out-of-band. *(Geist, Polaris, Carbon.)*
- A skeleton is never an empty state, never wraps a control, and contains no
  focusable element.
- One indicator per region, not per element. `aria-busy` on the region;
  `aria-live` on the destination, never on the skeleton.
- Filter/search controls **stay mounted and usable during loading** — fixing
  `responses-list.tsx:126`.

**Empty**

- `empty-first-run` and `empty-filtered` are different components with different
  copy and different actions: create the first record vs clear the filter.
- Filtered-empty **quotes the query verbatim** and names the recovery.
- Exactly one primary CTA, `Verb + Noun`. `Get Started` / `Continue` / `OK` /
  `Try X` banned. Three CTAs is a defect.
- The empty state replaces the element it stands for, **including a table's
  headers** — never an empty `<tbody>`.
- Left-aligned in in-page regions; centring reserved for small tiles.
- A genuine "nothing happened" state (0 pending) is **reassurance with no CTA**,
  never framed as a setup failure.

**Error**

- Name the resource: `Couldn't load responses`. **`Something went wrong` is
  banned**, as are `Oops`, `Unfortunately`, `We're sorry`, and humour.
- `Couldn't` / `Can't` for user-state, `Failed to` for infrastructure.
- No HTTP codes or infra internals in user copy; always end with a next step.
- Copyable identifier for *system* failures only, in a collapsed `<details>`.
  Validation and permission denials get none.
- **Never auto-retry** — the user came here to decide. Offer `Try again`.
- A panel that fails while siblings succeed replaces **only itself**. Max 5
  outage messages per page.
- **Error copy never tells a user to retry a permanent failure** (P4).

## 3. Lists, tables, and detail

**Row anatomy** — one per entity type, identical everywhere that entity appears:

- Borderless single flex row. Left: avatar/icon → title (Label) → secondary
  metadata (one step down, `tabular-nums` when numeric). Right: **at most two
  controls**; a third moves into a dots menu.
- Right-column action labels are `Verb + Noun` (`Remove member`, not `Remove`) —
  bare verbs lose context once the row scrolls. **Documented exception:** the
  moderation queue keeps bare `Approve` / `Reject`, because the object is
  universal and unambiguous across every row and every surveyed moderation
  product ships it that way (Reddit, YouTube, Senja).
- Selection checkbox is **hover-revealed**; nothing is selected on load.
- Three row states with three inputs: **highlight** (hover / `↑↓` / `J K`),
  **select** (`X` / Shift-click, Shift-`↑↓` for range), **act** (`Cmd K` /
  context menu). `Esc` clears. `Cmd A` selects all *after* filtering.
- Bulk actions appear in a bar on first selection, scoped to the active filter,
  with an explicit cancel. Per-row actions disable while bulk is active.
- Grouping is a **sticky section header carrying one togglable aggregate** —
  never a card per group. Empty-group visibility is a user toggle.
- Loading renders **skeleton rows**, not an empty body.
- Paginate past 50 items; pagination at the bottom; `21–40 of 142` (en dash).
- Truncate long inline lists at 5–10 rows with the hidden **count in the
  trigger**; move focus into revealed rows.

**A `<table>` only when all three hold:** every row shares a shape, **and** at
least one column is sortable/comparable down the column, **and** the user's task
is comparison. Otherwise a list row (find-and-act) or a definition list (one
record's key/values). A two-column table for a record's metadata is banned.

In a real table: numeric right-aligned + `tabular-nums`, text left-aligned,
headers aligned with their data, nothing centred. Units in the header, not every
cell; constant decimal precision down a column. Row hover tint always on. Content
wraps rather than truncating. Aggregates go in the **column footer**, not a
separate stats strip. Tri-state select-all; two-state row checkboxes.

**Row → detail is a non-modal side sheet.** The list stays interactive, `Esc`
closes, focus returns to the originating row, `↑↓` walks adjacent records, and the
sheet **does not repeat the page header** — it is the detail layer. A full-page
escape hatch exists. **Destructive confirmation never lives in the non-modal
sheet** — that is a modal with an explicit gate.

## 4. Status, metrics, time, and absent values

- **One badge per row.** Colour carries the signal; no icon duplicating it;
  badges are never clickable. Two badges side by side means the row needs a second
  column. Title Case, matching the canonical API term.
- **A status dot** is scoped to one lifecycle enum and animates only in
  transitional states. Pair with relative time when duration matters
  (`Running · 12s ago`) — the dot alone conveys no duration.
- **Every metric names itself** — no bare gauge. Thresholds are product-wide, not
  invented per widget.
- **Every number clicks through to the rows behind it.** No number is a dead end.
  This is what makes `content-performance-table` linking every row to the same
  unfiltered inbox a defect rather than a shortcut.
- **One time formatter:** `2m ago` / `5h ago` up to 7 days, then `Mar 14, 2026`.
- **Unknown / not-applicable renders `—`.** Never `N/A`, `null`, or empty string.
- **A legitimate `0` renders as `0`** and is never suppressed or dashed.
- `undefined`, `null`, `NaN`, `Invalid Date` must never reach the DOM.
- A count whose source is unavailable is **hidden**, not rendered as `0`.
- A rating renders **with its scale** or not at all.
- Charts never interpolate across a gap; the gap is drawn and both ends labelled.
  Bar/area axes start at zero.

## 5. Page chrome

- **A page header carries identity + page-scoped actions + persistent state —
  never explanatory prose.** No `<p>` of descriptive copy between a page title and
  the first content element. `PageHeader.description` is therefore re-scoped to
  *inline meta/state* (`2 widgets · Launchpad`), and sentences move to a section
  subtitle or a definition-list value. *(Geist has no page-description primitive
  at all; Linear's view header does filters and display options only.)*
- **Tabs are sibling views of one resource.** Cap 5–7, Title Case destination
  nouns, no verbs, no parenthesised counts — the count is a badge that
  **disappears at zero**. Active tab reflected in the URL and restored on refresh.
- **Messaging is typed and the type sets dismissibility:** project-wide state
  needing resolution → non-dismissible banner with a resolving CTA, one at a time;
  inline contextual → note, one per concept, persistent until the state changes;
  transient acknowledgement → toast. Feedback caused by the user's action inside a
  region renders **in that region**, not as a toast.
- **Filters and display options are separate axes** with separate controls.
  Filters round-trip through the URL; anything that doesn't is documented.
- Overflow menus open on **click** (never hover), cap ~10 items, group destructive
  last behind a divider, return focus to the trigger. Permission-gated items
  render **visible-but-locked**, not hidden.
- **Non-functional controls** are removed when removal isn't disorienting;
  otherwise rendered inactive with the reason in place — never a bare `disabled`
  explained only by a tooltip on a non-focusable element.

## 6. Type roles

Split by **purpose, not size** — the rule the app currently breaks by mixing
`text-xs`, `text-[11px]`, and `text-[10px]` inside one row:

- **Label** — single-line: row titles, menu items, table cells, metadata, badges.
  Tighter line-height, marries with icons.
- **Copy** — multi-line prose: descriptions, help text, empty-state bodies.
  Higher line-height, measure capped ~65–75ch.
- A row title and a body paragraph **never share a type class**.
- The muted metadata label is exactly **one step below** the row title, gets
  `tabular-nums` when numeric, and takes emphasis via nested `<strong>` — never a
  bespoke font-size.
- Minimum ≥5-step scale with ≥1.25 ratio; fixed `rem` (no fluid `clamp` in
  product UI).

Deliberately **not** done: adding an Inter Display cut for headings (Linear's
pairing). It is a real refinement but it is a visual change with a webfont cost,
and this pass is structural. Flagged for the user rather than taken silently.

## 7. What ShadCN keeps and loses

**Keeps** — untouched, this is the accessibility the user asked to preserve:
Radix behaviour, focus management and focus trapping, ARIA wiring, keyboard
semantics, portal/dismiss behaviour, `id`/`aria-describedby` plumbing in
`components/ui/*`.

**Loses** — the composition layer: stock `Card*` scaffolding as page layout, the
default `Table` used without the column law above, default badge colours, default
tabs pill (we use the sliding amber underline), and every hand-rolled
`rounded-* + border` container that is not one of the three sanctioned cases.

## 8. The primitive layer this requires

Built in `components/shared`, extending what exists rather than forking:

| Primitive | Job | Replaces |
| --- | --- | --- |
| `DataState` | owns the state union; makes error-as-empty unrepresentable | every hand-written ladder |
| `DataList` | row anatomy, selection, keyboard, bulk bar, pagination, skeleton rows | duplicated machinery in `form-list` / `widget-list` / `responses-list` |
| `DataTable` | the column law: alignment, tabular-nums, sort, footer aggregates | stock `ui/table` + fake flex "tables" |
| `DetailSheet` | non-modal row inspector, focus return, `↑↓` walk | nothing (missing surface) |
| `StatusBadge` | one badge per row, canonical enum → Title Case label | `form-status-badge` + inline `REVIEW_BADGE` maps |
| `MetricValue` | self-describing metric, zero-vs-unknown, click-through | `analytics/stat-tile` |
| `Section` | unbounded grouping: heading + divider, no border | the hand-rolled bordered panels |
| `EmptyState` (extend) | add `error` / `forbidden` / `cleared` variants | `analytics/card-empty` fork |

`analytics/card-empty.tsx`, the duplicated keys/agents subtrees, and the
duplicated list machinery are **deleted**, not tolerated.

## 9. Sweep strategy

Linear's own rule, adopted verbatim as process: *"design debt often happens in
small increments, it's best to be paid in larger sweeps… if you update just one
module or view at a time, the overall experience becomes more disjointed."*

And their scope discipline: **bound the sweep by excluding the riskiest layer.**
They excluded navigation. We already rebuilt navigation last session, so it is
excluded here — this pass touches page interiors only.

Order: primitives → moderation surface (the missing product) → Import Center
(the known-bad surface) → remaining surfaces in dependency order → verification.
