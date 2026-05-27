# `/projects/[slug]/collect` — Before-audit

Scope: the **forms list** surface (not the studio at `/collect/[formId]`).

Files in scope:
- `apps/web_v2/app/(app)/projects/[slug]/collect/page.tsx` — server shell
- `apps/web_v2/components/collect/form-config-list.tsx` (298 lines) — client list
- `apps/web_v2/components/collect/form-item.tsx` (220 lines) — list-mode row
- `apps/web_v2/components/collect/form-item-card.tsx` (225 lines) — card-mode tile
- `apps/web_v2/components/collect/form-card-preview.tsx` (366 lines) — SVG thumbnail
- `apps/web_v2/components/collect/inline-name.tsx` (76 lines) — click-to-rename input

Shared primitives used: `PageHeader`, `PageBody`, `RefreshingDataBadge`, `ViewToggle`,
`EmptyKindPicker`, `ItemRow`, `ItemCard`, `ItemActionRow`.

## Current behavior

1. Header (`PageHeader` density: default)
   - Title: `Forms`, description: "Collect testimonials and feedback from your customers."
   - Actions slot: `RefreshingDataBadge` + `Create new` button (only when list non-empty).
   - Toolbar slot: `ViewToggle` (list/grid, persisted via `useViewMode("collect:view", "list")`).
2. A/B-weight banner — amber inline alert, mx-4/mt-4, rendered when there are 2+ active
   forms and `Σ abWeight ≠ 100`.
3. Empty state — `EmptyKindPicker` with two kinds (`stepped` + `single`); both call the
   same `handleCreate` (kind is **not** passed through, just visual scaffolding).
4. Loading — 2 row skeletons in list-mode, 3 card skeletons in grid-mode.
5. List-mode row (`FormItem`)
   - `accentColor`: `var(--brand)` if active, `null` if paused.
   - Leading: 36px rounded-lg tile with `ClipboardText` icon, branded when active.
   - Title: `InlineName` (click-to-rename). Subtitle: description (truncate).
   - Metrics: `views · submissions · conv%` in mono.
   - Trailing: `Active`/`Paused` badge + relative `updatedAt`.
   - Actions: Edit (pinned), Duplicate, Pause/Activate, Delete (pinned, icon-only, danger).
6. Card-mode tile (`FormItemCard`)
   - `<FormCardPreview layout={null} … />` — **always falls back** to `FALLBACK_LAYOUT`.
     The list never threads each form's actual layout config through, so every card
     preview is identical.
   - Two absolute chips on the preview:
     - Top-left "flow ribbon": shows `FLOW_LABEL[layout.flow]` or fallback `"Form"`.
     - Top-right "layout chip": shows hero/container label, **or** `Active`/`Paused`
       fallback, plus an `abWeight` suffix when weight ≠ 100% AND active.
   - 3-stripe "theme strip" at bottom edge (background / primary / muted-foreground).
   - Body: `InlineName`, description (line-clamp-2), same metrics row, action row with
     a `border-t` on top.

## NO-list (what to fix)

NO-1. **Card previews don't differentiate forms.** `layout={null}` is hardcoded at the
list call site → every preview renders the fallback layout. The whole preview system
exists but communicates nothing per-form. Either thread the real layout through, or
strip the system down to a deliberately abstract thumbnail (and stop pretending it
reflects the form's actual shape).

NO-2. **Redundant active-state signaling.** In list-mode every row already has the
brand `accentColor` stripe + branded leading-icon background + branded icon color +
"Active"/"Paused" badge. Four channels for one bit. Pick the two that read fastest at
scan distance and drop the rest.

NO-3. **`abWeight` only visible in card-mode.** Card chip says `Side hero · 25%` when
weight ≠ 100%; list-mode row has no equivalent. The banner warns about the totals but
you can't see per-row weights to fix them. Surface `abWeight` in list-mode too (or in
both as a structured metric).

NO-4. **Flow ribbon + layout chip both rely on absent data.** With `layout={null}`,
the top-left chip is always `"Form"` and the top-right chip is always `"Active"` /
`"Paused"`. The chips are simulating depth that doesn't exist. Either delete the chip
system or feed it real data.

NO-5. **Theme strip is meaningless decoration.** The 3px bottom stripe (background /
primary / muted-foreground) doesn't encode any per-form data — it's the same on every
card. Remove or repurpose.

NO-6. **Header description is generic marketing copy.** "Collect testimonials and
feedback from your customers." restates the section name. Replace with information
density (count, A/B status, or remove entirely — `PageHeader` already shows the title).

NO-7. **Empty-state kinds are theatre.** `EmptyKindPicker` renders two big cards
("Stepped flow" vs "Single page"), but `onPick` ignores `kind` and calls the same
`handleCreate` with no config. The user is offered a choice that isn't honored.
Either thread `kind` into `createForm` body, or collapse to a single CTA.

NO-8. **Row title is rename-only.** `InlineName` makes the title a click-to-rename
button, so the most natural primary action ("open the form") requires hunting for
the Edit button. Editing is the dominant action on this surface — primary click on
the row body should open the studio; rename should move to a secondary affordance
(double-click, rename action, or the actions menu).

NO-9. **A/B weight banner is detached from rows.** Amber pill sits between header
and list with no spatial link to the rows that are out of balance. When the banner
fires, you can't tell at a glance which rows are over/under. Either inline a tiny
weight pill per row, or anchor the banner to the rows with a visual connection.

NO-10. **Inconsistent description treatment.** List-mode truncates to one line,
card-mode line-clamps to two. Either pick one or hide entirely on small density.

NO-11. **Card body has redundant divider + actions border-t.** `ItemCard` already
provides chrome; `border-t border-border/60 pt-2` on the action row adds a second
horizontal line in close proximity. Trim.
