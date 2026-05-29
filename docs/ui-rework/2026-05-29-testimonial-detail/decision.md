# Decision — testimonial moderation detail view

## Gate readout

Rework **allowed and required**. Triggers (from `before.md`):
- **Q4 NO** — no success/error feedback and no in-flight state on moderation actions.
- **Q5 NO** — reject is one-way from this UI yet fires unconfirmed, with no undo.
- **Q8 NO** — "Unpublished" (detail) vs "Draft" (list) for the same state; actions skip the
  app-wide toast convention.
- **Q10** recorded as a rework trigger.

Multiple independent triggers → proceed. Scope held to the two files that *are* the surface:
`components/testimonials/testimonial-detail.tsx` and `hooks/use-testimonial-moderation.ts`. Both
the `panel` and `page` variants route through these, so a single edit fixes both.

## In scope

| # | Change | Closes | File(s) | Primitive reused |
|---|--------|--------|---------|------------------|
| AC-1 | Confirm before **Reject** via `ConfirmationDialog` — `intent="danger"`, title names the author, body states "won't appear on your wall and can't be approved from here", confirm label "Reject testimonial". Approve & Publish stay one-click. | Q5 | `testimonial-detail.tsx` | `ConfirmationDialog` |
| AC-2 | **Toast** on every moderation action via per-call `mutate(…, { onSuccess, onError })`: concrete success ("Testimonial approved/rejected/published/unpublished") and recoverable error ("Couldn't approve — try again"). | Q4, Q8 | `use-testimonial-moderation.ts` | `sonner` `toast` |
| AC-3 | **In-flight state**: expose each mutation's `isPending` from the hook; in the footer, disable all action buttons while any action is in flight (prevents double-submit) and mark the active one. | Q4 | both files | `Button` `disabled` |
| AC-4 | **Vocabulary**: detail published-state pill "Unpublished" → **"Draft"** to match the two existing list surfaces (`shared.tsx:172`, `testimonial-row.tsx:136`). Pairs coherently with the footer verb (Draft → "Publish", Published → "Unpublish"). | Q3, Q8 | `testimonial-detail.tsx` | — |

## Out of scope / follow-ups
- **Re-moderate / un-reject flow.** Reject is one-way because the footer hides Approve once status
  leaves PENDING/FLAGGED. A true undo needs an API affordance (status → PENDING). Defer to a
  functional pass; AC-1's confirm is the interim safeguard. (Aligns with the mocks/defer-API rule.)
- **Page-variant keyboard moderation + next-item nav.** `a`/`r`/`p` and their hints are panel-only.
  Adding them to the standalone page is a functional enhancement — defer.
- **"Source" humanization** (`:266`) — only if the value space is a system enum; unknown today.
- **Global term sweep** — chose "Draft" to match the existing majority. If product later prefers
  "Unpublished" semantics, that's a one-line sweep across all three components.

## Anti-goals
- No confirmation on Approve or Publish (warning fatigue; both safe/reversible — Publish reverses
  via the same footer's Unpublish).
- No new tokens, no new shared primitives, no footer restyle for boldness. Reuse only.
- No edits to the already-audited inbox list rows or the list "Draft" labels.
- Stay warm and quiet — the goal is *trust in the action*, not visual flourish.

## Acceptance criteria (verified in after.md)
1. Clicking Reject opens a danger confirmation that names the author; cancel aborts; confirm rejects.
2. Approve / Reject / Publish / Unpublish each surface a concrete success toast and an error toast on failure.
3. While any moderation action is in flight, the footer buttons are disabled (no double-submit) and the active action is visibly pending.
4. The detail published-state pill reads "Draft" when unpublished, matching the list surfaces.
5. Gates green: `tsc --noEmit`, `eslint`, `prettier`, `pnpm build --filter web_v2`, `update-indexes.py`.
6. No regression to the panel or page variants; both still render author/quote/status/footer.
