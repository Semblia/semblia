# `/projects/[slug]/collect/[formId]` — Collect Studio — Before-audit

Scope of this pass (locked with user): **visual / UX refinement only.** The studio is
intentionally in "static shell" mode — the form-builder (fields, steps, branching)
is deferred to a later functional pass. This audit does **not** treat the missing
builder as a defect; it treats how the shell *presents itself* as the surface under
review.

## Required Context

- **Surface under review:** The full-screen Collect/Form Studio editor —
  topbar (`studio-topbar.tsx`), controls sidebar (`studio-controls.tsx` +
  `controls-*.tsx`), and the live preview stage (`studio-preview.tsx`).
- **User type:** Authenticated project owner/editor styling their public
  testimonial-collection form.
- **Primary user goal on this surface:** Pick/adjust the visual identity of the
  collection form (style preset, typography, color, shape, density) and save it,
  while seeing the result live.
- **Relevant reference inspected:** Tally / Typeform theme editors and Linear's
  settings panels (principles in [principles.md](./principles.md)).
- **Principle extracted:** A style editor should preview the *real artifact* the
  user is shaping and keep its own chrome quiet; it should never narrate its own
  implementation state to the user.

## Core Questions

**Q1. First-time user understands the surface and next step? — NO (IMPORTANT)**
- Evidence: The surface names itself three different ways — topbar center reads
  "Testimonial Studio" (`studio-topbar.tsx:81`), the topbar back button says "Back to
  forms", and the controls header reads "Form Studio" `v0.5`
  (`studio-controls.tsx:33-34`). A first-timer can't tell whether they're editing a
  "form" or a "testimonial".
- Evidence: The first thing in the controls body after the actions is a mono caption
  box reading "Static shell mode. Styling controls only." (`studio-controls.tsx:71-75`)
  — implementation status, not a next step.
- Correction: One consistent surface name; lead the panel with the first real choice
  (House styles), not a disclaimer.

**Q2. Clear primary action / reading path without competing emphasis? — NO (MINOR)**
- Evidence: Inside the controls panel the reading path is
  header → device toggle → Remix/Reset → **disclaimer box** → House styles. The
  disclaimer (`studio-controls.tsx:71-75`) sits between the controls and the first
  real choice and competes for attention with the same mono/uppercase treatment the
  section headers use.
- Correction: Remove the disclaimer box; let House styles be the first thing the eye
  lands on under the device toggle.

**Q3. Wording in the user's language (not system/marketing/AI copy)? — NO (IMPORTANT)**
- Evidence: Developer/system vocabulary is everywhere the user looks:
  - "Static shell mode. Styling controls only." (`studio-controls.tsx:73`)
  - "Token preview" pill (`studio-preview.tsx:264`), "TOKEN PREVIEW" stage label
    (`studio-preview.tsx:528`)
  - "Static studio shell" eyebrow (`studio-preview.tsx:311`)
  - Heading "Tune the visual **tokens** now. Templates and fields return in the next
    pass." (`studio-preview.tsx:325-327`)
  - "Static shell · token changes apply instantly · Cmd+S to save"
    (`studio-preview.tsx:554`)
  - `v0.5` version badge in the panel header (`studio-controls.tsx:34`).
- Correction: Replace "token"/"static shell"/"v0.5" language with plain words a
  customer would use ("style", "preview", "brand"). State the deferral at most once,
  framed as what they *can* do, not what's missing.

**Q4. System state clear (loading / saving / dirty / success / error)? — NO (IMPORTANT)**
- Evidence: While the draft loads, `StudioControls`, `StudioPreview`, and
  `StudioShellInner` all `return null` on `!draft`
  (`studio-controls.tsx:25`, `studio-preview.tsx:497`) — the whole editor renders as a
  blank screen with no skeleton or spinner.
- Dirty/saving/success/error are otherwise handled well: amber dirty dot with
  `role=status` + `aria-label` (`studio-topbar.tsx:83-90`), disabled Save when clean
  (`studio-topbar.tsx:108`), "Saving…" label, save/reset toasts
  (`studio-shell.tsx:93-103`).
- Correction: Add a loading skeleton/spinner for the `!draft` window.

**Q5. Prevent/communicate mistakes for consequential actions? — YES**
- `beforeunload` guard (`studio-shell.tsx:78-86`) + a "Leave studio without saving?"
  confirmation dialog (`studio-shell.tsx:144-154`) cover the only destructive exit.
  Reset only discards an in-progress draft and is itself reversible via Remix, so the
  lack of a Reset confirmation is acceptable (MINOR at most).

