# Audit — workspace / project entry surfaces (2026-07-27)

Slice: the projects home (`(app)/page.tsx`), project creation (`(app)/new`), the
project "overview" route (`(app)/[slug]`), and the error/layout boundaries
around them. Read after `census-data-states.md`, which established the
app-wide baseline this audit builds on.

Method: full end-to-end reads of every file in the slice plus the shared
primitives and hooks they compose (`components/shared/*`, `hooks/use-projects.ts`,
`hooks/api/query-options.ts`, `lib/format.ts`, `lib/favicon.ts`,
`lib/project-utils.ts`), the DTO contract (`packages/types/src/v2.ts`), and the
API-side guards that produce the error copy this UI surfaces
(`apps/api_v2/src/modules/projects/projects.service.ts`). No files edited.

## Headline verdicts

1. **There is no project overview.** `app/(app)/[slug]/page.tsx` is eleven lines
   and its entire body is `redirect(formsPath(slug))` (:10). The route in the
   sitemap has no surface. It cannot violate Design Principle #1 because it does
   not exist — but its absence means the app has no per-project home, which is
   the exact surface Principle #1 says every view should centre.
2. **The *global* view is the one that violates Principle #1.** The projects home
   header renders a workspace-wide aggregate — "N projects · N responses · N
   pending review" (`projects-client.tsx:269-281`) summed across every project in
   `use-projects.ts:56-60`. That is "a dashboard of aggregated vanity metrics" on
   the global view, which `.impeccable.md` Design Principles #1 explicitly
   forbids. It is also arithmetically unsound (see P0-3).
3. **This slice is not the cards-on-cards offender.** Honest count: the deepest
   bordered nesting in the whole slice is depth 2 (a bordered panel containing
   `border-b` rows, or a card containing a `border-t` footer). The one true
   card-in-card is inside the transfer dialog. The real defect in this slice is
   different and worse: **it hand-rolls its own empty state, its own
   filtered-empty state, its own error state, its own buttons, and its own form
   inputs, while four separate shared primitives that do exactly those things
   sit unused in the same repo.** Not one file in the slice imports
   `EmptyState`, `NoResults`, `GhostList`, or `ui/empty`.

---

## `app/(app)/page.tsx` + `components/projects/projects-client.tsx` (Projects home)

The app's root surface. 414 lines in the client component, containing four
locally-defined components (`IncomingTransfers`, `IncomingTransferDialog`,
`ProjectsClient`, `LoadFailed`).

### Composition

Good: composes `PageHeader`, `PageBody`, `FilterPills`, `SearchField`,
`ViewToggle`, `RefreshingDataBadge`, `HeaderSep` from `components/shared`
(:26-33). This is the most primitive-compliant chrome in the slice.

Hand-rolled anyway, despite an existing primitive:

- **`LoadFailed` (:388-413)** — a third error presentation. `RouteError`
  (`shared/route-error.tsx`) already renders the identical composition (destructive
  icon in a tinted circle, title, muted body, "Try again" button) via `ui/empty`.
  `LoadFailed` re-derives it by hand: `"flex size-10 items-center justify-center
  rounded-full bg-destructive/10"` (:391) vs RouteError's `"size-10
  bg-destructive/10 text-destructive"` (route-error.tsx:67). Same intent, two
  implementations, different radius and typography. **P1**
- **`IncomingTransfers` (:64-111)** — hand-rolled warning panel:
  `"overflow-hidden rounded-lg border border-warning/30 bg-warning/[0.06]"`
  (:75). No shared "notice/callout" primitive exists, so this is defensible as
  a one-off — but it is rendered as a stack of `<div>`s (:78-105), not a list, so
  a screen reader gets an unbounded run of content with no item count. **P2**
- **Header description skeleton (:263-266)** is a raw
  `<span className="inline-block h-3 w-44 animate-shimmer rounded bg-muted" />`
  instead of `<Skeleton className="h-3 w-44" />`, which is that exact class set
  (`ui/skeleton.tsx:6`). **P2**

### Surface nesting

Depth 2, not a defect. List view: `PageBody padding="bare"` → `div.px-4` →
`"mt-6 overflow-hidden rounded-xl border border-border bg-card"` (:355) →
`ItemShell shape="row"` which is `"border-b border-border"`
(`item-shell.tsx:87`). One panel, internally divided. Correct.

The one genuine card-in-card is in the dialog: `DialogContent` (already a
bordered elevated surface) wraps `"rounded-lg border border-border bg-muted/30
p-4"` (:140). A bordered card inside a bordered modal. **P2**

### Data states

| State | Handled? | Evidence |
| --- | --- | --- |
| initial loading | yes | `:336-349`, view-shaped skeletons |
| empty (never had data) | yes | `isEmpty` `:223` → `EmptyProjects` `:333` |
| filtered-empty (search) | yes | `:352-353` → `EmptySearch` |
| **filtered-empty (type filter)** | **NO — renders a blank screen** | see P0-2 |
| error / fetch-failed | yes | `loadFailed` `:226` → `LoadFailed` `:350-351` |
| **partial/degraded** | **NO** | transfers query failure is invisible, see P0-1 |
| **stale-while-revalidate after a failed refresh** | **NO** | see P1-1 |
| not-found | n/a | list surface |
| **permission-denied** | **NO** | `V2ProjectDTO.access.role` (v2.ts:494) is never read anywhere in the slice; a VIEWER's card is identical to an OWNER's |
| **pagination-exhausted** | **NO** | `pageSize: 100` hard cap, see P0-3 |
| zero/null field values | partial | responses `0` → "No responses yet" (card) but the row shows *nothing* (see `project-row.tsx`); `projectType: null` → badge silently omitted |

