# Form Studio rebuild — principles (2026-06-17)

From `.impeccable.md` (Measured · Credible · Warm; Linear/Vercel/Notion refs;
light, warm-slate + sparing amber-sand accent) and the forms-v4 locked
architecture.

1. **Show, don't tell.** Every visual choice is made by *looking* at the choice,
   not reading a word in a dropdown. Swatches, segmented controls with icons,
   and live themed miniatures replace all 8 appearance `<Select>`s. The miniature
   is derived from the *real* engine (`resolveThemeSnapshot`) so it can't lie.

2. **It's a studio, not a settings page.** A slim section rail (icon + label)
   on the left, a focused inspector beside it, the production preview filling the
   rest. Sectioned, with visual rhythm — not a monotonous stack of equal fields.

3. **Constrained, never freeform.** The rebuild expands *affordance*, not
   capability. Same knobs, same AA-clamped derivation, same doc contract. No new
   freeform style surface, no drag-and-drop. Restraint is the brand.

4. **Compose fast, like Tally.** Adding a question is one click to an icon
   type-picker; each row shows its type at a glance; reordering and editing are
   obvious. Keyboard-friendly.

5. **The accent is precious.** Amber-sand `--brand` marks only the active
   section, the selected option, and the primary Publish action. Everything else
   is warm neutral. Selection state uses shape + ring, never color alone (#4).

6. **Honest WYSIWYG.** The preview is the production renderer; the inspector's
   mini-swatches are derived from the same engine. What you pick is what ships.

7. **Progressive disclosure.** Per-question detail, conditional logic, and color
   overrides stay tucked until asked for. The first read is calm.
