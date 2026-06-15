# Forms-v4 Studio — Before-audit (2026-06-15)

Surface: `apps/web_v2/components/collect/studio/{studio-client,studio-editor,studio-preview}.tsx`
Route: `/projects/[slug]/collect/[formId]` (nested in the `(app)` shell)

## What it is
A form builder: left 440px tabbed editor (Content / Questions / Layout / Theme) + right
WYSIWYG iframe preview rendered through the production `forms-core` engine.

## Design Health (Nielsen 0–4) — 17/40, below average

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of status | 2 | Save/Publish/dirty pill present; preview has no hosted-vs-embed framing |
| 2 | Match real world | 2 | "Surface style / Accent intensity / Neutral tone" are engine words |
| 3 | User control & freedom | 1 | Conditional rule, once on, hides the question forever; no reset-to-project; no undo |
| 4 | Consistency & standards | 1 | Native `<select>` in a shadcn app; studio nested in app shell unlike a real editor |
| 5 | Error prevention | 1 | Empty-value condition is a foot-gun; free-text option matching |
| 6 | Recognition vs recall | 2 | Condition value typed free-text; must recall exact option string |
| 7 | Flexibility & efficiency | 2 | One brand color only; layouts have zero knobs |
| 8 | Aesthetic & minimalist | 2 | Restrained but charmless; preview floats in a flat muted box, not a canvas |
| 9 | Error recovery | 2 | Save/publish toasts, but no inline validation surfacing |
| 10 | Help & docs | 2 | Sparse hints; layout/theme knobs unexplained |

## Anti-patterns verdict
Not glossy AI-slop — it inherits the restrained Quiet Precision tokens. The failure is the
opposite: **under-designed**. A column of inputs next to an iframe, no spatial intent, no
canvas, tool-grade chrome. Reads as "internal admin tool," not "professional studio."

## What's working (keep + build on)
- True-WYSIWYG render path — the preview calls the exact production renderer, so it can't drift.
- AA-safe derived theme engine (`@workspace/brand-theme`).
- Restrained warm-neutral token palette.

## Priority issues
- **[P0] Nested + whole-page scroll + layout shift.** No editor authority; panes don't scroll
  independently; device/tab changes jump.
- **[P0] Conditional questions foot-gun.** Default empty value → permanently hidden; free-text
  option matching; native selects.
- **[P1] Branding disconnected & unbranded by default.** Raw URL logo field; empty header;
  no link to Settings → Branding.
- **[P1] Native selects + engine jargon.**
- **[P1] No per-layout knobs; theme too restrictive.** Split is a flat colored panel; one color.
- **[P2] Preview lacks canvas intent.** No chrome, no zoom, no hosted-vs-embedded framing.

## Persona red flags
- **Jordan (first-time builder):** enables a condition → the question vanishes, no explanation → abandons.
- **Alex (founder/power user):** wants the split panel to show a testimonial quote + logo →
  can configure neither → ships the plain card.