**P0-1 — a failed ownership-transfer fetch silently hides a pending ownership
request.** `projects-client.tsx:204` is `const transfers = incomingTransfers.data ?? []`.
`useMyProjectTransfers` has no error branch anywhere in the file, and
`IncomingTransfers` returns `null` when `transfers.length === 0` (:71). So a 500,
a network blip, or an expired token renders as *no pending transfers at all* —
the panel does not exist. Combined with the expiry window (`transferExpiry`
:54-62), a transfer can lapse because the user was never shown it. This is the
census's flagship pattern (`isError` falling through to empty) recurring in a
surface the census did not cover, and here the consequence is loss of an
ownership grant, not a wrong count.

**P0-2 — selecting a type filter that matches nothing renders a completely blank
canvas.** The filtered-empty branch is gated on search text only:
`filtered.length === 0 && search` (:352). With `search === ""` and a type filter
active, control falls through to the grid branch (:360-366), which renders
`<div className="mt-6 grid ...">` over an empty array — an invisible empty div —
and the create affordance is suppressed because `showGhostTile` requires
`typeFilter === "all"` (:229). Result: header, toolbar, then nothing. Reachable
whenever a background refetch removes the last project of the selected type, or
a project's `projectType` changes, or the filter is set while data is refetching.

**P0-3 — the workspace aggregate is wrong past 100 projects and is presented as
fact.** `use-projects.ts:13-16` requests `{ pageSize: 100 }` and `:19-21` reads
`projectsQuery.data?.items` only, discarding `total`, `totalPages`, `hasNext`,
`hasPrev` — all of which the DTO provides (`v2.ts:341-349`). `totalResponses` and
`totalPending` (`:56-60`) therefore sum only the first 100 projects, and
`projects.length` (`projects-client.tsx:269`) reports 100 for a 140-project
workspace. There is no pagination control, no "showing 100 of 140", no
truncation notice. The header states a number that is silently false, and the
pending-review count — the one number that drives action — undercounts.

**P0-4 — a Free-plan user is walked into a dead end with no warning.** No file in
`components/projects/` reads plan or usage (verified by grep). The header CTA
(:288-295) and the ghost tile (:365) are always enabled. The API rejects the
create with `ForbiddenException("Project limit reached for this plan")`
(`projects.service.ts:303-307`), which `project-create-client.tsx:54-60`
surfaces verbatim in a toast with no plan name, no limit value, no upgrade link,
and no route to billing. On the Free plan (limit 1) this is the *default*
experience of the second project.

### List/table quality

- **The row and the card disagree about what a project is.** `ProjectCard`
  always shows a response count (`project-card.tsx:45-48`), plus a pending chip,
  type badge, description, and date. `ProjectRow` shows pending **XOR**
  responses (`project-row.tsx:69-83`) — a project with 4 pending and 200
  responses shows only "4 pending"; the 200 disappears. Toggling
  `ViewToggle` therefore changes the *information*, not the layout. **P1**
- **Row anatomy is not consistent row-to-row.** Three shapes in one list: rows
  with a pending chip, rows with a response count, rows with an empty metric
  column (both counts zero). Nothing to scan down. **P1**
- Column alignment is actually fine — `ItemRow` gives metrics a `flex-1`
  siblings-absorb-slack layout (`item-row.tsx:69-89`) and `ProjectRow` pins the
  date to `w-[72px]` (`project-row.tsx:86`). But that width is a magic number,
  not a shared column token, and it is the only thing holding the right edge.
  **P2**
- **No row-level actions at all.** No rename, archive, duplicate, delete, copy
  link, or open-in-new on either the card or the row. The only interaction is
  navigate-in. `ItemActionRow` exists in `components/shared` and is unused here.
  **P1**
- **No bulk model** — and `ItemShell` already ships a `bulkSelected` prop
  (`item-shell.tsx:27`) that this surface never uses. **P2** (arguable whether
  projects need bulk; the affordance being pre-built and ignored is the point)
- **No sorting.** No name/date/response-count sort; order is whatever the API
  returned.
- **No pagination**, per P0-3.
- Neither view uses list semantics (`<ul>`/`role="list"`), so the count is not
  announced. **P2**

**P1 — `aria-label` on the item link destroys the row's content for screen
readers.** `project-card.tsx:36` and `project-row.tsx:31` pass
`aria-label={project.name}` to `ItemShell`, which puts it on the `<Link>`
(`item-shell.tsx:111-120`). An `aria-label` on a link overrides its entire
subtree as the accessible name, so a screen-reader user hears "Acme, link" and
never receives the pending count, response count, type, or description — the
only urgency signal in the list is silently dropped.

### Toolbar gating

`showToolbar = !loading && projects.length >= 6` (:222).

**P1 — filter state can be trapped with no control to clear it.** `search` and
`typeFilter` live in `useProjects` and keep filtering `filtered` regardless of
whether the toolbar is mounted. If a workspace drops from 6 projects to 5 while
a search or type filter is active (delete a project, or a refetch returns
fewer), the toolbar unmounts and the user is left looking at a filtered subset
with no visible reason and no way to reset. The `6` is also an unnamed magic
number.

