# The canonical system — implementation reference

Companion to `decision.md` (the rules) and `principles.md` (the why). This file
is the **API**: what to compose, and what each primitive is for. Everything here
lives in `apps/web_v2/components/shared` and is exported from
`@/components/shared`.

## Non-negotiables

1. **Never hand-roll a container.** `rounded-* + border` is sanctioned in three
   places only: `SettingsSection` (a settings fieldset), a grid tile in a
   deliberate card-grid where the tile *is* the entity, and a floating layer
   (dialog / popover / sheet / dropdown / toast). Everywhere else, content sits
   on the page background and groups with `Section`.
2. **Never nest two bounded surfaces.** A bordered box inside `SettingsSection`
   or inside a dialog is the defect. Group with, in order: stack gap → section
   heading → hairline divider → one tint step (`bg-muted/25`) → inset.
3. **No `box-shadow` on anything that scrolls with the page.** Elevation is
   hairline border + tint. Shadow belongs to floating layers.
4. **Never write a state ladder by hand.** No `loading ? … : items.length === 0
   ? <Empty/> : <Rows/>` anywhere. Use `useDataState` + `DataState`.
5. **Never offer an action the API will refuse.** Disable it and state the
   reason in place, via `disabledReason`.
6. **Absent ≠ zero.** `orDash()` for missing values, plain `0` for a real zero.
7. **One badge per row.** Colour carries the signal; no icon duplicating it.
8. **Page headers carry identity, state, and actions — never a paragraph.**
   Explanatory prose belongs to `Section.description`.

## Data state

```tsx
const query = useThing(slug, params);
const items = query.data?.items ?? [];
const state = useDataState(query, {
  count: items.length,          // omit for non-collection surfaces
  filtered: filter !== "all" || search.length > 0,
});

<DataState
  state={state}
  resource="responses"          // lowercase noun phrase used in error copy
  skeleton={<ListSkeleton rows={6} leading="circle" trailing />}
  empty={<EmptyState icon={Icon} title="…" description="…" action={…} />}
  filteredEmpty={<NoResults title={`Nothing matches “${search}”`} … />}
  align="center"                // "start" for an empty inside a panel
  compactError                  // for an error replacing one panel in a grid
>
  {rows}
</DataState>
```

`useDataState` derives, **error first**:
`loading-initial` · `empty-first-run` · `empty-filtered` · `error` ·
`forbidden` (401/403) · `not-found` (404) · `ready`.

- An empty state while `isError` is unrepresentable. That is the point.
- A failure *over already-loaded rows* stays `ready` with `hasRefreshError`,
  and `DataState` renders an inline "Couldn't refresh" notice above the rows
  rather than throwing the user's data away.
- `forbidden` and `not-found` never offer a retry — retrying a permanent
  failure is the P4 defect.
- `state.isRefreshing` drives `<RefreshingDataBadge show={…} />`.

`ErrorState` can also be used directly for a panel that owns its own failure:
`<ErrorState resource="your webhooks" onRetry={…} compact align="start" />`.

## Lists

```tsx
<DataList
  aria-label="Responses"
  pagination={{ page, pageSize, total, totalPages, onPageChange, busy }}
>
  {items.map((x) => <SomeRow key={x.id} … />)}
</DataList>
```

- Pass `pagination` straight from the API's paginated envelope. A surface that
  reads only `data.items` and drops `total`/`totalPages` silently truncates.
- Rows are `ItemRow` (existing primitive). **Never** wrap a row in its own card.
- `ListSkeleton` for cold load; `GridSkeleton` for card-grid views. Match the
  real row's `leading` / `trailing` / `density` so the swap causes no shift.

Keyboard triage — only for surfaces whose job is repetitive review:

```tsx
const selection = useListSelection({ ids, onActivate, enabled });
<SelectionCheckbox checked={…} onChange={…} label={`Select ${name}`} />
<BulkActionBar count={selection.count} scopeLabel="pending responses"
               scopeTotal={items.length} actions={…} onClear={selection.clear} />
```

