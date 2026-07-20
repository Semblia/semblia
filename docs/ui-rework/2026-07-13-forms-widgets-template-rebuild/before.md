# Before — Why the current forms + widgets presentation layer dies

Date: 2026-07-13. Scope: the *presentation* system (templates, theming knobs,
renderer composition, studio design surface) for forms and widgets. The
content/trust spine (field system, intents, conditional flow, consent,
submission pipeline, moderation, snapshot-publish) is explicitly NOT indicted
and survives the rebuild.

## The user's charge sheet (verified in code)

1. **Poor layout management.** `forms-renderer/src/renderer.tsx` `LayoutShell`
   is a 4-way switch where `centeredCard` and `fullPage` return byte-identical
   markup and `oneQuestion` merely drops the card `<div>`. Four "layout
   presets" are one skeleton with a card toggle. Widgets are the same idea:
   five layouts × CSS-only variants over one card renderer.

2. **Bad base configs and rendering.** Every form, regardless of intent or
   niche, renders: logo → h1 → description → field stack → button. Defaults
   produce a generic gray-card form (`themeId: "clean"`, indigo `#6366f1`).
   The first-run output is the *worst* output the system can produce, and
   it's what everyone sees.

3. **Unprofessional / immature design sense.** All differentiation is
   CSS-variable swaps (`buildFormStylesheet` + `data-*` attributes) on one
   DOM. No template owns its own typography scale, motion, iconography,
   composition, or success moment. "Looks" (`lib/forms/looks.ts`) are knob
   presets, not designs.

4. **Granular-builder posture.** `FormDesign` exposes 9 orthogonal knobs
   (brandColor, mode, radius, density, buttonStyle, fieldStyle,
   backgroundStyle, fontPairing, themeId) + logo + background image. The
   studio ships a field palette, per-field settings, flow-rule builder, and a
   Style panel of pickers. That is a weak Typeform, not a strong white-label
   template system. Nine knobs that all converge on the same skeleton is the
   worst of both worlds: decision fatigue for owners, sameness for viewers.

## Additional hard-requirement gaps found during recon

- **No server-side media optimization exists.** Zero `sharp`/`ffmpeg`/resize
  code anywhere in `apps/api_v2/src`. Uploads presign straight to S3 and are
  served raw. A 12 MB phone photo attached to a testimonial ships 12 MB to
  every widget viewer.
- **Embed loaders are Phase-8 stubs** (`embed.js`/`loader.js` in
  `forms_runtime`; `packages/forms-embed` has `dist/` but no `src/`).
- **Custom-domain automation is stubbed** (loud-fail in CDK) — schema exists,
  rollout doesn't.
- **No per-template loaders/transitions** — the runtime shows unstyled
  fallback while fetching; the brand moment is wasted.

## What is genuinely good (kept)

- `@workspace/brand-theme`: single-brand-color derivation with AA clamping.
  This is the crown jewel — templates consume it; owners can't break contrast.
- The 13-type field system, 5 intents, conditional flow, consent model.
- Snapshot-publish (validate/derive at write time, serve static at read time)
  and the `configEtag` cache model.
- The trust spine: Origin/HMAC separation, idempotency, honeypot/min-time,
  moderation pipeline.
- `forms_runtime` (Hono Lambda) SSR delivery skeleton and the
  hosted-page/embed addressing model.
- Studio *machinery* (server drafts, optimistic version, publish lifecycle) —
  the machinery survives even though the design surface it edits dies.