Secondary: the `ViewToggle` is absent during the initial load even though the
skeleton branch already commits to `view` (:337) — the layout is chosen while
the control that chooses it is hidden. Same class as the census's
`showToolbar = !loading` finding on `responses-list.tsx:126`, milder here. **P2**

### Stock-shadcn leakage

Low. No `Card`/`CardHeader` page scaffolding, no default `Table`, no default
`Tabs`, no `Alert`, no `dl/dt/dd`. Two leaks worth naming:

- **`FilterPills variant="pill"` contradicts the signature kit.** `.impeccable.md`
  Signature Kit #6 states selection identity is "the brand underline that draws
  in (tabs line variant, PageTabs, SectionNav, **FilterPills**), not a filled
  pill." The default `pill` variant — which this page uses (:301) — renders
  exactly a filled pill: `"bg-background text-foreground shadow-sm ring-1
  ring-brand/20"` (`filter-pills.tsx:134`). The primitive named in the canon
  violates the canon. **P1** (fix belongs in the primitive, not the call site)
- `Badge variant="secondary"` for the project type (`project-card.tsx:81-87`,
  `project-row.tsx:53-59`) is the stock shadcn grey chip, overridden inline with
  `"px-1.5 py-0 text-[10px]"` at both call sites — i.e. the same override written
  twice because no "type chip" variant exists. **P2**

### Copy quality

- **P1 — an expired transfer still offers "Accept ownership".** `transferExpiry`
  can return `"expired"` (:58), but the Review button (:95-104) stays enabled and
  the dialog's Accept button (:163-172) is offered unconditionally. The user is
  invited to perform an action that can only fail server-side.
- **P2 — `transferExpiry` presents an unknown as a soft fact.** An unparseable
  `expiresAt` returns `"expires soon"` (:56). "Soon" is a claim; the code
  literally does not know.
- **P2 — the expiry clock is frozen per render.** `transferExpiry` reads
  `Date.now()` at render (:57) with no interval; a page left open shows
  "expires in 2h" indefinitely. Cousin of the already-fixed
  `913b3b27 fix(developers): stop freezing the expiry clock at module load`.
- **P1 — no pending affordance on the transfer dialog.** `pending` only disables
  both buttons (:157, :166). No spinner, no label change, no `aria-busy`. Click
  Accept and the UI greys out with no indication anything is happening —
  precisely what `pr-quality-gates.md` ("Expose pending state") forbids.
- Good: `PROJECT_TYPE_LABELS` (`lib/format.ts:170-182`) humanises every
  `V2ProjectType`, so no raw `SAAS_APP` reaches the UI. `fmtRelative`
  (`lib/format.ts:69-77`) is humanised and both call sites add a
  `title={toLocaleDateString()}` for the exact value
  (`project-card.tsx:51`, `project-row.tsx:87`). This is the slice's best copy work.

---

## `components/projects/project-card.tsx`

- Composes `ItemCard` (:34) with the `footer` slot — correct primitive use.
- **P1 — the pending chip is hand-rolled while `Badge` is imported two lines
  away.** `:69-71` is
  `"flex shrink-0 items-center rounded-full bg-warning/15 px-2 py-0.5
  text-[10px] font-semibold text-warning"`. `Badge` has a `warning` variant —
  `"bg-warning/10 text-warning border-warning/25"` (`ui/badge.tsx:24-25`) — and
  the same file imports `Badge` at :5 and uses it at :81 for the type label
  directly beside the chip. Worse, `project-row.tsx:71` hand-rolls the *same
  state* differently: `rounded-md`, `text-xs`. So "3 pending" is a 10px full
  pill in grid view and a 12px `rounded-md` chip in list view for the same
  project, and neither matches the house badge. Violates Design Principle #4
  ("Status is sacred… instantly scannable"). **P1**
- **P2 — the card surfaces 2 of the 4 counts the DTO provides.** `_count` carries
  `responses`, `pendingModeration`, `widgets`, `apiKeys` (`v2.ts:488-493`); the
  card reads only the first two (:30-31). A project with 6 live widgets and 0
  responses reads as empty.
- **P2 — `line-clamp-2` on the description (:90) with no title attribute.**
  Truncation with no way to read the full value; contrast the date, which does
  provide `title`.
- `NewProjectTile` (:106-122) hand-rolls a 470-character class string for a
  dashed ghost tile. Legitimate one-off (no dashed-tile primitive exists), but it
  is a *third* create affordance alongside the header CTA and the empty-state
  CTA, and Design Principle #2 is "One thing at a time. Each page has a single
  primary action." **P2**
- `projectStaggerDelay` (:14-16) caps at index 6 — good. But keyed remounts on
  filter change re-trigger the staggered entrance across the whole grid, so
  changing a filter animates the entire canvas in. **P2**

## `components/projects/project-row.tsx`

Covered above under list quality. Additional:

- **P2 — the response metric is hidden on mobile but the pending chip is not.**
  `:76` is `"hidden items-center gap-1.5 … sm:flex"` while the pending chip
  (:71) has no responsive gate. On a narrow viewport a row shows either a
  pending chip or nothing.
- **P2 — a metric rendered without its unit.** `:80` renders bare `{responses}`
  after a chat icon; the word "responses" exists only in `aria-label` (:77).
  Sighted users see "💬 200" and must infer the unit from an icon.

## `components/projects/project-skeletons.tsx`

