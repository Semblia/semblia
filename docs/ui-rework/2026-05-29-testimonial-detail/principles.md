# Principles — testimonial moderation detail view

## Sources inspected

- NN/g, *Confirmation Dialogs Can Prevent User Errors — If Not Overused*
  (https://www.nngroup.com/articles/confirmation-dialog/)
- NN/g, *Indicators, Validations, and Notifications: Pick the Correct Communication Option*
  (https://www.nngroup.com/articles/indicators-validations-notifications/)
- Product reference (prior knowledge): Front / Linear / Superhuman triage-detail patterns —
  keyboard-first moderation, optimistic state change, and undo-over-confirm where the action is
  reversible.

Per the workflow: **principles, not tokens.** Semblia stays warm (Quiet Precision amber-sand); we
borrow behavior, not Linear/Front greyscale.

## Extracted principles

### Destructive / consequential actions (NN/g confirmation article)
- P1. **Reserve confirmation for serious, hard-to-reverse consequences.** Don't confirm routine
  operations — warning fatigue makes users click through everything.
- P2. **Prefer undo over confirmation when the action is reversible.** A safety net beats a speed
  bump. Confirmation is the fallback for when undo isn't available.
- P3. **Be specific.** Name the object and state the precise consequence — not "Are you sure?".
- P4. **Action-oriented button labels** ("Reject testimonial" / "Keep") that summarize the outcome,
  not "Yes/No".

### Action feedback (NN/g notifications article)
- P5. **Never let a consequential action fail silently.** The user must see that it took effect —
  and must see errors, with a path to recover.
- P6. **Match intrusiveness to importance.** Passive success → non-intrusive toast near the
  workflow. A required, irreversible decision → a modal step.
- P7. **Communicate the state change concretely** — which item, what its new status is — not a
  generic "Done".

### Triage-detail product patterns
- P8. **Prevent double-submits and show in-flight state.** The control that triggered the
  mutation should disable + indicate progress until the server confirms; the rest of the surface
  stays legible.

## Adapted for Semblia (this surface)

1. **Reject is one-way from this UI** (the footer hides Approve once status leaves PENDING/FLAGGED).
   No undo API exists today (P2 unavailable), so apply P1/P3/P4: a single lightweight
   `ConfirmationDialog` (the existing primitive) before Reject — danger intent, names the author,
   button reads "Reject testimonial".
2. **Approve and Publish are not confirmed.** Approve is benign; Publish is reversible in one click
   via Unpublish in the same footer (P2 satisfied by the existing toggle). Confirming either would
   be warning fatigue (P1). Leave them one-click.
3. **Every moderation action toasts** (P5–P7) using the app-wide `sonner` pattern already used in
   `danger-client`, `project-create-client`, account pages: `toast.success(<concrete state>)` /
   `toast.error(<recoverable message>)`. This also closes the Q8 consistency gap.
4. **Footer buttons reflect pending state** (P8): disable + a quiet in-flight cue while the mutation
   is in flight, mirroring how `ModerationItem` already uses its `resolving` set.
5. **Stay warm and quiet.** No new color, no bold restyle of the footer, no new shared primitive.
   Reuse `ConfirmationDialog`, `sonner`, existing `Button`/`ActionButton`. The point is *trust*,
   not visual flourish — directly answering the user's "feel human, not like an AI refine pass".

## Anti-goals
- Do **not** add confirmation to Approve or Publish (fatigue; both are safe/reversible).
- Do **not** restyle the footer for boldness or introduce new tokens/primitives.
- Do **not** touch the already-audited inbox list rows (`TestimonialRow`/`ModerationItem`) or the
  list's "Draft" label beyond the single shared-vocabulary decision recorded in `decision.md`.
- Do **not** build a re-moderation / un-reject flow — that needs API support; record as follow-up.
