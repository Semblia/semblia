# UI Rework — Widgets List / Gallery (`/projects/[slug]/widgets`)

Date: 2026-05-31
Branch: revamp/v2

## Required Context

- **Surface under review:** `apps/web_v2/components/widgets/widgets-gallery.tsx`
- **User type:** Authenticated project owner / collaborator
- **Primary user goal:** See existing embeddable widgets, their status, and create a new one.
- **Reference inspected:** the **already-reworked sibling** `components/collect/collect-forms-gallery.tsx` — same "gallery of project artifacts + create affordance" shape, one nav tab over.
- **Principle extracted:** Two adjacent nav tabs that do the same kind of job (list cards + create-by-kind) must use the same shared primitives, or the product reads as two different apps.

## Core Questions

1. First-time user understands surface? **YES** — `PageHeader title="Widgets"`.
2. Clear primary action? **YES** — create widget / open existing.
3. Wording in user's language? **YES**.
4. System state clear? **YES** — loading spinner, empty, published/draft shown.
5. Consequential mistakes handled? **N/A** — creation is non-destructive.
6. Deliberate hierarchy? **YES**.
7. Every element useful? **YES**.
8. Patterns consistent with Semblia? **NO** — the sibling `collect-forms-gallery` composes from shared primitives; this surface hand-rolls all of them:
   - Status pill uses raw `bg-emerald-50 text-emerald-700` (`widgets-gallery.tsx:62`) instead of the shared `StatusPill tone="success"` (which is `bg-success/12 text-success`). Off-brand colour in a warm-amber system.
   - `WidgetCard` is a hand-rolled `<Link>` card with `hover:border-brand/40` instead of `ItemCard` (paper-press hover).
   - Empty state hand-rolls a kind picker (`:137–178`) instead of the shared `EmptyKindPicker`.
   - `CreateRow` is a bespoke dashed block instead of the sibling's centered pill row.
   - *Correction:* mirror `collect-forms-gallery` — `ItemCard` + `StatusPill` + `EmptyKindPicker` + pill `CreateRow`. *Severity:* IMPORTANT.
9. Trustworthy / appropriate? **YES** (borderline) — off-brand emerald is a blemish, not broken.
10. Leaving unchanged harms quality? **NO** — toggling between the **Collect** and **Widgets** tabs reveals two visibly different design languages (different card hover, different status pill colour, different empty state). That side-by-side inconsistency reads as unfinished. *Severity:* IMPORTANT.

## Conditional — Dashboard / Project Management

1. Most important state visible? **YES** — cards show status + count.
2. Setup vs management distinction? **YES**.
3. Density efficient, not cold? **YES**.
4. Empty/first-use instructive? **PARTIAL** — functional but off-pattern from the sibling; fixed via `EmptyKindPicker`.

## Mechanical Quality Gate

1. Keyboard reachable? **YES**. 2. Focus visible? **YES**. 3. Contrast? **YES**. 4. Targets sized? **YES**. 5. Status not colour-only? **YES** (pill has text). 6. Narrow + wide? **YES**. 7. Flows rechecked → `after.md`.

## Rework Decision

Gate triggers via **Q10 NO** (sibling-inconsistency perceived-quality harm) plus **Q8 NO**. Scoped **normalize pass** (mirror the canonical sibling) — not a redesign. See `decision.md`.
