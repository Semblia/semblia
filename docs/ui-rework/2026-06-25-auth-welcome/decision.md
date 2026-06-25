# Auth + Welcome rebuild — decision & handoff

Date: 2026-06-25 · Surfaces: `app/(auth)/*`, `app/(standalone)/welcome/*`
Skills routed: `/emil-design-eng` (motion/polish), `/design-taste-frontend` (anti-slop).

## 1. Before-audit — why the current pages read as flashy / fake / AI-generated

The app itself ("Quiet Precision") is deeply restrained: a 52px blurred topbar, a
224px sidebar with 12px nav rows, brand amber used only as a **2px active bar** and
tiny badges. The auth + welcome pages speak a *different, louder* visual language —
which is exactly why they feel "disconnected from the main app":

| Tell (current code) | Location | Verdict |
| --- | --- | --- |
| Hairline grid overlay + radial brand "glow" blobs + bottom vignette | `(auth)/layout.tsx` | Decorative AI-slop; banned by house rules |
| Mono-uppercase eyebrows ("A STUDIO FOR TRUST", "SETUP · 01 OF 05") | layout, step-rail | The explicitly-banned eyebrow motif |
| Em-dash separators "——" + "Est. 2026" | layout footer | Textbook fake-legitimacy tell |
| 4rem display headline w/ brand-colored "Grow faster." | layout | App never uses display type or colored words |
| Numbered manifesto "01 Collect / 02 Curate / 03 Display" | layout | Marketing gesture, not app-native |
| Dark, brand-heavy onboarding rail | `_step-rail.tsx` | A second visual language inside the product |
| 600ms staggered reveals (80→480ms delays) seen on every login | `auth-stagger-*` | The "sluggish" — ~1s wait before you can read |

## 2. Research (visual data gathered via firecrawl, session-free real login forms)

| Reference | Pattern | Lesson |
| --- | --- | --- |
| Linear | Ultra-minimal centered, no card, providers-first → email on 2nd screen | Restraint reads as premium; progressive disclosure |
| Cal.com | Centered **card** w/ border, providers+form, footer links | A card gives structure so it isn't a bare floating form |
| Mercury | Centered card on **tinted bg** + real **top bar** (mark left / CTA right) | The *frame* (topbar + footer) is what de-generics a centered form |

Conclusion: "centered, executed impeccably" *is* the premium pattern. Since we have
no social proof to show, the differentiator is **craft + a real app frame**, not a
marketing splash.

## 3. Principles for the rebuild

1. **Native, not marketing.** Re-derive both surfaces from the app's own quiet
   language (warm-slate tokens, hairline borders, brand-as-whisper). The door should
   look like the house.
2. **Frame > decoration.** Replace glow/grid/manifesto with a real app frame: a top
   bar using the app's own `SembliaMark` + `ThemeToggle`, a structured card, a quiet
   footer. Consistent frame across auth *and* welcome → reads as one app.
3. **Fast where it's seen often** (Emil). Entrance ≤ ~220ms ease-out, single move.
   No long staggers on login. Reduce, don't add.
4. **Ban the tells** (design-taste): no mono-uppercase eyebrows, em-dashes, "Est.",
   display type, brand-colored words, radial glows, hairline grids.
5. **Keep Inter.** The skill's font ban yields to the established project design
   system; consistency with the app wins.
6. **Onboarding must earn its keep.** Capture the few *functional* inputs that let us
   personalize, framed as purposeful — not a survey / DB fill.

## 4. Scope split (Codex is currently in the API — avoid collision)

**My lane (web_v2 UI, this change):**
- Rebuild `(auth)/layout.tsx` → framed centered card (top bar + card + footer), warm
  app background, zero decoration. Retune auth motion to fast/calm.
- Rebuild the welcome shell → calm, light, app-native frame matching auth (slim top
  bar + segmented progress + centered content). Kill the dark brand rail.
- Recompose welcome to value-first **4 screens** (from 5) using the **existing**
  server step enum + `onboardingData` shape (no API change):
  1. **About you** — name + **role (`profile.jobTitle`, re-activated)**
  2. **Your goals** — intent (primary, functional framing) + referral (demoted to a
     small optional secondary). One PATCH: `step: "INTENT"`, `data: {referral, intent}`.
  3. **First project** — create.
  4. **Your link** — the shareable collection link (the payoff).
- Map both `REFERRAL` and `INTENT` resume cursors → the "goals" screen.

**Handoff to backend / Codex (do NOT implement here):** wire the captured signals to
real defaults. Spec from the config-surface map:
- `intent.intents[]` → project `projectType`, `visibility`, `autoModeration`; form
  field visibility defaults; widget `layoutType` + `showBranding`.
- `profile.jobTitle` → notification `typePreferences` + widget `density` default.
- (Optional new) moderation stance → `profanityFilterLevel`, `autoApproveVerified`
  (requires extending `onboardingDataPatchSchema` — it is `.strict()` today).
- Key files: `packages/database/prisma/schema.prisma` (Project 82–147, Widget 869–917,
  NotificationPreferences 1088–1096); `apps/api_v2/.../account-defaults.service.ts`;
  `apps/api_v2/.../users/{users.service.ts,users.dto.ts}`;
  `createProject` body (`apps/web_v2/hooks/api/use-projects-api.ts:69`) accepts only
  `{name, slug, brandColorPrimary}` — extend to accept `projectType`/`visibility` if
  defaults are to be set at creation time.

**Reused, not rebuilt** (they already match the app): `AuthField`, `AuthPrimaryBtn`,
`AuthSocialButtons`, `AuthDivider`, `AuthPasswordField`, OTP, `ThemeToggle`,
`SembliaMark`. "Rebuild" targets the flashy shell + sluggish motion + survey framing,
not the solid primitives.