Clean. Shapes mirror the real row/card so loading does not reflow
(`ProjectRowSkeleton` `:9-17` vs `ItemRow padding="default"` = `px-6 py-4`;
`ProjectCardSkeleton` `:22-33` mirrors the card's `px-5 pt-5 pb-4` + `border-t`
footer). Uses `animate-shimmer`, which is the sanctioned waiting vocabulary
(Signature Kit #2). One nit: the skeleton draws its own
`"rounded-xl border border-border bg-card"` (:22) rather than reusing
`ItemCard`'s shell, so the two can drift. **P2**

## `components/projects/project-empty-states.tsx`

The single worst-composed file in the slice.

- **P1 — reintroduces the deleted centred page rail.** `:24` is
  `"mx-auto grid w-full max-w-6xl …"`. `.claude/rules/design-system.md`: "The app
  is full-bleed app-wide. Do not reintroduce a contained/centered `max-w-*` page
  rail." `max-w-6xl` is the literal value that was deleted from
  `PageHeader`/`PageBody`/`PageToolbar`. So the first-run screen — the first
  thing a new user ever sees — is the one surface in the app that is not
  full-bleed.
- **P1 — hand-rolls two buttons, and the app's most important CTA loses the
  signature material.** `:41-45` is a `<Link>` with a hand-written
  `"…rounded-lg bg-primary px-4 text-[13px]…"`; `:58` is an `<a>` with another
  hand-written button class. `Button` variant `default` is
  `"ink-raised bg-primary text-primary-foreground…"` (`ui/button.tsx:12-13`).
  The hand-rolled CTA omits `ink-raised`, so "Create first project" is the one
  filled primary CTA in the product that does not carry the ink-press material
  Signature Kit #4 requires.
- **P1 — hand-rolls the empty state itself, against Design Principle #6.** The
  file imports nothing from `components/shared`. `EmptyState` (with `icon`,
  `title`, `description`, `action`, `preview`, `bordered` props) and `GhostList`
  exist for exactly this (`shared/empty-state.tsx:41-147`). `.impeccable.md` #6:
  "never hand-roll a page's own header, tabs, or empty state."
- **P1 — `EmptySearch` (:97-126) is a prop-for-prop reimplementation of
  `NoResults`** (`shared/empty-state.tsx:162-184`): title, description, action.
  Two components, same three slots, different typography (`text-[15px]
  font-semibold` vs `text-sm font-medium`).
- **P1 — `EmptySearch` copy is wrong on two counts.** ":111-112" says "projects
  match on name and description" — the filter also matches `tags`
  (`use-projects.ts:39`). And the state is reachable while a *type filter* is
  the actual cause of zero results, in which case the copy blames the search and
  the only recovery offered — "Clear search" (:114-123) — does not clear the
  type filter, so the screen does not change.
- **P1 — `PopulatedPreview` (:161-235) is a second ghost-preview engine.**
  `GhostList` (`shared/empty-state.tsx:41-86`) already renders faint placeholder
  rows with varied widths, `aria-hidden`, and pointer-events off.
  `PopulatedPreview` instead stacks three absolutely-positioned `SkeletonCard`s
  (`"rounded-xl border border-border bg-card p-5"`, :199) with hard-coded
  `hsl()`/`oklch()` literals for the avatar and star placeholders (:206, :228)
  — raw colour values outside the token system, in a file whose entire job is to
  look native.
- **P2 — missing the dot-paper texture the canon assigns to empty states.**
  Signature Kit #1 puts `bg-dot-grid` "where artifacts sit or will sit (studio
  stages, preview canvases, empty states)". `bg-dot-grid` appears in exactly one
  component app-wide (`ui/empty.tsx:10`) — which this file does not use. The
  slice's one empty state, which literally contains a preview canvas, has no
  texture.
- **P2 — `StageEntry` (:140) uses `border-l` as decoration** on mobile
  (`"border-l border-border/60 pl-4 sm:border-l-0 sm:border-t"`). Not a banned
  side-stripe (the census verified no `border-l-[2-9]` anywhere) but it is a
  decorative rule whose only job is ornament.
- **P2 — unverified external link.** `:55` hard-codes `https://docs.semblia.com`
  with the label "How Semblia works". If that host is not live this is
  placeholder copy shipped to first-run users.

## `components/projects/project-avatar.tsx`

Well-built and the correct kind of primitive: three-tier resolution (uploaded
logo → derived favicon → brand initials), `object-contain` per the logo rule
(:58), `onError` fallback to initials (:59).

- **P2 — the fallback is silent, so "unknown" and "no logo" look identical.** A
  favicon that 404s and a project that never had a logo both render initials
  (:66-84). On the create page this actively contradicts the copy (see below).
- **P2 — `projectInitials` (`lib/format.ts:4-11`) will throw on a name with
  consecutive spaces.** `"Acme  Corp".split(" ")` yields an empty-string element
  and `w[0]` is `undefined`, so `.join("")` produces `"AC"` silently — not a
  crash, but the helper has no guard and `name` is unvalidated free text.
- **P2 / privacy — every project's customer domain is sent to Google.**
  `faviconForUrl` (`lib/favicon.ts:29-36`) builds
  `https://www.google.com/s2/favicons?domain=<host>`, so rendering the projects
  list discloses the user's client domains to a third party on every paint. A
  documented, deliberate trade-off in the file header, but worth a conscious
  re-decision in a rebuild.

## `components/projects/remember-last-project.tsx`