**Q6. Deliberate visual hierarchy? — NO (MINOR)**
- Evidence: The preview stage's focal card is undercut by competing chrome: a pulsing
  amber live-dot + "TOKEN PREVIEW" (`studio-preview.tsx:518-528`), a decorative
  diagonal accent wash (`studio-preview.tsx:216-221`), and a 4-up row of metadata
  chips at the bottom (`studio-preview.tsx:482-485`). Three "look at me" elements
  surround the one card that matters.
- Correction: Quiet the stage chrome, drop the redundant chip row, let the form card
  be the clear focus.

**Q7. Every major visible element useful for the task? — NO (IMPORTANT)**
- Evidence: The four `TokenChip`s at the foot of the preview — "Field shape / Density /
  Button / Texture" (`studio-preview.tsx:482-485`) — restate values the user just set
  in the sidebar, in raw enum form (`rounded`, `compact`, `solid`, `grain`). Pure
  redundancy.
- Evidence: The dashed placeholder boxes captioned "Placeholder content only. No live
  fields or branching logic here." (`studio-preview.tsx:376-378`) exist only to fill
  the card and apologize.
- Correction: Remove the chip row; replace the apologetic placeholders with a
  representative (still static) styled form so the preview shows *how the chosen style
  reads on a real form*.

**Q8. Patterns consistent with the rest of Tresta? — NO (IMPORTANT)**
- Evidence: Stage chrome uses raw hex outside the Quiet-Precision token system — stage
  background `#eae7df`, chrome `#8d8b83`, tip `#b8b7b1`
  (`studio-preview.tsx:115-118`), and a hard-coded `#f59e0b` live-dot
  (`studio-preview.tsx:524`) that is not the brand amber-sand. Stage chrome font is
  hard-coded `"Geist Mono"` strings (`studio-preview.tsx:511,548`) rather than the
  app's mono token.
- Evidence: Surface naming inconsistency (Q1) is also a consistency defect.
- Note: The `--f-*` tokens *inside* the previewed frame are correct and must stay —
  those describe the customer's form, not Tresta chrome. The inconsistency is only in
  the Tresta-side stage chrome.
- Correction: Map stage chrome onto existing app tokens (`--muted-foreground`,
  `--border`, brand accent) where it's Tresta's own UI.

**Q9. Trustworthy / appropriate for a customer-testimonial product? — NO (IMPORTANT)**
- Evidence: The combined effect of "static shell", "v0.5", "token preview", and
  "Templates and fields return in the next pass" makes the studio read as an
  unfinished internal tool. A user evaluating Tresta to host *their* brand's
  testimonial form would not trust this screen.
- Correction: Same as Q3/Q7 — remove the beta/implementation narration; present a
  confident, finished styling experience.

**Q10. Would leaving it unchanged harm comprehension/trust/quality? — YES, it would harm.**
- The surface actively advertises its own incompleteness. This is the strongest
  argument for the pass.

## Conditional Page-Type Checks

This is a *studio/editor* surface, which the checklist doesn't enumerate directly. The
**Widget / Public Display** lens is the closest fit, applied to the preview stage:

1. Are the testimonials/form the visual focus rather than Tresta's controls/decoration?
   — **NO.** The live-dot, accent wash, and chip row compete with the form card
   (see Q6/Q7).
2. Can the owner clearly understand what their audience will see? — **NO.** The preview
   shows dashed placeholders and "no live fields here" rather than a representative
   form.
3. Credible, readable, brand-compatible preview? — Partial. Token application is real
   and good; the surrounding narration undermines credibility.
4. Avoids anything that makes the result feel fabricated/staged? — The "static shell"
   framing is the staging problem.

## Mechanical Quality Gate

1. Keyboard reachable controls? — **YES** (shadcn Button/Slider/Select + native
   inputs; Cmd/Ctrl+S wired at `studio-shell.tsx:120-133`).
2. Focus visibly identifiable? — **MINOR NO.** Preset cards are bare `<button>`s
   (`controls-style-presets.tsx:24-33`) with hover styles but no explicit
   `focus-visible` ring; they inherit only the UA outline.
3. Sufficient text contrast? — **NO (MINOR but blocking per gate).** Stage tip text
   `#b8b7b1` on stage bg `#eae7df` (`studio-preview.tsx:550 / 116`) is well under 3:1.
4. Targets adequately sized/spaced? — **YES.**
5. Status not color-alone? — **YES** (dirty dot has `aria-label`+`title`+`role`;
   saving uses a text label).
6. Usable narrow + wide? — **YES** (desktop side-by-side; mobile design/preview tab
   layout, `studio-shell.tsx:197-263`).
7. Functional flows rechecked after change? — N/A pre-change (verified in after.md).

## Rework Decision

Gate is **decisively triggered**: Q1, Q3, Q4 are NO (any of Q1–5 → rework); Q9 is NO;
and three of Q6–8 are NO. Mechanical NOs on contrast (#3) and focus (#2) must also be
cleared. Proceeding to principles + decision.
