# Visual language — what the screens actually look like

Date: 2026-07-28. Branch `feat/internal-ui-rework-2026-07`.

`decision.md` set the **rules** (what may be a container, what states must exist).
It did not set the **composition** — row anatomy, density, split proportions,
emphasis. Building to rules alone produced correct, characterless screens; the
first review verdict on the rebuilt Responses queue was that alignment and
hierarchy were broken, which they were. This file closes that gap.

Method: drove a browser over real product surfaces and looked at them, rather
than reading design-system documentation. Captures in the session scratchpad.

## What the references actually do

### GitHub — issues list (the triage-list reference)

The row is **left-anchored and does not stretch**. Title first, at a readable
measure that wraps rather than truncates. Labels sit **inline, immediately after
the title**. The metadata line (`#96291 · cyhforlight opened 10h ago`) sits
**directly under the title**, left-aligned, dot-separated, one line.

There is **no right-pinned metadata column**, so there is no void down the
middle of the row. The right edge is empty. Lifecycle state is a **16px glyph at
the far left**, not a pill — it costs nothing horizontally and reads instantly
down the column.

The whole list is **one bordered container with hairline dividers**. Rows are
never individually bordered. Filter chrome is a **single ~44px band** at the top
of that container: state toggles with counts on the left, dropdown filters on
the right, overflow last.

> Directly contradicts what this pass first built, which pinned a badge and a
> timestamp to the far right of a full-width row and left ~400px of nothing
> between them and the content.

### Plausible — live dashboard (the metrics reference)

The metric strip is **one bordered band divided by vertical hairlines**, not six
cards. Per metric: label above (~11px, uppercase, letter-spaced, muted), value
below (~22px, semibold), delta inline after the value (~11px, coloured, with a
direction glyph). The **selected metric is a highlighted segment** — the strip
is the chart's control, so the numbers do work instead of decorating.

Page chrome is **one line**: identity + live indicator left, controls (Filter,
range, overflow) right. No page description. The chart sits **directly on the
page background** under the strip — no card. Everything shares one left rail:
strip edge, axis labels, section starts.

### Linear — issue detail (the density and detail reference)

Body 13–14px, meta 12px, sidebar rows ~30px — **tighter than this app is
today**. Activity entries are one line each: 16px avatar, actor semibold, verb
muted, time muted, all inline and left-aligned. Comments are subtly tinted
panels, one container level. Content measure is capped; the right edge breathes.

### Geist — checkbox (the control-craft reference)

16px square, 4px radius, 1px hairline border, transparent when unchecked. Not a
native input. This repo already ships exactly this as `components/ui/checkbox`
and the first build bypassed it for a raw `<input type="checkbox">` with an
`accent-color` — the most-repeated control in the product, off-system.

## The rules this yields

### V1 — Metadata goes under the title, never opposite it

A row's content is one left-anchored block: title line, then a meta line. The
right edge carries **at most one** short item (a timestamp, or a hover-revealed
action cluster) and is otherwise empty. If a row needs a right column, the row
is really a table and should become one.

### V2 — Lifecycle state is a glyph at the left, not a pill at the right

A 6–8px status dot in a fixed left slot reads down the column at a glance and
costs no width. Reserve badges for state that is genuinely categorical and
cannot be encoded positionally.

### V3 — Rows do not carry an action row

Actions appear on hover and on keyboard focus, in a fixed-width slot at the
row's right edge. The permanently-visible action strip under every row was
adding ~40px per row and repeating the same three buttons down the page. Full,
labelled actions live in the detail pane where the decision is actually made.

### V4 — Approve and Reject are not peers

In a review queue, approve is the common, expected outcome and reject is the
consequential one. Same size, different weight: approve carries fill, reject is
quiet. Destructive actions are never inline in a row.

### V5 — Split means split

A record inspector is a **second column in the layout**, not a panel floating
over the page. Overlaying covered this app's own page header and its primary
action. List column is a fixed 380–420px; the record takes the rest; both scroll
independently. Below `lg` there is no room for two columns, so the record
becomes a full-width view with a back affordance.

### V6 — One header line

Identity and count on one line; filters and search on a second; nothing else.
The first build spent ~150px of vertical space on three bands of chrome above a
queue whose whole job is showing rows.

### V7 — Emphasis follows the page's job

The one filled button on a page is the thing the page exists to do. On a review
queue that is not "Import proof" — that is a secondary route in. A filled
primary on a secondary action miscasts the whole screen.

### V8 — Density

Row title 13px/500. Meta 11–12px. Two-line queue row lands at 64–76px, not 145.
List type steps: 13 → 12 → 11. The 14–15px body used app-wide reads as a
settings form, not as a working surface.

## Page archetypes

| Archetype | Layout | Used by |
| --- | --- | --- |
| **Triage split** | filter band → list column (fixed) + record column (flex) | Responses |
| **Collection** | header + toolbar → one bordered list, or a card grid | Forms, Widgets, Projects, Keys, Webhooks |
| **Instrument** | header → metric band → panels on the page background | Analytics |
| **Form** | `SettingsSection` stack, dividers inside, sticky save bar | Settings, Account |
| **Record** | breadcrumb-free detail column, `DefinitionList` for fields | key detail, response detail |

## Product decisions taken here

- **There is no project dashboard.** `/[project]` redirects to the queue.
  A landing page that only links onward is navigation rendered twice — the
  sidebar already does it. The user's first destination in a project is the work
  waiting for them.
- **The queue is the project's home.** It opens on "Needs review".
