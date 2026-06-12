# Testimonial moderation detail view — Before-audit

Date: 2026-05-29
Branch: `revamp/v2`
Reviewer: Claude (Opus 4.8)
Evidence basis: code reading at
`apps/web_v2/components/testimonials/testimonial-detail.tsx`,
`apps/web_v2/components/testimonials/detail-parts.tsx`,
`apps/web_v2/components/testimonials/shared.tsx` (STATUS_CONFIG, Stars, FeedRow),
`apps/web_v2/app/(app)/projects/[slug]/testimonials/[id]/{page,_detail-page}.tsx`,
`apps/web_v2/hooks/use-testimonial-moderation.ts`,
`apps/web_v2/hooks/api/use-testimonials-api.ts`,
`apps/web_v2/components/ui/{action-button,confirmation-dialog}.tsx`.
Live screenshots deferred (consistent with the inbox audit; the surface reuses verified primitives).

## Required Context

- **Surface under review**: the testimonial moderation **detail view** — the `TestimonialDetail`
  component (`testimonial-detail.tsx`). It renders in two variants from one component:
  - `variant="panel"` — the right column of the desktop master-detail inbox
    (`_testimonials-inbox.tsx:293`), beside the list.
  - `variant="page"` — the standalone route `/projects/[slug]/testimonials/[id]`
    (`_detail-page.tsx`), used on mobile and for deep links.
  Both variants are wired through the **same** hook `useTestimonialModeration(slug)`
  (`_testimonials-inbox.tsx:67`, `_detail-page.tsx:23`), so the component + that hook are the
  whole audited surface.
- **User type**: authenticated project owner / collaborator moderating incoming testimonials.
- **Primary user goal**: read one testimonial in full, then decide — approve / reject, and
  publish / unpublish — with confidence the decision took effect.
- **Relevant reference inspected**: pending (Task 2 — Front / Linear / Superhuman triage-detail).
- **Principle extracted from that reference**: pending.

Surface anatomy (top → bottom, `testimonial-detail.tsx`):
1. Header bar — optional back button, "Testimonial" label, optional close (`:71-101`).
2. Author block — initial avatar, name, "Verified" chip, role/company, email (`:112-147`).
3. Rating stars (`:150-157`).
4. Content blockquote with faint decorative quote glyph (`:160-170`).
5. Status pills — moderation status + Published/Unpublished (`:177-204`); tags (`:207-221`);
   moderation-flags box with score (`:224-248`).
6. Metadata grid — Submitted date, Source (`:252-268`).
7. Sticky action footer — Approve / Reject (only when actionable) + Publish/Unpublish, with
   `a`/`r`/`p` Kbd hints in panel variant only (`:274-335`).

Key behavioral fact: `isActionable = moderationStatus === "PENDING" || "FLAGGED"`
(`:61-63`). The footer shows Approve/Reject **only** while actionable. Once a testimonial is
APPROVED or REJECTED, neither button renders — **reject is effectively one-way from this UI**.

## Core Questions

### 1. Can a first-time user understand the surface and what to do next?
**YES.** Header label, author, stars, quote, status pills, and a clear action footer make the
unit of work and the available decisions obvious without prior knowledge.

### 2. Is there a clear primary action / reading path without competing emphasis?
**YES.** Reading cascade (author → rating → quote → status → metadata) is deliberate, and the
footer holds the decisions. Minor: at rest the footer buttons are visually quiet (see Q6) but
they are labelled + iconed, so the path is not ambiguous.

### 3. Is wording in the user's language, not system language / SaaS filler?
**NO (MINOR–IMPORTANT).**
- Same state, two different words across surfaces: the detail labels the unpublished state
  **"Unpublished"** (`testimonial-detail.tsx:202`) while the list row `FeedRow` labels the
  identical `isPublished === false` state **"Draft"** (`shared.tsx:172`). One concept, two
  vocabularies — confusing and inconsistent.
  - Correction: standardize on one term (Published / Unpublished pairs with the publish/unpublish
    verbs already in the footer). Severity: IMPORTANT (also a Q8 consistency defect).
- `Source` renders `t.source` raw (`:266`); if the value space is an enum/slug (e.g. `WIDGET`,
  `API`) it leaks system language. Correction: map known sources to human labels. Severity: MINOR.
- Moderation flags render `flag.replace(/_/g, " ")` (`:243`) — acceptable but machine-derived.
  Severity: MINOR.

### 4. Is current system state clear: empty, loading, success, error, draft, published…?
**NO (IMPORTANT).** Display states are covered — empty (`DetailEmpty`), loading
(`DetailBodySkeleton`), moderation-status pill, Published/Unpublished pill. But **action-outcome
state is absent**:
- No success / error feedback after approve/reject/publish. `useTestimonialModeration`
  (`:19-38`) calls `mutate(...)` and the mutations (`use-testimonials-api.ts:65-94`) only
  `invalidateQueries` in `onSuccess` — there is **no `onError`, no toast**. The user clicks
  Approve and nothing confirms it until a background refetch silently swaps the pill. Every other
  mutation surface in the app toasts (`danger-client.tsx:21-24`, `project-create-client.tsx:42-45`,
  account pages) — this surface is conspicuously silent.
