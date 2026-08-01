# 2026-08-02 (late) — Review flow, dark palette, copy diet

User verdict driving this pass: the dark theme's warm tone doesn't fit;
light mode is fine. The billing page has a spacing bug. The approval /
reading / moderation screens are confusing. Most surfaces carry too much
hand-holding text. Responses should be list → detail with real filters.

## Decisions

1. **Dark mode is neutral graphite, not warm slate.** The desk-and-paper
   warmth (oklch hue 55–70) belongs to light mode; at night it reads as a
   brown film. Dark surfaces/foregrounds move to hue 255 at chroma ≤ 0.006
   so the amber pen is the only warmth on the page. Brand, semantic colors,
   and light mode untouched. All token-driven — no component changes.

2. **Billing joins the gutter grid.** Usage and Plans were unbounded
   `Section`s with no horizontal padding — flush to the viewport edge while
   every `SettingsSection` sat inside `px-4 sm:px-6`, and "View plans"
   clipped at the right edge. Both now carry the settings gutter and the
   section hairline. The start-aligned `EmptyState` also drops `py-10` →
   `py-4`: under a padded section header it read as a hole in the page.

3. **Responses is list → detail.** The split-pane made one screen do two
   jobs. The queue is now a full-width index — status pills, form filter
   (rendered only when >1 form exists), source filter (from forms /
   imported), sort (newest/oldest/rating), search — and each row opens
   `/[slug]/responses/[id]`. The detail page: person on the left rail
   (identity, consent verdict + matrix, provenance, automated check), the
   testimonial on the right and wider, one decision bar under it. On the
   phone the quote and the decision come first, the person after.
   `api_v2` list gained `formId` and `origin` narrowing.

4. **Helpers get out of the way.** The moderation verdict's "You decided …
   Your decision is what counts —" paragraphs are gone ("Advisory only"
   carries the whole disclaimer). Section descriptions across developers /
   forms / projects / analytics / settings drop their product-lecture
   sentences. Security and consequence copy (trust, destructive confirms,
   MFA) kept.
