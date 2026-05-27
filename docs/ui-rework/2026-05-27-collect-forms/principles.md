# Principles — `/projects/[slug]/collect` (forms list)

## Sources consulted

- **Typeform workspace** (typeform.com / product screenshots) — grid-mode preview cards
  actually render the form's first question and theme; metric strip lives on hover.
- **Tally dashboard** (tally.so) — list-mode is the default; per-row submission count is
  the dominant metric; "Open" is the implicit primary action on row click.
- **Senja "Collection Forms"** (senja.io) — primary CTA on row click opens the editor; a
  status dot (live / paused) replaces a full pill; copy-link is a row-level shortcut.
- **Linear projects list** — confirms a pattern Tresta already uses: the row body is the
  click target; secondary actions live in a hover-revealed action rail.

External screenshots were the strongest signal here; the rest reasons from established
list/management-UX heuristics.

## Distilled principles for a forms-management list

### P1. Primary click opens the editor; rename is a secondary affordance

A forms list is a **management** surface, not a **triage** surface. The dominant action
across a session is "open this one to edit it." Every comparable product (Tally,
Typeform, Senja, Linear) makes the row body the click target for the dominant action.
Tresta currently makes the row title a click-to-rename input, so the dominant action
requires the user to find and click the smaller "Edit" affordance.

**Apply:** Row click → studio. Rename moves to `F2`, a dedicated rename action in the
overflow menu, or double-click on the title.

### P2. If a thumbnail can't differentiate, it shouldn't pretend to

Typeform's card previews genuinely show the form's question and theme — different forms
look different. A thumbnail is information dense or it is noise. Tresta's
`FormCardPreview` was *designed* to encode the form's layout, but the list passes
`layout={null}` so every card renders the fallback. The chips ("Side hero · 25%",
"Stepped") fake the differentiation the visual already failed to provide.

**Apply:** Either thread the real `LayoutConfig` from each form into `FormCardPreview`
(restoring the system's intent), or **delete the preview entirely** and lean on a
denser, list-style card with the same metrics as the row. The middle ground — a
preview that lies — is the worst option.

### P3. Active/paused is one bit; signal it once, decisively

Tresta currently encodes `isActive` four ways on a single row: brand accent stripe +
branded leading-icon background + branded icon color + an explicit "Active"/"Paused"
badge. Each new channel desensitizes the others; the badge becomes background and the
accent loses meaning. Senja uses a single small status dot; Tally uses an outlined
"Draft" pill that only appears on inactive forms.

**Apply:** Keep the brand `accentColor` on the row as the active-state primary signal
(it's the cheapest visual). Drop the leading-icon recolor. Reserve the trailing badge
for the **exception** only — render "Paused" but suppress "Active" (active is the
default, and silence is the strongest signal of default state).

### P4. A/B weights belong on the rows they describe

The aggregate banner ("Active form weights total 95%") tells the user there's a
problem but not which rows caused it. The card-mode chip already shows weight, but
only sometimes (`abWeight !== 100 && isActive`) and only in grid. Per-row weight
visibility lets the user reason locally — "this row is 60, that one is 35, the missing
5 is here." The banner can stay as a summary, but the rows must carry the data.

**Apply:** Show `abWeight` as a structured metric on every active row in both modes —
e.g. a small `60%` chip in the trailing slot. Suppress on paused forms (where weight
is ignored).

### P5. List mode is for density; grid mode is for visual differentiation

Two view modes only earn their existence if each does something the other can't. List
mode wins on scan-density: more rows visible, more metrics per row. Grid mode wins
when there's per-form visual content to show (a thumbnail of the actual form). With
`layout={null}` hardcoded, grid mode currently does neither — it just shows the same
fallback over and over with less metric density.

**Apply:** Either restore real visual differentiation in grid mode (P2), or drop the
view toggle entirely. A view toggle with no payoff in either direction is dead chrome.

### P6. Honor the choice you offer, or don't offer it

`EmptyKindPicker` shows the user two large cards labeled "Stepped flow" and "Single
page", but `onPick` discards the `kind` parameter and creates an identical default
form either way. This is worse than a single CTA — it teaches the user the choice
doesn't matter.

**Apply:** Either (a) thread `kind` into `handleCreate` so the new form starts with
`flow: 'stepped'` vs `flow: 'all'` in its config, or (b) collapse the empty state to
a single "Create your first form" CTA and let the studio handle the choice.

### P7. Decorative chrome should be cut before functional chrome is added

The card preview's 3-stripe "theme strip" at the bottom edge and the dual top-left /
top-right chip system both look like they encode something but don't. Cutting these
isn't a downgrade — it's recovering attention for the data that does matter (metrics,
status, weight).

**Apply:** Remove the bottom theme strip. Collapse the two chips into a single
trailing-edge metadata line in the card body. If the preview is kept (P2-a), let the
preview *be* the visual signal — overlay chrome on it only when there's something
exceptional to say.

## Tresta-specific adaptations

- **Header.** Keep `Forms` title; replace the marketing-copy description with a
  factual sub-line — total count, or a count split by state (`3 active · 1 paused`).
  Or drop description entirely; `PageHeader` already supplies the title.
- **Row body is the click target.** Wrap the body content in a clickable region that
  calls `onEdit`. `InlineName` switches to `F2` / `Rename` action / double-click.
- **Card preview decision.** Default to threading the real `LayoutConfig` through
  (matches `FormCardPreview`'s designed intent). If `LayoutConfig` isn't trivially
  available from the list-DTO, treat that as a separate handoff and **strip the
  card-mode preview down to a typographic card** for this pass.
- **Active/paused.** Brand accent stripe stays. Leading icon goes neutral (no
  per-active recolor). Trailing badge only renders for `Paused`.
- **Per-row `abWeight`.** Render `{abWeight}%` as a small mono trailing metric on
  active rows. Keep the aggregate banner; soften its tone if needed.
- **Empty state.** Thread `kind` through to `handleCreate` (preferred) — pass it as
  `{ kind: 'stepped' | 'single' }` and let the API or the studio honor it as a
  starter config. If the backend can't accept that yet, collapse the picker.

## Anti-goals (what we will *not* do)

- **No new shared primitives.** Use existing `ItemRow`, `ItemCard`, `ItemActionRow`,
  `PageHeader`, `Badge`, `ViewToggle`, `EmptyKindPicker`.
- **No motion redesign.** The hover/reveal model for actions is fine; do not add new
  transitions for the sake of polish.
- **No studio (`/collect/[formId]`) changes.** That surface is its own session.
- **No backend changes required.** If P6 (kind threading) needs an API change, this
  session collapses the empty state to a single CTA and logs the kind-threading as a
  separate follow-up — we don't block the rework on backend work.
- **No grayscale drift.** Tresta stays warm; keep brand accent and amber-sand
  warnings.
