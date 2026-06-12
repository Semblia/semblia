# External principles for `/projects` (second pass — page structure)

Date: 2026-06-12.
Method: the 2026-05-23 `principles.md` (Geist empty-state + Linear method extracts) remains
valid and is inherited, not re-fetched. This pass adds the *page-structure* principles the
first pass never addressed, sourced from documented patterns in Vercel's dashboard, Linear's
"purpose-built" method, and Railway/Notion's create-tile convention.

## Inherited from 2026-05-23 (still binding)

- **P1** Empty state orients before it asserts identity (Geist). — kept, surface unchanged.
- **P2** Toolbars are earned by content (`≥ 6` threshold). — kept.
- **P3** One row, one identifying signal. — kept for list view.
- **P4** No positioning copy where labels do the work. — kept.

## New principles for this pass

### P5. A workspace home is a *place*, not a query result

> Vercel, Railway, Notion: the dashboard/home content sits in a centered, bounded container.
> Full-bleed edge-to-edge lists are for master-detail panes that own their pane — never for a
> page with no sidebar.

**Semblia delta:** `/projects` is the only surface in the app with neither sidebar nor
container. Rows stretch 1264px+, name flush-left and date flush-right with ~1000px of nothing
between. Adaptation: a centered `max-w-6xl` column (matches `EmptyProjects`' internal grid
width) holds title, summary, toolbar, and content. The page gets a center of gravity.

### P6. Default to the densest *honest* presentation for the regime

> Vercel's dashboard defaults to project cards because at typical project counts (1–10) cards
> carry more orienting signal per item than rows; their list view is the power-user option.

**Semblia delta:** Semblia's default is `"list"`, and below 6 projects the ViewToggle is hidden,
so the richer card view is unreachable exactly when it matters most. Adaptation: default view
becomes `"grid"`; the persisted user choice still wins; the toggle still appears at ≥ 6.
List view becomes the bounded-panel power view, not the landing presentation.

### P7. Ambient totals before per-item detail

> Dashboards answer "anything need me?" before "what is each thing?" (Linear's inbox count,
> Vercel's status dots). One quiet line of workspace totals beats N silent rows.

**Semblia delta:** `useProjects` already computes `totalResponses` / `totalPending` — render
them as a one-line summary under the page title ("1 project · 12 responses · 3 pending
review"), pending in `--warning`. No new queries, no charts, no cognitive load.

### P8. The create affordance lives in the canvas, not only the chrome

> Vercel ("Add New…"), Notion (new-page tile), Figma (new-file tile): a dashed ghost tile at
> the end of the grid keeps creation discoverable where the eye already is, and gives a
> 1–2 item grid compositional balance instead of a void.

**Semblia delta:** add a dashed "New project" tile as the last grid cell when no search/filter
is active. It is a real affordance (same target as the header CTA), not decor. Hidden in list
view (power regime keeps chrome CTA only).

### P9. Every reachable state is a designed state

> Geist: error and loading states are first-class. A fetch failure must say so and offer
> retry; a background refresh must be visible.

**Semblia delta:** add the missing error branch (named failure + "Try again" wired to
`refetch`); move `RefreshingDataBadge` out of the gated toolbar so refreshes are visible at
all counts.

## What we are **not** taking

- **Vercel's dark/grayscale aesthetic** — Semblia stays warm slate + amber-sand.
- **Dashboard-ification** — no charts, no activity feeds, no usage meters on this surface.
  One summary line is the ceiling.
- **Marketing fill** — the void is fixed by structure (container, grid, ghost tile), not by
  adding promotional content.

## Confidence

- P5 high — the live screenshots make the failure undeniable; bounded containers are the
  documented norm for sidebar-less dashboards.
- P6 high — directly fixes a regression the 2026-05-23 toolbar gating introduced.
- P7 high — data already computed; renders one line.
- P8 medium-high — widely-converged pattern; risk is redundancy with the header CTA, accepted
  deliberately (header CTA serves filtered/list/power states, tile serves the landing grid).
- P9 high — closes a recorded follow-up from the prior pass.
