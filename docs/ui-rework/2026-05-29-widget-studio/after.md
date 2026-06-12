# `/projects/[slug]/widgets/[id]` — Widget Studio — After-audit

Scoped **normalize pass** (the full-rework gate did not trigger — see
[before.md](./before.md)). Only the enumerated Q8 consistency defects were touched; no
redesign, no functional changes.

## Resolution map

| Before NO/minor | AC | Resolved? | Where |
| --------------- | -- | --------- | ----- |
| Q8 — `v0.1 · preview` header caption (cross-studio drift) | AC-1 | **Yes** | `StudioMark` now `name="Widget Studio" status="Layout & style"`, `version` dropped (`widget-studio-controls.tsx:122-125`) — parallels Collect's `status="Brand & style"` |
| Q8 / mech #3 — raw-hex stage chrome | AC-2 | **Yes** | `--stage-bg/#ebe8e0` + `--stage-chrome/#8d8b83` removed from `STAGE_CSS`; stage is `bg-muted`, chrome/tip text `text-muted-foreground` (`widget-studio-preview.tsx`) |
| Q8 / Q6 — emerald `#10b981` pulsing live-dot + glow | AC-3 | **Yes** | Now a small static `bg-brand` dot; green glow + `widget-stage-pulse`/`widget-stage-live` keyframes removed. "LIVE PREVIEW" label kept (preview is genuinely live) |
| Q8 — emerald wall-pill status dot | AC-4 | **Yes** | `bg-brand ring-brand/20` (`widget-studio-topbar.tsx:105-108`) |
| Q8 — emerald rail type-badge | AC-4 | **Yes** | wall badge `bg-brand text-background`; embed unchanged `bg-foreground/80` (`widget-studio-rail.tsx:151-153`) |
| Q8 — indigo first-run share-pulse | AC-5 | **Yes** | keyframe box-shadow now `color-mix(in oklch, var(--brand) …, transparent)`; reduced-motion opt-out kept (`widget-studio-topbar.tsx`) |
| Q3 — "Embedded inside a faux site" tip | AC-6 | **Yes** | → "Shown on a sample page" (`widget-studio-preview.tsx`) |
| Q7 — fake QR glyph | AC-7 | **Deferred (justified)** | Left as-is: already honestly captioned "A scannable QR will be generated … Coming next.", so it does not deceive. Softening risked scope creep for no real gain |

## Re-run — Core Questions

- **Q1** YES — beta caption gone. **Q2** YES (unchanged). **Q3** YES — "faux site" phrase
  humanized. **Q4/Q5** YES (unchanged, already strong). **Q6** YES — the one pulsing
  decoration is now a calm brand dot. **Q7** YES — only the captioned QR placeholder
  remains. **Q8 — now YES:** all emerald/indigo/raw-hex chrome is on Quiet-Precision
  tokens; the two studios read as one family. **Q9/Q10** YES.

## Mechanical Quality Gate (re-run)

1. Keyboard — YES. 2. Focus — YES. 3. Contrast — **YES** (chrome now `text-muted-foreground`
   on `bg-muted`, theme-tracked). 4. Targets — YES. 5. Status not color-alone — YES
   (live dot still paired with "LIVE PREVIEW" text). 6. Narrow + wide — YES. 7. Functional
   flows — Save/Reset/Share/rename/rail-nav/leave-guard/Cmd+S untouched; build + tsc +
   lint green.

## Behavior changes a user would notice

1. The controls header no longer shows a `v0.1 · preview` version tag — it reads
   "Widget Studio · Layout & style", matching the Form Studio.
2. The preview stage's "live" dot is a small calm amber (brand) dot instead of a pulsing
   green one; the stage background tracks the app's muted surface in light/dark.
3. The wall-URL pill dot and the wall rail badge are amber (brand) rather than green;
   the Globe/Code icons still distinguish wall vs embed.
4. The first-save Share-button nudge pulses in the brand color, not indigo.
5. The embed preview caption reads "Shown on a sample page".

## Verification gates

| Gate | Status |
| ---- | ------ |
| `pnpm exec tsc --noEmit` | **Pass** (exit 0) |
| `pnpm exec eslint …` (touched) | **Pass** (no output) |
| `pnpm exec prettier --write` (touched) | **Pass** |
| `pnpm build --filter web_v2` | **Pass** (2 tasks, 35.9s) |
| `python scripts/update-indexes.py` | **Pass** |

## Follow-ups logged

- **Product domain `semblia.com` vs `semblia.com`.** Hard-coded `semblia.com` appears across
  the topbar wall pill, preview wall URL, and share-drawer snippets/CDN/embed URLs
  (`widget-studio-topbar.tsx:54`, `widget-studio-preview.tsx:241`,
  `widget-share-drawer.tsx:201,251,252`). Test creds use `semblia.com`. This is a
  correctness/config question, not a visual one — flagging for the team to confirm the
  canonical domain; left unchanged this pass.
- **Share-drawer success greens.** The "Copied" state and the "Edits auto-deploy" /
  first-run "Your widget is live" callouts use emerald as semantic success feedback
  (`widget-share-drawer.tsx`). Left intact — defensible success semantics, and recoloring
  would be over-reach for a consistency pass. Revisit only if the team wants success
  states on a warm token too.
- **QR placeholder.** When the real QR generation lands, replace `QRGlyph`'s
  pseudo-random grid with a real scannable code.
- **Rail hover `-translate-y-px`** is a mild translate-on-hover (design system prefers
  paper-press). Not a color/consistency defect; left for a future motion pass.
