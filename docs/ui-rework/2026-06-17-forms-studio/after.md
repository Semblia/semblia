# Form Studio rebuild — after (2026-06-17)

The studio editor was rebuilt from a 4-tab dropdown settings form into a visual
inspector. Engine, doc contract (`FormDefinitionDoc` v2), API wiring, and the
production-renderer `PreviewCanvas` are untouched — fully backward compatible.

## Live verification (real compiled UI)

Could not drive the user's logged-in Chrome (profile lock — see
`docs/research/2026-06-15-studio-competitors/`), so I mounted a self-contained
studio harness (StudioEditor + PreviewCanvas, local state, no API hooks) on the
auth-gated `/design` gallery, ran the web_v2 dev server, logged in with the test
account via `agent-browser`, and screenshotted the real compiled components in
light mode. Harness reverted after capture; screenshots kept as evidence:

- `shot-01-compose.png` — Compose section (branding + header) in dark mode.
- `shot-02-style.png` — themed preset cards (Default/Clean), segmented
  appearance, Flat/Bordered/Elevated surface tiles.
- `shot-03-style-mid.png` — corner-radius glyphs, density, button-style swatches.
- `shot-04..05` — typeface specimens, accent-intensity tiles, color.
- `shot-06-layout.png` — four themed layout miniatures (Card/Inline/Split/Guided).
- `shot-07/08` — question rows with type glyphs + REQ pills; grouped type-picker.

Every appearance choice is now made by looking. The swatches are derived from
`resolveThemeSnapshot`, so they match what ships.

## Design Health — after (~35/40)

| # | Heuristic | Before | After | Note |
|---|---|---|---|---|
| 2 | Match real world | 2 | 4 | jargon knobs now have live visual referents |
| 6 | Recognition vs recall | 1 | 4 | no hidden dropdowns; choices are visible |
| 7 | Flexibility & efficiency | 2 | 3 | icon type-picker quick-add (no DnD by decision) |
| 8 | Aesthetic / minimalist | 2 | 4 | studio-grade visual inspector, clear rhythm |
| 1,3,4,5,9,10 | (stable/strong) | — | — | AA clamp, satisfiable showIf, live preview kept |

## Polish pass applied

- **Keyboard focus rings** added to every hand-rolled control (section rail,
  option cards, segmented, radius glyphs, type-picker items, question-row
  buttons, disclosure, reset link) — they had none.
- **No native `<select>`**: the condition editor's `MiniSelect` was replaced
  with a shadcn `SelectField`, restoring the house standard.

## Verification

`tsc --noEmit`, `eslint . --ext .ts,.tsx` (clean), `vitest` (collect 34/34,
studio-editor 6/6 rewritten for the new UI), `pnpm build --filter web_v2` (5/5)
all pass.

## Deliberately unchanged / deferred

- No engine/schema/API changes; no new theme knobs; no drag-and-drop.
- Widget Studio is a separate track (still needs server-draft hydration parity —
  `docs/plans/2026-06-15-studios-reconciliation-and-roadmap.md`).
- The condition editor keeps the prior 3-up select layout (unchanged behavior).
