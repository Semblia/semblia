# Design-language pass — before-audit (2026-07-11)

Goal: the system is solid but reads as "well-groomed default shadcn." This
audit names exactly _where_ the generic feel comes from, so the fix targets
causes, not vibes.

## What is already ours (keep, don't relitigate)

- **Palette** — "Quiet Precision" warm-slate/linen OKLCH neutrals + single
  amber-sand `--brand`. Genuinely custom, matches the brand personality
  (Measured. Credible. Warm.). Not the problem.
- **Icons** — Phosphor (not lucide). Already a differentiator.
- **Radius geometry** — tightened scale (`--radius: 0.5rem`, controls
  rounded-lg, surfaces rounded-xl). Fine.
- **Hairline construction** — cards/overlays use `ring-1 ring-foreground/8`
  instead of borders. Good bone structure.
- **Dot-grid stage** — `.tf-stage-grid` already renders the studio canvas as
  dotted drafting paper. A native seed for a texture motif; currently used in
  exactly one place.

## Where the generic feel actually lives

1. **Overlay motion is the shadcn signature.** Dialog, dropdown, select,
   popover, context-menu, tooltip, hover-card all use tw-animate-css
   `fade-in-0 zoom-in-95` from center-ish origins at ~100–150ms. This
   fade+zoom pair is the single most recognizable "default shadcn" tell —
   every Radix-based SaaS ships it.
2. **Skeleton = `animate-pulse bg-muted`.** Literally the stock one-liner.
   globals.css even defines `.animate-shimmer` with a comment "use instead
   of animate-pulse for feel" — and the Skeleton component doesn't use it.
3. **Spinner = spinning icon glyph** (`CircleNotch` + `animate-spin`).
   Interchangeable with every other app.
4. **Tabs = pill-in-muted-track** as the default variant (stock). The `line`
   variant with the brand underline exists but the underline pops via
   opacity — it doesn't slide — and the pill variant is what stock demos
   look like.
5. **Focus ring is anonymous.** `focus-visible:ring-3 ring-ring/30` with
   `--ring` = warm gray. Correct, invisible, and identical to every shadcn
   app. Focus is a high-frequency brand moment going unused.
6. **Motion vocabulary is fragmented.** ~30 one-off keyframes named per
   surface (`auth-*`, `onboard-*`, `detail-*`, `settings-*`, `help-fab-*`,
   `tf-*`, `step-*`) with four easings used interchangeably
   (`0.16,1,0.3,1`, `0.23,1,0.32,1`, `0.4,0,1,1`, `ease`) and durations
   from 100ms to 600ms chosen ad hoc. Every surface animates _similarly but
   not identically_ — which is exactly what "individually styled shadcn
   components" feels like.
7. **Buttons are flat fills.** Default variant is `bg-primary` with an
   opacity-hover. No material feel; press feedback exists
   (`active:translate-y-px`) but there is no depth language tying primary
   actions together.
8. **Empty/loading/feedback states are unthemed.** Empty is a dashed box;
   loaders are generic; nothing connects "waiting" to the brand.

## Positioning check (dev tool ↔ commercial product)

Users are SaaS founders, indie devs, consultants — dev-adjacent buyers, but
the _job_ is commercial: collect, curate, and publish human trust signals.
Touchpoints split ~60/40 commercial/developer (forms, walls, widgets vs
embed snippets, API keys, webhooks). The app must feel like a **credible
professional instrument**, not a terminal and not a marketing toy. The prior
studios research already fixed the analogous choice for editors: visual
instrument (Figma/Typeform) over settings panel (Linear) — the same logic
holds product-wide.
