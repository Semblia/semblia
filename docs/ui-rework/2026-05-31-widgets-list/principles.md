# Principles — Widgets List / Gallery

## Reference inspected

- **Internal canonical sibling:** `components/collect/collect-forms-gallery.tsx` (reworked 2026-05-27). Same surface archetype: a gallery of project artifacts with a create-by-kind affordance.
- Shared primitives: `ItemCard`, `StatusPill`, `EmptyKindPicker` (`components/shared/`).

## Extracted principles (adapted for Semblia)

1. **Siblings share primitives.** When two surfaces are the same archetype, the later one composes from the same shared components rather than re-implementing the look. This is the single biggest lever against "feels like two different apps."

2. **Status colour comes from tone tokens.** Published/draft → `StatusPill tone="success" | "muted"`. Never hand-pick Tailwind palette numbers (`emerald-50/700`).

3. **Cards use paper-press hover.** `ItemCard` (built on `ItemShell`) provides brand-warmth ring/shadow on hover — no bespoke `hover:border-brand/40`.

4. **Empty = kind picker.** First-run for a create-by-kind surface uses `EmptyKindPicker` (brand-rule eyebrow → heading → kind buttons with their own busy state).

## Anti-goals

- No new primitives, no new tokens.
- Do not redesign the layout — the grid + create-row structure is already correct; only de-drift it to the sibling.
- Preserve all four widget layouts (wall / carousel / grid / list) and the create/open flows.
