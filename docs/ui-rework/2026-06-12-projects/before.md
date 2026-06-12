# `/projects` — Before-audit (second pass)

Date: 2026-06-12
Reviewer: Claude (Fable 5)
Evidence basis: **live dev-server walkthrough** (screenshots in `shots/`) + code reading.
Prior pass: `docs/ui-rework/2026-05-23-projects-list/` — fixed row internals, empty-state copy,
toolbar gating. This pass re-audits because the user reports the page still "looks kind of the
worst" as the app entrypoint. User has explicitly authorized full structural rework.

## Required Context

- **Surface:** `/projects` — workspace home, the post-login entrypoint. No sidebar; only the
  global topbar above it.
- **Files:** `apps/web_v2/components/projects/projects-client.tsx`, `project-row.tsx`,
  `project-card.tsx`, `project-empty-states.tsx`, `project-skeletons.tsx`,
  `apps/web_v2/hooks/use-projects.ts`.
- **States observed live:** populated (1 project, dark + light + mobile 390px). Empty/search
  states read from code (unchanged since their cleared 2026-05-23 audit).
- **Regimes:** empty (0), small (1–5, the common early-customer case), power (≥6, toolbar).

## Live observations (screenshots: `shots/before-light-list.png`, `before-light.png`, `before-mobile.png`)

With 1 project at 1264×800: topbar band → sticky `PageHeader` band ("Projects" + New project)
→ **one full-bleed 56px row** → **~80% of the viewport is empty background**. The row stretches
edge-to-edge: avatar+name flush left, "May 13" flush right, ~1000px of nothing between them.
Same in dark, light, and (proportionally) mobile.

## Core Questions

1. **First-time-user orientation?** YES for the 0-project empty state (cleared 2026-05-23).
   **NO for the 1–5 regime** — the page communicates nothing beyond a name and a date. The
   void below the row is not "calm", it is unfinished.
2. **Clear primary action / reading path?** **NO.** The real action ("open my project") is a
   thin row dwarfed by dead space. Nothing guides the eye after the row ends.
3. **User-language wording?** YES (fixed in prior pass).
4. **System state clear?** **NO.**
   - `useProjects` exposes `error` but `projects-client.tsx` never branches on it (open
     follow-up from 2026-05-23 `after.md`, still unfixed) — a failed load renders the empty
     state's sibling branches or nothing.
   - `RefreshingDataBadge` only exists inside the toolbar, which is hidden below 6 projects —
     background refreshes are invisible in the common regime.
5. **Mistake prevention?** N/A (no destructive actions on this surface).
6. **Visual hierarchy deliberate?** **NO at page level.** Row internals are fine (prior pass),
   but there is no content container: full-bleed rows at desktop widths destroy scanability
   and proportion. The header band / row band / void stack has no center of gravity.
7. **Every element useful / anything missing?** **NO — missing, not excess.**
   - `useProjects` computes `totalResponses` and `totalPending` — never rendered (noted as
     unused symbols on 2026-06-07). The entrypoint shows zero workspace-level signal.
   - The card view (richer: description, stats footer) is **unreachable below 6 projects**
     because the only ViewToggle lives in the gated toolbar, and the default is `"list"`.
     The prior pass's toolbar gating accidentally locked users into the weakest presentation.
   - Row shows responses count only when pending == 0 and responses > 0; a 0-response project
     row carries only name + type + date.
8. **Consistent with Semblia system?** YES mechanically (tokens, ItemRow/ItemCard, PageHeader)
   — but the page-level layout (full-bleed list with no container) exists nowhere else in the
   app; every other surface has a sidebar or its own container, so this one reads broken.
9. **Trustworthy / appropriate?** **NO.** For a product that sells social proof ("what shows
   is what sells"), the post-login first impression is emptiness. It under-sells the product
   the user just paid for.
10. **Would leaving it unchanged harm?** **YES.** This is the first screen after every login.

## Conditional Page-Type Checks — Dashboard / workspace home

1. Most important state visible? **NO** — pending-review totals invisible at page level;
   per-row pending pill only when > 0.
2. Setup vs ongoing distinguishable? Partially — empty state yes; 1-project state gives no
   "what's next" affordance once the first project exists.
3. Density efficient without cold/overwhelming? **NO** — inverse problem: emptiness, not
   density.
4. Empty states instructive? YES (0-project state cleared prior audit; keep).

## Mechanical Quality Gate

1. Keyboard reachable? YES (Link rows, Buttons).
2. Focus visibility? YES (ItemShell ring, Button ring).
3. Contrast? YES (live check: muted-foreground date on background passes at size).
4. Targets sized? YES.
5. Status not colour-alone? YES.
6. Narrow viewports? YES mechanically — but mobile shows the same void (shots/before-mobile.png).
7. Existing flows rechecked? Sign-in → /projects walked live this session. Note: a POST to
   `/sign-in` returned **500** during Clerk session activation (sign-in eventually succeeded
   via client-side session). Out of scope for this surface; recorded as follow-up.
8. Motion: rows/cards use `animate-fade-up` with linear per-index stagger (55/65ms × index,
   uncapped) — at 20+ items the last row waits >1.2s. MINOR.
9. List view wraps `ItemRow` (own `border-b` from ItemShell) in `divide-y` — doubled
   1px+1px borders between rows. MINOR visual bug (`projects-client.tsx:283,300`).

## Verdict

Gate rule (any of Q1–5 NO, or Q9/Q10 NO, or 2+ of Q6–8 NO): **Q1, Q2, Q4, Q6, Q7, Q9, Q10 all
NO → full rework gate clears decisively.** The prior pass fixed the furniture; the room is
still wrong. This pass restructures the page itself.
