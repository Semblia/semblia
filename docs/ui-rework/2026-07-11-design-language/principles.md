# Design-language pass — research + principles (2026-07-11)

Reference study for one question: **what gives a Radix/shadcn-based product a
recognizable identity without losing calm professionalism?**

## Reference findings

- **Linear** — identity comes from _motion discipline_, not decoration: one
  easing family, sub-200ms UI, nothing bounces. Panels don't zoom; they
  appear with near-instant fades. Identity = restraint executed perfectly.
- **Vercel / Geist** — identity from _geometry + texture_: hairlines, grid
  and dot backgrounds on stages and empty areas, tabular numerals,
  monochrome with one accent. Dot/grid texture reads "engineering paper,"
  not ornament.
- **Stripe** — identity from _one signature color moment_: the blurple focus
  ring. Every input, every button, the same recognizable focus. Focus states
  are brandable at zero cognitive cost.
- **Attio / Notion** — warmth via paper-toned neutrals and soft depth on
  raised elements (subtle top-highlight on primary buttons; "pressed ink"
  material feel) while staying flat overall.
- **Resend / techno-dither school** — full dithered gradients, scanlines,
  terminal-dark. Distinctive but reads _techno-futurist_; 2026 SaaS design
  splits into techno-futurist vs editorial camps, and Semblia's brand
  ("Measured. Credible. Warm.", anti-reference: dark-terminal) is firmly
  editorial. **Adopt the drafting-paper end of the dot idea, reject the
  dither/terminal end.**
- **Emil Kowalski (animations.dev) framework** — adopted as motion law:
  ease-out for enter, faster exits than enters, no `scale(0)`, origin-aware
  popovers (`--radix-*-transform-origin`), no animation on
  keyboard-frequency actions, UI motion < 300ms, custom curves over CSS
  built-ins, transitions over keyframes for interruptible UI.
- **Repo's own prior research** (studios rebuild P10): "motion is
  confirmation, not decoration" — already locked; this pass extends it
  product-wide.

## Principles (the recipe)

**L1 — One material: ink on warm paper.** The app is a drafting desk for
social proof. Surfaces are warm paper; text and controls are measured ink;
the single amber accent is the pen. Every new visual decision must be
explainable in this material language.

**L2 — Texture is functional paper, not decoration.** The dot-grid reads as
the _workbench_ — it appears where artifacts sit or will sit (studio
stages, preview canvases, empty states) and nowhere else. Density stays
near-invisible (border-mix ≤ 55%). No dithered gradients, no scanlines, no
noise overlays.

**L3 — One motion vocabulary, spoken everywhere.** Two easings
(`--ease-out-quart`-class strong ease-out for enters; a quick plain ease-in
for exits), one duration scale (~120/160/240ms), one enter gesture: **rise**
(fade + small translate toward final position). Overlays rise from their
trigger origin; dialogs settle from 98% scale; nothing zooms from 95%,
nothing bounces. Exits are always faster than enters.

**L4 — Focus is the brand moment.** One amber focus signature on every
focusable control: border picks up the accent, soft amber halo ring.
Replaces the anonymous gray ring. Must hold ≥3:1 non-text contrast against
adjacent colors in both schemes (WCAG 2.2 focus-appearance).

**L5 — Waiting states carry the motif.** Loaders are dot-matrix (a triad of
pulsing dots — ink dots on paper), skeletons shimmer warmly (never
`animate-pulse`), progress feels printed, not spun. If a wait is branded,
even latency reinforces identity.

**L6 — Press is physical, hover is quiet.** Every pressable compresses
(~scale 0.98 / 1px settle) in ~120ms. Hovers only shift color/tint — no
lifts, no translates on high-frequency controls. Primary buttons get an
"inked" material: hairline top-light + soft base shade, so the one filled
CTA per page reads as the object with the most ink.

**L7 — Selection is an underline, not a pill.** The active-state language is
a sliding amber underline / edge-line (tabs, section rails already lean this
way). Muted-track pills are demoted to a segmented-control role with
hairline construction, not the default identity.

**L8 — Radix behavior is untouchable.** Semantics, keyboard interaction,
focus management, and a11y wiring stay exactly as shipped. This pass edits
class strings, tokens, and presentation wrappers only.

**L9 — Reduced motion is graceful, not broken.** Motion collapses to quick
opacity fades under `prefers-reduced-motion`, keeping comprehension cues.

**L10 — Delete the dialects.** Per-surface keyframe families collapse onto
the shared vocabulary. A new surface must not be able to invent a new
easing/duration without touching the token layer.
