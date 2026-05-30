# Principles — Analytics Dashboard

## References inspected

- **Vercel Analytics / Linear Insights** — data-reporting dashboards in the same B2B-SaaS register Tresta borrows *principles* (not aesthetics) from.
- **Internal:** `apps/web_v2/app/globals.css` "Quiet Precision" OKLCH token system; `components/projects/project-empty-states.tsx` (canonical editorial empty state).

## Extracted principles (adapted for Tresta)

1. **Charts wear the product's palette.** Series colours come from the dedicated `--chart-1…5` ramp, referenced as raw CSS vars so they stay valid OKLCH and theme-aware. Two adjacent charts that show different metrics should not be identical colours — give views and submissions distinct ramp entries so the eye separates them.
   - *Tresta adaptation:* `views → var(--chart-1)` (amber/brand), `submissions → var(--chart-2)` (green). Tooltip chrome uses `var(--card)` / `var(--foreground)` / `var(--border)`.

2. **Semantic deltas, not raw colours.** Up/down trend indication maps to `--success` / `--destructive`, never hand-picked Tailwind palette numbers. The arrow icon already carries the meaning non-chromatically — keep it.

3. **An empty data surface orients toward producing data.** "No data yet" is a dead end. The instructive version names the next action (share the form, start collecting) and links to it. Reuse `ProjectEmptyState` (brand-rule eyebrow → tracking-tight heading → relaxed body → primary CTA) for one-family consistency.

4. **Errors stay calm and recoverable.** Keep the existing retry affordance; present it in the same editorial register rather than a bare muted line.

## Anti-goals

- No new chart library, no new tokens, no new shared primitives.
- Do not desaturate toward Vercel/Linear grayscale — Tresta stays warm.
- Do not restructure the metric/chart layout; the hierarchy is already correct.