- No **pending / in-flight** state on the footer buttons: they neither disable nor show progress
  during the mutation (`testimonial-detail.tsx:283-332` pass no `disabled`/loading), allowing
  double-submits. Contrast `ModerationItem`, which already models exactly this with a `resolving`
  set + `disabled` (`shared.tsx:205-216`, `:256-265`).
- Correction: success/error toasts in the hook + pending/disabled state on the buttons.
  Severity: IMPORTANT.

### 5. Does it prevent or safely communicate mistakes for consequential actions (reject, publish)?
**NO (IMPORTANT).** Reject fires immediately on click with no confirmation, no undo, and (per Q4)
no toast (`use-testimonial-moderation.ts:26-31`). Because the footer hides Approve once the item
is no longer PENDING/FLAGGED (`:61-63`), **a mis-click on Reject cannot be undone from this view**
— there is no re-moderate affordance. Publish likewise makes a testimonial publicly visible on the
wall with one unconfirmed click. There is no undo API available, so the only safe-mistake mechanism
the surface can offer today is a confirmation step before the irreversible action.
- Correction: confirm before Reject via the existing `ConfirmationDialog` (`confirmation-dialog.tsx`).
  Severity: IMPORTANT.

### 6. Is visual hierarchy deliberate; decoration doesn't compete?
**YES.** The cascade leads with content; the quote glyph sits at 15% opacity and doesn't compete
(`:165`). The footer's at-rest muted styling (`ActionButton` only colorizes tone on hover,
`action-button.tsx:12-20`) is an intentional Quiet-Precision restraint, not noise.

### 7. Is every major visible element useful for the task?
**YES.** Author, rating, quote, status, flags, metadata, and actions all serve the moderation
decision. No purely decorative blocks.

### 8. Are patterns consistent with the rest of Semblia?
**NO (one clear instance).** "Unpublished" (detail) vs "Draft" (list) for the same state — see Q3.
Additionally, the moderation actions skip the app-wide toast-on-mutation convention (Q4). Pills,
`STATUS_CONFIG`, `Stars`, tokens, and icon sizing are otherwise consistent. Severity: IMPORTANT.

### 9. Does it feel trustworthy and appropriate for a testimonials product?
**YES, broadly.** The warm, quiet styling is appropriate. The one dent in trust is the silent
moderation actions ("did my reject actually land?") — captured under Q4/Q5.

### 10. Would leaving this unchanged noticeably harm comprehension, trust, or product quality?
**Gate sense: NO — leaving it as-is is NOT acceptable.** (The checklist wording inverts here; per
the prior projects-list audit's reading, a rework-triggering answer is recorded as NO.) Silent,
unconfirmed, one-way moderation actions are precisely the class of defect that erodes trust in a
moderation tool. Recorded as a rework trigger.

## Conditional Page-Type Checks — Testimonial Moderation

1. **Content central & easy to evaluate?** YES — quote block is the visual anchor; author + rating
   sit immediately above it.
2. **Approval / rejection / publishing / visibility states unambiguous?** Partial. The two-axis
   model (moderation status pill + Published pill) is displayed clearly, but state **transitions**
   give no feedback (Q4). Vocabulary drift "Unpublished"/"Draft" (Q3) hurts here too.
3. **Actions safe, reversible where appropriate, clearly consequential?** **NO** — reject/publish
   are immediate, unconfirmed, and reject is one-way from this UI (Q5).
4. **Process multiple efficiently without losing context?** Panel variant: YES (list stays beside).
   Page variant: weaker — `a`/`r`/`p` shortcuts and their Kbd hints are gated to `!isPage`
   (`:292,304,330`), so the standalone page has no keyboard moderation and no next-item flow.
   Severity: MINOR (page variant is the mobile/deep-link fallback; sequential triage lives in the panel).

## Mechanical Quality Gate

1. **Keyboard reach/operate all controls?** YES — all controls are real `<Button>`s. (a/r/p
   shortcuts are panel-only; page relies on tab + activate.)
2. **Focus visible?** YES — buttons inherit the shared `Button` focus-visible ring.
3. **Text contrast sufficient?** YES, with a MINOR note: metadata uses `text-[10px]`/`text-[11px]`
   on `text-muted-foreground`; readable but at the small end. Decorative quote glyph at 15% is
   non-informational. No color-only information.
4. **Targets adequately sized/spaced?** YES — footer buttons `size="sm"` flex-1; header uses
   `icon-xs`. MINOR watch on `icon-xs` header buttons at touch sizes.
5. **Status/validation not color-only?** YES — every status pill carries icon + text label.
6. **Usable at narrow & wide viewports?** YES, MINOR watch: three footer buttons (Approve / Reject /
   Unpublish) in one flex row are tight at ~360px.
7. **Functional flows rechecked after change?** N/A pre-change — verified in `after.md`.

## Rework Gate Readout

Rework is **allowed and required**: **Q4 NO** and **Q5 NO** (both within Q1–5), Q8 NO, and Q10
recorded as a rework trigger. Multiple independent triggers.

Detail in `decision.md`.