**P1 — the feature is write-only. It has no reader.** The component writes a
`last_project` cookie (:18) and PUTs `/me/last-used-project` (:29) on every
project page mount. Verified by grep: `last_project` appears only in this file
and its test; `fetchLastUsedProject` is defined at `lib/semblia-api.ts:237-239`
and **called nowhere**. The doc comment claims it is "Read server-side in
`app/page.tsx`" (:11) — that file does not exist (the home route is
`app/(app)/page.tsx`, which is a bare `<ProjectsClient />` with no cookie read).
So the app pays a network write per project navigation, stores a year-long
cookie, and never uses either. Either the "land me back where I was" behaviour
was lost in a refactor, or the whole component is dead weight; the doc comment
makes it look intentional.

## `components/projects/project-page-shell.tsx`

**P2 — dead code with a deprecated prop, sitting in the folder as a trap.** Zero
consumers (verified by grep — the only other mentions are historical notes in
`shared/page-body.tsx:7` and `shared/page-header.tsx:8` describing the pattern
it *replaced*). It still exposes
`/** @deprecated Page subheadings were removed… */ description?` (:6) and
silently drops that prop (:12-16). A contributor who finds it will reasonably
assume it is how project pages are built.

---

## `app/(app)/new/page.tsx` + `components/projects/project-create-client.tsx`

### Composition

- **P1 — the only project-creation form in the product is built from the
  sign-in shell's components.** `:14-15` import `AuthField`
  (`components/auth/auth-field.tsx`) and `AuthPrimaryBtn`
  (`components/auth/auth-primary-btn.tsx`). `AuthField` hand-rolls a raw
  `<input>` with a local `authInputCls` (auth-field.tsx:4-11) rather than
  `ui/input` + `ui/label`; `AuthPrimaryBtn` hand-rolls a raw `<button>` with
  `auth-btn` and no `ink-raised` (auth-primary-btn.tsx:26-36). The in-app
  dashboard has no shared form-field primitive, so the fix was to reach into a
  different product area's shell.
- **P1 — consequence: `/new` has a different focus ring from every other input
  in the app.** `authInputCls` uses `"focus:ring-2 focus:ring-brand/15
  focus:border-brand/40"` (auth-field.tsx:7). Signature Kit #3 mandates
  `focus-visible:border-ring` + `ring-3 ring-ring/30` as "one recognizable focus
  moment product-wide". This surface is the exception, and it uses `focus:`
  rather than `focus-visible:`, so the ring fires on mouse click too.
- **P2 — `AuthField` has an `error` prop that this form never passes**
  (:92-109). Field-level validation is available and unused; every failure —
  including the ones that are about a specific field — goes to a toast.
- Composes `PageHeader` + `PageBody` correctly (:65-76).

### Surface nesting

Flat: `PageBody` → `aside` → three sibling `"rounded-lg border border-border
bg-card"` panels (:170, :209), each containing a `"rounded-lg bg-muted"` icon
tile (:211). Depth 2 (card → tile), acceptable. The `"flex size-11 … rounded-xl
bg-brand/10"` icon block at :79-81 is a decorative brand-tinted square with no
information content.

### Data states

| State | Handled? | Evidence |
| --- | --- | --- |
| form submitting | yes | `AuthPrimaryBtn loading` → spinner + "Creating project..." (:110-114). No `aria-busy`. **P2** |
| submit error | toast only | `:54-60`, raw API message |
| **plan-limit pre-check** | **NO** | P0-4 above |
| **slug-collision pre-check** | **NO** | P0-5 below |
| site-metadata loading | yes | `metaLoading` → "Reading your site…" (:184) |
| **site-metadata failed** | **NO — indistinguishable from success** | P1 below |
| **field-level validation** | **NO** | browser-native only |

**P0-5 — the form can fail on a field the user cannot see or edit, with API
jargon and no stated remedy.** `:45` derives the slug client-side
(`slugifyProjectName(name)`) and sends it. The API rejects a duplicate with
`ConflictException("Project slug already exists")`
(`projects.service.ts:383-384`), which `:54-59` surfaces verbatim. The user never
typed a slug — they typed a *name* — so the error names a concept absent from the
UI. Two projects named "Acme" and "acme" both slugify to `acme`
(`project-utils.ts:3-10`), so this is reachable by ordinary naming. Nothing in
the message says "pick a different name", and there is no slug field to edit.

**P1 — "First project creates" is shown on every project creation.** `:133-135`:
`<p className="text-[10px] font-semibold uppercase tracking-[0.14em]…">First
project creates</p>`. The aside renders unconditionally, so a user creating
their fifth project is told this is their first. It is also a mono-uppercase
eyebrow used as ornament — the pattern `design-system.md` lists under "Banned
decoration".

**P1 — the collection URL is presented as fact but is a client-side guess.**
`:136-144` shows `getDefaultProjectCollectionUrl(slugifyProjectName(name))`
under the heading "Hosted collection URL". The server owns the slug and can
reject or differ from it (P0-5), so this URL can be wrong. When the name is
empty it shows the literal fake `https://project.testimonials.semblia.com`
(:142) styled identically to the real value — placeholder text dressed as data.
The value is also `truncate`d (:216) with no `title`, so a long URL cannot be
read at all.

**P1 — "We'll use this as your icon" is asserted even when there is no icon.**
`DetectedSite:183-185` renders that copy whenever loading finishes.
`useSiteMetadata` collapses every failure into `setMetadata(null)`
(`use-site-metadata.ts:44-46`), so a blocked, unreachable, or icon-less site is
indistinguishable from a resolved one. `ProjectAvatar` then falls back to
initials. The UI promises a favicon the product may never show.

