# `/projects/[slug]/testimonials` — Before-audit

Date: 2026-05-27
Branch: `revamp/v2`
Reviewer: Claude (Opus 4.7)
Evidence basis: code reading at `apps/web_v2/app/(app)/projects/[slug]/testimonials/_testimonials-inbox.tsx`, `apps/web_v2/components/testimonials/{testimonials-client,testimonial-row,testimonials-filter-bar,testimonial-empty-state,bulk-toolbar,shared}.tsx`. Live screenshots deferred until dev-server pass.

## Required Context

- **Surface under review**: `/projects/[slug]/testimonials` — the project-scoped testimonial inbox. Two columns on desktop (list + selected-item detail panel), single column on mobile (selection routes to `/[id]`). Auxiliary states: empty (`TestimonialEmptyState`, two variants), loading skeletons, bulk-action mode, pagination band.
- **User type**: authenticated project owner / collaborator. Recurring daily-use task; needs to triage incoming testimonials quickly.
- **Primary user goal on this surface**: review and act on pending testimonials (approve / reject), then publish keepers. Secondary: search past testimonials, copy collection link when empty.
- **Relevant reference inspected**: pending (Task 2 — Linear inbox, Front, Superhuman triage view).
- **Principle extracted from that reference**: pending.

## Core Questions

### 1. Can a first-time user understand what this surface is for and what to do next?

**YES.** Title "Testimonials" + description "N total · N pending" sits above status tabs (`_testimonials-inbox.tsx:228-252`). Empty state for `ALL` is concrete and instructive: *"Share your link to get started"* with a copy-URL primary action (`testimonial-empty-state.tsx:81-180`). When populated, rows present author + content preview + status pill + stars — the unit of work is obvious.

### 2. Is there a clear primary action or primary reading path, without competing emphasis from less important elements?

**NO.**

- Evidence: two horizontal control bands stack above the list: (a) `PageHeader.toolbar` with five status `PageTabs` (`_testimonials-inbox.tsx:244-251`), (b) `TestimonialsFilterBar` with search + sort dropdown + "Select" button (`testimonials-client.tsx:152-162`, `testimonials-filter-bar.tsx:79-144`). Both bands answer the same conceptual question ("narrow this list"). When `bulkMode` engages, a third band (`BulkToolbar`) appears. When `totalPages > 1`, a fourth band (pagination) appears at the bottom. The list itself is sandwiched between up to four control strips.
- The primary action — *act on the next pending item* — has no dedicated affordance in the header. The header description quietly mentions "N pending" but the user must mentally translate that into "click the Pending tab, then click rows."
- Proposed correction: when `pendingCount > 0`, surface a primary action in the header (e.g. "Review N pending →" button that filters to Pending) and consolidate the search/sort/select bar into a single strip co-located with the tabs (or move sort into the tabs row as a trailing dropdown).
- Severity: **IMPORTANT**.

### 3. Is the wording written in the user's language rather than internal system language, vague SaaS filler, or artificial marketing copy?

**YES.** Empty-state titles are crisp: "Share your link to get started", "Inbox zero", "All clear", "Nothing approved yet". Descriptions are imperative and concrete (`testimonial-empty-state.tsx:185-214`). The hint *"Paste it into a customer email, DM, or invoice"* (line 152) is the right register. Status pill labels match the user's mental model ("Approved", "Pending", "Flagged", "Rejected"). Tab labels are equally plain. No marketing copy.

One minor: the eyebrow text *"Inbox · No testimonials yet"* (line 89) is brand-style ornament rather than orientation — but it's small enough that it doesn't compete. **MINOR**.

### 4. Is the current system state clear wherever it matters?

**YES, with one gap.**

- Loading: `TestimonialSkeleton` rows with shimmer; an inbox skeleton renders before `project` resolves (`_testimonials-inbox.tsx:200-221`).
- Empty: variant per filter (`testimonial-empty-state.tsx:33-48`).
- Pending vs reviewed: header description shows `{total} total` and a warning-toned `{pendingCount} pending` (`_testimonials-inbox.tsx:233-242`); each row carries a `StatusPill` (`testimonial-row.tsx:110`).
- Published vs draft: visible in the **detail** panel only — not surfaced on the list row. The list-row `StatusPill` only shows moderation status, not publication state. Two approved testimonials may differ on whether they are actually published; the user can't tell from the list.
- Background refresh: `RefreshingDataBadge` in the filter bar trailing area (`testimonials-filter-bar.tsx:135`).
- Error: no rendered error branch for the list query (`testimonials-client.tsx` uses `listQuery` but never reads `listQuery.error`).
- Proposed correction: add a small published/draft marker on **approved** rows (a tiny `Eye`/`EyeOff` glyph or a dot) so the list answers "what is actually live?" without entering the detail. And handle the query error case.
- Severity: published/draft gap **MINOR**, error branch **MINOR**.

