# Semblia Hosted Forms — White-Label Design Model

> Status: **Agreed direction, 2026-05-31** (product owner + frontend). This is the build
> contract for the hosted collection forms. It is *not* a frozen spec — revise deliberately.
> `docs/designs/cal/DESIGN.md` is **only** the extracted Cal.com system, used as inspiration
> for the first preset. It is not a source of truth.

White-labeling is a **headline feature** for Semblia: a customer's respondent should feel they
never left that customer's brand. The design challenge is to allow *deep* customization while
making it **impossible to produce a broken or ugly form**. The answer is a derived token engine
(below), not a pile of independent knobs.

---

## 1. What exists today (as of this doc)

- **`packages/forms-core`** — shared rendering core, currently an MVP skeleton:
  - Question types: `text | textarea | email | rating` only.
  - `FormDesignTokens` = **8 flat, independent, raw values** (`accent, background, text,
    mutedText, surface, border, radius, fontFamily`) — set directly, no derivation/clamping.
  - `normalize.ts` is a stub (`import zod` only).
  - Renders **static server HTML** (`renderToStaticMarkup`) → single-page, native submit, no
    guided mode.
- **`apps/forms_runtime`** — Lambda/CDK host. Resolves `{ project, FormConfig }` (carries
  `project.brandColorPrimary`) and handles submit. Consumes `forms-core`.
- **`apps/web_v2` Collect Studio** — has its **own** token/preset system
  (`lib/collect/studio-types.ts` `DesignTokens`, `studio-presets.ts`,
  `components/collect/studio/controls-style-presets.tsx`) whose shape **differs** from
  `forms-core`, and whose preview is a *representative static form*, not the real renderer.

### Problems this model fixes
1. **Flat independent tokens + full customization = broken combinations** (bad contrast,
   off-key surfaces).
2. **Two divergent token systems** (studio vs. core) that will keep drifting.
3. **Preview lies** — studio preview ≠ production output.

---

## 2. Core model: the derived token engine

Users set only a few **source inputs**. Every visual token is **computed** by a resolver, so
users never touch dependent values and therefore cannot create an incoherent or inaccessible
result.

```
FormThemeInputs  →  resolveTheme()  →  FormDesignTokens (computed)  →  CSS vars
  (what the user sets)   (forms-core/normalize.ts)   (~20 tokens, AA-safe)
```

### Source inputs (`FormThemeInputs`) — the entire user-facing surface

| Input | Type | Notes |
|---|---|---|
| `brandColor` | hex | The one identity color. Drives the whole accent system. |
| `appearance` | `light \| dark \| system` | `system` follows the respondent (see §6 differentiators). |
| `radius` | `0 \| 1 \| 2 \| 3 \| 4` | none → sm → md → lg → full. Scale, never raw px. |
| `density` | `compact \| cozy \| spacious` | Maps to a vetted spacing scale. |
| `typePairing` | `PairingId` | Curated font pairings (no free font input on free tier). |
| `surfaceStyle` | `flat \| bordered \| elevated` | Border-vs-shadow logic is derived, not set. |
| `accentIntensity` | `subtle \| balanced \| bold` | How prominently `brandColor` is used. |

### Resolver guarantees (`resolveTheme` in `forms-core/normalize.ts`)
- Converts `brandColor` to OKLCH; derives `accent / accentHover / accentActive / onAccent /
  focusRing`.
- Derives `background / surface / surfaceMuted / text / mutedText / border / borderStrong`
  from `appearance` + `surfaceStyle`.
- **Enforces WCAG AA**: if a derived pairing fails contrast, the resolver clamps lightness —
  user intent yields to accessibility, always.
- Output is the canonical `FormDesignTokens`, emitted as the existing `--semblia-form-*` CSS vars.

### One token contract, one renderer
`FormThemeInputs` + `FormDesignTokens` live **only** in `forms-core`. The studio imports them;
the studio's separate `DesignTokens` is retired. The studio preview renders through the **same**
`forms-core` component as production (see §6: True WYSIWYG).

### `FormConfig` shape (target)
```ts
interface FormConfig {
  brandName: string;
  headline: string;
  subhead: string;
  questions: FormQuestion[];
  theme: FormThemeInputs;            // replaces flat `tokens`
  presetId?: PresetId;               // last seed applied (studio UX only)
  layout: "single" | "guided";
  branding: {
    logoUrl?: string;                // object-contain, never cover-crop
    faviconUrl?: string;
    watermark: boolean;              // forced true on free tier
  };

  // 🚧 ROADMAP — Match-the-Embed. NOT IMPLEMENTED. Do not build silently; see §6.
  embedTheme?: EmbedThemeBinding;
}
```

---

## 3. Presets = remixable seeds (not locks)

