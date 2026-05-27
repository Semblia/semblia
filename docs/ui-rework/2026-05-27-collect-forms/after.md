# `/projects/[slug]/collect` — After-audit

Resolution status for each NO from [before.md](./before.md), verified against the
implementation against [decision.md](./decision.md).

## Resolution map

| #     | NO                                                            | AC      | Resolved?     | Where                                                                          |
| ----- | ------------------------------------------------------------- | ------- | ------------- | ------------------------------------------------------------------------------ |
| NO-1  | Card previews don't differentiate forms (`layout={null}`)     | AC-2    | **Yes**       | `dto-adapter.ts` extracts `LayoutConfig` from `dto.config.layout`; `form-config-list.tsx` passes `entry.layout` to `FormItemCard` |
| NO-2  | Redundant active-state signaling (4 channels for one bit)     | AC-3    | **Yes**       | Brand accent stripe kept; leading icon now neutral; "Active" badge removed (only "Paused" renders) |
| NO-3  | `abWeight` only visible in card-mode                          | AC-4    | **Yes**       | `FormItem` (list) now renders `{abWeight}%` in trailing slot on active rows; card body shows it inline |
| NO-4  | Flow ribbon + layout chip both rely on absent data            | AC-2    | **Yes**       | Both absolute-positioned chip overlays removed from `FormItemCard`. A single flow label appears in the body line, sourced from real data |
| NO-5  | Theme strip is meaningless decoration                         | AC-2    | **Yes**       | 3-stripe bottom decoration removed                                             |
| NO-6  | Header description is generic marketing copy                  | AC-5    | **Yes**       | Replaced with `{N} active · {M} paused` factual sub-line; suppressed during loading and on empty |
| NO-7  | Empty-state kinds are theatre                                 | AC-6    | **Yes**       | `handleCreate(kind?)` builds kind-specific starter config: `stepped → { layout: { flow: "stepped" } }`, `single → { layout: { flow: "all" } }`. Header "Create new" still uses server default |
| NO-8  | Row title is rename-only                                      | AC-1    | **Yes**       | Row and card body click → `onEdit`. Rename moves to action menu + double-click on title. `InlineName` extended with controlled `editing` / `onEditingChange` / `onDoubleClickRename` (additive, backwards-compatible) |
| NO-9  | A/B weight banner is detached from rows                       | AC-4    | **Partial**   | Per-row weight visibility achieved (NO-3 fix doubles as the per-row anchor). Banner kept as-is; spatial connection unchanged. Spending more chrome on the banner felt heavier than the data deserves once rows surface their own weight |
| NO-10 | Inconsistent description treatment (truncate vs line-clamp-2) | —       | **Deferred**  | Left as-is. Line-clamp-2 in cards matches the card density; truncate in rows matches the row density. The "inconsistency" reads as appropriate per-mode behavior on re-look |
| NO-11 | Card body redundant divider + actions border-t                | AC-7    | **Yes**       | `border-t border-border/60 pt-2` on the card action row removed; only `mt-2` remains |

## Behavior changes a user would notice

1. Clicking anywhere on a form row (or card) opens the studio.
2. To rename: double-click the title or pick "Rename" from the action menu.
3. Card thumbnails now look different per form (stepped flow looks different from
   all-fields layout, hero position is reflected, etc.).
4. The "Active" badge no longer renders; pausing a form is what shows a badge.
5. A small `60%` weight indicator sits next to every active row.
6. Header now reads `3 active · 1 paused` instead of marketing copy.
7. Picking "Stepped flow" from the empty state actually creates a stepped form.

## Verification gates (from decision.md)

| Gate                                          | Status        | Notes                                                  |
| --------------------------------------------- | ------------- | ------------------------------------------------------ |
| `pnpm exec tsc --noEmit` (apps/web_v2)        | **Pass**      | Exit 0                                                 |
| `pnpm exec eslint . --ext .ts,.tsx`           | **Pass**      | Exit 0, no new warnings                                |
| `pnpm prettier --write` on touched files      | **Pass**      | All touched files formatted                            |
| `pnpm build --filter web_v2`                  | **Pass**      | 2 tasks successful in 40s                              |
| `python scripts/update-indexes.py`            | **Pass**      | Vector store + knowledge graph incrementally updated   |
| `tests/collect/form-config-list.test.tsx`    | **Pass**      | 5 / 5 (one expectation updated for new kind-threaded body) |

## Follow-ups logged

- **`InlineName` is shared.** Other surfaces still call it without the new controlled
  props (defaults preserve old behavior). No migration needed; but if a future pass
  on widgets/projects wants the same row-click model, the props are ready.
- **Banner softening.** NO-9 deferred the banner-toning; if user testing shows the
  amber pill reads as alarmist now that per-row weights are visible, a lighter
  variant (or muted-foreground prose) is the next step.
- **Studio-side kind handoff.** The kind-threaded `config: { layout: { flow } }`
  reaches the API but the studio still applies its own defaults when loading a
  fresh form. A studio rework session should ensure the picked flow survives all
  the way into the editor's initial state.
- **Description treatment.** NO-10 deferred; revisit only if a user complains the
  two modes feel inconsistent.
