# Template System v2 — Product Polish Pass (2026-07-17)

User review of PR #45 (template system v2): "a nice leap in the right
direction" but not yet a *product*. This plan turns the 13 feedback items into
phased work on `feat/template-system-v2-2026-07` (pushed to PR #45). Full
ownership granted, including DB and API contracts.

## Feedback → decisions

1. **Textareas are never resizable, app-wide.** Larger fixed fields, native
   vertical scroll. Two chokepoints own this: `web_v2/components/ui/textarea.tsx`
   and forms-renderer `css.ts` (`.tf-textarea`, the only `resize` rule).
2. **Embedded forms are a different product, not a cropped hosted form.**
   `FormDefinitionDoc` gains `delivery: "hosted" | "embed"` (default hosted,
   additive). Embed forms have a limited field palette
   (`EMBED_CAPABLE_TYPES` — no upload/capture types) and a field cap
   (`EMBED_MAX_FIELDS`). Enforced at publish (api_v2), reflected in the studio
   (palette filtering, incompatibility flags), and gated at serving
   (`/f/:slug` serves hosted-delivery only, `/embed/:slug` embed-delivery
   only). `Form.delivery` DB mirror column (additive migration), synced on
   draft save + publish.
3. **Embeds must actually work.** `/embed/:slug` becomes a full hydrated HTML
   document (transparent page background, embed composition, same submit
   pipeline as hosted — it runs first-party inside an iframe). A tiny
   `embed.js` registers `<semblia-form>` which injects the iframe and
   auto-resizes via height postMessage. frame-ancestors already derives from
   the per-form allowlist. The shadow-DOM `loader.js` stays Phase-8 deferred.
4. **Form type (intent) is mutable.** `PATCH /forms/:id` accepts `intent`;
   writes the column + `draft.intent` in one transaction (draftVersion bump).
   Non-destructive: no re-seeding of fields. Studio Setup gets a Form type
   select.
5. **Anonymity / consent / captcha / protection are platform-side.** All
   Protection UI (captcha/min-time/honeypot/blocked words) and the
   consent/anonymous toggles leave the studio. Platform defaults own them
   (captchaMode default moves off→suspicious now that no UI exists). The
   `consent` field type leaves the palette and the outline (still seeded per
   intent, still rendered + validated — respondents keep the consent moment;
   owners no longer manage it as a field). Contract shapes stay (old docs
   parse unchanged).
6. **Conditionals are content.** FlowRulesEditor leaves Setup; each field's
   editor (left rail) gets a Logic section scoped to rules involving it.
7. **Studios: content lives LEFT, design lives RIGHT.** Forms: the left rail
   becomes the content hub — structure outline, and selecting Header/field/
   Ending opens its editor *in the left rail* (the right inspector is never
   hijacked). Right tabs become Template · Brand · Setup (Setup = form type,
   delivery, attribution). Widgets: gain a left content rail (source picker,
   reorder, wall copy, visibility); right keeps Template/Style(+Behavior).
8. **Form preview is display-only.** New renderer `mode: "showcase"`: fields
   are inert (pointer-events none, tabindex -1), step navigation is free (no
   validation), submit shows the success moment. Studio canvas + preview
   route use showcase; the hosted runtime keeps `live`.
9. **Embed previews live in a believable site.** The widgets'
   `HostPageChrome` wraps the forms studio canvas and preview route whenever
   delivery = embed. The hosted/embed canvas toggle dies — delivery is a form
   property now.
10. **Widgets never ship headings on the embed surface.** `masthead()`
    renders only when `surface === "wall"`. The h2-on-embed branch dies.
11. **Widget embeds inherit the host page.** `.sw-scope[data-sw-surface="embed"]`
    gets `background: transparent`; column/editorial embed max-widths relax
    to fluid; all packs adapt via container queries. Card surfaces still
    paint; the owner's appearance mode picks the text color family.
12. **Widget canvas fits its content.** StudioCanvas gains a fit-height frame
    mode used by embed-kind widgets (an embed is an in-flow element, not a
    page); wall keeps the viewport-page frame.
13. **Widget templates get redone to product bar.** Same contract (manifest,
    accents, data attrs), new item markup + CSS worlds per template, verified
    live in the browser.
14. **Native media recorder.** `MediaCaptureControl` (shared by all packs)
    gains a MediaRecorder capture path (record/preview/re-record/use)
    alongside upload; output enters the same file path as picker files.
    Hosted-only by construction (capture types are not embed-capable).

## Phases (one commit each)

- **P1** Textareas app-wide (web_v2 primitive + forms-renderer base + pack
  min-heights).
- **P2** Contracts: `delivery` + embed capability rules + mutable intent +
  platform-side protection defaults (forms-core, api_v2, database, types).
- **P3** Forms studio reorg (left content hub, right Template/Brand/Setup,
  per-field Logic, palette rules, delivery-aware canvas + HostPageChrome).
- **P4** Showcase mode (forms-renderer) + display-only canvas/preview.
- **P5** Widgets-core surface hygiene: no embed masthead, transparent embed
  background, fluid widths (+ test updates).
- **P6** Widget template redo (markup + CSS worlds).
- **P7** Widget studio reorg + fit-height canvas.
- **P8** Native recorder.
- **P9** Working embeds: hydrated `/embed/:slug` document + `embed.js`
  iframe loader + `formEmbedSnippet` + share surface.
- **P10** Gates, live verification, continuity docs, PR #45 update.

## Explicitly deferred

- Shadow-DOM `loader.js` (Phase 8 of the forms rebuild) — the iframe path is
  the launch embed.
- Media derivative serving, video transcode (pre-existing).
- Widget click-to-edit canvas selection (not requested; content rail solves
  the editing-distance complaint).
