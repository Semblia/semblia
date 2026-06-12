# `/projects` — Before-audit

Date: 2026-05-23
Branch: `revamp/v2`
Reviewer: Claude (Opus 4.7)
Evidence basis: code reading at `apps/web_v2/components/projects/*` and `apps/web_v2/components/shared/page-header.tsx`. Live screenshots deferred until dev-server pass.

## Required Context

- **Surface under review**: `/projects` — the post-login authenticated workspace home. Two states: populated list (`ProjectRow` / `ProjectCard`) and first-run empty (`EmptyProjects`). Auxiliary states: search-empty (`EmptySearch`), background-refresh badge, skeletons.
- **User type**: authenticated workspace owner or admin (Clerk user; possibly inside a Clerk org).
- **Primary user goal on this surface**: pick a project to enter, or create a new one. Secondary: glance at moderation/testimonial counts across the workspace.
- **Relevant reference inspected**: pending (Task 3 — Linear "teams" list, Vercel "projects" dashboard, Cal.com "event types").
- **Principle extracted from that reference**: pending.

## Core Questions

### 1. Can a first-time user understand what this surface is for and what to do next?

**YES.** Populated view: title "Projects", description showing counts, rows are clearly clickable, primary action "New project" sits in the header. Empty view: editorial copy with "Create first project" CTA and a three-stage Create → Collect → Review explainer (`project-empty-states.tsx:93-109`). No prior product knowledge required to act.

### 2. Is there a clear primary action or primary reading path, without competing emphasis from less important elements?

**YES.** The single primary action ("New project") is in the header `actions` slot (`projects-client.tsx:83-90`). The filter pills + search + view-toggle toolbar (lines 91-112) sits below as secondary controls. No competing emphasis from body content.

### 3. Is the wording written in the user's language rather than internal system language, vague SaaS filler, or artificial marketing copy?

**NO — empty state. PARTIALLY YES — populated state.**

- Evidence: empty-state H2 reads *"A studio for trust. Yours starts empty."* (`project-empty-states.tsx:46-52`) and the eyebrow reads *"First project · 0 of 1"*. The H2 is poetic / brand-marketing copy that a first-time user does not parse as instruction. "A studio for trust" is product positioning, not orientation.
- Stage descriptors "Name the workspace customers recognize", "Share the hosted link or embed a form", "Approve only the proof you stand behind" lean editorial; they work but verge on prose-poetry where short imperatives would orient faster.
- Proposed correction: keep the warm voice in the body paragraph, but rewrite the H2 to do orienting work — e.g. *"Create your first project to start collecting testimonials."* Move the brand-positioning line to a smaller subordinate role or drop it.
- Severity: **IMPORTANT**.

### 4. Is the current system state clear wherever it matters: empty, loading, success, error, draft, published, approved, hidden, or disabled?

**YES.** Loading: skeleton rows/cards (`projects-client.tsx:117-130`). No projects: `EmptyProjects`. Search-no-match: `EmptySearch` (line 131-133). Background refresh: `RefreshingDataBadge` (line 101). Per-project pending moderation: warning pill on both card and row (`project-card.tsx:53-56`, `project-row.tsx:87-91`). Project visibility: icon in row trailing area.

One gap: there's no rendered error state for the projects query — `useProjects` returns `error` but the component does not branch on it (`projects-client.tsx`). For now testing has not surfaced this; record as **MINOR**.

### 5. Does the surface prevent or safely communicate mistakes for consequential actions such as delete, publish, reject, disconnect, or discard?

**N/A.** This surface is a read-only navigator. Project creation goes to `/projects/new`; destructive actions are scoped to the project detail Settings → Danger area.

### 6. Is the visual hierarchy deliberate: important content leads, related items are grouped, and decorative elements do not compete with the task?

**NO — list view. YES — card view.**

- Evidence (list view `project-row.tsx:42-126`): each row's trailing cluster carries five separate slots in this order on `sm+`: optional pending pill → testimonial count w/ icon → widget count w/ icon → visibility icon → relative timestamp → arrow. Six trailing items per row. The eye has to traverse all of them before recognising what differentiates one project from another, and the icon-only visibility marker requires a hover-title to interpret. The truly identifying signal (name, what kind of product) competes with the metric strip on the right.
- Evidence (card view `project-card.tsx:38-95`): leading avatar + name + badge form a clear identification block; metrics live in a separate bottom strip across the card. Hierarchy is clean there.
- Proposed correction: in list view, collapse the trailing metrics into a single `RowMetric` cluster (e.g. *"12 testimonials · 3 widgets"* in one muted line) and drop the visibility icon-only marker in favour of a `StatusDot` with text label that only appears when visibility is non-default. Remove the trailing `ArrowRightIcon` (the whole row is the link — the arrow is decorative).
- Severity: **IMPORTANT**.

### 7. Is every major visible element useful for the user's current task, rather than present only to make the UI look richer?

**NO.** Three specific concerns:

1. **Trailing `ArrowRightIcon`** on every row and card (`project-row.tsx:122`, `project-card.tsx:94`). The whole `ItemRow` / `ItemCard` is a link with hover styling. The arrow adds no information, only restating "this is clickable." Proposed correction: drop it; rely on the existing hover paper-press to signal interactivity. **MINOR**.
2. **Filter pills + search + view-toggle toolbar renders for any project count ≥ 1** (`projects-client.tsx:76`, `showToolbar = !loading && projects.length > 0`). For a user with 1-3 projects (the common early state), all three controls are noise — there is nothing to filter, search, or change view of. Proposed correction: gate `showToolbar` on `projects.length >= 6` (or whatever the natural row-fit threshold is). **IMPORTANT**.
3. **Type badge next to the project name** (`project-row.tsx:67-74`, `project-card.tsx:64-71`). The type is already represented in the filter pills; restating it on every row is redundant when only one project of each type is common. Proposed correction: keep the badge only when the active filter is `all` *and* there are ≥ 2 type families present. **MINOR**.

