# Forms-v4 Studio — Principles for the rebuild

Anchored in `.impeccable.md` (Semblia "Quiet Precision": measured, credible, warm; Linear /
Vercel / Notion references; single amber brand accent; earn trust through restraint).

1. **The studio is a place, not a panel.** Full-page, self-contained editor. Two authorities:
   an editor rail and a preview canvas — each with its own sticky header and independent scroll.
   The page itself never scrolls.
2. **Zero layout shift.** Fixed shell height, stable pane widths, reserved space. Switching
   tabs, devices, or layouts must not move the chrome.
3. **Native-feel components.** Every control is the app's shadcn primitive. No native `<select>`,
   no one-off inputs. It should feel like the rest of web_v2.
4. **Speak the user's language.** Humanize engine jargon; explain knobs in plain terms; show,
   don't tell (the canvas is the explanation).
5. **Safe by construction.** A freshly-enabled condition must reveal correctly. Colors clamp to
   AA. Branding inherits from the project unless deliberately overridden, and can be reset.
6. **Contextual complexity.** Show only the knobs that apply to the selected layout. Progressive
   disclosure over a dumped grid of options.
7. **The canvas has intent.** Browser chrome, zoom, and a hosted-vs-embedded framing derived
   from the project's type — the preview should feel like seeing the real thing.
8. **Restraint.** No decorative streaks, mono-uppercase eyebrows, or flourish. Hierarchy comes
   from weight, size, and spacing on the warm-neutral palette.
