# Widget Studio rebuild — principles (2026-06-17)

Same principles that drove the Form Studio rebuild (`docs/ui-rework/2026-06-17-forms-studio/principles.md`),
re-pointed at widgets. From `.impeccable.md` (Measured · Credible · Warm; Linear/Vercel/
Notion refs; light, warm palette + sparing brand accent) and the locked parametric model.

1. **Show, don't tell.** Every appearance choice is made by *looking* at the choice, not
   reading a word in a dropdown. Themed mini testimonial cards (`WidgetThemeSwatch`) and
   segmented controls with icons replace the Type/Neutral/Button dropdowns and the
   flat-chip preset/surface previews. The miniature is derived from the *real* engine
   (`resolveBrandTheme`) so it can't lie.

2. **It's a studio, not a settings page.** A focused, section-switched inspector — one
   concern at a time (Layout · Style · Content) — beside the production preview. Not a
   six-deep accordion dumped in one scroll.

3. **One control vocabulary, shared with the Form Studio.** `Segmented` for 2–4 mutually
   exclusive options, `OptionCardGroup` for choices that deserve a themed preview,
   `Section`/`Field`/`SwitchRow` for structure. No bespoke per-section widgets.

4. **Constrained, never freeform.** The rebuild expands *affordance*, not capability.
   Same knobs, same AA-clamped derivation, same `WidgetDefinitionDoc` v1 contract. No new
   freeform style surface, no drag-and-drop. Restraint is the brand.

5. **The accent is precious.** The brand color marks only the active section, the selected
   option (ring + check), and the primary action. Everything else is warm neutral.
   Selection uses shape + ring, never color alone.

6. **Honest WYSIWYG.** The preview is the production shadow-DOM renderer; the inspector's
   mini-cards derive from the same `resolveBrandTheme`. What you pick is what embeds.

7. **Keep what already works.** The sibling-widget switcher rail, the live shadow-DOM
   preview, the share drawer, the unsaved-changes guard, `⌘S`, mobile tabs — all retained.
   This is a controls/vocabulary rebuild, not a shell rewrite.