### 8. Are patterns consistent with the rest of Semblia or an explicitly proposed reusable design-system improvement?

**YES.** Uses `ItemCard`, `ItemRow`, `PageHeader`, `PageBody`, `FilterPills`, `SearchField`, `ViewToggle`, `RefreshingDataBadge`, `EditorialEyebrow` family (via `EmptyProjects`). Tokens (`bg-muted`, `text-foreground`, `text-warning`, `var(--brand)`) are correct. Typography uses Inter + mono. Motion: `animate-fade-up` with stagger matches the vocabulary.

One drift: the empty state uses an `oklch(0.7 0.12 55 / N)` direct color expression for star placeholders (`project-empty-states.tsx:281`) and a literal `hsl(${accentHue} 30% 72% / 0.45)` for the skeleton avatars. These bypass the token system. **MINOR**.

### 9. Does this surface feel trustworthy and appropriate for a product that handles customer testimonials and customer-facing presentation?

**YES, with caveat.** The populated state is restrained and credible. The empty state's poetic H2 reads more as positioning than as a workspace, which can register as "AI-built marketing landing page" rather than "my workspace home." See Q3.

### 10. Would leaving this surface unchanged noticeably harm comprehension, trust, or perceived product quality?

**NO for populated state. NO-but-borderline for empty state.**

A user with projects will navigate productively; the trailing metric strip is busy but not broken. A first-time user will land in the empty state, which is the highest-impact first impression in Semblia and currently reads slightly marketing-y. Not catastrophic, but it is the first thing every paying customer sees and is worth tightening.

## Conditional Page-Type Checks — Dashboard / Project Management

1. **Most important state/next task visible?** YES — pending count is in the header description on a warning color when non-zero; per-row pending pill stands out.
2. **Distinguish setup work from ongoing management?** N/A on this surface.
3. **Information density efficient without becoming visually cold or overwhelming?** PARTIALLY NO — list view trailing cluster is dense (see Q6); card view is fine.
4. **Empty states and first-use states genuinely instructive?** YES (three-stage flow is good), but H2 copy distracts from instruction (see Q3).

## Mechanical Quality Gate

1. **Keyboard reachable?** Likely YES — `ItemRow` / `ItemCard` compose from a Next `Link` when `href` is provided; `Button` / `SearchField` / `ViewToggle` are standard controls. **Needs live verification.**
2. **Focused element identifiable?** Only the primary CTA explicitly carries a `focus-visible:ring` (`project-empty-states.tsx:68`). Row / card focus rings rely on `ItemShell` defaults — **needs live verification**.
3. **Sufficient contrast?** The eyebrow `text-muted-foreground/60` (`project-empty-states.tsx:41`) drops the muted token to ~60% alpha and may fail WCAG AA on the off-white background. Tabular metrics at `text-xs text-muted-foreground` are likely OK. **MINOR — needs measurement**.
4. **Targets sized?** The "clear search" button in `EmptySearch` is 11.5px font with `px-2.5 py-1.5` — touch target ~26px, **below the 44px guideline**. **MINOR**.
5. **Status without colour alone?** Pending pill uses both colour and text — OK. Visibility uses icon only without a visible text label, but with a `title` attribute for hover — **fails for keyboard / no-pointer users**. **MINOR**.
6. **Usable at narrow viewports?** The trailing cluster hides under `hidden sm:flex` (`project-row.tsx:86`), so on mobile only avatar + name + arrow remain. Good. The card grid collapses 3→2→1 at `lg/sm/base`. Good.
7. **Existing functional flows manually rechecked after the UI change?** N/A — no change yet.

## Summary of NOs

| Question | Severity | Issue |
|---|---|---|
| Q3 | IMPORTANT | Empty-state H2 reads as brand-marketing, not orientation |
| Q6 | IMPORTANT | List-view trailing cluster has 6 slots; identification competes with metrics |
| Q7 | IMPORTANT | Toolbar renders even when there's 1-3 projects (search/filter is noise) |
| Q7 | MINOR | Decorative trailing arrow on every row |
| Q7 | MINOR | Redundant type-badge on every row |
| Q8 | MINOR | Empty state uses raw oklch/hsl outside the token system |
| Q10 | borderline | Empty state is the first impression — slightly marketing-y |
| Mech 2 | needs-verification | Row / card keyboard focus ring |
| Mech 3 | MINOR | Eyebrow alpha 60% may fail AA |
| Mech 4 | MINOR | "Clear search" target below 44px |
| Mech 5 | MINOR | Visibility icon has no visible text label |

## Decision-gate readout (preliminary)

Rework rule: any of Q1–5 NO, OR Q9 / Q10 NO, OR 2+ of Q6–8 NO.

- Q3 = NO (Q1–5)
- Q6 = NO and Q7 = NO (2 of Q6–8)
- Q10 = borderline NO

**Gate clears.** Scope of rework is *targeted*: empty-state copy + list-row trailing simplification + toolbar gating + mechanical-quality MINORs. Not a full visual redesign. Final decision in `decision.md` after the external-principles pass.
