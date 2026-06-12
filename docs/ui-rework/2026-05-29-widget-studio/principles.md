# Widget Studio — Principles

This surface did not warrant fresh external research: it is already a well-built
direct-manipulation editor, and the NN/g principles fetched for the Collect studio
(`docs/ui-rework/2026-05-29-collect-studio/principles.md`) apply unchanged. The
governing principle here is **in-house consistency**, not external inspiration.

## Principles applied

1. **One product family (cross-studio consistency).**
   The Widget and Collect studios share `StudioMark` and a near-identical shell. After
   the Collect refinement they must keep agreeing: no version/beta caption in the panel
   header, quiet tokenized stage chrome, warm palette only.

2. **Warm palette, no ad-hoc accent colors.**
   Quiet Precision is warm slate + a single amber-sand accent (`--brand`). Emerald and
   indigo are not in the system. Semantic "kind"/"live"/"nudge" signals reuse `--brand`,
   `--foreground`, and `--muted-foreground` rather than importing green/violet — the icon
   (Globe vs Code) already differentiates widget kinds, so color need not carry it.

3. **Tokenize Semblia-side chrome.**
   The stage background/label colors describe Semblia's *own* editor UI, so they belong on
   `bg-muted` / `text-muted-foreground`, not raw hex. (The `--w-*`/widget tokens *inside*
   the rendered widget describe the customer's artifact and stay untouched.)

4. **Speak plainly.**
   "Embedded inside a faux site" → a plain description of what the user is looking at.

5. **Don't fake what isn't there (mild).**
   A placeholder that looks like a real scannable QR, sitting next to "Coming next", is
   self-contradictory. Either label it unmistakably as a placeholder or keep it visually
   neutral. Low priority — it is already honestly captioned.

## Anti-goals (explicitly out)

- **No redesign.** The full-rework gate did not trigger; this is a normalize pass.
- Do **not** touch the controls' functional sections, the preview renderer, the share
  snippets, the store, or any behavior.
- Do **not** change product domains (`semblia.com` vs `semblia.com`) — that is a
  correctness/config question, recorded as a follow-up, not a visual change.
- No new tokens, no new primitives, no new motion for personality.
