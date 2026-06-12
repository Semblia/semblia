# UI Rework — Analytics Dashboard (`/projects/[slug]/analytics`)

Date: 2026-05-31
Branch: revamp/v2

## Required Context

- **Surface under review:** `apps/web_v2/components/analytics/analytics-view.tsx` (rendered by `app/(app)/projects/[slug]/analytics/page.tsx`)
- **User type:** Authenticated project owner / collaborator
- **Primary user goal:** Read how their collection form is performing — views, submissions, published count, conversion, and trends over time.
- **Reference inspected:** Vercel Analytics + Linear Insights (data-dashboard conventions); internal design system `apps/web_v2/app/globals.css` ("Quiet Precision", OKLCH tokens).
- **Principle extracted:** Charts must speak the product's own palette consistently; a data surface's empty state should orient the user toward *producing* data, not merely report its absence.

## Core Questions

1. First-time user understands surface? **YES** — `PageHeader title="Analytics"` + project name.
2. Clear primary reading path? **YES** — metric row → trend charts, top to bottom.
3. Wording in user's language? **YES** — "Form views", "Submissions", "Published", "Conversion".
4. System state clear (empty/loading/error)? **NO** — loading skeleton and error are fine, but the empty state is a single muted line "No analytics data yet." (`analytics-view.tsx:315–322`) with no orientation toward how data gets produced. *Correction:* editorial empty state pointing to the collect form. *Severity:* IMPORTANT.
5. Prevents/communicates consequential mistakes? **N/A** — no destructive actions on this surface.
6. Deliberate visual hierarchy? **YES** — metrics lead, charts follow.
7. Every element useful? **YES** — no decorative filler.
8. Patterns consistent with Semblia / design system? **NO** —
   - Trend deltas use raw Tailwind `text-emerald-600` / `text-red-600` (`analytics-view.tsx:78–79`) instead of the semantic `--success` / `--destructive` tokens. This is the same off-brand-color defect class fixed in the 2026-05-29 widget-studio pass.
   - *Correction:* `text-success` / `text-destructive`. *Severity:* IMPORTANT.
9. Trustworthy / appropriate? **NO** —
   - **Chart colors are silently broken.** `ChartCard` passes `color="hsl(var(--brand))"` (`analytics-view.tsx:282,288`) and the Recharts tooltip uses `border: "1px solid hsl(var(--border))"` (`:125`). The design tokens are **OKLCH** (`--brand: oklch(0.7 0.12 55)`, `globals.css:56`), so `hsl(oklch(...))` is an invalid color string — the area stroke/fill and tooltip border fall back to the browser default rather than the brand palette.
   - *Correction:* reference the tokens directly (`var(--chart-1)`, `var(--chart-2)`, `var(--border)`, `var(--card)`, `var(--foreground)`). *Severity:* BLOCKING (visible rendering defect).
10. Leaving unchanged harms quality? **YES** — broken chart palette + off-brand deltas read as unfinished on a surface customers use to judge their own performance.

## Conditional — Dashboard / Project Management

1. Most important state immediately visible? **YES** — totals row is first.
2. Setup vs ongoing-management distinction? **N/A** — pure reporting surface.
3. Density efficient without being cold? **YES**.
4. Empty/first-use states genuinely instructive? **NO** — see Q4.

## Mechanical Quality Gate

1. Keyboard reachable controls? **YES** — range buttons + refresh are real `<button>`s.
2. Focus visible? **YES** — default ring retained.
3. Contrast sufficient? **PARTIAL** — broken chart color may render an unintended stroke; fixed alongside Q9.
4. Targets adequately sized? **YES** — refresh is `h-9 w-9`, range buttons `px-3 py-1.5`.
5. Status messages not colour-only? **PARTIAL** — trend deltas pair an arrow icon with colour (good); keep that when swapping to tokens.
6. Usable narrow + wide? **YES** — grid collapses `sm`/`lg`.
7. Functional flows rechecked after change? deferred to `after.md`.

## Rework Decision

Gate triggers: Q4 NO (one of 1–5), **Q9 NO**, **Q10 NO**, and Q8 NO. Rework is warranted. See `decision.md`.
