# Decision — `/projects/[slug]/collect` (forms list)

This doc converts [before.md](./before.md) NOs and [principles.md](./principles.md)
into concrete acceptance criteria that the rework must hit.

## Architectural facts established before deciding

These were checked against the codebase, not assumed:

- `fetchForms` (`apps/web_v2/lib/semblia-api.ts:826`) returns `V2CollectionFormDTO[]`,
  which includes both `entry` and `config`. The list currently calls
  `dtoToFormConfigEntry(dto.entry)` and **discards `dto.config`**. The form's real
  `LayoutConfig` is reachable from `dto.config.layout` without any API change.
- `createForm` (`apps/web_v2/lib/semblia-api.ts:840`) accepts `body: { name, description?,
  config?: unknown }`. We can pass a kind-specific starter config without any backend
  change.
- `LayoutConfig` and `FormConfig` are defined in
  `apps/web_v2/lib/collect/studio-types.ts`. `FormConfig.layout` is mandatory; existing
  forms in the wild are expected to carry it.
- `EmptyKindPicker` (already used by both `/testimonials` and `/collect`) already
  exposes the picked `kind` via `onPick(kind)`. The collect list currently ignores
  `kind`. Wiring it through is purely client-side.

This rules out the "we'd need a backend change" escape hatch on NO-7 / P6.

## Acceptance criteria

### AC-1. Row click opens the studio (resolves NO-8, P1)

- The whole `ItemRow` body becomes the click target for `onEdit`. Hover treatment
  matches the existing pattern (subtle background change; do not invent new motion).
- `InlineName` no longer captures the click on the title. Rename moves to:
  - Double-click on the title, **and**
  - A "Rename" entry in the action set (existing `ItemActionRow`).
- Keyboard: `F2` while a row has focus enters rename mode. (Stretch — only if it
  drops in cleanly with existing focus model; not a hard requirement.)
- The same applies to card-mode: the card body (excluding the action rail) is the
  click target for `onEdit`.

### AC-2. Card preview either differentiates or disappears (resolves NO-1, NO-4, NO-5, P2, P5, P7)

Decision: **thread the real `LayoutConfig` through** rather than gutting the preview
system. The data is already on the wire.

- `dtoToFormConfigEntry` (or a sibling adapter) is extended to expose `layout:
  LayoutConfig | null` derived from `dto.config?.layout`. If `dto.config?.layout` is
  missing or malformed, surface `null` and let `FormCardPreview` use its fallback —
  but the list-level `layout={null}` hardcode must go.
- `FormCardPreview` receives the real layout; identical-looking thumbnails go away.
- The two absolute-positioned chips are simplified to **one** small metadata chip in
  the card body (not over the preview). It shows `{flowLabel}` only; the layout-chip
  and the duplicated `abWeight` suffix are removed (weight gets per-row treatment in
  AC-4).
- The 3-stripe bottom "theme strip" is removed.

If, in execution, `dto.config?.layout` is consistently absent (i.e. the DTO doesn't
actually carry layout in practice), the fallback is: **strip the preview to a
typographic card** matching the row's density — no preview, just `name + description +
metrics + abWeight + actions`. The middle ground (a lying thumbnail) is forbidden.

### AC-3. Active/paused signaled once, decisively (resolves NO-2, P3)

- Row `accentColor`: brand when active, `null` when paused. **Kept.**
- Leading icon background and icon color: **neutral** in both states. (Drop the
  brand-tinted background and brand-colored icon.)
- Trailing badge: render **only "Paused"**. Active is silent — the accent stripe is
  the active signal.
- Card-mode mirrors the row: brand accent on the card border, neutral chrome
  otherwise, and the "Paused" badge appears only in the paused state.

### AC-4. Per-row A/B weight visibility (resolves NO-3, P4)

- Active rows: show `abWeight` as a small mono trailing metric, e.g. `60%` to the
  right of the metrics row or in the trailing slot (left of the badge slot).
- Paused rows: weight is not shown (it doesn't apply).
- Card-mode: weight appears as a structured field in the body, not as a chip
  over the preview. Match list-mode placement conceptually.
- The aggregate amber banner stays as-is; the warning is still valuable when the
  totals drift.

### AC-5. Header description carries information, not marketing (resolves NO-6)

- Replace `"Collect testimonials and feedback from your customers."` with a factual
  sub-line of the form `"{N} active · {M} paused"` (omit zero terms — `"3 active"`
  if no paused, `"1 paused"` if no active).
- If the list is loading and counts aren't known, render no description (better
  than a flash of placeholder).

### AC-6. Honor the empty-state kind choice (resolves NO-7, P6)

- `EmptyKindPicker.onPick` receives the picked `kind` (`"stepped" | "single"`).
- `handleCreate(kind?)` builds the `createForm` body with a kind-specific starter
  config:
  - `kind === "stepped"` → `config: { layout: { flow: "stepped", … } }`
  - `kind === "single"`  → `config: { layout: { flow: "all", … } }`
  - no kind passed (the existing "Create new" header button) → no `config` field;
    server defaults apply.
- The remaining `LayoutConfig` fields use the project's existing defaults; we don't
  invent new defaults in this pass.

### AC-7. Quiet card body chrome (resolves NO-11)

- Remove the `border-t border-border/60 pt-2` on the card's action row. `ItemCard`
  chrome already separates the body; a second horizontal line in close proximity is
  noise.

## Out of scope

- The studio editor (`/collect/[formId]`). Separate session.
- Bulk multi-form actions. Not present today; do not add.
- Per-form analytics / drill-in routes from the row. Editing remains the dominant
  action (P1).
- Keyboard shortcut palette for the list. The triage `j/k/a/r/p` model fits inboxes,
  not management lists; do not borrow it here.
- Backend changes. Everything in AC-1 through AC-7 is client-only.

## Verification gates before marking the surface "done"

1. `cd apps/web_v2 && pnpm exec tsc --noEmit` clean.
2. `cd apps/web_v2 && pnpm exec eslint . --ext .ts,.tsx` clean (no new warnings).
3. `pnpm prettier --check` (or matching repo command) clean on touched files.
4. `pnpm build --filter web_v2` succeeds (CLAUDE.md hard constraint).
5. `python scripts/update-indexes.py` run after source changes (CLAUDE.md rule).
6. `tests/collect/form-config-list.test.tsx` either updated or still passing.
7. after.md written, confirming each NO (1–11) is resolved or has a deferred-with-
   reason note.

## Risks and follow-ups

- **Risk:** real-world `dto.config?.layout` may be absent on legacy forms. Mitigation
  in AC-2 (preview falls back gracefully; if pervasive, switch to typographic-card
  fallback in this same pass).
- **Risk:** `InlineName` is used elsewhere (e.g. widgets list?) — changing its
  click-to-rename behavior in-place may affect other surfaces. Mitigation: change
  the **call site** in `form-item.tsx` / `form-item-card.tsx` to wrap `InlineName`
  in a non-click-capturing display by default, opting into edit via `F2` /
  double-click / action — leave `InlineName`'s internal API as-is.
- **Follow-up:** the studio rework will need its own pass on the
  `EmptyKindPicker`-injected starter config to make sure the kind actually affects
  the first-edit experience meaningfully. Logged here, not addressed here.