A preset is just a named set of **seed source inputs** plus metadata. Pick one to start, then
freely change any input — coherence is guaranteed by the resolver, so presets never need to lock
anything.

```ts
interface FormPreset {
  id: PresetId;
  name: string;
  tier: "free" | "paid";
  inspiration?: string;             // internal only
  seed: Partial<FormThemeInputs>;
}
```

Starter set (tune in build): **Default** (Semblia), **Clean** (Cal-inspired, *free*),
**Minimal** (Linear), **Bold** (Stripe), **Editorial** (serif/trust). First preset to ship =
**Clean**, seeded from `docs/designs/cal/DESIGN.md`.

---

## 4. Customization surface & tiering (gate by *impact*, not feature count)

Free gets nearly everything; watermark always on; only `tier: "free"` presets selectable.

| Lever | Free | Paid | Rationale |
|---|---|---|---|
| brandColor, appearance, radius, density, typePairing, accentIntensity, all copy | ✅ | ✅ | Resolver keeps them safe |
| `free` presets | ✅ | ✅ | |
| `paid` presets | — | ✅ | |
| Logo upload | — | ✅ | High-impact identity lever |
| Remove watermark | — | ✅ | High-impact |
| Custom domain | — | ✅ | High-impact |
| Custom font upload, custom-CSS escape hatch, cover image | — | ✅ | Highest risk to integrity |
| "Powered by Semblia" watermark | always on | removable | |

Gating is resolved server-side into a capability object the studio + runtime read; gating policy
lives in entitlements, **not** hardcoded in forms-core.

---

## 5. Layout modes (one config, two shells)

Both share field renderers + validation; only orchestration differs.

- **`single`** — scrollable card. Default for short forms.
- **`guided`** — one question at a time, keyboard-first, progress affordance. Better completion
  for longer/heavier asks. (`forms-core` currently does static single only — guided is new work.)

---

## 6. Signature differentiators (what makes Semblia unlike Senja/Typeform/Tally)

### Committed
1. **AI brand import** — paste a website URL or logo → auto-propose `brandColor`, `typePairing`,
   and a matching preset. "Paste your site, get a form that already looks like you."
2. **True WYSIWYG preview** — studio preview renders via the exact production `forms-core`
   renderer. Kills the representative-preview drift; preview === reality.
3. **On-brand respondent dark mode** — `appearance: "system"` respects the visitor's OS
   light/dark while staying on the customer's brand (resolver derives both palettes).

### 🚧 ROADMAP — Match-the-Embed (NOT BUILT — keep loud, do not bury)
Linked/embedded forms can inherit the **host page's palette** so they feel native where they
live. Reserved hook: `FormConfig.embedTheme?: EmbedThemeBinding`. **Action item kept visible
here so it is not lost in code comments.** Do not implement until explicitly scheduled; when we
do, it slots in as another `FormThemeInputs` source resolved at render time.

---

## 7. Locked mechanics (never themeable)
Field interaction behavior, validation timing/placement, consent/GDPR structure, focus order,
required semantics, min target sizes, and `prefers-reduced-motion` — all fixed. Themes touch
skin, never mechanics.

---

## 8. Architecture & convergence
- **`packages/forms-core`** = single source of truth: `FormThemeInputs`, `FormDesignTokens`,
  `resolveTheme`, presets, field renderers, `SingleLayout` + `GuidedLayout`, `FormRenderer`.
- **`apps/forms_runtime`** = host: resolve config → render `FormRenderer` → submit.
- **`apps/web_v2` studio** = config editor; imports `forms-core` renderer for preview; retires
  its local `DesignTokens`.

---

## 9. Phased build plan
1. **Engine** — `FormThemeInputs` + `resolveTheme` (OKLCH + AA clamp) in `forms-core`; expand
   `FormDesignTokens` to the derived set; keep `--semblia-form-*` vars. Unit-test contrast.
2. **Presets as seeds** — preset registry + `tier`; ship **Clean** first (from cal DESIGN.md).
3. **Converge studio** — swap web_v2 studio onto `forms-core` types; preview via real renderer.
4. **Layouts** — extract field renderers; add `GuidedLayout` alongside `SingleLayout`.
5. **Tiering** — capability object + watermark enforcement + free/paid preset flags.
6. **Differentiators** — True WYSIWYG (falls out of #3), respondent dark mode (#1 resolver),
   then AI brand import.
7. **Match-the-embed** — scheduled later (§6).

---

## 10. Open questions
- Field-type roadmap beyond the current 4 (video / file / consent / choice for testimonials)?
- AI brand import: client-side palette extraction vs. server endpoint + which model?
- Where entitlement → capability resolution lives (api_v2 forms module vs. shared entitlements).
- `appearance: "system"` default on or off per preset?
