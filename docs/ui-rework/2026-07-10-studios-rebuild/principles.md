# Studios rebuild — research notes + extracted principles (2026-07-10)

Live walk of five industry builders in Chrome (authenticated sessions),
studying **layout ideas, preview presentation, and flows** — not design
systems. Each section records what was observed, then the principle it
yields.

---

## 1. Typeform (form builder — admin.typeform.com)

Observed in the real builder (form with welcome screen, 4 questions,
payment, ending):

- **Three-zone layout**: left = *structure* (Pages list: compact rows with a
  small type icon + number + truncated title; Endings grouped below), center
  = the form itself rendered big and editable inline (click text on the
  canvas to edit it), right = *contextual settings for the selected block
  only* (block-type dropdown, 2–3 toggles, a button-label input, "Image or
  video +"). The right panel is nearly empty most of the time.
- **Design is a floating panel, not a mode**: the Design button opens a small
  draggable popover over the live canvas (tabs: My themes / Gallery; a theme
  editor with Logo / Font / Buttons / Background tabs). The canvas stays
  fully visible while theming; every change lands live.
- **Themes are objects**, reusable across forms, edited in one place.
- **Control language**: label-left rows with a *tiny* swatch-dropdown on the
  right for colors; corner radius = three small monochrome glyph segments;
  per-subfield icon-only toggles (eye = show/hide, star-burst = required).
  Zero option cards. Zero color in the chrome.
- **Preview**: play button → full-viewport takeover of the *functional* form.
  The only chrome is a tiny floating pill top-center: Close ✕ · device
  toggle · restart. Device flip re-renders content in a clean rounded
  phone-proportioned rect — **no fake bezels or notches**.
- **Lifecycle tabs** top-center: Content → Workflow → Connect (then Share /
  Results). The builder is one stage of a legible pipeline.

## 2. Tally (form builder — tally.so)

- **The form is a document.** No structure panel, no permanent config
  sidebar. Type `/` → a flat text list of block types (tiny monochrome
  icons, Notion-style). Editing IS previewing.
- **Customize** opens a right sidebar of *direct values*: theme + font
  dropdowns, color rows as swatch+hex pairs two-per-row, then Advanced:
  page width 700px, base font 16px, logo w/h/radius, input width/height/
  border/radius/margins — all small numeric inputs. An expert can build
  anything by reading the values; nothing is gated behind curated cards.
- **Preview**: full takeover, real form, a single "Back to editor" pill
  top-left. Publish is the primary top-right CTA.

## 3. Figma (the reference for canvas + preview)

- **Inspector**: right panel, sections stacked — Position / Layout /
  Appearance / Fill / Stroke / Effects / Export. Each section is a few
  *compact rows*: icon-segment alignment strips, tiny X/Y/W/H numeric
  fields with inline labels, swatch+hex+opacity rows with eye/minus
  affordances. **Empty sections collapse to a single "+" row** (progressive
  disclosure — the panel only shows what exists).
- **Zoom is a first-class system**: editable % field + Zoom in/out, Zoom to
  fit (Shift+1), 50% / 100% (Ctrl+0) / 200%. The canvas is never at an
  uncontrolled scale; the user always knows and controls the number.
- **Present = a new tab** (`/proto/...` URL with `scaling=min-zoom&content-scaling=fixed`
  as query params — the preview state is deep-linkable). Content fills the
  viewport, letterboxed. **All chrome auto-hides**; mouse movement reveals a
  top bar + a bottom page pill + a Restart (R) chip, which fade again.
- Tools live in a floating bottom-center dark pill, not a toolbar row.

## 4. Senja (direct competitor — app.senja.io)

- Studio hub: create-surface with type tabs (Widgets / Walls of Love /
  Popups / …) and **a gallery of large, real-content thumbnails** for
  choosing a widget type. Big visual cards ARE used here — in a full-page
  picker, where the choice is genuinely visual and there's room.
- Widget editor: purple top bar (back · name · Save changes · Share), a
  far-left 3-step icon rail (Select Testimonials → Widgets → Design), a
  ~250px left panel whose content swaps per step, canvas = **dotted-paper
  artboard**.
- The Design step is one long scrolling panel of UPPERCASE group headers +
  toggles + dropdowns. Honest verdict: *weaker* than Figma/Typeform — long
  scroll, no hierarchy. Semblia's section rail is already better bones.

## 5. Framer (site builder — framer.com)

- Canvas frames carry a **floating header label**: "Desktop · 1200" + a
  play icon + "+" to add a breakpoint. The frame states its own width.
- **Floating bottom-center dock**: cursor / hand / comment / **dark-mode
  moon toggle** / zoom dropdown ("100% ˅" → Zoom Z, In/Out, to 100%
  Shift+0, to Fit Shift+1, to Selection Shift+2). Canvas controls live ON
  the canvas, not in a header row.
- Style tab: compact rows (Typography → Base · 16 PX · −/+ steppers).
- Top bar is nearly empty: name center; play · Invite · **Publish** right.

---

# Extracted principles (the recipe)

**P1 — The canvas is the product.** Every studied tool gives the artifact
the overwhelming majority of pixels and keeps chrome quiet, mostly
monochrome, and floating. Config UI never competes with the preview for
attention.

**P2 — Controls whisper; the preview shouts.** The professional control
unit is the *row*: label left, compact control right (icon segment, tiny
swatch, small numeric/stepper, small select). Visual tiles are reserved for
genuinely visual choices, kept small and monochrome. Large rich-preview
cards belong in full-page pickers/galleries only (Senja's gallery), never
stacked in a 300px sidebar.

**P3 — Structure and settings are different panels.** Builders separate
*what's in the form* (structure list, left) from *what's configured on the
selected thing* (contextual inspector, right). The inspector reacts to
selection; it is not a static wall of every option.

**P4 — Zoom is a controlled, visible number.** Fit / 50 / 100 / 200 /
custom %, with shortcuts (Shift+1 fit, Shift+0 100%) and an always-visible
readout. Auto-fit is the *default*, never the only behavior.

**P5 — Preview is a place, not a pane.** True preview = the real, functional
artifact, full-viewport, in its own tab with a deep-linkable URL; chrome is
a tiny floating pill that auto-hides. The in-editor stage is for *editing at
scale*; the preview tab is for *believing it*.

**P6 — Devices are honest rectangles.** A width-labeled rounded rect
(Framer's "Desktop · 1200") beats fake bezels and notches. The label carries
the truth; the ornament carried nothing.

**P7 — Progressive disclosure over guided tours.** Figma collapses empty
sections to "+"; Typeform shows 3 controls until you select something.
Nothing explains itself in persistent prose — discoverability comes from
looking, hierarchy from what's visible when.

**P8 — Direct values for experts, presets for speed.** Tally exposes raw
px/hex under an "Advanced" fold; Typeform leads with themes. Both coexist:
presets seed, values refine. Never lock a look behind preset-only choices.

**P9 — One primary CTA: Publish.** Everything else (preview, share, invite)
is secondary/icon-weight. Save is ambient (autosave + status), not a
button competing with Publish.

**P10 — Motion is confirmation, not decoration.** The only animations
observed: zoom/scale transitions, chrome fade-in/out, hover reveals. Panel
swaps are instant-but-crossfaded; nothing bounces, nothing tours.