### 5. Does the surface prevent or safely communicate mistakes for consequential actions?

**PARTIALLY YES.**

- Approve / reject are clearly labelled, colour-coded, and reversible in product semantics (reject can be re-approved from detail).
- Inline hover actions (`testimonial-row.tsx:115-148`) fire immediately on click — no confirm. For a reversible operation this is acceptable.
- Bulk approve / bulk reject (`bulk-toolbar.tsx:28-46`) also fire immediately. Mass-rejecting 20 items by mistake is harder to recover from than a single misclick. The button labels say "Approve" / "Reject" with no counter and no undo affordance.
- Proposed correction: the BulkToolbar buttons should read *"Approve N"* / *"Reject N"* (interpolate the count), and ideally a brief toast with an Undo affordance for bulk reject. The Cancel button is already there for selection itself, which is good.
- Severity: **MINOR**.

### 6. Is the visual hierarchy deliberate: important content leads, related items are grouped, decoration doesn't compete?

**NO.**

- Evidence (row meta strip, `testimonial-row.tsx:108-111`): every row renders **both** `Stars` and `StatusPill`. Under the `PENDING` tab, every row shows a "Pending" pill — restating the active filter on every line. Under `APPROVED`, every row shows "Approved". The pill carries no new information when the user has already filtered to a specific status; it doubles the chroma of the row meta.
- Evidence (control density): four conceptually-similar control bands can stack (status tabs / search-sort bar / bulk toolbar / pagination), each occupying ~36-44px. On a 13" laptop, the actual list shrinks to roughly half the viewport.
- Evidence (row content): the content preview clamps at 2 lines but the absolute-positioned hover actions (`testimonial-row.tsx:116`) overlay the right side of those lines for long testimonials. Visual collision under hover.
- Proposed correction:
  - Hide `StatusPill` on rows when the current tab is not `ALL` (or render only when status ≠ tab value, for the rare cross-filter case after a status change).
  - Collapse status tabs + sort into one strip; move "Select" to a row-level affordance triggered by a shift-click or a tab-level overflow menu rather than a fixed toolbar button.
  - Reserve a stable right-rail gutter inside the row (e.g. `pr-20` on hover) so inline actions don't overlap content preview.
- Severity: **IMPORTANT**.

### 7. Is every major visible element useful for the user's current task?

**NO.**

1. **Per-row `StatusPill` under filtered tabs** — already covered in Q6. Restates active filter. **IMPORTANT**.
2. **"Select" button in `TestimonialsFilterBar`** (`testimonials-filter-bar.tsx:119-129`) — when no rows are actionable, the button is correctly hidden via `hasActionable`. When rows *are* actionable, the button is still labelled just "Select" with a checkmark — ambiguous (select what?). The conventional inbox pattern is shift-click or row hover-checkbox, not a header button. **MINOR**.
3. **Mobile chevron** (`testimonial-row.tsx:152`) — `lg:hidden`, fine on mobile, but inherits `text-muted-foreground/40` which is faint; it's functionally redundant since the whole row is the link. Keep as a touch affordance hint but verify contrast. **MINOR**.
4. **Header description "{N} total"** (`_testimonials-inbox.tsx:233`) — the count is also shown by `result.total` in the filter bar trailing area (`testimonials-filter-bar.tsx:137-139`). Two copies of the same number on the same screen. The result count moves with filters (correct), so the header "total" is the unconditional one. Probably keep both, but flag. **MINOR**.

### 8. Patterns consistent with the rest of Semblia?

**YES.** Uses `ItemShell` (row variant), `PageHeader`, `PageTabs`, `PageToolbar`, `SearchField`, `RefreshingDataBadge`, `ActionButton`, `StatusPill` + `Stars` (shared in `components/testimonials/shared.tsx`). Skeleton uses the standard `Skeleton` primitive with `animate-shimmer`. Tokens (`text-warning`, `text-success`, `bg-brand`, `bg-muted`) are correct.

One drift: `testimonial-empty-state.tsx:110-111` uses an inline `box-shadow: 0_0_0_2px_var(--color-success)/6%` literal. The token system supports `shadow-xs/sm` and `ring` utilities; arbitrary alpha box-shadows bypass it. **MINOR**.

### 9. Does this surface feel trustworthy and appropriate for a testimonials product?