**P1 — the form previews a value it will then refuse to submit.**
`hostnameFromUrl` accepts bare `"example.com"` (`lib/favicon.ts:17-23`), so
typing that renders the full `DetectedSite` panel with favicon and brand swatch.
But the input is `type="url"` (:106), so the browser blocks submit with a native
"Please enter a URL" tooltip on the same value the page just validated visually.

**P2 — `DetectedSite` fires on every keystroke-debounce of a partial host.**
`useSiteMetadata` keys on `host`, and `hostnameFromUrl("https://e")` returns
`"e"`, so the panel appears (and a `/api/site-metadata` request is issued) for
one-character hosts mid-typing.

---

## `app/(app)/[slug]/page.tsx` — the "project overview"

```
export default async function ProjectHubPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  redirect(formsPath(slug));   // :10
}
```

**P1 — there is no project overview surface. The route is a redirect stub.** Not
a placeholder that looks unfinished — a route with no UI at all. Consequences:

1. **Every project entry costs a server round-trip with no loading affordance.**
   `projectPath(slug)` is the href on every card (`project-card.tsx:35`), every
   row (`project-row.tsx:30`), and the post-create redirect
   (`project-create-client.tsx:53`). Each one hits `/[slug]`, which resolves
   `[slug]/layout.tsx` (an awaited API fetch, :20) and *then* redirects to
   `/[slug]/forms`, which resolves its own layout and data. There is **no
   `loading.tsx` anywhere under `app/(app)`** (verified: only
   `app/not-found.tsx`, `app/%5Fwall-host/not-found.tsx`,
   `app/wall/[wallSlug]/not-found.tsx` exist). So opening a project is a stall
   with no skeleton, no progress, no streamed shell. **P1**
