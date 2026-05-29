# Testimonial moderation detail view — After-audit

Date: 2026-05-29
Branch: `revamp/v2`
Reviewer: Claude (Opus 4.8)
Changes landed in: `components/testimonials/testimonial-detail.tsx`,
`hooks/use-testimonial-moderation.ts`,
`app/(app)/projects/[slug]/testimonials/[id]/_detail-page.tsx`,
`app/(app)/projects/[slug]/testimonials/_testimonials-inbox.tsx`.

## What changed (each tied to a decision-doc AC)

- **AC-1 (Q5)** — Reject now opens a `ConfirmationDialog` (`intent="danger"`, `size="sm"`) that
  names the author and states the consequence ("won't appear on your wall, and it can't be
  approved from here afterward"); confirm label "Reject testimonial". Approve and Publish remain
  one-click (Publish reverses via the same footer's Unpublish). `testimonial-detail.tsx`.
- **AC-2 (Q4, Q8)** — Approve / Reject / Publish / Unpublish each fire concrete success toasts and
  recoverable error toasts via per-call `mutate(…, { onSuccess, onError })` in
  `use-testimonial-moderation.ts`, matching the app-wide `sonner` convention. The `handleInline*`
  variants (inbox list rows + bulk toolbar) stay quiet by design — the row leaving the list is the
  feedback, and bulk would otherwise emit one toast per item.
- **AC-3 (Q4)** — The hook exposes `isApproving` / `isRejecting` / `isPublishing`; the footer
  disables all action buttons while any mutation is in flight (no double-submit) and swaps the
  active button's icon for a `Spinner`. Wired into both the panel (`_testimonials-inbox.tsx`) and
  page (`_detail-page.tsx`) call sites.
- **AC-4 (Q3, Q8)** — The detail published-state pill now reads **"Draft"** when unpublished,
  matching the two existing list surfaces (`shared.tsx:172`, `testimonial-row.tsx:136`). Pairs
  coherently with the footer verb (Draft → "Publish").

## NO → YES delta

| Q | Before | After | Evidence |
|---|--------|-------|----------|
| Q3 (user's language) | NO — "Unpublished" vs list "Draft" | **YES** | Detail pill now "Draft", consistent with both list surfaces. (Source-value humanization remains a noted MINOR follow-up.) |
| Q4 (state clarity) | NO — no success/error/in-flight feedback | **YES** | Success + error toasts on every action; buttons disable + show Spinner while pending. |
| Q5 (safe mistakes) | NO — reject one-way, unconfirmed | **YES** | Danger confirmation before reject, naming author + consequence. (No undo API exists; confirm is the correct interim safeguard.) |
| Q8 (consistency) | NO — silent actions + term drift | **YES** | Actions now toast like the rest of the app; pill term unified to "Draft". |
| Q10 (harm if unchanged) | rework trigger | **resolved** | Moderation actions are now confirmed, visible, and double-submit-safe. |

Questions already YES before (Q1, Q2, Q6, Q7, Q9) are unchanged — no regression; the footer
restyle was deliberately avoided per anti-goals.

## Mechanical Quality re-check
1. Keyboard — all controls operable; confirm dialog is a focus-trapped Radix `AlertDialog`. **YES.**
2. Focus visible — inherited from `Button` / `AlertDialog`. **YES.**
3. Contrast — no new low-contrast text; toast + dialog use system tokens. **YES.**
4. Targets — footer buttons unchanged (`size="sm"`); dialog actions are default-size. **YES.**
5. Not color-only — toasts carry text; confirm dialog carries title + body + labelled buttons;
   status pills still icon + text. **YES.**
6. Viewports — footer button count unchanged; dialog uses `size="sm"`. **YES.**
7. Functional flows rechecked — `tsc --noEmit` ✓, `eslint . --ext .ts,.tsx` ✓,
   `prettier --write` ✓ (no changes), `pnpm build --filter web_v2` ✓ (28.6s),
   `update-indexes.py` ✓ (graph updated; semantic extraction skipped as usual). **YES.**

## Follow-ups (out of scope this pass)
- **Re-moderate / un-reject flow** — reject stays one-way because the footer hides Approve once
  status leaves PENDING/FLAGGED. A true undo needs an API affordance (status → PENDING). The
  confirmation is the interim safeguard.
- **Keyboard `r` parity** — the inbox's `r` shortcut (`_testimonials-inbox.tsx`) calls
  `handleReject` directly, bypassing the footer's confirm dialog. The dialog protects the mouse
  click on both variants and is the *only* reject path on the page variant (no shortcuts there); a
  deliberate keypress is intentional. Routing `r` through the confirm is a small follow-up if
  parity is desired.
- **"Source" humanization** (`testimonial-detail.tsx:266`) — only if the value space is a system
  enum; unknown today.
- **Global term sweep** — chose "Draft" to match the existing majority. If product prefers
  "Unpublished" semantics, that's a one-line sweep across all three components.
- **Panel pending granularity** — pending flags are slug-scoped, so an inline list action while the
  panel is open on a *different* item briefly disables the panel footer. Rare and self-clearing.
