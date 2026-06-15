# Forms-v4 Studio — Decision gate

**Verdict: rebuild the experience, keep + extend the engine.**

The `forms-core` schema + render engine and the AA-safe theme derivation are sound (the preview
is true-WYSIWYG and can't drift). What's broken is the *editing experience* around them. So:
extend the engine additively (per-layout knobs, guided-custom color overrides); rebuild the
studio shell, editor, and preview.

## Locked decisions (with the product owner)
1. **Guided-custom color** — keep the AA-safe engine; add a forms-only override layer for
   brand / accent / background / surface / text, each contrast-guarded. Shared
   `@workspace/brand-theme` (used by widgets) stays untouched.
2. **Branding = inherit + override** — inherit project logo + brand color by default; per-form
   override via the existing `FORM_BRANDING_LOGO` uploader; "Reset to project branding".
3. **Per-layout knobs** — designed per preset (card / inline / split / conversational); split
   gets side, fill (soft/solid/neutral/image), and content (header / testimonial quote / blurb).

## Sequencing (UX-first, per owner priority)
0. Before-audit (this).
1. Full-page shell: standalone route, independent scroll panes, sticky sub-headers, shadcn
   selects, no layout shift.
2. Branding sync + conditional-questions fix.
3. Preview canvas (chrome, zoom, hosted vs embedded mock page by project type).
4. Engine: per-layout knobs + guided-custom colors (forms-core + studio knob UIs).
5. Polish + after-audit + full verification.

One commit per phase; each phase ends green (tsc + eslint + forms-core tests + `pnpm build
--filter web_v2`). The `FORM_PANEL_IMAGE` media purpose (split background image) is the only
API/DB slice — delegated to Codex, gated until it lands.
