# After-state — design-system unification + IA rework

Date: 2026-06-25
Branch: revamp/v2

## Honest audit conclusion

The "every page does its own design system" framing was *mostly* true of **one
layer** — section navigation — and largely **not** true of the rest. The shared
primitives are in fact broadly adopted:

- `PageHeader` is composed by Forms, Responses, Widgets, Projects, Analytics,
  Project overview, key/agent detail, and both section shells.
- The base `Empty` primitive (`components/ui/empty.tsx`) is composed
  consistently across the Developers clients (audit, agents, keys, ...).
- `FilterPills` is the filter affordance on Widgets; `EmptyKindPicker` is the
  shared "pick a kind" empty state.

So the systemic problem was concentrated, not everywhere:

1. **Section IA (the loud one).** Settings + Developers each navigated 8
   destinations with a horizontal scroll-tab strip — past the usability ceiling
   and a named anti-pattern — and the two strips were copy-pasted.
2. **One filter holdout.** Responses hand-rolled a solid-pill filter that looked
   different from the canonical `FilterPills` used on Widgets.

## What shipped (4 per-phase commits)

- `27dc6a3b` — **IA rework**: new `SectionNav` primitive (vertical rail on
  desktop, horizontal strip on mobile), config-driven (`settings-nav.ts`,
  `developer-nav.ts`); both shells refactored; two copy-pasted `SubTabs` deleted.
- `4f4428f4` — removed stale OpenCode delegation references (live surfaces only).
- `dd871934` — `/impeccable` governance: principle 6 in `.impeccable.md` makes
  every surface derive from the shared primitives.
- `32f2a516` — Responses filter → shared `FilterPills`.

Build (`pnpm build --filter web_v2`), typecheck, and lint all pass.

## Intentionally NOT changed (would be downgrades / out of scope)

- **Studio chrome** (form + widget studios): full-screen editors with their own
  topbar/rail — deliberately distinct from list-page chrome.
- **Preview renderers** (`widgets/preview-renderers/*`, host-page-chrome): these
  simulate a *customer's* website, so they must NOT look like the app.
- **First-run heroes** (`forms-empty-state`, `EmptyKindPicker`): rich teaching
  empties — flattening them into the generic `Empty` card would lose the cue and
  violates the "empty states teach" principle.

## Tracked follow-ups (not blocking)

- **Visual verification** of the new section rail (login + click through
  Settings/Developers on desktop + mobile widths). Not done this session.
- The `forms-empty-state` typography (text-base/text-xs) drifts slightly from the
  base `EmptyTitle`/`EmptyDescription` scale (text-sm). Low priority — align its
  type tokens to the system while keeping the intent-icon cluster.
</content>
