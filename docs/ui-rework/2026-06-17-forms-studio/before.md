# Form Studio — before-audit (2026-06-17)

Surface: `apps/web_v2/components/collect/studio/*` (the parametric forms-v4 studio).
Method: code read (studio is behind Clerk auth; live drive not available this
session — `agent-browser` can't attach to the logged-in Chrome, per
`docs/research/2026-06-15-studio-competitors/`). Grounded in the real component
source + the forms-core contract + `.impeccable.md` design context.

## What it is today

`studio-client.tsx` shell: topbar (back / form name / status pill / Save / Publish)
over a body of `[editor 420px] | [PreviewCanvas flex-1]`. The editor
(`studio-editor.tsx`) is a `PageTabs` 4-tab rail — **Content / Questions / Layout /
Theme** — of stacked `Field`s.

The preview (`preview-canvas.tsx`) is genuinely good: it renders the **production
forms-core renderer** in a scaled browser-chrome iframe, with hosted/embed +
form/thank-you + device + zoom toggles. **Keep it.** The engine (`@workspace/forms-core`
+ `@workspace/brand-theme`) is solid and backward-compatible. **Keep it.**

## Design Health — Nielsen heuristics (~24/40, "functional but underwhelming")

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | Status pill + live preview good; no per-knob feedback |
| 2 | Match real world | 2 | "Neutral tone / accent intensity" are jargon with no visual referent |
| 3 | User control & freedom | 3 | Reset-to-preset / Auto exist; no global undo |
| 4 | Consistency | 3 | Consistent with Settings surfaces — which is the problem |
| 5 | Error prevention | 3 | AA clamp + satisfiable showIf defaults + Zod validation — strong |
| 6 | **Recognition vs recall** | **1** | **Every visual choice is a text dropdown** |
| 7 | Flexibility & efficiency | 2 | No type palette / quick-add; reorder = two 14px arrows |
| 8 | **Aesthetic / minimalist** | **2** | **Reads as a settings form; presets are text chips** |
| 9 | Error recovery | 3 | Fine |
| 10 | Help & docs | 2 | Hints exist; visual choices lack examples |

## Priority issues

- **[P0] Visual choices rendered as dropdowns.** Appearance, radius, density,
  typeface, surface style, accent intensity, neutral tone, button style — 8
  `<Select>`s in a 2-col grid. Recognition-over-recall is violated: the user
  can't see what they're choosing. → visual pickers (segmented w/ icons, swatch
  tiles, live mini-previews).
- **[P0] Presets have no visual representation.** Theme presets = 6 text chips;
  layout presets = text-only cards. We already render themed miniatures
  (`FormCardPreview`) and can derive a faithful theme swatch via
  `resolveThemeSnapshot`. → live, themed preset cards.
- **[P1] Editor reads as a settings page, not a studio.** Flat tab rail, equal-
  weight stacked fields, no studio chrome. → section rail (icon+label), sectioned
  inspector, visual rhythm.
- **[P1] Question composer is thin.** Plain accordion + up/down arrows, no
  type palette, type change buried in an expanded `<Select>`. → icon type-picker
  (Tally-style quick add), clearer per-row affordances.
- **[P2] Monotonous spacing; every control equal weight.** → rhythm + grouping.

## Constraints carried into the rebuild (locked, do not violate)

- No drag-and-drop, ever (locked product decision). Reorder via controls.
- No freeform style knobs — appearance is constrained knobs → AA-clamped
  derivation. New visual capability = new constrained knob, not free CSS.
- The studio preview MUST keep using the production forms-core renderer.
- Backward compatible with stored `FormDefinitionDoc`s (schemaVersion 2).
