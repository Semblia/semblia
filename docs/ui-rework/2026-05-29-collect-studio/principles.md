# Collect Studio — Principles

Reference inspected: NN/g *Direct Manipulation* UX principles
(https://www.nngroup.com/articles/direct-manipulation/), cross-read against the
Tally / Typeform theme editors and Linear settings panels. **Principles extracted, not
tokens.** Tresta stays warm slate + amber-sand; we do not import any grayscale.

## Extracted principles → Tresta adaptation

1. **Accurate state display — preview the real artifact, not a schematic.**
   *NN/g:* "Show exactly what users are building… the actual output, not a simplified
   or schematic version." → The stage should render a representative testimonial form
   (heading, a rating row, a name field, a message field, a submit button) styled by
   the live tokens — not dashed placeholder boxes that announce "no live fields here".
   This is presentation only; it introduces no new controls or data.

2. **Quiet chrome — the editor narrates the artifact, never itself.**
   The studio's own UI (stage label, tip line, panel header) should recede. No pulsing
   live-dot, no "TOKEN PREVIEW / static shell / v0.5" status broadcast. A style editor
   that talks about its own build state breaks the user's trust in the artifact.
   → At most one quiet, human line about what this surface does.

3. **Immediate, legible feedback over decorative feedback.**
   *NN/g:* "Changes must instantly reflect in the preview." Tresta already does this
   (tokens apply live). The decorative diagonal accent wash and the redundant
   bottom chip-row are *fake* feedback — they don't tell the user anything the live
   form doesn't already show. Remove them; keep the real live update.

4. **One name for one thing.**
   "Testimonial Studio" / "Form Studio" / "Back to forms" must collapse to a single
   consistent surface name. Pick the user's word: **Form Studio** (it edits a
   collection *form*; "testimonial" is the content, not the object being edited).

5. **Speak the user's language.**
   Replace "token", "static shell", "v0.5" with words a customer uses: *style*,
   *preview*, *brand*. State the deferral (builder coming later) at most once, framed
   as what they can do now ("Style your form — fields & flow are configured
   elsewhere"), never as a missing-feature apology.

6. **Earned chrome / proximity (Tresta house rule + NN/g proximity).**
   Lead the controls panel with the first real choice (House styles), directly under
   the device toggle. Don't seat a disclaimer between the actions and the first
   control.

7. **Honest, finished surface (trust).**
   For a product that hosts a customer's brand-facing form, the editor must look
   shipped. Loading shows a skeleton, not a blank screen. Tresta-side chrome uses
   Quiet-Precision tokens (`--muted-foreground`, `--border`, brand accent), not raw
   hex.

## Anti-goals (explicitly out)

- Do **not** build the form-builder (fields/steps/branching). Scope is visual only.
- Do **not** desaturate toward Linear/Vercel grayscale. The previewed form keeps its
  own `--f-*` palette; Tresta chrome keeps warm slate + amber-sand.
- Do **not** add new design-system primitives or new tokens.
- Do **not** add motion "for personality" — the live token update is the only
  feedback that earns motion.
