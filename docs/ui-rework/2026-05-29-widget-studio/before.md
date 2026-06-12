# `/projects/[slug]/widgets/[id]` — Widget Studio — Before-audit

Scope intent (user): visual / UX refinement. **Important finding up front:** unlike the
Collect studio, the Widget Studio is substantially complete and well-built. The
full-rework gate does **not** trigger. What the audit *does* surface is a bounded set of
**consistency defects** (off-brand colors + a beta caption that is now inconsistent with
the just-refined Collect studio). Per the checklist, that means: no redesign — execute a
scoped **normalize pass** against the specific NOs only.

## Required Context

- **Surface under review:** Full-screen Widget Studio — topbar
  (`widget-studio-topbar.tsx`), sibling rail (`widget-studio-rail.tsx`), controls
  accordion (`widget-studio-controls.tsx` + `controls-*.tsx`), live preview
  (`widget-studio-preview.tsx`), and the share drawer (`widget-share-drawer.tsx`).
- **User type:** Authenticated project owner/editor configuring an embed or wall-of-love
  widget.
- **Primary user goal:** Shape the widget (layout/style/content), see it live, and grab
  the embed snippet / public link to ship it.
- **Relevant reference inspected:** Same as Collect ([principles.md](./principles.md)) —
  live-preview/direct-manipulation editors — plus the just-completed Collect studio
  (`docs/ui-rework/2026-05-29-collect-studio/`) as the in-house consistency baseline.
- **Principle extracted:** Two sibling studios must read as one product family; chrome
  uses the warm Quiet-Precision palette, not ad-hoc emerald/indigo.

## Core Questions

**Q1. First-time user understands surface + next step? — YES** (minor: `v0.1 · preview`
caption in the panel header, `widget-studio-controls.tsx:125`, is leftover beta noise).

**Q2. Clear primary action / reading path? — YES.** Preview is the focus; Share is the
emphasized primary CTA in the topbar (`widget-studio-topbar.tsx:154-163`); rail and
controls read cleanly.

**Q3. Wording in the user's language? — YES, with minor pockets.** Two casual/dev
phrases: the preview tip "Embedded inside a faux site" (`widget-studio-preview.tsx:321`)
and the `v0.1 · preview` caption. Not the systemic jargon problem Collect had — recorded
as minor.

**Q4. System state clear? — YES.** Hydration spinner (`shell:213-223`), explicit
"This widget no longer exists" state (`shell:226-244`), dirty dot via `InlineName`,
"Saved" toast, first-run → share-drawer celebrate flow, and live `LIVE PREVIEW` /
`DARK MODE` / `ROTATING` indicators. This is genuinely strong.

**Q5. Prevents/communicates mistakes? — YES.** `beforeunload` guard + navigation guard +
"Leave studio without saving?" confirmation (`shell:262-272`).

**Q6. Deliberate visual hierarchy? — YES** (minor: pulsing green live-dot is the one
"look-at-me" decoration; everything else is calm).

**Q7. Every major element useful? — YES** (minor: the QR in the link tab is a
non-scannable fake glyph, `widget-share-drawer.tsx:453-...`, though it is honestly
captioned "A scannable QR will be generated … Coming next.", so it doesn't deceive —
but a fake-looking code next to a "coming" caption is slightly self-contradictory).

**Q8. Consistent with the rest of Semblia? — NO (IMPORTANT).** This is the real defect.
Concrete off-system colors and drift:
- Emerald `#10b981` pulsing live-dot with green glow in the preview stage
  (`widget-studio-preview.tsx:255-260`). Quiet Precision has **no green**.
- Emerald wall-kind accents: the topbar wall-URL pill status dot
  `bg-emerald-500 ring-emerald-500/20` (`widget-studio-topbar.tsx:106`) and the rail
  type-badge `bg-emerald-500/85` (`widget-studio-rail.tsx:152`).
- Indigo first-run share-pulse `rgba(99, 102, 241, …)`
  (`widget-studio-topbar.tsx:170-178`) — indigo is not in the palette.
- Raw-hex stage chrome `--stage-bg:#ebe8e0` / `--stage-chrome:#8d8b83`
  (`widget-studio-preview.tsx:151-158`), outside the token system — the *same* anti-
  pattern just removed from the Collect stage.
- `v0.1 · preview` header caption (`widget-studio-controls.tsx:125`) — the Collect studio
  just dropped its `v0.5` caption, so the two siblings now disagree.

**Q9. Trustworthy / appropriate? — YES.** Solid, shippable feel. The emerald/indigo
accents read faintly "generic SaaS" but not untrustworthy.

**Q10. Would leaving unchanged harm? — Mildly.** Chiefly cross-studio inconsistency now
that Collect is warm/clean and Widget carries green + indigo + a beta caption.

## Conditional Page-Type Check — Widget / Public Display (applied to preview)

1. Testimonials are the focus, not Semblia chrome? — **YES** (real `WidgetRenderer` inside
   faithful browser/host chrome).
2. Owner understands what their audience sees? — **YES** (wall = browser chrome w/ URL;
   embed = host-page chrome w/ their site name).
3. Credible/readable/brand-compatible? — **YES.**
4. Avoids feeling fabricated/staged? — **YES** (uses real approved testimonials, with a
   sensible fallback set).

## Mechanical Quality Gate

1. Keyboard reachable — YES. 2. Focus visible — YES (rail + create button carry
   `focus-visible:ring`). 3. Contrast — YES (stage chrome `#8d8b83` on `#ebe8e0` is low
   but it's incidental mono labels; still, tokenizing in AC fixes it properly).
   4. Targets sized — YES. 5. Status not color-alone — YES (live indicators pair dot
   with text labels; "Copied" pairs check icon + text). 6. Narrow + wide — YES (four-tab
   mobile layout). 7. Functional flows rechecked — verified in after.md.

## Rework Decision

Full-rework gate (any Q1–5 NO, or Q9/Q10 NO, or ≥2 of Q6–8 NO): **NOT triggered** — only
Q8 is a clear NO. Per the checklist this means **no redesign**. However Q8 + cross-studio
drift justify a **scoped normalize pass** limited to the enumerated consistency defects.
Proceeding on that basis only — see [decision.md](./decision.md).
