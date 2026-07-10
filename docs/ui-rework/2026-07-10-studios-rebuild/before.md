# Studios rebuild — before-audit (2026-07-10)

Context: the user rejected PR #40 ("guided five-section editors") because it
reshuffled inspector content without changing the studio's bones. This audit
names what is actually wrong with the studios as they exist on `main` today,
from the code (`components/studio/`, `components/forms/studio/`,
`components/widgets/studio/`) and the user's own words.

## User's verdict (verbatim themes)

- "Interactions: clanky, abrupt."
- "Previews: broken, uncontrolled, poor scaling, lacks true full screen
  preview, in a new page (take inspiration from Figma)."
- "Everything feels over-enforced, like the large multi-color config sidebar
  for all the templates, layouts, alignments — almost everything is a large
  multi-color ugly mini-card style button."
- "Visual builders should be intuitive, not guided by holding hands — a user
  should be able to build anything by looking at the configs and the
  interactions."

## Diagnosis from code

### 1. Control vocabulary: one loud shape for every decision

`OptionCardGroup` (controls.tsx) — a large bordered card with a 16:10 preview
area, brand ring, floating check badge, label + hint text — is used **44 times
across 9 files** for *everything*: intent templates, layout presets, color
schemes, corner radius, density, button style, background, alignment, widget
variation. In a fixed 340px sidebar, 2-col grids of these cards stack into the
"multi-color mini-card wall" the user hates. There is no hierarchy between a
primary decision (theme) and a minor knob (alignment); everything shouts at
the same volume. Professional inspectors (Figma, Framer) use compact rows —
icon segments, swatches, steppers, small selects — and reserve visual preview
tiles for genuinely visual choices only.

### 2. Preview: two ad-hoc stages, neither controlled

- **Forms** (`form-studio-preview.tsx`): the form renders at a fixed
  `max-w-xl` CSS width inside a `max-w-4xl` faux BrowserChrome. There is **no
  scaling at all** — no zoom, no fit, no percentage readout. On a narrow
  stage the frame just shrinks and the content reflows, so the preview stops
  being truthful (WYSIWYG breaks exactly when you resize).
- **Widgets** (`widget-studio-preview.tsx`): auto-fit only —
  `min(availW/1280, availH/800) * 0.96` clamped to [0.2, 1]. The user cannot
  set zoom, cannot view at 100%, and a 1280px desktop frame squeezed to ~55%
  renders testimonial text unreadably small.
- **No true fullscreen preview**, and no dedicated preview page (the Figma
  "Present in new tab" pattern). The only escape hatch is the live hosted
  URL, which requires publishing first.
- The two studios implement completely different stage chrome (forms: header
  segmented controls; widgets: floating pills + status line), different
  device dims, different tips.

### 3. Interactions: instant swaps, no motion model

- Rail section changes swap the inspector subtree instantly — content pops.
- Mobile flips panels with `display: none`.
- The forms renderer remounts on structural key changes — visible flash when
  adding/removing a field.
- No entrance/exit transitions anywhere in the inspector; the only animation
  in the studios is the widget stage's scale transition and an auto-theme
  pulse.

### 4. Over-enforcement / hand-holding

Persistent stage tips ("⌘S to save · changes auto-deploy"), "Live preview"
status pills, help popovers with tips, guided section descriptions. The
chrome talks constantly. An intuitive instrument shows state quietly and gets
out of the way.

### 5. Rigid shell

- Inspector fixed at `w-[340px]`, rail fixed at 72px with icon-over-label
  buttons; no resize, no collapse.
- Preview controls are scattered and inconsistent between studios.
- `role="dialog"` full-screen takeover with a Back button — fine — but the
  studio has no zoom-out moment (no way to see form + settings + share as one
  instrument).

## What is sound and must survive

- **Server lifecycle** (both studios): debounced autosave (1200ms) with
  optimistic `expectedVersion` + 409 conflict re-hydrate; explicit Publish
  moment; status derived from `version` vs `publishedVersion`; rename;
  beforeunload + in-app leave guards. This machinery is correct — the rebuild
  keeps it byte-for-byte where possible.
- **Compile paths**: forms `compilePreviewSnapshot` → `FormRenderer`
  (true-WYSIWYG, deferred doc, structural-key remount discipline); widgets
  `publishWidgetDefinition` → `renderPublishedWidgetFragment` → shadow root.
- **Canvas → inspector selection** (`data-tf-field` capture-phase click).
- **Keyboard层**: digit section jumps, ⌘⏎ publish, ⌘S save, `?` help.
- **Share drawer** (widgets) and hosted/wall URL affordances.
- **A11y bones**: roving tabindex, radiogroups, aria-modal, reduced-motion
  respect. The rebuild must not regress these.
