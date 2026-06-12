# UI Rework — Settings Hub (`/projects/[slug]/settings/*`)

Date: 2026-05-31
Branch: revamp/v2

## Required Context

- **Surface under review:** `settings/page.tsx` + 7 sibling routes
  (`branding`, `social`, `visibility`, `trust`, `members`, `hosts`, `danger`),
  all wrapped by `components/settings/settings-shell.tsx`. Forms:
  `general-form`, `branding-form`, `social-form`, `visibility-form`,
  `trust-client`, `members-client`, `hosts-client`, `danger-client`.
- **User type:** Authenticated project owner/admin configuring a project.
- **Primary user goal:** Adjust identity, branding, visibility, trust, team, domains; delete the project.
- **Reference inspected:** internal — the `SettingsShell` sidebar pattern, the `SettingsSection` primitive, and the shared `Button`/`Input`/`Label` UI set.
- **Principle extracted:** A multi-page settings hub should keep one stable sidebar, one section primitive, and consistent save/validation affordances across every page.

## Core Questions

1. First-time user understands surface? **YES** — sidebar lists every area with a one-line description; content header echoes the active label + description (`settings-shell.tsx:164-171`).
2. Clear primary action? **YES** — each form has a single "Save changes" submit, disabled until dirty (`general-form.tsx:125`, `branding-form.tsx:119`).
3. Wording in user's language? **YES** — "Logo, colors, and typography", "Allowed embed domains", etc.
4. System state clear? **YES** — "Saving…" pending label, `mutation.isError` inline message, `aria-current="page"` on active nav.
5. Consequential mistakes handled? **YES** — slug change behind `SlugChangeDialog` with a "breaks existing links" warning; project deletion behind `DangerZoneCard` + `DeleteProjectDialog` confirm; destructive copy is explicit ("This cannot be undone").
6. Deliberate hierarchy? **YES** — sidebar → page title/description → grouped `SettingsSection`s → save bar with top border.
7. Every element useful? **YES**.
8. Patterns consistent with Semblia? **YES** — every page composes `SettingsShell` + `SettingsSection`; active nav uses the brand accent (`text-brand`, `weight="fill"`); inputs/labels/`Select` are the shared primitives. The primary logo editor is the shared `MediaUploader`; the small 40px thumbnail beside it is an explicit *"Sidebar avatar render"* preview and uses `object-cover` deliberately because it mirrors the cropped sidebar avatar (not the full brand mark), so it does not conflict with the object-contain rule for full-mark previews.
9. Trustworthy / appropriate? **YES** — destructive actions are isolated in a clearly-labelled Danger zone.
10. Leaving unchanged harms quality? **NO**.

## Mechanical Quality Gate

1. Keyboard reachable? **YES** — native links, inputs, selects, buttons.
2. Focus visible? **YES** — shared primitives carry focus rings.
3. Contrast? **YES** — foreground/muted-foreground on card/muted backgrounds.
4. Targets sized? **YES** — `py-2` nav rows, `h-9` inputs, default-size buttons.
5. Status not colour-only? **YES** — active nav also uses `aria-current` + filled icon + ring; errors are text via `text-destructive`.
6. Narrow + wide? **YES** — sidebar stacks above content below `lg`, sits left and sticky at `lg+` (`settings-shell.tsx:118-121`).
7. Flows rechecked? no change to recheck.

## Rework Decision

Gate does **not** trigger — no Q1–5 NO, Q9/Q10 both YES, fewer than two of Q6–8 NO. **No rework.**

### Minor opportunities (recorded, not actioned)

- `general-form.tsx` and `branding-form.tsx` use a raw `<select>` rather than a shared Select primitive; this is consistent across the settings forms, so it is left as-is rather than introducing one-off divergence.

No code change, no commit for this surface.
