# `/projects/[slug]/collect/[formId]` — Collect Studio — After-audit

Re-runs the [before.md](./before.md) checklist against the implementation, verified
against [decision.md](./decision.md). Scope was **visual / UX refinement only** — no
form-builder functionality was added.

## Resolution map

| Before NO | AC   | Resolved? | Where |
| --------- | ---- | --------- | ----- |
| Q1 — three different surface names | AC-1 | **Yes** | Topbar center "Form Studio" (`studio-topbar.tsx:81`); panel header `StudioMark name="Form Studio" status="Brand & style"` with `v0.5` badge removed (`studio-controls.tsx:30-42`) |
| Q2 — disclaimer competes with first control | AC-3 | **Yes** | "Static shell mode…" box deleted; House styles is now first under the Remix/Reset actions (`studio-controls.tsx`) |
| Q3 — developer/system copy everywhere | AC-2 | **Yes** | Removed "token preview", "static studio shell", "tune the visual tokens", "v0.5". Stage label → "Preview"; tip → "Changes apply live · ⌘S to save" (`studio-preview.tsx`) |
| Q4 — blank screen while loading | AC-6 | **Yes** | `StudioLoadingSkeleton` renders sidebar + stage placeholders when `!draft` (`studio-shell.tsx:40-59,197-199`) |
| Q6 — competing stage chrome | AC-5 | **Yes** | Pulsing live-dot + `stage-pulse` keyframes removed; diagonal accent wash removed; 4-up chip row removed |
| Q7 — redundant/apologetic elements | AC-4 | **Yes** | `TokenChip` row deleted; dashed placeholders + "no live fields here" replaced with a representative styled form (eyebrow, heading, rating, two fields, submit) |
| Q8 — raw hex chrome outside token system | AC-5 | **Yes** | Stage chrome now `bg-muted` + `text-muted-foreground` + `font-mono` utility; `--stage-*` hex vars and hard-coded `"Geist Mono"` removed. `--f-*` tokens *inside* the frame kept (they describe the customer's form) |
| Q9 — reads as unfinished internal tool | AC-2/AC-4 | **Yes** | All beta/version/"static shell" narration gone; preview shows a confident, finished form sample |
| Mech #2 — preset cards lack focus ring | AC-7 | **Yes** | `focus-visible:ring-2 ring-ring ring-offset-1 ring-offset-sidebar` added (`controls-style-presets.tsx:28`) |
| Mech #3 — stage tip contrast < 3:1 | AC-5 | **Yes** | Tip uses `text-muted-foreground/70` on `bg-muted` (theme-tracked, meets contrast) instead of `#b8b7b1` on `#eae7df` |

## Re-run — Core Questions

- **Q1 Understandable surface/next step?** YES — one name ("Form Studio"), panel leads
  with House styles, the preview itself communicates what's being styled.
- **Q2 Clear primary path, no competing emphasis?** YES — disclaimer gone; preview is
  the focus, controls read top-down.
- **Q3 User's language?** YES — "style", "preview", "brand"; no token/shell/version
  jargon.
- **Q4 System state clear?** YES — loading skeleton added; dirty/saving/success/error
  unchanged and already solid.
- **Q5 Mistakes prevented/communicated?** YES — unchanged (leave-guard + confirmation
  dialog intact).
- **Q6 Deliberate hierarchy?** YES — single focal form card; chrome recedes.
- **Q7 Every element useful?** YES — redundant chips/placeholders removed; every
  preview element now represents the real form.
- **Q8 Consistent with Tresta?** YES — Tresta-side chrome on tokens; consistent naming.
- **Q9 Trustworthy?** YES — surface reads as shipped.
- **Q10 Would leaving unchanged harm?** No longer applicable — the harm (self-advertised
  incompleteness) is removed.

## Mechanical Quality Gate (re-run)

1. Keyboard reachable — YES (unchanged). 2. Focus visible — **YES** (preset ring added).
3. Contrast — **YES** (tokenized chrome). 4. Targets — YES. 5. Status not color-alone —
YES. 6. Narrow + wide — YES (skeleton respects `isDesktop`; preview centers and scrolls).
7. Functional flows rechecked — Save/Reset/Remix/leave-guard/Cmd+S paths untouched;
build + typecheck + lint green.

## Behavior changes a user would notice

1. The editor is consistently called **Form Studio**.
2. The controls panel opens straight into House styles (no disclaimer box).
3. The preview now shows a real-looking testimonial form (brand line, "Share your
   experience", a 5-star row, name + testimonial fields, a "Send testimonial" button)
   that restyles live as tokens change — instead of dashed "placeholder" boxes.
4. The pulsing amber dot, accent wash, and the redundant Field-shape/Density/Button/
   Texture chip row are gone; the stage chrome is a quiet "Preview" + device dimensions.
5. While the form loads, a skeleton appears instead of a blank screen.

## Verification gates

| Gate | Status |
| ---- | ------ |
| `pnpm exec tsc --noEmit` (apps/web_v2) | **Pass** (exit 0) |
| `pnpm exec eslint …` (touched files) | **Pass** (no output) |
| `pnpm exec prettier --write` (touched files) | **Pass** |
| `pnpm build --filter web_v2` | **Pass** (2 tasks, 32.9s) |
| `python scripts/update-indexes.py` | **Pass** (vector + graph incremental) |

## Follow-ups logged

- **Semantic graph extraction skipped** by `update-indexes.py` (needs Claude); run
  `/graphify apps/web_v2 apps/api_v2 packages --update --no-viz` when convenient.
- **`StudioPreview`/`StudioControls` keep their `if (!draft) return null` guards.** They
  are now dead (the shell gates on `!draft` first) but harmless and defensive; left in
  place. Not worth a separate slice.
- **Widget Studio** still carries its own `StudioMark` "v… · preview" caption and a QR
  placeholder — out of scope this session; candidate for the next surface.
- **Representative preview is static.** When the real field/flow builder lands, the
  preview should switch to render the actual configured form; the token-driven styling
  layer is already in place to receive it.