**YES.** Restrained colour, factual labelling, no marketing copy in the working states. The empty state's copy-link bar is calm and direct.

### 10. Would leaving this surface unchanged noticeably harm comprehension, trust, or perceived product quality?

**NO, but it is the highest-friction working surface in Semblia** and the friction items in Q2 + Q6 will compound for power users who triage daily. Not catastrophic; worth tightening.

## Conditional Page-Type Checks — Testimonial Moderation

1. **Is the testimonial content central and easy to evaluate?** PARTIALLY. The 2-line clamp and the right-side meta strip make scanning workable, but the meta strip (stars + pill + hover actions) competes for the same band. Content is *adjacent to* central, not *the* central element.
2. **Approval/rejection/publishing/visibility states unambiguous?** Approval/rejection: clear via `StatusPill`. Publishing: **not surfaced on the list** (see Q4). Visibility: N/A — testimonials don't have a separate visibility flag on the list.
3. **Moderation actions safe, reversible, clearly consequential?** YES for individual actions, MINOR risk for bulk reject (no count in button, no undo).
4. **Can the user process multiple testimonials efficiently without losing context?** YES — desktop master-detail keeps the list visible; `j`/`k`/`a`/`r`/`p` shortcuts give a keyboard triage loop; bulk mode exists. The keyboard story is genuinely strong.

## Mechanical Quality Gate

1. **Keyboard reachable?** YES — `ItemShell` composes as a button when `onClick` provided; `j`/`k`/`Esc`/`a`/`r`/`p` shortcuts registered via `useKeyboardShortcuts` (`_testimonials-inbox.tsx:116-197`). Needs live verification for tab-order.
2. **Focused element identifiable?** Relies on `ItemShell` default focus ring — **needs live verification**.
3. **Sufficient contrast?** Eyebrow `text-muted-foreground/60` (`testimonial-empty-state.tsx:89, 225`) at ~60% alpha may fail AA on warm-slate. Mobile chevron `text-muted-foreground/40` is decorative-only so weaker contrast is defensible but should be measured. Row meta at `text-[10px]` for timestamps is small; may be below 4.5:1 on muted-foreground. **MINOR — needs measurement**.
4. **Targets sized?** Inline hover-action buttons are `ActionButton size="icon-sm"` ~28px — below the 44px touch guideline. They're hover-only on desktop so non-blocking, but pagination buttons (`testimonials-client.tsx:217-236`) are forced to `size-7` (28px) explicitly. **MINOR for pagination buttons**.
5. **Status without colour alone?** `StatusPill` has icon + text — OK. `Stars` is shape-based — OK. Pending warning in header has a text "pending" suffix — OK.
6. **Usable at narrow viewports?** Detail panel is `hidden lg:flex` (`_testimonials-inbox.tsx:273-274`); mobile routes to `[id]`. Row collapses sensibly — role/company hides under `hidden sm:inline`. Bulk toolbar wraps. Pagination is fine.
7. **Existing flows manually rechecked?** N/A — no change yet.

## Summary of NOs

| Question | Severity | Issue |
|---|---|---|
| Q2 | IMPORTANT | Two stacked filter strips; no primary "review pending" action surfaced when pending > 0 |
| Q4 | MINOR | Published/draft state invisible on list (only in detail) |
| Q4 | MINOR | No rendered error branch for list query |
| Q5 | MINOR | Bulk approve/reject buttons don't show count; no undo for bulk reject |
| Q6 | IMPORTANT | Per-row StatusPill restates the active tab; inline actions overlap content on hover |
| Q7 | IMPORTANT | StatusPill redundancy (same as Q6) |
| Q7 | MINOR | "Select" header button ambiguous; header total duplicates filter-bar count |
| Q8 | MINOR | Empty state uses literal alpha box-shadow outside token system |
| Q3 | MINOR | Empty-state eyebrow ornament |
| Mech 2 | needs-verification | Row focus ring |
| Mech 3 | MINOR | Eyebrow alpha 60%, mobile chevron 40% — needs contrast check |
| Mech 4 | MINOR | Pagination buttons forced to 28px |

## Decision-gate readout (preliminary)

Rework rule: any of Q1–5 NO, OR Q9 / Q10 NO, OR 2+ of Q6–8 NO.

- Q2 = NO (Q1–5 trigger) ✓
- Q6 = NO, Q7 = NO (2 of Q6–8 trigger) ✓

**Gate clears.** Scope of rework is *targeted*: header-level "review pending" affordance + filter-strip consolidation + per-row pill gating + inline-action gutter + the smaller MINORs. Not a visual redesign of the row or the empty state. Final decision in `decision.md` after the external-principles pass.
