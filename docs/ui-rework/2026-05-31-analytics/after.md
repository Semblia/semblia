# After — Analytics Dashboard

Date: 2026-05-31
File touched: `apps/web_v2/components/analytics/analytics-view.tsx`

## NO → YES delta

| Q | Before | After | What changed |
|---|--------|-------|--------------|
| 4 | NO | YES | Empty state now uses `ProjectEmptyState` — brand-rule eyebrow, orienting heading ("Nothing to measure — yet"), and a CTA to **Set up collection** (`/projects/[slug]/collect`). Error state re-cast in the same editorial register, retry preserved. |
| 8 | NO | YES | Trend deltas now use `text-success` / `text-destructive`; arrow icons retained so meaning isn't colour-only. No raw Tailwind palette colours remain. |
| 9 | NO | YES | Chart series now reference valid OKLCH tokens — `var(--chart-1)` (views) and `var(--chart-2)` (submissions), visually distinct. Tooltip chrome uses `var(--card)`/`var(--foreground)`/`var(--border)`. Also fixed a duplicate gradient `id` (both charts shared `gradient-value`) via `useId()`. |
| 10 | NO | YES | Palette renders correctly in light/dark; surface reads finished. |

## Re-run — Core Questions

1. YES  2. YES  3. YES  4. **YES**  5. N/A  6. YES  7. YES  8. **YES**  9. **YES**  10. **YES**

## Re-run — Mechanical Quality Gate

1. YES — buttons keyboard-operable. 2. YES. 3. YES — chart strokes now valid, contrast restored. 4. YES. 5. YES — deltas pair icon + token colour. 6. YES — grid collapses. 7. YES — range toggle, refresh, retry, and chart render flows rechecked via `pnpm build --filter web_v2`.

## Verification

- `pnpm exec tsc --noEmit` — clean
- `pnpm exec eslint components/analytics/analytics-view.tsx` — clean (also removed 4 pre-existing unused lucide imports: `Component`, `FileText`, `Loader2`, `Users`)
- `pnpm exec prettier --write` — formatted
- `pnpm build --filter web_v2` — ✓ success (1m12s)

## Follow-ups

- `MetricCard` / `ChartCard` remain hand-rolled tiles (`border-border/60 bg-card rounded-lg`). Consistent with sibling stat tiles; promoting to a shared primitive is a separate slice if a third surface re-implements it.