2. The user's project home is the Forms list — a configuration surface — so
   there is nowhere in the product that answers "how is this project doing?"
   without navigating to Analytics. The comment at :8-9 states this is
   deliberate ("Forms is the start of the collect → review → display funnel"),
   which is a defensible product call, but it leaves the aggregate-metrics
   pressure on the *global* view, which is exactly where the canon forbids it
   (Headline #2).
3. No `metadata` export, unlike every sibling page, so the browser tab shows the
   inherited title during the redirect. **P2**

On the brief's question — does the overview violate "the global view is just a
project selector, never a dashboard of aggregated vanity metrics"? The overview
cannot, because it is empty. The violation is real but located one level up, in
`projects-client.tsx:269-281` / `use-projects.ts:56-60`.

## `app/(app)/[slug]/layout.tsx`

Correct and minimal: awaits `params` per the Next.js 16 rule (:19), guards the
project (:20-22), adds no chrome (documented at :10-14).

**P1 — permission-denied and auth-expired are misrouted to a "try again" error.**
`serverFetchProjectBySlug` converts *only* 404 to `null`
(`lib/semblia-api-server.ts:36-40) and rethrows everything else. So a 403 (a
member removed from a project, a revoked invite, a wrong-org slug) and a 401
propagate to `[slug]/error.tsx` → `RouteError`, whose copy is "We hit an
unexpected error while loading this view. Your data is safe — try again, and if
it keeps happening, let us know." (`route-error.tsx:50`) with a **"Try again"**
button. Retrying a 403 can never succeed. This is precisely the failure the
brief calls out: "error copy that tells the user to retry something that can
never succeed." There is no permission-denied surface anywhere in the slice.

## `app/(app)/[slug]/error.tsx` and `app/(app)/error.tsx`

Both correctly delegate to the shared `RouteError` and satisfy the repo rule
that every route section ships an `error.tsx`. `[slug]/error.tsx` sensibly
overrides `homeLabel` to "Back to projects" (:23).

- **P1 (in `RouteError`, surfaced by these boundaries)** — one generic message
  is used for every failure class, so 403/401/429/500 are indistinguishable and
  all get "Try again". See above.
- **P2** — `app/(app)/[slug]` has an `error.tsx` but no `not-found.tsx`, so the
  `notFound()` at `layout.tsx:22` falls through to the root `app/not-found.tsx`,
  which renders outside the app shell. A user who mistypes a project slug is
  ejected from the sidebar/nav entirely rather than seeing "no such project" in
  place.

---

## Top defects, ranked

| # | Sev | Defect | Location |
| --- | --- | --- | --- |
| 1 | **P0** | A failed transfers fetch silently hides a pending ownership request — the panel does not render at all, and the request can expire unseen | `projects-client.tsx:204`, `:71` |
| 2 | **P0** | A type filter matching nothing renders a completely blank canvas: filtered-empty is gated on `search` only, and the ghost tile is suppressed | `projects-client.tsx:352`, `:229`, `:360-366` |
| 3 | **P0** | The workspace aggregate is silently wrong past 100 projects: `pageSize: 100`, `total`/`hasNext` discarded, no pagination, no truncation notice | `use-projects.ts:13-21`, `:56-60`; header `projects-client.tsx:269-281` |
| 4 | **P0** | Free-plan users are walked through the entire create form into `ForbiddenException("Project limit reached for this plan")` shown raw in a toast, with no quota hint, no plan name, no upgrade path | `project-create-client.tsx:54-60`; `projects.service.ts:303-307`; no plan read anywhere in `components/projects/` |
| 5 | **P0** | Create can fail on a slug the user never entered and cannot edit: client-derived slug + `ConflictException("Project slug already exists")` surfaced verbatim | `project-create-client.tsx:45`, `:54-59`; `projects.service.ts:383-384` |
| 6 | **P1** | 403/401 on a project are routed to a "Try again" error — retrying can never succeed; no permission-denied surface exists | `semblia-api-server.ts:36-40` → `[slug]/error.tsx` → `route-error.tsx:50` |
| 7 | **P1** | There is no project overview: `[slug]/page.tsx` is a redirect stub, so every project entry pays a server round-trip with **no `loading.tsx` anywhere** under `app/(app)` | `[slug]/page.tsx:10`; verified absence of `loading.tsx` |
| 8 | **P1** | Card and row disagree about what a project *is* — the row shows pending XOR responses, so toggling the view changes the information, not the layout; three row anatomies in one list | `project-row.tsx:69-83` vs `project-card.tsx:43-55` |
| 9 | **P1** | The same "N pending" status renders three ways (card pill 10px, row `rounded-md` 12px, house `Badge variant="warning"` unused) — Principle #4 violation | `project-card.tsx:69-71`, `project-row.tsx:71`, `ui/badge.tsx:24-25` |
| 10 | **P1** | `aria-label` on the item link erases the row's entire content for screen readers — pending and response counts are never announced | `project-card.tsx:36`, `project-row.tsx:31`, `item-shell.tsx:111-120` |
| 11 | **P1** | First-run screen reintroduces the deleted `max-w-6xl` centred rail and hand-rolls two buttons, the primary one losing `ink-raised` | `project-empty-states.tsx:24`, `:41-45`, `:58` |
| 12 | **P1** | The whole slice hand-rolls empty/filtered-empty/error states while `EmptyState`, `NoResults`, `GhostList`, and `ui/empty` sit unused; `EmptySearch` ≡ `NoResults`, `PopulatedPreview` ≡ `GhostList`, `LoadFailed` ≡ `RouteError` | `project-empty-states.tsx:97-126`, `:161-235`; `projects-client.tsx:388-413` |
| 13 | **P1** | The only project-creation form is built from the **auth shell's** field and button components, giving `/new` a non-canonical focus ring and no `ink-raised` | `project-create-client.tsx:14-15`; `auth-field.tsx:7`; `auth-primary-btn.tsx:26-36` |
| 14 | **P1** | Filter state can be trapped: dropping below 6 projects unmounts the toolbar while `search`/`typeFilter` keep filtering, with no control to clear | `projects-client.tsx:222` + `use-projects.ts:28-43` |
| 15 | **P1** | Three copy defects on `/new`: "First project creates" shown on every creation; the hosted collection URL presented as fact (and a fake host when blank); "We'll use this as your icon" asserted even when metadata failed | `project-create-client.tsx:133-135`, `:136-144`, `:183-185` |
| 16 | **P1** | `EmptySearch` copy omits `tags` from the match set and blames the search when a type filter is the real cause; "Clear search" does not clear the filter | `project-empty-states.tsx:111-123` vs `use-projects.ts:39` |
| 17 | **P1** | An expired ownership transfer still offers "Accept ownership"; the dialog exposes no pending state beyond disabling both buttons | `projects-client.tsx:58`, `:95-104`, `:157`, `:166` |
| 18 | **P1** | No row-level actions anywhere on the app's root surface (no rename/archive/delete/copy-link); `ItemActionRow` and `ItemShell.bulkSelected` exist and are unused | `project-card.tsx`, `project-row.tsx` |
| 19 | **P1** | A failed *background* refresh is completely invisible — cached data shown with no stale indicator, deliberately per the comment but only half-implemented | `projects-client.tsx:224-226`; `RefreshingDataBadge` never fires on failure |
| 20 | **P1** | `FilterPills` default `pill` variant renders a filled pill, contradicting Signature Kit #6 which names FilterPills as an underline surface | `filter-pills.tsx:134`; used at `projects-client.tsx:301` |
| 21 | **P1** | `remember-last-project` is write-only: cookie + PUT on every project mount, `fetchLastUsedProject` never called, doc comment cites a nonexistent `app/page.tsx` | `remember-last-project.tsx:11`, `:18`, `:29`; `lib/semblia-api.ts:237` |
| 22 | P2 | `ProjectPageShell` is dead code with a `@deprecated` prop, positioned to be mistaken for the current pattern | `project-page-shell.tsx:6`, zero consumers |
| 23 | P2 | Truncation without recourse: card description `line-clamp-2` and collection URL `truncate`, both without `title` | `project-card.tsx:90`, `project-create-client.tsx:216` |
| 24 | P2 | Three competing create affordances on one page (header CTA, ghost tile, empty-state CTA) against Principle #2 | `projects-client.tsx:289`, `:365`; `project-empty-states.tsx:39` |
| 25 | P2 | `bg-dot-grid` absent from the slice's empty state despite Signature Kit #1 naming empty states as its home; raw `hsl()`/`oklch()` literals used instead of tokens | `project-empty-states.tsx:206`, `:228` |
| 26 | P2 | `[slug]` has `error.tsx` but no `not-found.tsx`, so a mistyped slug ejects the user out of the app shell | `app/(app)/[slug]/`, `app/not-found.tsx` |
| 27 | P2 | Neither view uses list semantics; no keyboard navigation on the app's root surface despite the Linear "keyboard-first" reference | `projects-client.tsx:354-366` |
| 28 | P2 | `_count.widgets` / `_count.apiKeys` available and ignored, so a widget-rich project with no responses reads as empty | `project-card.tsx:30-31` vs `v2.ts:488-493` |
| 29 | P2 | Every project's customer domain is disclosed to Google on every paint of the list | `lib/favicon.ts:29-36` |
| 30 | P2 | Assorted: frozen expiry clock; "expires soon" for an unparseable date; row metric hidden on mobile while the chip is not; response count rendered without its unit; hand-rolled header skeleton; magic `w-[72px]` and magic `>= 6` | `projects-client.tsx:54-62`, `:263-266`, `:222`; `project-row.tsx:76`, `:80`, `:86` |

Test coverage for the slice is three assertions total (`tests/projects/*`:
summary line + ghost tile, first-load failure retry, first-run CTA). None of
P0-1 through P0-5 is covered.

---

## Duplication and reuse opportunities — the primitives that should exist

### 1. `<DataSurface>` — one component that owns the whole state matrix

The single highest-leverage primitive, and the one the census already
identified as structurally necessary. Every surface in this slice hand-writes a
`loading ? … : error ? … : empty ? … :` ladder and each one drops a branch:
`projects-client.tsx:332-367` drops filtered-empty-by-filter and
stale-after-failed-refresh; the transfers block (`:322-329`) drops loading and
error entirely.

It must make **rendering an empty state while `isError` is true
unrepresentable**, and must distinguish, as separate required slots:
`loading` / `empty` / `filteredEmpty` / `error` / `forbidden` / `notFound` /
`stale`, plus a `truncated` affordance driven by the DTO's `hasNext`. Feed it
the query result and the active filter descriptor so `filteredEmpty` cannot be
mis-gated on `search` alone (P0-2) and `truncated` cannot be forgotten (P0-3).

Replaces: `projects-client.tsx:332-367` ladder, `LoadFailed` (:388-413),
`EmptySearch`, `EmptyProjects`'s outer shell, and the identical ladders the
census found in `responses-list`, `form-list`, `widget-list`,
`analytics-dashboard`.

### 2. `<StatusChip>` — the one pending/status token

Three renderings of "N pending" exist today for the same state
(`project-card.tsx:69`, `project-row.tsx:71`, `ui/badge.tsx:24`). Fold them into
one chip keyed by semantic status, carrying shape **and** colour per Principle
#4 (today amber-only, and `--warning` is literally `--brand`
(`globals.css:144`), so the pending signal is the same hue as the primary CTA).
Delete both hand-rolled chips.

### 3. `<MetricStrip>` — a fixed metric contract per item, shared by card and row

The card/row information divergence (defect 8) exists because each view picks
its own facts. One declarative metric set — responses, pending, widgets, last
activity — rendered by both `ItemCard`'s footer slot and `ItemRow`'s metrics
slot, with an explicit `0` presentation distinct from absent, and units always
visible rather than icon-only. Kills the XOR, the three row anatomies, and the
magic `w-[72px]`.

### 4. `<Field>` / `<FormActions>` — an in-app form primitive

`project-create-client.tsx` reaches into `components/auth/*` because the
dashboard has no field primitive. Build one on `ui/input` + `ui/label` +
`ui/button` with the canonical amber `focus-visible` ring, a wired `error` slot,
and `aria-busy` on submit. Then `AuthField`/`AuthPrimaryBtn` go back to being
auth-only, and `/new` stops being the app's focus-ring exception.

### 5. Collapse the two empty-state systems into one

`components/shared/empty-state.tsx` (`EmptyState`/`NoResults`/`GhostList`, 10
consumers) and `components/ui/empty.tsx` (shadcn `Empty*`, 12 consumers, and the
**only** carrier of `bg-dot-grid`) are two parallel systems, and this slice uses
neither — it is a third, fully hand-rolled one. Pick one, move `bg-dot-grid`
into it, and delete `EmptySearch`, `PopulatedPreview`, and `SkeletonCard` from
`project-empty-states.tsx` in the same pass.

### 6. `<PlanGate>` / quota-aware CTAs

Defect 4 exists because no create affordance knows the plan. A primitive that
wraps a creation CTA, reads usage once, and renders either the enabled action or
an at-limit state with the real limit and a billing link — applied to the header
CTA (`projects-client.tsx:289`), the ghost tile (`:365`), and the `/new` submit.
The same guard exists API-side for forms, so this generalises beyond projects.

### 7. Server-owned identifiers, never client-derived

`slugifyProjectName` in the client (defect 5) and the collection-URL preview
built from it (defect 15) both guess at server state. Either have the API return
a reserved/suggested slug before submit, or stop presenting the derived URL as
fact. This is the `pr-quality-gates.md` "preserve server-issued slugs and IDs
instead of regenerating them in the client" rule, violated in the product's
primary create flow.

### 8. A permission-denied route state

`RouteError` needs a variant (or a sibling `RouteForbidden`) that omits "Try
again" and explains loss of access, plus `serverFetchProjectBySlug` mapping 403
distinctly from 404 (`semblia-api-server.ts:36-40`). And `[slug]` needs its own
`not-found.tsx` so a bad slug stays inside the app shell.

### 9. Deletions

- `components/projects/project-page-shell.tsx` — zero consumers.
- `components/projects/remember-last-project.tsx` — write-only; either wire the
  reader or delete the component, the API client function
  (`lib/semblia-api.ts:237-239`), and the cookie.
