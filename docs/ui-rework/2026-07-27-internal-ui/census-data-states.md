# Data-state census — mechanical baseline (2026-07-27)

Established by the orchestrator directly, before the per-surface audits, so the
final verification has an objective ledger to close out against. Method: grep
census over every client component in `apps/web_v2` that owns a react-query
call, then hand-verification of each surface that reported zero error handling.

## Flagship finding — P0

The four surfaces a user actually lives in have **no query-error state at all**.
Every one of them falls through to its "you have nothing yet" empty state when
the API call fails, which actively lies to the user: a network blip, an expired
token, or a 500 renders as "No responses yet".

| Surface | Queries | Query-error handling | What a failed fetch renders today |
| --- | --- | --- | --- |
| `components/responses/responses-list.tsx` | 2 | **none** (the 3 `onError` hits at :102/:115/:122 are mutation toasts, not the query) | `EmptyState` "No responses yet" (`:158` → `:211`) |
| `components/analytics/analytics-dashboard.tsx` | 4 | **none** | panels render as zeroed/empty |
| `components/forms/form-list.tsx` | 12 | **none** | `forms-empty-state` |
| `components/widgets/widget-list.tsx` | 10 | **none** | `widget-empty-state` |

Root cause is structural, not local: there is no primitive that owns the
state matrix, so every surface hand-writes its own `loading ? … : empty ? … :`
ladder and each one independently forgets a branch. The fix is a primitive that
makes rendering an empty state while `isError` is true unrepresentable — not
four local patches.

## Secondary state gaps

- `components/nav/notification-bell.tsx`, `components/nav/project-switcher.tsx`
  — no error handling. Lower stakes (nav chrome) but the bell silently shows
  zero unread when the fetch fails.
- `components/responses/responses-list.tsx` — reads `data.items` only and drops
  `total` / `hasNext` / `totalPages`, so a project past `pageSize: 30` (`:81`)
  silently truncates with no pagination affordance and no indication of it.
- `components/responses/responses-list.tsx:126` — `showToolbar = !loading`
  removes the filter pills during every load, so the control that scopes the
  query disappears exactly while the query runs, and returns with a layout
  shift.

## Surfaces with error handling present (spot-check baseline)

`webhooks-client.tsx` (4/4), `projects-client.tsx` (2/2), `billing/page.tsx`,
`plan-switcher.tsx`, `notifications-client.tsx`, `widget-studio-shell.tsx`,
`widget-preview-client.tsx`, `form-preview-client.tsx`,
`billing-address-form.tsx`. These are the reference points for what "handled"
already looks like in-repo; they are not necessarily handled *well* (see the
per-surface audits).

## Structural counts

- **152** hand-rolled bordered/rounded surfaces
  (`rounded-{lg,xl,2xl}` + `border`) across `components/` and `app/`. This is
  the real "stock reskin" symptom — not literal `<Card>` abuse. Stock shadcn
  `Card*` scaffolding appears in only 3 non-showcase files
  (`plan-switcher.tsx`, `ui/card.tsx`, `ui/hover-card.tsx`).
  Worst offenders: `widget-share-drawer` (6), `members-client` (5),
  `key-detail-client` (5), `analytics-dashboard` (5), `projects-client` (4),
  `integrations-client` (4).
- **4** files import the `ui/table` primitive; the densest tabular surface
  (`analytics/content-performance-table.tsx`) is not one of them — it is a stack
  of flex `<Link>` rows with no shared column widths, so nothing aligns row to
  row despite being titled a table.
- Clean on two impeccable absolute bans, verified by grep: **no** side-stripe
  borders (`border-l-[2-9]`, `border-l-4`, …) and **no** gradient text
  (`bg-clip-text`) anywhere in the app.

## Verification contract for close-out

The rework is not done until, for every surface listed in the audits:

1. `isError` renders a real, actionable error state — never an empty state.
2. First-run empty and filtered-empty are distinct surfaces.
3. Paginated lists either render a pagination affordance or prove the API
   returns everything.
4. Filter/search controls stay mounted and usable during loading.
5. A legitimate `0` is visually distinguishable from unknown/absent data.
