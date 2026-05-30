# Decision — Analytics Dashboard

## Gate readout

Rework **allowed and warranted**:
- Q9 NO (broken chart palette — BLOCKING visible defect)
- Q10 NO (perceived-quality harm)
- Q4 NO (non-instructive empty state)
- Q8 NO (off-brand delta colours)

## In scope

| # | Item | Ties to | Severity |
|---|------|---------|----------|
| 1 | Fix chart series colours: `hsl(var(--brand))` → `var(--chart-1)` (views) / `var(--chart-2)` (submissions); fix gradient `stopColor` accordingly | Q9 | BLOCKING |
| 2 | Fix Recharts tooltip chrome: `hsl(var(--border))` → `var(--border)`, add `background: var(--card)`, `color: var(--foreground)` | Q9 | BLOCKING |
| 3 | Trend deltas `text-emerald-600`/`text-red-600` → `text-success`/`text-destructive` (keep arrow icons) | Q8 | IMPORTANT |
| 4 | Replace bare empty state with `ProjectEmptyState` — eyebrow + orienting heading + body + CTA to the collect form (`/projects/[slug]/collect`) | Q4 | IMPORTANT |
| 5 | Re-cast error state in the same editorial register, preserving the `refetch()` retry affordance | Q4 | MINOR |

## Out of scope

- Metric/chart layout and grid (hierarchy is correct).
- Migrating `MetricCard`/`ChartCard` to `ItemCard` — the `border-border/60 bg-card rounded-lg` tile style is consistent with sibling stat tiles; promoting to a shared primitive is a separate slice.
- The page-level `AnalyticsViewSkeleton` (it is consistent and correct).

## Anti-goals

No new tokens, no new shared primitives, no palette desaturation, no layout redesign.

## Acceptance criteria

- All chart strokes/fills and tooltip chrome render with brand/theme colours in light and dark.
- No raw Tailwind palette colours remain in the file.
- Empty and error states read as one family with the rest of Tresta.
- `tsc --noEmit`, `eslint`, and `pnpm build --filter web_v2` pass.
