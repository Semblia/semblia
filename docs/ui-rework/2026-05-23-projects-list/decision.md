# Rework decision — `/projects`

## Gate

- Q3 = NO → triggers (Q1–5).
- Q6 = NO and Q7 = NO → 2 of Q6–8, triggers.
- Q10 = borderline NO for empty state.

**Decision: proceed with targeted rework.** Not a redesign — a surgical fix list grounded in three principles from `principles.md`.

## In-scope changes

| # | Issue | Principle | Files | Severity |
|---|---|---|---|---|
| 1 | Empty-state H2 reads as positioning, not orientation | P1, P4 | `project-empty-states.tsx` | IMPORTANT |
| 2 | Toolbar shows for any project count ≥ 1 | P2 | `projects-client.tsx` | IMPORTANT |
| 3 | List row trails 6 slots, identification competes with metrics | P3 | `project-row.tsx` | IMPORTANT |
| 4 | Decorative trailing arrow on every row + card | P3 | `project-row.tsx`, `project-card.tsx` | MINOR |
| 5 | Type badge restated on every row when filter already exists | P3 | `project-row.tsx`, `project-card.tsx` | MINOR |
| 6 | Visibility icon lacks visible text label | mech-5 | `project-row.tsx` | MINOR (a11y) |
| 7 | "Clear search" target ~26 px tall | mech-4 | `project-empty-states.tsx` | MINOR (a11y) |
| 8 | Eyebrow alpha 60% may fail AA | mech-3 | `project-empty-states.tsx` | MINOR — verify, only change if it actually fails |

## Out of scope (deliberately)

- Card view layout. The hierarchy is fine; only the trailing arrow + redundant type badge are touched (items 4, 5).
- `PageHeader`, `ItemRow`, `ItemCard`, `RowMetric`, `StatusDot`, `EditorialEyebrow` internals. We only use them.
- Tokens, theme, motion vocabulary. No new colors or shadows.
- Empty-state visual structure (ghost preview + three-stage flow stays — it's the right Educational archetype).
- Loading skeletons.
- Error state for the projects query (record as a follow-up in memory; not part of this surface's UX issue).

## Anti-goals (explicit)

- Do **not** desaturate toward Linear's grayscale; Semblia stays warm.
- Do **not** add visual flourish in the name of "personality" — the changes above are *reductive*.
- Do **not** introduce new shared components. Compose from what exists.
- Do **not** rewrite copy that already works (the stage descriptions, the populated-state header description, the search-empty quote-the-query pattern).

## Acceptance criteria (re-runs of the before-audit questions)

After implementation, the same Q3, Q6, Q7, Q9, Q10, mech-3, mech-4, mech-5 must answer YES (or N/A with reason). Mechanical Q1, Q2 will be re-verified after the change. If any does not flip, the change is rolled back rather than papered over.