## Tables

Use `DataTable` **only** when all three hold: rows share a shape, a column is
comparable down the column, and the task is comparison. Otherwise a list row or
`DefinitionList`.

```tsx
<DataTable
  aria-label="Content performance"
  columns={[
    { id: "name", header: "Widget", cell: (r) => r.name },
    { id: "loads", header: "Loads", numeric: true, sortable: true,
      cell: (r) => fmtCount(r.loads), footer: fmtCount(total) },
  ]}
  rows={rows} getKey={(r) => r.id} sort={sort} onSortChange={setSort}
/>
```

Alignment, `tabular-nums`, units-in-header, and footer aggregates come from the
column definition, never from the cell renderer.

## Grouping and record display

```tsx
<SectionStack>
  <Section title="Delivery" description="…" actions={…} meta="4 endpoints">
    …
  </Section>
  <Section title="Retries" divided>…</Section>
</SectionStack>
```

`Section` draws **no border**. `divided` adds a hairline above it.

`DefinitionList` is the answer to "show this record's fields" — it replaces
both the two-column `<table>` and the grid of tiny bordered cards:

```tsx
<DefinitionList items={[{ term: "Created", value: fmtDateTime(x.createdAt) }]} />
```

## Status

```tsx
<StatusBadge {...reviewStatusMeta(r.reviewStatus)} />
<StatusDot {...importJobMeta(job.status)} since={timeAgo(job.completedAt)} />
```

Registries: `reviewStatusMeta` · `publishStatusMeta` · `moderationDecisionMeta`
· `moderationRunMeta` · `importJobMeta` · `importAvailabilityMeta`. Every one
falls back readably, because the API can grow an enum before the app knows it.

Tones: `positive` · `attention` · `critical` · `progress` · `neutral` · `muted`.
`StatusDot` animates only when `transitional` — a dot that always pulses says
nothing.

## Metrics

```tsx
<MetricRow columns={4}>
  <MetricValue label="Pending review" value={counts.pending}
               href={`${responsesPath(slug)}?status=pending`} />
</MetricRow>
```

- `value={null}` renders an em dash and "Not available right now". A real `0`
  renders `0`. These are different facts.
- `href` is close to mandatory: every number leads to the rows behind it.
- `MetricRow` separates metrics with hairlines, not with a card each.

## Formatting

From `@/lib/format`:

| Helper | Use |
| --- | --- |
| `timeAgo(v)` | the one time formatter. Relative under a week, `Mar 14, 2026` beyond. `—` for absent/unparseable. |
| `fmtDateTime(v)` | precise value, for `title=` on a relative stamp |
| `orDash(v)` | scalar or `—`; preserves a real `0` |
| `fmtCount(n)` | grouped integer, pair with `tabular-nums` |
| `fmtRange(page, size, total)` | `21–40 of 142` |
| `fmtRating(value, scale)` | `4/5`, or `null` when the scale is unknown |
| `humanizeLabel(id)` | `export.csv.requested` → `Export CSV Requested` |

`fmtRelative` is a deprecated alias for `timeAgo`; sweep call sites onto
`timeAgo` when you touch the file.

## Copy rules

- Errors name the resource: `Couldn't load responses`. **Banned:** "Something
  went wrong", "Oops", "Unfortunately", humour, HTTP codes, infra internals.
- `Couldn't` / `Can't` for user-state; `Failed to` for infrastructure.
- One primary CTA per empty state, `Verb + Noun`. **Banned:** "Get Started",
  "Continue", "OK", "Try X".
- Right-column row actions are `Verb + Noun` (`Remove member`, not `Remove`).
  Documented exception: the moderation queue keeps bare `Approve` / `Reject`.
- A genuine "nothing happened" state (0 pending, 0 failures) is reassurance
  **with no CTA** — it is not a setup failure.
- Raw enum values never reach a user's eyes.
