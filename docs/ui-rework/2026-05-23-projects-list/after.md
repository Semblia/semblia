# `/projects` — After-audit

Date: 2026-05-23
Reviewer: Claude (Opus 4.7)
Evidence basis: code reading at the same files after the rework edits. Live screenshots deferred.

## What changed

Per `decision.md`:

1. **Empty-state copy** (`project-empty-states.tsx`): H2 changed from poetic positioning to a one-line orientation. Old: *"A studio for trust. Yours starts empty."* New: *"Create your first project to start collecting testimonials."* Eyebrow alpha bumped from `/60` → `/80` for AA contrast. Type size dropped from `2rem/2.45rem` → `1.85rem/2.15rem` so a longer single-line heading still reads as an editorial display.
2. **EmptySearch clear button** (`project-empty-states.tsx`): replaced the hand-rolled `<button>` with the canonical `<Button variant="outline" size="default">`. Target height 32 px (was ~26 px). Inherits `focus-visible:ring-3 focus-visible:ring-ring/30` from the button system.
3. **Toolbar gating** (`projects-client.tsx`): `showToolbar = !loading && projects.length >= 6` (was `> 0`). Filter pills + search + view toggle now hidden in the 1-5 project regime where they have nothing to act on.
4. **List row simplification** (`project-row.tsx`): trailing cluster reduced from 6 slots to 1 (`updated-at`). Pending pill moved into the `metrics` slot (the slot ItemRow was designed for). Testimonials count only appears as a secondary metric when there is no pending work to draw the eye. Widgets count, visibility icon, decorative trailing arrow all removed.
5. **Card view** (`project-card.tsx`): decorative trailing arrow removed. Layout otherwise untouched (it was already clean per before-audit Q6).

## Re-run of the before-audit NOs

| Question | Before | After | Verdict |
|---|---|---|---|
| Q3 Wording | NO (poetic H2) | **YES** — H2 is now imperative and names the outcome ("Create your first project to start collecting testimonials") | flipped |
| Q6 Visual hierarchy | NO (list trail = 6 slots) | **YES** — row reads `[avatar] [name + type-badge / subtitle] [pending pill OR ø testimonials] [updated-at]`. Identification leads, one urgent metric beside it, time on the right | flipped |
| Q7 Useful elements: arrow | NO (decorative) | **YES** — removed from both row and card | flipped |
| Q7 Useful elements: toolbar at all counts | NO (renders ≥ 1 project) | **YES** — gated to `≥ 6` projects | flipped |
| Q7 Useful elements: type badge | MINOR | **kept** — badge stays in the title block because at small project counts the toolbar (which carries filter pills) is now hidden, so the badge becomes the only type signal. Honest reversal of the before-audit's minor finding; kept rather than blindly applied. | reversed |
| Q8 Token drift in empty state | MINOR | **unchanged** — the raw `oklch()` / `hsl()` in the populated-preview decoration is outside scope (it's the ghost-preview stack, not the headline copy). Recorded as follow-up. | open |
| Q9 Trust | YES w/ caveat | **YES** — caveat resolved by the H2 rewrite | improved |
| Q10 First impression | borderline NO | **YES** — first thing a new customer reads is now an instruction, not positioning | flipped |
| Mech 3 Eyebrow alpha | MINOR | **YES** — `/60` → `/80` on the empty-state eyebrow; matches `/70` used elsewhere | flipped |
| Mech 4 Clear-search target | MINOR | **YES** — 32 px (was ~26 px), uses standard Button focus ring | flipped |
| Mech 5 Visibility icon a11y | MINOR | **YES** — removed; no longer a concern. Visibility now lives only on the project detail page where it has a real text label | flipped |

## New verdicts on the Core Questions (after)

1. First-time user understands what to do next? **YES.**
2. Clear primary action / reading path without competing emphasis? **YES.** Better than before: with the toolbar hidden at low counts, the header → rows path is direct.
3. User-language wording? **YES.** Empty-state H2 names the next action; CTAs are verb+noun; description adds new information rather than restating the title (per Geist guidance).
4. System state clear? **YES.** Loading / empty / search-empty / refreshing / pending all still distinct.
5. Mistake prevention? **N/A.**
6. Visual hierarchy deliberate? **YES.** Each row earns its slots.
7. Every element useful? **YES.** Toolbar earns its place via content threshold; arrows and visibility icon are gone.
8. Consistent with Semblia? **YES.** Composes from `ItemRow`, `ItemCard`, `Button`. No new primitives, no new tokens. Empty state visual structure unchanged.
9. Trustworthy / appropriate for testimonials product? **YES.** Stronger — workspace home is more "place to work" than "marketing landing".
10. Would leaving unchanged harm? Moot — changes are landed.

## Conditional Page-Type Checks — Dashboard / Project Management (after)

1. Most important state visible? **YES.** Pending pill is now the *primary* metric on a row, not the fifth.
2. Distinguish setup vs ongoing? **N/A.**
3. Density efficient without cold/overwhelming? **YES.** Row went from dense-trailing-cluster to balanced.
4. Empty states instructive? **YES.** Same three-stage flow + ghost preview, but the H2 now sets up the action rather than the brand.

## Mechanical Quality Gate (after)

1. Keyboard reachable? **YES** by construction (Link rows, Button controls). Needs one live verification pass before the next session.
2. Focus visibility? **YES** for the Clear-search button now (Button inherits the system ring). Row / card focus still needs live verification.
3. Sufficient contrast? **YES** for the rewritten copy. The eyebrow alpha bump should clear AA. Live verification recommended.
4. Targets sized? **YES** — Clear search is 32 px tall (AA min 24 px met).
5. Status messages without colour alone? **YES** — pending pill uses text+colour; no icon-only status remains in row trailing.
6. Narrow viewports? **YES** — metric chip and trailing both responsive (`hidden sm:flex` on testimonials chip; updated-at always visible).
7. Existing flows manually rechecked? **NOT YET** — defer to next session's live-verify pass.

## Net result

Of the **11 NOs / open items** in `before.md`:

- **9 flipped to YES** (Q3, Q6, both Q7 IMPORTANT, Q9-caveat, Q10, mech-3, mech-4, mech-5)
- **1 deliberately reversed** with reason (Q7 type-badge — kept because toolbar gating removed the alternative type-signal)
- **1 open** (Q8 token drift in populated-preview decoration — out of scope, follow-up)

No new NOs introduced. No surface re-designed for its own sake. All edits compose from existing primitives.

## Follow-ups to record

- **Q4 follow-up**: render an error state for the projects query (`projects-client.tsx` does not branch on `error` from `useProjects`). Not part of this session's UX issue; record as a separate ticket.
- **Q8 follow-up**: replace `oklch(...)` and `hsl(${accentHue} ...)` in the empty-state's `SkeletonCard` / star placeholders with token expressions or `var(--brand)` interpolations. Cosmetic; defer.
- **Live verification**: focus rings on `ItemRow` / `ItemCard`, contrast measurement on the empty-state eyebrow.
