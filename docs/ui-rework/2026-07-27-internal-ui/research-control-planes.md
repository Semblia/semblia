# How best-in-class control planes structure the inside of a page

Research date: 2026-07-27. Scope: the **inside** of an authenticated page — page header vs
toolbar vs body, container nesting, list-row composition, density and type. Navigation chrome
(sidebars, global nav, breadcrumb trails as navigation) is explicitly out of scope.

## Method and source quality

Product dashboards are behind auth and no logged-in browser was available, so every finding below
comes from a **public primary artifact**: the vendor's own design-system documentation, help
centre, or engineering/design blog. Where I could only obtain marketing-site or docs-site CSS
rather than product CSS, the number is labelled inline as such.

Source tiers used, best first:

1. **Vercel Geist** (`vercel.com/geist/*`) — a genuine, current, prescriptive design-system spec
   with per-component "When to use / Behavior / Content / Accessibility" rules. By far the
   richest source of the six; roughly half this report is Geist because it is the only one of the
   six that publishes its internal rules verbatim.
2. **Linear** — `linear.app/docs/*` (behaviour of real screens) plus the two-part 2024 redesign
   post authored by the co-founder and the engineers who shipped it.
3. **Attio** — `attio.com/help/*`, which documents the record-page anatomy field by field,
   including the configurable zones and their caps.
4. **Notion** — `notion.com/help/*`, which documents the database-page layout builder and
   workspace-settings IA.
5. **Raycast** — `manual.raycast.com/*`. Weakest for page-internal structure: the manual
   describes team/settings surfaces as feature lists, not layouts.
6. **Height** — **shut down**. Operations ceased 2025-09-24 (announced 2025-03-20 by founder
   Michael Villar; `height.app` now serves only a farewell page). Its help centre survives only in
   the Wayback Machine, and the archived *Height 2.0* collection contains no UI-anatomy articles.
   Everything in the Height section describes **Height 1.x as documented in 2022** and cannot be
   verified against a running product. Treat it as historical precedent, not as a live reference.

### What I could not verify — stated up front

- **Exact in-product row heights, row padding, and metadata label size/weight/tracking for
  Linear, Attio, Notion and Raycast are not derivable from any public artifact.** I have not
  guessed them. Where a px number appears below it is either (a) published by the vendor, or
  (b) measured from a docs/marketing stylesheet and labelled as such.
- Geist publishes its type scale as **named classes with usage notes but no px values** on the
  public page. The px values quoted for Geist are labelled by origin.

---

## 1. Vercel — Geist design system + the Vercel dashboard

### 1.1 Page anatomy

**Geist ships no page-header component at all.** The published component index (77 entries:
Avatar, Badge, Banner, Book, Breadcrumbs, Browser, Button, Calendar, Checkbox, Choicebox,
Clearable Input, Code, Code Block, Collapse, Combobox, Command Menu, Context Card, Context Menu,
Copy Button, Description, Destructive Action Modal, Dots Menu, Drawer, Empty State, Entity, Error,
Error Card, Feedback, Fieldset, File Tree, Gauge, Grid, Input, JSON View, Keyboard Input, Label,
Load More Button, Loading Dots, Menu, MiddleTruncate, Modal, Multi Select, Note, Pagination, Phone,
Pill, Progress, Project Banner, Radio, Relative Time Card, Scroller, Search Input, Select,
Separator, Sheet, Show more, Skeleton, Slider, Snippet, Spinner, Split Button, Status Dot, Switch,
Table, Tabs, Text With Copy Button, Textarea, Theme Switcher, Toast, Toggle, Tooltip, Video)
contains **no `PageHeader`, `PageTitle`, or `PageDescription`.** The closest primitives are:

- `Breadcrumbs` — location within hierarchy (text and menu variants).
- `Tabs` — sibling views inside one page.
- `Fieldset` — "Groups related form controls inside a **bordered card** with optional footer
  actions", with a `####` title and a subtitle beneath it.
- `Description` — a `<dl>/<dt>/<dd>` key/value pair for "definition-list metadata: a short Title
  Case key paired with a single value (`Last Deployed`, `Region`, `Plan`)".

**Consequence for the descriptions-under-titles question: in Geist a subhead is not a page-level
element.** It is either a *card-level* element (the Fieldset subtitle, e.g. "Account Settings /
Manage your account preferences and settings") or a *metadata* element (Description's `<dd>`).
Geist explicitly redirects two-column key/value blocks away from tables: "For a key/value metadata
block on a detail page, use Description, **not a two-column table**."

Page-level messaging is not free-form prose either — it is typed:

- `Project Banner` — "temporary, project-wide notifications that require resolution": overdue
  billing, active rollback, attack mitigation, expiring trial blocking deploys.
  **Non-dismissible by design**: "If the message can be dismissed without resolving the underlying
  state, it isn't banner-worthy; move it to a Note." One banner at a time. Always carries a
  `callToAction` that resolves the state — "A banner with no route is a dead end."
- `Note` — inline contextual feedback next to the field/card/section it describes.
- `Toast` — transient acknowledgment of a user-initiated action ("Domain added", "Project
  archived", "Deployment canceled").
- Empty State doc, on where persistent warnings go: "Don't put critical persistent warnings here.
  Empty states vanish when the list populates; persistent warnings belong in **Note or the page
  header**." (This is the one place Geist's prose acknowledges a page header as a slot.)

**Toolbar / tabs rules** (from `geist/tabs`):

- "Use Tabs to switch between sibling views inside a single page (`Overview`, `Logs`, `Settings`).
  For navigation between unrelated pages, use a sub-menu, not Tabs. Tabs imply the views share
  scope, URL parent, and data model."
- Cap: **5–7 entries desktop, 3–4 mobile.** Past that, consolidate or move behind a Menu.
- Tab titles are Title Case, **1–2 words, a destination noun**. "Verbs belong on buttons;
  `View Logs` is wrong on a tab."
- "Don't append a count to the title (`Logs (12)`); use a badge slot instead and **drop the badge
  at zero**."
- "Reflect the active tab in the URL (query param or path) so deep-links and refresh restore
  state." Tab change must be instant — "don't trigger network confirmation or toast on tab change."

### 1.2 Surface law

Geist's `Materials` page is the elevation vocabulary, and it is closed: **exactly 8 presets in two
families.**

| Family | Preset | Radius | Documented role |
| --- | --- | --- | --- |
| Surface (on the page) | `material-base` | 6px | "Everyday use." |
| Surface | `material-small` | 6px | "Slightly raised." |
| Surface | `material-medium` | 12px | "Further raised." |
| Surface | `material-large` | 12px | "Further raised." |
| Floating (above the page) | `material-tooltip` | 6px | "Lightest shadow… the only floating element with a triangular stem." |
| Floating | `material-menu` | 12px | "Lift from page." |
| Floating | `material-modal` | 12px | "Further lift." |
| Floating | `material-fullscreen` | 16px | "Biggest lift." |

The two hard rules:

- **No stacking.** "Don't stack two Materials on the same element; if a child needs more elevation,
  lift it into its own Material with a higher type."
- **Lowest elevation that works.** "Favor the lowest elevation that still reads as elevated
  against its background; **over-elevating is a common source of visual noise**."
- Elevation must agree with z-index band: "Align the elevation choice with the element's `z-index`
  band so a `tooltip`-typed surface doesn't sit visually below a `base` card."
- Elevation is chrome, not semantics: "Material is decorative chrome; semantics live on the
  role-bearing wrapper."

**Page backgrounds: exactly two, and the second is rationed.** From `geist/colors`: "There are two
background colors for pages and UI components. **In most instances, you should use Background 1** —
especially when color is being placed on top of the background. **Background 2 should be used
sparingly** when a subtle background differentiation is needed."

**The 10-step scale assigns fixed roles**, which is what makes "hairline border vs background tint
vs shadow" decidable rather than taste:

- Colors **1–3 = component backgrounds**: 1 default, 2 hover, 3 active. Documented composition
  rule: "If your UI component's default background is Background 1, you can use Color 1 as your
  hover background and Color 2 as your active background. On smaller UI elements like badges, you
  can use Color 2 or Color 3 as the background."
- Colors **4–6 = borders**: 4 default, 5 hover, 6 active.
- Colors **7–8 = high-contrast backgrounds** (7 default, 8 hover).
- Colors **9–10 = text and icons**: 9 secondary, 10 primary.

So the elevation vocabulary in practice is: **hairline border (4–6) plus background tint (1–3) for
anything living on the page; shadow reserved entirely for the four floating materials.** There are
10 colour scales total (Backgrounds, Gray, Gray alpha, Blue, Red, Amber, Green, Teal, Purple, Pink),
P3 on supported displays.

**Where a bordered card actually appears.** In the whole index, `Fieldset` is the one component
described as a card — and its stated job is grouping related form controls, i.e. **settings
sections**. Its variants are all state-carrying, not decorative: `With Error Text`, `With Warning
Text`, `Error Type`, `Warning Type`, `Without Footer`, `Without Title`, and a
**`With Disabled Wall`** variant for tier-gated content. Everything else — Entity rows, Table rows,
Description lists — sits directly on the page background.

### 1.3 List anatomy — `Entity` (the canonical settings/membership row)

`Entity`: "Displays up-to-two columns of content. The left column can contain arbitrary content,
and the right column typically contains controls or actions related to the content in the left
column."

Composition, exactly as documented:

- **Left column, in order:** an `Avatar` or icon → a Title Case label → sentence-case secondary
  metadata (`Member since Mar 14, 2026`). "Lead the left column with a scannable identifier."
- **Right column: at most one or two controls.** "If the row needs more, move secondary actions
  into a `Dots Menu`."
- **Right-column button labels are Verb + Noun** — `Remove Member`, `Resend Invite`. "Bare verbs
  like `Remove` or `Confirm` lose context once the row scrolls offscreen."
- **Multi-select:** "the leading `Checkbox` carries `aria-label="Select {entity name}"` so the row
  is selectable without relying on the visual label."
- **Loading:** "Render the Skeleton variant during load instead of an empty row, and swap to real
  content once data resolves."

The docs' own live example rows are the tell — a three-part row and nothing more:

```
GitHub Desktop on MacBook Pro        [Decline]
Last used just now

VS Code on Windows 11                [Decline]
Last used 10min ago
```

Primary identifier (Label), muted relative-time secondary line, one right-aligned action. No
border per row, no card per row.

**When Entity becomes a real Table.** Geist states the switch in both directions:

- Table: "for tabular data where rows share the same shape **and at least one column is sortable
  or comparable across rows**."
- Entity: "for a row of descriptive content paired with one or two controls (member rows,
  integration rows, domain rows)."
- Description: "for a static key/value metadata block on a detail page."

**Table behaviour rules** (all verbatim-derived):

- Empty list → render `Empty State` **outside** the table, "rather than an empty `<Table.Body>`".
- Unknown value → render `—`. "Don't substitute `N/A`, `null`, or an empty string."
- Sortable headers are `<button>`s; the arrow is decorative and "the button announces the **next**
  sort state".
- "Apply `tabular-nums` (or Geist Mono) to numeric columns so digits align across rows."
- Headers are "Title Case nouns or noun phrases: `Last Used`, `Requests (7d)`, `Created`,
  `Status`. **Never sentences.**"
- Time: short relative form (`2m ago`, `5h ago`), "switch to `Mar 14, 2026` past 7 days".
- Pagination copy: `Previous` / `Next`; page count reads `Page 2 of 7` or `21–40 of 142`
  "with an en-dash inside the range".
- Table variants offered: basic, striped, bordered, interactive, full-featured (with a Subtotal
  footer row), virtualized (+ Show More).

**Row actions** (`geist/menu`, `geist/dots-menu`):

- Open on **click, not hover**: "hover-open menus collide with screen readers and trackpad
  scrolls." Close on activation, Escape and outside-click; "Don't auto-close on a hover-out."
- Cap ≈10 items; past that use `MenuSection` or move to a settings page.
- Items are Title Case **Verb + Noun** (`Rename Project`, `Duplicate Deployment`). "Bare verbs like
  `Rename` or `Edit` are wrong outside obvious single-object context."
- `…` suffix **only** when activating opens a follow-up dialog (`Rename…`, `Transfer to Team…`).
- "Group destructive items at the bottom, separated by a divider, and keep the destructive copy as
  Verb + Noun (`Delete Project`, never bare `Delete`)."
- Permission-gated actions use `MenuItemLocked` — rendered disabled with a lock suffix — rather
  than being hidden.
- Keyboard: Up/Down move, Home/End jump, Enter/Space activate, typeahead matches the visible label
  first, **focus returns to the trigger on close "so keyboard users keep their place in the row"**.
- Right-click/long-press → `ContextMenu`. Global `⌘K` → `CommandMenu`. Two related primary actions
  → split button, "rather than burying the secondary action".

**Paging and truncation** (`geist/show-more`, `pagination`, `load-more-button`):

- `ShowMore` for progressive disclosure of one long list; `Pagination` for sibling pages of the
  same set; `Collapse` for optional sections.
- "Show enough rows to convey the shape of the list before truncating (**5–10 typical**).
  **Truncating at 2 makes the affordance feel performative.**"
- Trigger carries the hidden count — `Show 12 More`, then `Show Less`. Both Title Case.
- "Don't cycle Show More then Show Less mid-flow on the same data set; collapsing rows after the
  user expanded them scrolls them away from where they were reading."
- Trigger is a `<button>` with `aria-expanded` + `aria-controls`; "After expansion, move focus to
  the first newly revealed row."
- "Render hidden rows in the DOM when the count is small so find-in-page works; lazy-load only
  when the dataset is large enough to hurt initial render."
- Pagination: "Hide the slot at the start or end of a sequence instead of disabling it; an empty
  rail reads cleaner than a dimmed link with nowhere to go."

**Detail record** (`geist/sheet`):

- Sheet is for "persistent associated context like deployment details, log row inspection, or a
  member profile, **where the underlying page stays useful**". Default is `modal=false` "so toasts
  and other high-z elements stay reachable".
- Side is derived from trigger location: "a row inspector slides from `right`, a global filter from
  `left`. **Don't change sides mid-session.**"
- "Outside-click does not auto-close, so always render an explicit close affordance and honor
  Escape." Focus is trapped and **returned to the trigger row on close** "so keyboard users keep
  their place in the list".
- **"Don't duplicate the page header inside the sheet; the sheet is the detail layer."**
- Never use Sheet for destructive confirmation — `modal=false` "weakens severity for a delete or
  revoke". That belongs to `Modal` / `Destructive Action Modal` (type-to-confirm gate + optional
  irreversibility band).

### 1.4 Status and metric presentation

- `Status Dot` is scoped to a **single enum**: `QUEUED | BUILDING | READY | ERROR | CANCELED |
  DELETED`. "For non-deployment statuses (Workflow runs, Queue messages, Sandbox, Cron jobs), use
  a `Badge` with the canonical state vocabulary instead of repurposing the dot."
- The dot animates only while `BUILDING`/`QUEUED` and goes static at terminal state — "**Don't add
  a separate spinner alongside it.**" And "Don't flash the color through every transitional state
  on a polling tick; only update when the readyState changes."
- Duration is not the dot's job: "Pair with `RelativeTimeCard` when timing matters
  (`Building · 12s ago`)."
- `Badge` colour mapping is fixed: "`green` for healthy, `red` for error, `amber` for warning,
  `blue` for informational or production, `gray` for neutral. The `-subtle` suffix tones any of
  them down on dense surfaces." Sizes: Small/Medium/Large. Copy: "Title Case, one word when
  possible, two max: `Active`, `Pending`, `Pro`, `Enterprise Trial`. Match the canonical API or log
  term: `Production` not `Prod`, `Deployed` not `Live`, `Canceled` not `Cancelled`."
- **One badge per row.** "Two side by side is a sign the row needs a second column."
- Metric: `Gauge` for "a 0–100 ratio against a fixed maximum where the comparison is the point,
  like quota usage, build cache hit rate, uptime, or billing-period consumption"; `Progress` for
  determinate task progress with a known total; `Badge`/`StatusDot` for enumerated state.
  "Threshold colors should match the same numeric breakpoints used elsewhere in the product
  (`>=80%` warning, `>=95%` error). **Don't invent gauge-only thresholds.**" A gauge is never
  self-describing: "Always pair the gauge with an adjacent label or Tooltip naming what the number
  represents (`Build Cache Hit Rate`)."

### 1.5 Empty / filtered-empty / error states

Geist enumerates **six** distinct empty-ish states and forbids collapsing them:

> "Pick the variant by what the user needs: **no-results** for a filtered list that returned zero
> rows, **blank slate** or **informational** for a resource the user hasn't created, **cleared**
> for completed work, **permission** for role or tier denials, **error** for a failed load."

- Filtered-empty quotes the query verbatim with curly quotes:
  `No logs match “${query}”. Clear the filter to see all logs.` Multi-facet →
  `No {Items} Match Your Filters`, and suggest widening or clearing.
- Titles are Title Case (`No Logs Match Your Filter`), descriptions sentence case that "adds new
  information instead of restating the title".
- CTA cap: one primary, plus one secondary only "when the first action could legitimately be one
  of two paths (`Import Repository` and `Deploy Template`). **Three CTAs is a smell.**"
- "After an async filter change, wrap the region in `aria-live="polite"`."
- Permission and tier denials render **full-page** when the user lands on a route they can't view;
  `Note` is only for one gated tile inside an otherwise-accessible page.
- Errors: "State what happened and what to do next, in that order." System/infra errors always
  carry a stable identifier (request ID, deployment ID, run ID) rendered "on a monospace sub-line
  under a collapsed `<details>` so the user can copy-paste it into a support thread". Validation and
  permission denials are user-state and get no ID. Full-page route errors return focus to `Try
  Again`.
- Loading: `Skeleton` when "async data fills a known layout: table rows, card grids, profile
  blocks, sidebars", sized to the final content — "A 200×20 block becoming an 80×16 string reads as
  a glitch." Shape mirrors the eventual element (avatars `pill`, buttons/chips `rounded`, image
  tiles `squared`). `aria-busy="true"` on the region, `aria-live="polite"` on the destination
  container "not the skeleton itself".

### 1.6 Density and type

Geist's type system is organised **by purpose, not by size**, in four families:

- **Headings** — `text-heading-72 … text-heading-14`.
- **Buttons** — `text-button-16` (largest), `text-button-14` (default),
  `text-button-12` ("Only used when a tiny button is placed inside an input field").
- **Label** — "Designed for single-lines, and given ample line-height for **highlighting & marrying
  up with icons**": `label-20/18/16/14/13/12` plus `label-14-mono`, `label-13-mono`,
  `label-12-mono`.
- **Copy** — "Designed for multiple lines of text, having a higher line height than Label":
  `copy-24/20/18/16/14/13` plus `copy-13-mono`.

The load-bearing usage notes, verbatim:

| Class | Vercel's own usage note |
| --- | --- |
| `text-label-14` | "**Most common text style of all.** Used in many menus." |
| `text-copy-14` | "**Most commonly used text style.**" |
| `text-label-16` | "Used in titles to help differentiate from regular." |
| `text-label-13` | "Used as a **secondary line next to other labels**. Tabular is used when conveying numbers for consistent spacing." |
| `text-label-13-mono` | "Used to pair with Label 14, as the smaller mono size looks better in that pairing." |
| `text-label-12` (+Strong, +CAPS) | "Used for **tertiary level text in busy views**, like Comments, Show More and the capitals in Calendars." |
| `text-copy-13` | "For **secondary text and views where space is a premium**." |
| `text-copy-16` | "Used in simpler, larger views like Modals where text can breathe." |

So the small muted metadata label in a Geist row is **Label 13** (with the tabular variant when it
carries numbers), the row title is **Label 14/16**, and 12 is reserved for tertiary text in dense
views. Emphasis inside a type class is done by nesting `<strong>` (the "Strong"/"Subtle"
modifiers), not by switching class.

**Numbers, with provenance labels:**

- *Measured from the Geist docs site's own stylesheet* (`firecrawl_scrape formats:["branding"]` on
  `vercel.com/geist/typography`): body **16px**, h1/h2 **40px**, base spacing unit **4px**, font
  stack `Geist → Inter → -apple-system…`, page background `#FAFAFA`, primary text `#171717`.
  ⚠️ This is the documentation site, not the dashboard. `#FAFAFA` is also the site's
  `theme-color`, so it is Vercel's own light "Background 2"-ish value, but the 16px body is a docs
  reading measure, not a dashboard density.
- *Community-authored, unofficial* (designsystems.one, self-labelled "Unofficial,
  community-authored reference… not affiliated with Vercel"): `copy-16` 16/24, `copy-14` 14/20,
  `label-12` 12/16; radii small 6 / default 8 / large 12 / pill; `shadow-small
  0 2px 4px rgba(0,0,0,0.1)`, `shadow-medium 0 8px 30px rgba(0,0,0,0.12)`; motion `150ms ease`;
  spacing 4·8·12·16·24·32·48·64. ⚠️ **Do not treat these as canonical.** They are, however,
  consistent with the radii Vercel does publish on the Materials page (6/6/12/12/6/12/12/16).

### 1.7 What Vercel conspicuously refuses to do

- **No `variant="info"` Note** — "No `variant="info"` exists; omit `variant` for the default info
  icon or use `variant="secondary"` for neutral copy."
- **No redundant status iconography.** "Don't add a checkmark icon for success states or an X for
  errors; the variant carries that signal."
- **No two badges in one row.** No clickable badges: "Badges are static labels. Don't wire
  `onClick` onto them; promote to a Button or link." No badge inside a badge, no two icons.
- **No sentences in a badge** (`Currently Active`, `You are on Pro`) — "the surrounding row supplies
  the context."
- **No `Something Went Wrong` title.** "Name the resource that failed (`Couldn't Load Page`,
  `Couldn't Load Deployments`)." `Unable to` is **banned**; `Couldn't`/`Can't` for user-state,
  `Failed to` for system/infra. No `Unfortunately` / `Oops` / `We're sorry`. **"Never humor an
  error."**
- **No `Get Started`, `Continue`, or `OK` as CTA labels** (Empty State). No three CTAs.
- **No background auto-retry on an error surface** — "the user came to this surface to decide."
- **No hover-opened menus.** No auto-close on hover-out.
- **No stacked Notes** — "Stacking three Notes on a card means the page architecture, not the Note
  copy, is wrong."
- **No dismissible project banner**, no competing banners, no emoji/interjection encoding severity.
- **No skeleton as an empty state** and no permanent decorative skeleton.
- **No `Status: Ready` prose wrapped around a status dot**; no `2m ago ago` (don't append "ago"
  after RelativeTimeCard); no pre-formatted date strings passed to it.
- **No product UI inside marketing chrome** — the `Browser` and `Phone` components exist for
  screenshots and explicitly say "Don't render real product UI" inside them.
- **No count in a tab title**; no verbs in a tab title.

---

## 2. Linear

### 2.1 Page anatomy

From "How we redesigned the Linear UI (part Ⅱ)" (Karri Saarinen, Yann-Edern Gillet, Andreas Eldh,
Romain Cascino; 2024-03-28) and `linear.app/docs`:

- The redesign's stated target was structural, not decorative: "We've adjusted the **sidebar, tabs,
  headers, and panels** to reduce visual noise, maintain visual alignment, and **increase the
  hierarchy and density** of navigation elements."
- Linear names a **layered header model**: "Linear relies on a set of structured layouts that
  support the navigation elements and content. It integrates **additional headers to store filters
  and display options**, **side panels to display meta properties**, as well as the actual display:
  list, board, timeline, split, and fullscreen." Milestone 2 of the project was "Behavior
  definitions… of the main components of the app: **sidebar, tabs, app headers, and view
  headers**." That is two distinct header tiers — an *app header* and a *view header* — and the view
  header's documented job is **filters + display options**, not titles and prose.
- The chrome is conceptualised as an "inverted L-shape… the global chrome of the application that
  controls the content in the main view."
- **Control placement, from the docs:** Display options button "shows up on the top right corner of
  a view" (`Shift V`); layout toggle `Cmd/Ctrl B`; Filter menu (`F`); project details sidebar
  toggle "in the top right corner" (`Cmd/Ctrl I`); Inbox quick search `Cmd/Ctrl F`.
- **Descriptions under titles: Linear does not do this as chrome.** On a project, the description
  *is* the body: the Overview tab holds "a brief summary and an extensive description", and "We'll
  display all project properties **beneath the short project summary**" as an inline-editable
  property list (Status, Lead, Team, Milestone, Start date, Target date, Members, Icon), then
  Resources, then the detailed description, then Milestones. The same properties are also reachable
  as a right-hand details sidebar (`Cmd/Ctrl I`) "accessible from the project overview and also from
  the project issues page" — the panel and the body are two projections of one property set.
- Team home page anatomy is tabs + pinned resources: "The Overview tab highlights pinned resources
  for quick access… Team Home also shows team members and shortcuts to common destinations like
  team settings, triage, issues, projects, and views," plus Documents and Members tabs.

### 2.2 Surface law

- **Theme inputs collapsed from 98 to 3.** "Instead of having to define 98 specific variables for
  each theme, we defined three: **base color, accent color, and contrast**." Contrast is a
  first-class variable, so "super high-contrast themes for users who need it for accessibility
  reasons" are generated rather than hand-built.
- **A named 5-rung elevation ladder.** They kept LCH "as it is one of the closest color spaces to
  the human eye and allowed us to deal with **different elevations for our surfaces (e.g.
  background, foreground, panels, dialogs, and modals)**." Aliases are generated for "surfaces,
  texts, icons, and controls".
- **Elevation reads as tint, not shadow, by construction.** "Karri mostly worked with **opacities of
  black and white** during his explorations, which really helped him get results quickly and helped
  me understand the relationship he had in mind between the elements and their respective elevation
  and hierarchy."
- **Post-redesign they deliberately spent less colour and more contrast**: "The latter was achieved
  by **limiting how much chrome (blue in our case) was used in the calculations** applied to our
  color system. The contrast of the content has also been improved by making our text and neutral
  icons darker in light mode and lighter in dark mode."

### 2.3 List anatomy — the issue row

Behaviours are fully documented; **pixel geometry is not public and I have not invented it.**

- **Grouping headers are sticky section headers, not cards:** "The grouping header will remain
  **sticky** as you scroll down so it's clear what grouping and sub-grouping you have in these
  views." Sub-grouping works in lists and as board **rows** ("a swim-lane style structure").
- **One header affordance, two metrics:** "Beside each group in board or list view, you will see
  either the total number of issues in the group **or** the total estimate of all issues in the
  group. **You can click this to toggle** between either option."
- **Row content is user-configurable, and filters vs display are separate axes.** "Display options
  show all issues in the list but hide or show data on the issue item or board card", vs "filters
  will refine the list to only issues with certain properties". Toggleable display properties: ID,
  status, assignee, priority, SLA, project, due date, milestone, cycle, release, estimate, labels,
  links, customers, customer revenue, **time in status**, created date, updated date, pull requests
  and commits, Sentry issues.
- **Three distinct row states — highlight, select, act:**
  - *Highlight* = hover, or `↑`/`↓` / `J`/`K` from the keyboard. "By default, **no issue is
    selected** when you open a board or list of issues."
  - *Select* = `X` on the highlighted row, `Shift`+click, or — critically — "**Hover near the left
    edge of an issue to reveal its checkbox.**" The checkbox is hover-revealed; it does not
    permanently occupy the row.
  - *Range select* = hold `Shift` then `↑`/`↓`. Select-all = filter first, then `Cmd/Ctrl A`.
    `Esc` clears.
  - *Act* = `Cmd/Ctrl K` command bar on the selection, or right-click for the contextual menu.
    "Common bulk actions will show up at the bottom."
- **Keyboard reordering is gated on view state:** `Option/Alt ↑/↓` moves by increments,
  `Option/Alt Shift ↑/↓` to top/bottom — but only after setting Grouping = **No grouping** and
  Ordering = **Manual**. Manual order is a shared mutation: "Manual ordering is unique in that it
  will update the manual order **for everyone in the workspace**."
- **Row → detail is a Quick-Look-style peek, not a navigation:** `Space` to latch peek on/off, hold
  `Space` for a transient preview released on keyup, `↑`/`↓` moves through adjacent items "while
  updating the preview", `Esc` closes. "Peek is one of the semi-secrets of the Linear UI… similar
  to Quicklook in macOS." The command menu auto-peeks the highlighted item. Issue peek shows
  description, assignee, status, priority, cycle, labels, estimate, created date, updated date;
  project peek adds the project graph.
- **Sort semantics differ per layout, on purpose:** "When ordering by status, **list views** show
  issues from closest to done → farthest from done, followed by completed and canceled issues. This
  helps to surface active work without scrolling through the backlog. If you prefer to order issues
  by status in your team's workflow order, **use board views instead**."
- **When Linear switches to a table: essentially never in the work surfaces.** The layout switch is
  list ↔ board (`Cmd/Ctrl B`) ↔ timeline ↔ split ↔ fullscreen. Tabular presentation appears only
  inside Insights/Dashboards, as one of three insight formats — "**charts, metric blocks, and
  tables**".
- **Empty-group state is an explicit switch,** not an inferred one: "Show empty groups — when
  toggled on, this setting shows groups with no issues." Inbox has the analogous "Show snoozed" /
  "Show read" toggles. Completed/archived work is routed to separate destinations rather than
  filtered in place (Active / Backlog default views; Archive at `G` then `X`).
- **Notification row (Inbox):** the redesign "redesigned notifications to be more centered around
  the **notification type** and **emphasized the faces of your teammates**". Row actions from the
  list: `Backspace` delete, `Shift Backspace` delete all read, `U` toggle read, `Option/Alt U` mark
  all read, `H` snooze, right-click for the contextual menu. Hard ceiling documented: 2,000 open
  notifications.
- **Filter chrome is a formula, editable segment by segment:** for `Assignee is Andreas`, clicking
  `Assignee` does nothing, clicking `is` offers `is not`, clicking `Andreas` opens a selectable
  list; adding a second value auto-promotes the operator to `is either of`. Operators are a closed
  set: is/is not, is either of, includes any/all/neither/either/none (labels + links), before/after
  (dates). Applied filters are reflected in the URL and shareable — but "Only the main filters are
  included in the URL. **View options, quick filters, and Insights filters aren't included.**"

### 2.4 Metric presentation (Dashboards / Insights)

- Three formats only, shared between Insights and Dashboards: **chart, table, metric block**.
- Every insight is a **click-through**: "Explored directly — click any slice or metric to open a
  filtered view of the underlying issues."
- Filters compose at two levels: dashboard-level (global to all insights, inherited by insights
  added later) and insight-level (local). And — a genuinely good idea — **dashboard-level filters
  can be visually hidden without being deactivated**: "you can optionally hide these
  dashboard-level filters from view using the 'saved filters' button **to reduce visual clutter;
  this does not affect whether they apply**."
- Freshness is explicit, not implied: a **Refresh data** action in the context menu.

### 2.5 The persistence model worth stealing

Display options are per-user by default and can be promoted: "To update for your view only, simply
modify the display options (do *not* Set as default)… Press **Set as default** to save the current
display options as the default for other members in your workspace. **It will be the view they see
when they first open it, but they can always apply their own preferences on top of it.**" Plus
**Reset to default**. Three-state persistence — personal override / workspace default / reset —
with the personal layer always winning.

### 2.6 Density and type

- **Two Inter cuts, split by role:** "We started using **Inter Display** to add more expression to
  our headings while maintaining their readability and kept using **regular Inter** for the rest of
  the text elements."
- *Measured from `linear.app/docs` CSS* (`branding` scrape): body **15px**, base spacing unit
  **8px**, background `#08090A`, primary text `#D0D6E0`, accent `#5E6AD2`, secondary-button radius
  8px, colour scheme dark. ⚠️ This is the docs/marketing stylesheet. Two of these values are
  independently corroborated as product tokens: `#08090A` is Linear's own `theme-color` meta on
  every page, and `#5E6AD2` is the long-standing Linear accent. Treat **15px body and 8px rhythm as
  docs-site figures**, and `#08090A`/`#5E6AD2` as brand-level.
- *Measured from `linear.app/homepage`*: same family and background, h1 64px / h2 48px / body 15px,
  base unit 8, primary button pill (`9999px`) with a five-layer stacked micro-shadow. ⚠️ Marketing.
- **Not verifiable:** Linear's in-app row height, row padding, and the size/weight/tracking of the
  small muted metadata label. No public artifact exposes them. Do not cite a number for these.

### 2.7 What Linear conspicuously refuses to do

- **Refuses incremental redesign of a shared visual layer.** "While the design debt often happens
  in small increments, it's best to be **paid in larger sweeps**. This goes against the common
  wisdom in engineering… If you update just one module or view at a time, the overall experience
  becomes more disjointed." (A design reset, part I.)
- **Refused to touch navigation in the same project**, to bound risk: "I eventually set aside
  navigation as it became clear the problems were complex and no longer solely a design issue…
  This felt like an unnecessary risk and would expand the scope."
- **Refuses hand-maintained theme variables** (98 → 3) and refuses HSL for surface generation.
- **Refuses to let chrome colour bleed into the neutral scale** — the explicit fix was "limiting how
  much chrome (blue in our case) was used in the calculations".
- **Refuses a permanent per-row checkbox** — it is hover-revealed near the left edge.
- **Refuses to pre-select a row on view open** — "By default, no issue is selected."
- **Refuses table layout for issue lists** — table only exists as an Insights/Dashboard format.
- **Refuses to archive notifications** (documented, deliberate): "We don't support archiving
  notifications at this time."
- **Refuses to let users choose which notifications reach the Inbox** — "All notifications will
  arrive there."

---

## 3. Attio

### 3.1 Page anatomy — the record page

Attio's record page is the best-documented detail page of the six, because every zone is an
admin-configurable slot with a published default and a published cap. Configuration entry point:
`⋮` in the upper-right of any record → **Configure page** → **Save changes** at the bottom.
Configuration is per-object and applies to all workspace members.

The five zones, top-left to bottom-right:

1. **Name + action icon row.** Directly under the record name sits a row of icon buttons:
   Compose email, Add to list, New note, Run workflow, New task, Enroll in sequence (people), plus
   an icon per connected app. **Reorderable** ("hover over the icons and click **Edit**, then drag
   actions to reorder them"). The favourite star is top-left of the record.
2. **Highlights widgets — hard cap of 6.** "At the top of the Overview tab, you can display
   **up to six attributes** as highlight widgets. Click **+ Add widget** to select the attributes
   whose values you want to show at a glance."
3. **Tabs.** Overview, Activity, Emails, Files, Notes, relationship tabs (Team on Companies,
   Company on People, Associated people/company on Deals, or any custom relationship attribute),
   Tasks, Calls. Add / remove / reorder by drag or `⋮ → Move left / Move right / Remove tab`;
   "Some default tabs can't be removed." **Multiple Emails tabs with different sources are allowed
   on one object** (e.g. a general Emails tab plus a "Legal emails" tab sourced from the Legal POC
   relationship) — tabs are a filter dimension, not just a nav dimension.
   Activity tab has its own **View settings → Visible events** toggles per event type.
4. **Left panel: sections.** "Sections appear on the left-hand side of record pages. **Each record
   page must include a Record Details section, and the Lists section can't be removed.**"
   - Record Details holds object attributes, is renameable, and **has a documented default**: "If
     no attributes are added manually, **the first five attributes** listed on the object's
     attribute settings page in Workspace settings are shown by default."
   - Progressive disclosure inside the panel: drag the divider to resize; **View all values** to
     expand the full attribute list; then a **Search attributes** field; right-click a value →
     **View edit history** (who or what changed it).
   - Extra sections are addable with a title and a chosen attribute set; removable via a trash icon
     in the section's top-right; reorderable by drag.
5. **Lists summary.** One section per list the record belongs to, each showing **the first three
   list attributes**. Two density modes, and the density change also changes interactivity:
   - **Standard** — "Larger entries with **editable** attribute values", plus a **Show attribute
     name** toggle to trade visible labels for icons.
   - **Compact** — "Smaller entries with **read-only** attribute values."
   - Per-entry hover affordances: comment icon, run-workflow icon, `⋮` (manage attributes / remove
     from list).

**No page-level description or subhead appears anywhere in the documented anatomy.** The
information budget is spent on capped, named attribute zones instead.

### 3.2 Surface law

Nesting is shallow and every level is named: **page → tab → section/panel → row/entry**. Sections
are the only container primitive in the documented model; there is no card-inside-card. Density is
a **per-section** setting (Standard/Compact on Lists), not a global toggle — so one page can carry
two densities where the content warrants it.

### 3.3 List anatomy — the table view row (Attio is spreadsheet-first)

"Table views enable you to manage record and attribute data in a **spreadsheet-style layout**."

- **The row is a spreadsheet row.** First column is the record name; its header carries a **`+`** to
  create a record ("Click the **+** icon in the first column header, or click **+ New [Object]** /
  **+ Add [Object]** in the top right"). One column per attribute. A trailing `+` after the last
  column adds a column or creates a new attribute.
- **Affordances are column-level, not row-level.** Click a column header for: Move left / Move
  right, **Hide attribute**, **Edit column label**, **Formatting**, and the underlying attribute
  name. Drag headers to reorder; drag the cell edge to resize.
- **Presentation vs model separation is explicit.** "Note that this does **not rename the underlying
  attribute**. The new label you give the attribute will only be shown on the column you are
  editing, and not in any other views where the attribute may be surfaced." **Clear label** reverts.
- **Relative vs absolute time is a per-column formatting choice**, not a product-wide decision:
  "For date and timestamp attributes, choose whether to display values as absolute dates/times, or
  as relative values (i.e. 'in 3 days')." Currency formatting exposes label style, decimals, and
  digit grouping per column.
- **Aggregates live in the column footer.** "Use **+ Add calculation** at the very bottom of a
  column"; numeric columns get sum/count/etc, "Columns with non-numerical values support
  **empty**/**filled** calculations." No separate stats strip.
- **Keyboard is genuinely spreadsheet-grade:** arrows move across cells, Enter/return edits and
  saves, `↓`/`↑` scroll option lists, `@` mentions in tasks/notes/comments, `cmd/ctrl+C/V` copies
  and pastes attribute values. Range select by click-drag or click → `shift` → click. Paste works
  **to and from external spreadsheets**, with type compatibility enforced: "you cannot paste an
  email address into a phone number attribute."
- **Row selection → toolbar.** "Select multiple records using the checkboxes, then add them to a
  list, run a workflow, send emails, or delete them." On relationship tabs the toolbar is: Add to
  list, Enroll in sequence, Run workflow, Send email, **Unassociate**, Delete. If the relationship
  is single-valued, the same actions move to a per-row `⋮` instead — the affordance shape follows
  cardinality.
- **Hover reveals, it doesn't decorate:** hover a record name in a view to reveal the favourite
  star; hover a list entry to reveal comment / workflow / `⋮`.
- Cell-level audit: right-click a cell → **View edit history** (Pro/Enterprise).

### 3.4 When they switch from a list to a real table — and to something else entirely

Attio's layout answer is **table or kanban**. The more interesting switch is at the data-model
level, and they publish the decision rule:

- **All-records view** (sidebar → Records): dynamic, filter-defined, "always visible to everyone in
  the workspace". Use it "when you want to segment all records of a particular object using
  filters".
- **List**: a handpicked subset that creates a *list entry* per record — "an instance of that record
  within the list, and it's where **list-specific attributes** live. This allows you to track
  information that only applies in that context **without changing the underlying record itself**."
  Lists can be private or restricted; object views cannot.
- **Custom object**: for genuinely new entities needing relationships and reporting.
- The summary line: "**use a custom object to model new data, and use a list to organize existing
  data for a process or workflow.**"
- **View** = a saved projection (layout + saved filters/sorts + visible attributes) over either.
  "You can hide or reorder attributes in each view without affecting other views."

### 3.5 Density and type

- *Measured from `attio.com/help` CSS* (`branding` scrape): Inter body + **InterDisplay** headings
  (same role-split as Linear), base spacing unit **8px**, border-radius **10px**, `#FFFFFF`
  background, `#000000` primary text, muted greys `#8F99A8` / `#6F7988` / `#717A88`, body **12px**,
  h1 56px. ⚠️ Help-centre stylesheet, and the 12px "body" reading is the site's small print, so
  **only the Inter/InterDisplay pairing, the 8px rhythm and the muted-grey ladder are safely
  transferable**; the sizes are not.
- **Not verifiable:** Attio's in-app row height, cell padding, or metadata label spec.

### 3.6 What Attio conspicuously refuses to do

- **Refuses an unconfigured-but-empty page.** Every zone has a published default (first 5 object
  attributes; first 3 list attributes), so a page nobody configured is still legible.
- **Refuses an unbounded attribute dump at the top of a record** — 6 highlight widgets max, then a
  resizable, expandable, searchable panel.
- **Refuses editable values in Compact mode.** Density downgrade deliberately downgrades
  interactivity rather than shrinking a fully interactive row.
- **Refuses to let presentation mutate the model** — relabelling a column never renames the
  attribute, and the relabel is scoped to that one column.
- **Refuses to leak personal organisation into shared space** — "Favorites and folders are personal
  to you and won't appear in other team members' sidebars." Sidebar list sort is per-user, *except*
  custom drag order, which is explicitly shared — documented rather than accidental.
- **Refuses an unbounded sidebar list** — "By default, the sidebar will show a maximum of **six**
  lists. Toggle **Show all lists** on to remove the limit."
- **Refuses type-unsafe paste.**

---

## 4. Height — historical only (product shut down 2025-09-24)

⚠️ **Status.** Height ceased operations on 2025-09-24, announced 2025-03-20 by founder/CEO Michael
Villar. `height.app` now serves only a farewell page: "After three and a half years of being
publicly available, we've made the difficult decision to discontinue operations six months from
now, with the final day of service being September 24th, 2025." The help centre exists only in the
Wayback Machine; its archived **Height 2.0** collection (25 articles) is entirely about autonomous
AI workflows, permissions and standups, and contains **no UI-anatomy articles**. Everything below is
from archived **2022** help-centre docs describing **Height 1.x** and cannot be verified against a
running product. Included because the user asked for it and because two of its patterns are
genuinely instructive by contrast with Linear.

Self-description: "a powerful **spreadsheet-style interface** and integrated real-time chat" — the
row was a spreadsheet row with chat welded to the detail view.

- **Grouping was "Section by", with "Subsection by"** for a second level — same two-level grouping
  as Linear's group/sub-group and Notion's group/sub-group.
- **Row configuration was a *team* artifact, not a personal one.** "Once you've added your
  attributes and their options, you can then toggle them as shown or hidden on each list from the
  'Section by' menu… **Everyone looking at that list will see the same attributes and the tasks in
  the same order.**" This is the exact inverse of Linear's personal-by-default display options,
  and it is the clearest contrast in the whole report: the same feature, opposite persistence law.
- **Row anatomy:** leading completion checkbox that *is* the done action ("you can also mark any
  task as done, by tapping on the box next to it, just like in any to-do list… You can undo this by
  tapping on the box again"); inline-editable name ("Hit enter once on any task to immediately edit
  its name inline"); attributes as trailing columns; **subtasks as first-class rows in the main
  list**, created with `TAB` — "in Height, subtasks are a first-class citizen, **visible from the
  main list** and you can give them any attributes you want, just like a parent task. For example,
  some subtasks can be bugs, some can have different owners, some can be high priority."
- **Completed-row policy was per-view with layout-specific defaults** — the most concrete
  "what happens to finished rows" spec of the six: "By default, in a **grid** visualization, once
  you mark a task as completed (whether it's 'Done', 'Won't do', etc), **it will disappear from your
  list**. Within **kanban** visualizations, completed tasks will show **since the most recent
  Monday** (i.e. a current work week)." The View menu then offered: always show / never show / only
  today / since a specific weekday / a custom date.
- **Detail preview with a pinnable attribute rail:** "If you're looking for your task attributes
  when you open a task preview from a list, you can opt to **always see them as a sidebar** by
  clicking the sidebar button next to 'Attributes'." A per-user pin that promotes a popover into a
  persistent panel.
- **Select-then-command-palette**, same as Linear: "Once you've selected one or more tasks, use
  `cmd+k`… With Command, you can quickly manage tasks en masse, marking all selected as done,
  adding a new attribute, like 'v109', to them, or bulk removing the assignee."
- **Smart lists = saved searches** supporting `and` / `or` / `not` / parentheses, pinnable to the
  sidebar, and visible to teammates who can pin them too.
- **Layout switch was three-way** (spreadsheet / kanban / calendar) with an explicit mutation
  warning: "A message will appear notifying you of unsaved changes if the updated view is not saved
  following the change." Changing a shared view's layout is treated as a change to shared state and
  announced as one — a detail worth stealing regardless of Height's fate.
- Settings IA was two-level and split by ownership: **Settings → Product settings → {Attributes,
  Integrations}** and **Settings → Personal settings → {Profile, Preferences, Notifications}**.
  Row-density-relevant preferences lived there: "you can decide if you want to **show task IDs and
  list names**, see **usernames or full names** of your teammates, and set Height to dark or light
  mode."

**What Height refused:** per-user row configuration. View configuration was deliberately a team
artifact. Given the product is gone, treat this as a documented alternative rather than a
recommendation — Linear's personal-override-on-top-of-workspace-default is the pattern that
survived.

---

## 5. Notion — settings surfaces and the database detail page

### 5.1 Page anatomy — the database page layout builder

Notion is the only one of the six that ships a **user-facing layout builder** for its detail page,
which makes its zone vocabulary unusually explicit. Entry point: hover above the database page
title → **Customize layout** (desktop/web; `···` → Customize layout on mobile).

Four zones:

1. **Heading** — page title + **pinned properties** + backlinks. The reference doc:
   "you can pin **up to 15 properties**." (The companion guide says "up to four important database
   properties"; the reference is the newer and more specific source — noting the discrepancy rather
   than resolving it.) Overflow behaviour is published: "When you pin more properties than fit on
   screen, they appear in a **horizontal scroller**. Use the `>` and `<` arrows to scroll."
   Backlinks have three states: **Always show / Show on hover / Off**.
2. **Main page area** — "the spotlight of your layout… ideal for elements that deserve more
   attention, such as sub-items, detailed text, or visual content like files and media."
3. **Property group** — **exactly one per layout**, holding every property not pinned and not
   promoted to a module. Organisable into **named collapsible sections**. Has its own search:
   "Type any part of a property name to filter the list in real time. The search works **across
   collapsed sections and hidden properties too**. Search is not case-sensitive."
4. **Details panel** — a collapsible right panel, opened/closed by **View details** at the top of
   the page. Guide framing: "your organizational sidekick… keeps your main page clutter-free while
   ensuring all important information remains within easy reach. Think of it as a handy spot for
   those **'nice-to-have' details that don't need center stage**."

Plus **modules** — "a way to have any single property stand out on its own, in its own area…
great for displaying images and visuals, or just drawing attention to a single property, like a
summary."

**Structure choice:** `Simple` (properties + content across main page and details panel) or
`Tabbed` — "One tab is a `Content` tab that contains the page's contents and layout modules, and
you can add more tabs that contain **views of other databases** from your workspace."

**Three-state property visibility, not two:** `Always show` / **`Hide when empty`** / `Always hide`.
And hidden properties don't vanish: "When you hide properties, they get **aggregated in a single
menu item at the bottom of the list**. You can click this to easily show any hidden properties."

Comments are a layout decision too: page discussions on/off; inline comments `Default` (comment
visible with commenter's photo) vs **`Minimal`** (count only, click to expand).

**Documented constraints** — the interesting part, because they're the guardrails:

- "A page layout will apply to **all pages in the database**. Layouts **can't** be applied only to
  specific pages or specific views."
- "You **can't** move or remove a page's `Heading`." "You **can't** remove the `Property group`."
- "Some properties, like `Relation`, can't be moved to the details panel."
- Reset exists and is non-destructive: `Reset to original page layout` — "No properties will be
  deleted."

### 5.2 Surface law

Notion's containment rule is **full-page vs inline**, and chrome is earned by being the page:

- "**Controls and menus for your inline database are hidden until you hover over it.**"
- Full-page databases "appear just like any other page in your sidebar" and get persistent chrome.
- Convertible in both directions (drag to sidebar to promote; `⋮⋮ → Turn into inline` to demote).

Visible nesting: page → (tabs) → main area + details panel → property group → sections. Four
levels, and only **one** of them (the details panel) is a visually distinct surface.

### 5.3 List anatomy

**Notion's `List` layout is the deliberately low-chrome one:** "Lists are a very clean, minimal
layout of your database items… ideal for storing notes, articles, and documents that don't need too
many properties."

Row composition, verbatim: "**In lists, all the properties assigned to an item appear at the far
right.**" So — primary identifier left, *all* metadata right-aligned, no columns, no header row.
Property order in that right-hand cluster is set by dragging `⋮⋮` in Property visibility.

**Hit targets differ per layout, and it's documented:**

- Tables: "hover over your first column and click the **`OPEN`** button that appears."
- Lists: "just click on the **title** of the item."
- Boards, calendars, galleries: "click **anywhere on the card**."

**Where the detail opens is a per-view setting with layout-specific defaults** — the cleanest spec
of this decision anywhere in the six:

- Options: **Side peek** ("Open pages on the right side of the database. The rest of the database
  view continues to be interactive on the left"), **Center peek** ("a focused, center modal"),
  **Full page**.
- Defaults: "**Table, Board, List & Timeline** layouts will open pages in **side peek** by default.
  **Gallery & Calendar** layouts will open pages in **center peek** by default."
- And always an escape hatch: "Pages will always open in a peek preview. Click `⤡` at the top left
  to view in full page mode."

**Table row affordances:**

- Selection checkbox is **hover-revealed** (same as Linear): "Hover over any row and click the
  checkbox that appears next to it… If you want to select all of the rows, hover over the `Name`
  property and click the checkbox that appears next to it." Then "edit any of your database
  properties for your selected rows".
- Reorder = drag the `⋮⋮` handle revealed on hover (rows); drag the heading (columns); drag the
  column edge to resize.
- **Column footer aggregates** (same pattern as Attio): Count all / Count values / Count unique
  values / Count empty / Count not empty / Percent empty / Percent not empty / Earliest date /
  Latest date / Date range; number properties add Sum / Average / Median / Min / Max / Range.
- Horizontal-scroll answer is **`Freeze up to column`** — the frozen columns "stay visible on the
  left side no matter where you scroll".
- `Wrap text` is a per-column choice for long cell content.
- Grouping: `Group` + `Sub-group` ("groups by status can also be sub-grouped into priority"), with
  per-group `👁️` show/hide, group sort, and **`Hide empty groups`** — the same explicit
  empty-group switch Linear has.
- Search inside a view appears past a threshold: "Databases that contain **at least three pages**
  will also be searchable… Database search looks at database page titles and properties."
- The Title column is structurally load-bearing and they say so: "The `Title` property gives you
  access to database pages. That said, you can drag the column left or right to re-order it."

**Row → item is always a page**, which is the reason the detail-page spec is so developed: "Every
item in your database, whether it's a row in a table or a card on a board or calendar, is its own
Notion page."

**When they switch layouts:** per-view choice over one data source — Table / Board / Timeline /
Calendar / List / Gallery / Chart — with a stated isolation rule: "**Each database view has its own
settings. Settings applied to one database view won't be applied across all other database views
automatically.**" Filters and sorts additionally have a **`Save for everyone`** switch — personal
by default, shared on opt-in (the same three-state persistence idea as Linear's *Set as default*).
Advanced filters nest AND/OR "up to three layers deep".

### 5.4 Settings surfaces

Notion's workspace settings are a **flat two-level IA** with long scrolling sections, not nested
tabs. Almost every documented action reads:

> "1. Go to `Settings` in your sidebar. 2. Under `Workspace`, select `General`. 3. …"

Sections observed in the docs: `General` (name, icon, trusted domain access / allowed email
domains, export all workspace content, export members as CSV, analytics toggle, Danger zone),
`Identity` (verified domains, SAML SSO), `Security`, `Emoji`, `Members`.

Three patterns worth lifting:

1. **Destructive actions are fenced in a named region with a typed confirmation.** "Scroll down to
   `Danger zone` and select `Delete entire workspace`. **You'll be asked to type the name of your
   workspace to confirm** you want to proceed." (Compare Geist's `Destructive Action Modal`:
   "a required type-to-confirm gate and an optional irreversibility band.")
2. **Plan gating is disclosed inline per setting, not hidden.** "Note: Some of the following
   settings are available on specific Notion plans only", then per-setting tier annotations
   (`Allow page access requests from non-members`: all plans except Enterprise; `Allow members to
   request adding other members`: Plus and above; and a separate "Security settings available on
   Enterprise Plans only" block).
3. **A pending → verified state machine is exposed in the row**, with a manual retry: "If your
   domain's status is `Pending`, select `•••` next to the domain → `View details` → `Verify` to
   manually verify it… your domain's status will be `Verified`."

Also documented: role-shaped visibility ("Many of these settings are only visible if you're an
admin on a Plus Plan or Enterprise Plan. **They don't appear in the mobile app at all.**") and a
database-specific permission level, `Can edit content`, whose boundary is spelled out — can create /
edit / delete pages and edit property values; **cannot** add/edit/remove properties or views,
change filters or sorts, or lock the database. That's a permission that separates *data* from
*structure*, which is exactly the distinction a control plane needs.

### 5.5 Density and type

- The density levers Notion actually exposes are structural, not typographic: hide properties
  (`Hide when empty` / `Always hide`), collapse property-group sections, `Full width` page option,
  hide `Property icons` ("If you hide property icons, only property names will be visible in
  pages"), inline comments `Minimal`, backlinks `Show in popover`.
- **I deliberately did not scrape `notion.com` branding CSS for numbers.** The marketing site's
  type scale is far from the app's, and quoting it would be actively misleading. No public artifact
  gives Notion's product row height or metadata label spec.

### 5.6 What Notion conspicuously refuses to do

- **Refuses per-view detail layouts.** One layout per database, applied to all pages — a deliberate
  consistency constraint on an otherwise infinitely configurable product.
- **Refuses to let you delete the Heading or the Property group** — the two structural anchors.
- **Refuses to let you delete the Title/Name property** ("Our tables are a lot different than
  traditional spreadsheets, since each row represents a database entry that can be opened as its
  own page").
- **Refuses to hide hidden things completely** — hidden properties collapse into one clickable
  aggregate at the bottom of the list.
- **Refuses a destructive reset** — `Reset to original page layout` deletes no properties.
- **Refuses to show controls on inline databases at rest** — hover-only.
- **Refuses to share your filters/sorts by default** — sharing is the explicit `Save for everyone`
  opt-in.

---

## 6. Raycast — team / organization dashboard

⚠️ Weakest of the six for page-internal structure. Raycast's team surfaces are split between the
native app's Settings and a web account area, and `manual.raycast.com` documents them as feature
lists rather than layouts. Only what is attributable is reported.

- **Settings IA: a left rail of tabs — fixed system tabs first, then a data-driven entity list in
  the same rail.** Documented panes: **Account** ("sits at the top left of Settings and shows your
  profile at a glance… your current plan (Free, Pro, or Teams)"), General, Launcher, Shortcuts,
  Keyboard, Advanced, **Organizations**, About, AI, Applications — and then "Below the list of
  Applications, **each installed extension appears as its own entry in the sidebar**", grouped into
  categories: Built-in commands, Store extensions, Script Commands, Quicklinks. That mixed rail
  (fixed sections + a categorised list of user data) is the notable structural move.
- **v2 was "redesigned with a cleaner layout that matches the refreshed look and feel of the app",
  and shipped search *because* the rail got long.** `⌘F` in Settings: "You don't need to remember
  where every option lives… search for anything: a setting, a command, an extension, or just a
  keyword you remember. Select a result to **jump straight to the right place**." Plus a deep-link:
  `⌘⇧,` from Root Search "to jump directly to the selected item's settings", and
  `Configure Command` / `Configure Extension` from the Action Panel.
- **Density is a user-chosen product setting, not a fixed design decision** — the most explicit
  density affordance in the six:
  - **Interface Size**: Default / Large / Larger, selected via `Aa` buttons. "When you change the
    size, Raycast's windows resize to match, and **all UI elements scale with them, including text,
    buttons, and fields**." It also nudges per-window content zoom upward if that window's zoom is
    smaller, but "Content zoom stays independent… you can still adjust it per window."
  - **Window Mode**: Compact / Expanded — "**Compact mode uses a more condensed layout so you can
    see more results at a glance.**"
- **Settings rows edit in place; there is no drill-down page.** Applications pane: "Use the search
  field to find any installed app, then **configure it inline**: **Add Alias** — give an app a
  custom name to type… **Record Hotkey** — assign a global keyboard shortcut… **Checkbox** —
  disable individual apps you don't want to appear in Raycast's results."
- **A row toggle with global consequence, stated as such:** "Each command has a toggle to enable or
  disable it. **Disabled commands won't appear in Root Search.**"
- **Section-level master switch in the section header:** "Toggle the switch in the top right to
  enable or disable AI globally" (and the same for Applications). A whole pane can be switched off
  from its own header.
- **Reorder/remove row pattern** in the Fallback Commands pane: "Add commands from any extensions,
  use [drag] to reorder them, and use [x] to remove ones you don't want."
- **Members / permissions surface — a real precedent for rendering permissions as a table.**
  Organization Settings → Members exposes a documented column set: "the complete list of
  organization members, including **name, email, role, and 2FA status**", where the 2FA column is
  Enterprise-only. Three roles: **Manager, Billing, Member**. The manual itself renders the
  capability matrix as a permission-per-row × role-per-column table with `Yes`/blank cells and a
  footnote marking Enterprise-only rows — not prose. Roles are assigned "by Managers in the Members
  section of the Organization Settings page".
- **Shared-vs-personal is surfaced in the row, not in a separate area:** "Anything you share lives
  in your organization **alongside your personal items**, so members can tell at a glance **what's
  theirs and what comes from the team**." (Contrast Attio, which puts personal favourites in a
  separate sidebar section.)
- **Per-setting "New" badges.** The manual marks individually-shipped settings with a `New` badge
  inline — a setting-level changelog affordance rather than a separate release-notes page.
- *Measured from `manual.raycast.com` CSS* (`branding` scrape): Inter, body **15px**, h1 36 / h2 28,
  base spacing unit **4px**, border-radius **3px**, `#FFFFFF` / `#000000`, accent `#D82524`.
  ⚠️ Documentation site, not the app.

---

## Transferable rules

Testable rules distilled from the above. Each carries its attribution. "Testable" means an
implementation can be checked against it in review.

### Page anatomy

1. **A page header carries identity + page-scoped actions + persistent state, never explanatory
   prose.** Vercel's published component index has no page-description primitive at all; the only
   place its prose admits a page header is as the home for "critical persistent warnings"
   (`geist/empty-state`). Linear's own redesign names two header tiers — *app header* and *view
   header* — and gives the view header exactly one job: filters and display options
   (`linear.app/now/how-we-redesigned-the-linear-ui`). Test: no `<p>` of descriptive copy between a
   page title and the first content element.
2. **If a surface needs an explanation, the explanation belongs to a *card* or a *metadata pair*,
   not to the page.** Geist puts subtitles on `Fieldset` (bordered settings card: title + subtitle)
   and key/value on `Description` (`<dl>/<dt>/<dd>`), and explicitly forbids using a two-column
   table for the latter. Test: every subhead in the app resolves to either a Fieldset-style section
   subtitle or a definition-list value.
3. **Tabs are sibling views of one resource; cap them at 5–7; title them as Title Case destination
   nouns; put the count in a badge that disappears at zero; reflect the active tab in the URL.**
   All five from `geist/tabs`. Corroborated by Attio (record tabs are addable/removable/reorderable
   projections of one record) and Linear (project Overview/Issues; team Overview/Documents/Members).
   Test: no tab label contains a verb or a parenthesised count; refresh restores the tab.
4. **Page-level messaging is typed, and the type determines dismissibility.** Project-wide state
   needing resolution → non-dismissible banner with a CTA that resolves it, one at a time. Inline
   contextual → Note, persistent until the underlying state changes, one per concept. Transient
   acknowledgment → Toast. All from `geist/project-banner`, `geist/note`, `geist/toast`. Test: no
   dismissible banner exists; no card carries two Notes.
5. **Cap every configurable zone and publish a default so an unconfigured page is still legible.**
   Attio: 6 highlight widgets max; Record Details defaults to "the first five attributes listed on
   the object's attribute settings page"; each Lists section shows "the first three list
   attributes". Notion: up to 15 pinned properties, overflow becomes a horizontal scroller. Test:
   every slot-based zone has both a documented maximum and a documented empty-config default.

### Surface law

6. **Two page backgrounds maximum, and the second is rationed.** Geist: "In most instances, you
   should use Background 1… Background 2 should be used sparingly when a subtle background
   differentiation is needed." Test: grep for a third page-level background token.
7. **Assign every step of the neutral scale a single role, and never use a step outside its role.**
   Geist: 1–3 component background (default/hover/active), 4–6 border (default/hover/active), 7–8
   high-contrast background, 9–10 text/icons (secondary/primary). Test: a border colour never
   appears as a fill, and a fill never appears as a border.
8. **In-page elevation is hairline border + background tint. Shadow is reserved for surfaces that
   float above the page.** Geist's Materials splits into Surface (base/small/medium/large) vs
   Floating (tooltip/menu/modal/fullscreen), and only the floating family is described in terms of
   lift. Linear reached the same place from the other direction: their designer "mostly worked with
   opacities of black and white", and LCH was kept because it "allowed us to deal with different
   elevations for our surfaces (e.g. background, foreground, panels, dialogs, and modals)". Test:
   no `box-shadow` on any element that scrolls with the page.
9. **Never nest two elevated surfaces.** Geist: "Don't stack two Materials on the same element; if
   a child needs more elevation, lift it into its own Material with a higher type." Plus "Favor the
   lowest elevation that still reads as elevated against its background; over-elevating is a common
   source of visual noise." Test: no card inside a card; maximum one bordered/filled container
   between the page background and a row.
10. **Bordered/filled cards exist for one purpose: grouping form controls into settings sections.**
    `Fieldset` is the only card in Geist's index, and its variants are all state-carrying (error
    text, warning text, error type, warning type, disabled wall for tier gating) rather than
    decorative. Lists, tables, metadata and detail properties sit directly on the page background —
    Attio's record sections, Linear's issue rows and Notion's list rows are all borderless. Test:
    every card in the app either wraps form controls or carries a documented state.
11. **Allow density to vary per section, and make the density change a real semantic change.**
    Attio's Lists sections: Standard = "larger entries with editable attribute values"; Compact =
    "smaller entries with **read-only** attribute values". Raycast makes density a user setting
    (Interface Size Default/Large/Larger; Window Mode Compact/Expanded, where "Compact mode uses a
    more condensed layout so you can see more results at a glance"). Test: a compact variant never
    just shrinks a fully interactive row.

### List anatomy

12. **The default row is a single borderless flex row: identifier on the left, metadata beneath or
    beside it, at most two controls on the right.** Geist `Entity` is literally "up-to-two columns",
    right column "at most one or two controls. If the row needs more, move secondary actions into a
    Dots Menu", left column ordered avatar/icon → Title Case label → sentence-case secondary
    metadata. Notion's List layout: "all the properties assigned to an item appear at the far
    right". Test: no row has a border, a shadow, or three right-side buttons.
13. **Right-aligned row actions are Verb + Noun, always.** Geist `Entity`: "Keep right-column
    buttons Verb + Noun (`Remove Member`, `Resend Invite`). Bare verbs like `Remove` or `Confirm`
    lose context once the row scrolls offscreen." Same rule in `geist/menu` for overflow items, with
    destructive items grouped at the bottom behind a divider and `…` reserved for items that open a
    follow-up dialog. Test: grep row-action labels for single-word verbs.
14. **The selection checkbox is hover-revealed, and nothing is selected on load.** Linear: "Hover
    near the left edge of an issue to reveal its checkbox" and "By default, no issue is selected
    when you open a board or list of issues." Notion: "Hover over any row and click the checkbox
    that appears next to it"; the header checkbox selects all. Test: a fresh list render has no
    persistent leading checkbox column and no selected row.
15. **Model three distinct row states — highlight, select, act — and give each its own input.**
    Linear: hover or `↑`/`↓`/`J`/`K` highlights; `X` or `Shift`+click selects; `Shift`+`↑`/`↓` range
    selects; `Esc` clears; `Cmd/Ctrl A` selects all *after* filtering; `Cmd/Ctrl K` or right-click
    acts on the selection; "Common bulk actions will show up at the bottom." Test: keyboard-only
    traversal, selection, and action are all possible without the mouse, and bulk actions appear in
    a bottom bar rather than mutating the header.
16. **Grouping is a sticky section header carrying one togglable aggregate — never a card per
    group.** Linear: "The grouping header will remain sticky as you scroll down"; "Beside each group
    … you will see either the total number of issues in the group or the total estimate of all
    issues in the group. You can click this to toggle between either option." Both Linear and Notion
    ship an explicit **Hide/Show empty groups** switch rather than inferring it. Test: group headers
    stick on scroll, carry exactly one count, and empty-group visibility is a user toggle.
17. **Switch from list to table only when rows share a shape *and* at least one column is sortable
    or comparable across rows.** `geist/table`, with the two counter-rules: descriptive row + one
    or two controls → `Entity`; key/value metadata on a detail page → `Description`, "not a
    two-column table". Linear never uses a table for issue lists at all — tabular presentation
    exists only as one of three Insights formats. Test: every table in the app has a sortable or
    comparable column; every settings/membership list is rows, not a table.
18. **In a real table, put aggregates in the column footer, not in a separate stats strip.** Attio:
    "+ Add calculation at the very bottom of a column" (numeric → sum/count; non-numeric →
    empty/filled). Notion: the same footer menu with Count all / values / unique / empty / not empty
    / Percent empty / not empty / Earliest / Latest / Date range, plus Sum/Average/Median/Min/Max/
    Range for numbers. Test: no KPI row duplicates a number that a column footer could carry.
19. **Truncate a long list at 5–10 rows, put the hidden count in the trigger, and move focus into
    the revealed rows.** `geist/show-more`: "Show enough rows to convey the shape of the list before
    truncating (5–10 typical). Truncating at 2 makes the affordance feel performative"; "Show 12
    More"; `aria-expanded` + `aria-controls`; "After expansion, move focus to the first newly
    revealed row"; don't re-collapse mid-flow. Test: no "Show more" behind fewer than five rows and
    no bare "Show more" without a count.
20. **Row → detail opens a side panel that keeps the list interactive, and returns focus to the
    row.** Geist `Sheet`: default `modal=false`; "a row inspector slides from `right`"; "Don't
    change sides mid-session"; focus trapped then "return focus to the trigger row on close so
    keyboard users keep their place in the list"; **"Don't duplicate the page header inside the
    sheet; the sheet is the detail layer."** Notion codifies the defaults per layout — "Table,
    Board, List & Timeline layouts will open pages in side peek by default. Gallery & Calendar
    layouts will open pages in center peek by default" — always with a `⤡` escape to full page.
    Linear's Peek adds the keyboard version: `Space` to latch, hold for transient, `↑`/`↓` walks
    adjacent records while updating the preview, `Esc` closes. Test: opening a row detail does not
    navigate, does not repeat the page title, and `Esc` + focus return both work.
21. **Never use the non-modal detail panel for a destructive confirmation.** `geist/sheet`: the
    non-modal default "weakens severity for a delete or revoke" — that belongs to a modal with a
    type-to-confirm gate (`geist/destructive-action-modal`), and Notion fences the same class of
    action in a named `Danger zone` requiring the user to type the workspace name.

### States

22. **Ship five separate states, not one "empty".** Geist enumerates: no-results (filtered list
    returned zero rows), blank slate / informational (never created), cleared (completed work),
    permission (role or tier denial, rendered full-page on a route the user can't view), error
    (failed load). Test: a filtered-to-zero list and a never-created list render different copy.
23. **Filtered-empty quotes the query verbatim and offers the clear action.** Geist:
    `No logs match “${query}”. Clear the filter to see all logs.` Multi-facet →
    `No {Items} Match Your Filters`, suggesting widening or clearing. Test: the query string appears
    in the empty message.
24. **One primary CTA in an empty state, two only when the first action is legitimately two paths.
    Never `Get Started` / `Continue` / `OK`.** `geist/empty-state`: "Three CTAs is a smell."
25. **Errors name the resource, never `Something Went Wrong`; carry a copyable ID for system
    failures only; never auto-retry.** `geist/error`: `Couldn't Load Deployments` not
    `Something Went Wrong`; `Couldn't`/`Can't` for user-state, `Failed to` for infra, `Unable to`
    banned; no `Oops`/`Unfortunately`/`We're sorry`; "Never humor an error"; stable ID on a
    monospace sub-line inside a collapsed `<details>`; validation and permission denials get no ID;
    "Don't auto-retry in the background; the user came to this surface to decide"; full-page route
    errors return focus to `Try Again`.
26. **Skeletons match the final layout's dimensions and shape, and are never an empty state.**
    `geist/skeleton`: "A 200×20 block becoming an 80×16 string reads as a glitch"; avatars `pill`,
    buttons/chips `rounded`, image tiles `squared`; `aria-busy` on the region and `aria-live` on the
    destination container "not the skeleton itself"; "When there's no data to load, render an
    EmptyState." Geist `Entity` adds the row-level version: "Render the Skeleton variant during load
    instead of an empty row."

### Status and metrics

27. **One badge per row; colour carries the signal; no icon duplicating it; badges are never
    clickable.** `geist/badge`: "One badge per row; two side by side is a sign the row needs a
    second column"; green healthy / red error / amber warning / blue informational-or-production /
    gray neutral, `-subtle` for dense surfaces; "Don't add a checkmark icon for success states or an
    X for errors"; "Don't wire `onClick` onto them"; Title Case, one word ideally, two max, matching
    the canonical API term (`Canceled` not `Cancelled`).
28. **A status dot is scoped to one lifecycle enum, animates only in transitional states, and never
    duplicates a spinner or a `Status:` prefix.** `geist/status-dot`, whose enum is
    `QUEUED | BUILDING | READY | ERROR | CANCELED | DELETED`; anything else uses a Badge. "Pair with
    RelativeTimeCard when timing matters (`Building · 12s ago`); the dot alone doesn't convey
    duration."
29. **Every metric names itself, and thresholds are product-wide.** `geist/gauge`: "The gauge alone
    is not self-describing" — always an adjacent label or Tooltip; "Threshold colors should match
    the same numeric breakpoints used elsewhere in the product (`>=80%` warning, `>=95%` error).
    Don't invent gauge-only thresholds." Gauge for a ratio against a fixed max, Progress for a known
    total, Badge/StatusDot for enumerated state.
30. **Every metric is a click-through to the rows behind it.** Linear Dashboards: "click any slice
    or metric to open a filtered view of the underlying issues"; only three formats exist (chart,
    metric block, table); freshness is an explicit `Refresh data` action. Test: no number in the app
    is a dead end.
31. **Time is `2m ago` / `5h ago` up to 7 days, then `Mar 14, 2026` — one formatter, no `ago ago`,
    no pre-formatted strings.** `geist/table` + `geist/relative-time-card`. Attio shows the
    escape valve: make absolute-vs-relative a **per-column formatting** choice rather than a
    product-wide argument.
32. **Unknown cells render `—`.** `geist/table`: "Don't substitute `N/A`, `null`, or an empty
    string." And numeric columns get `tabular-nums` "so digits align across rows for comparison".

### Persistence and configuration

33. **View configuration is personal by default, promotable to a shared default, and always
    resettable — with the personal layer winning.** Linear: modify to change your own view; "Set as
    default" to save it "for other members in your workspace… but they can always apply their own
    preferences on top of it"; "Reset to default" reverts. Notion filters/sorts have the same
    opt-in: `Save for everyone`. Height did the opposite ("Everyone looking at that list will see
    the same attributes and the tasks in the same order") and is no longer with us — treat the
    personal-default model as the one that survived. Test: changing a display option never mutates
    a colleague's view unless the user explicitly promoted it.
34. **Filters and display options are different axes and must not be conflated.** Linear: "filters
    will refine the list to only issues with certain properties while display options show all
    issues in the list but hide or show data on the issue item or board card." Test: two separate
    controls, two separate menus.
35. **Reflect filters in the URL and say which parts don't round-trip.** Linear: applied filters are
    in the URL and shareable, but "Only the main filters are included in the URL. View options,
    quick filters, and Insights filters aren't included." Notion: `Copy link to view`. Test: pasting
    a filtered URL reproduces the filter, and any non-serialised state is documented.
36. **Presentation changes never mutate the model.** Attio: relabelling a column "does **not** rename
    the underlying attribute. The new label… will only be shown on the column you are editing";
    `Clear label` reverts. Test: no rename/relabel path writes to the canonical identifier.
37. **Property visibility has three states, and hidden things stay reachable.** Notion:
    `Always show` / `Hide when empty` / `Always hide`, and "When you hide properties, they get
    aggregated in a single menu item at the bottom of the list." Attio's equivalent is
    `View all values` + `Search attributes` behind the default five. Test: no attribute is
    unreachable once hidden.

### Interaction and settings surfaces

38. **Overflow menus open on click, cap around ten items, and group destructive actions last behind
    a divider.** `geist/menu`: "hover-open menus collide with screen readers and trackpad scrolls";
    close on activation/Escape/outside-click; return focus to the trigger; permission-gated items
    render as `MenuItemLocked` (disabled + lock icon) rather than disappearing. Test: no
    `onMouseEnter` opens a menu; permission-gated actions are visible-but-locked.
39. **Settings are a flat two-level IA of long scrolling sections, with destructive actions fenced
    and plan gating disclosed inline.** Notion: `Settings` → `Workspace` → `General`/`Identity`/
    `Security`/`Emoji`/`Members`, a named `Danger zone` with typed confirmation, and per-setting
    tier annotations rather than hidden rows. Geist's structural unit for these sections is
    `Fieldset` — bordered card, title + subtitle, optional footer action, and a `disabled wall`
    variant for tier-gated content. Test: no settings section is more than two levels deep from the
    rail; every gated control states its tier in place.
40. **Settings rows edit in place; a settings rail long enough to need search gets search.**
    Raycast: inline `Add Alias` / `Record Hotkey` / enable-checkbox per app row, per-command enable
    toggles whose effect is stated ("Disabled commands won't appear in Root Search"), a
    section-level master switch "in the top right" of a whole pane, and `⌘F` search across "a
    setting, a command, an extension, or just a keyword you remember" plus `⌘⇧,` deep-linking into a
    specific item's settings. Test: no settings row requires a drill-down page to change one value.
41. **Render a permissions matrix as a table, not as prose.** Raycast's own Roles & Permissions doc
    is a permission-per-row × role-per-column grid (Member / Billing / Manager) with `Yes`/blank
    cells and a footnote marking Enterprise-only rows. Their Members list has a published column
    set: name, email, role, 2FA status.
42. **Announce mutations to shared state as mutations.** Height warned on changing a saved view's
    layout: "A message will appear notifying you of unsaved changes if the updated view is not saved
    following the change." Linear says the quiet part out loud for manual ordering: "Manual ordering
    is unique in that it will update the manual order **for everyone in the workspace**." Test:
    every control that writes shared state either says so or requires an explicit save.
43. **Separate the permission to edit *data* from the permission to edit *structure*.** Notion's
    `Can edit content` level: can create/edit/delete pages and edit property values; **cannot** add,
    edit or remove properties or views, change filters or sorts, or lock the database. Attio's
    parallel: only Admins and members with Full access can `Configure page`; Read-only members can't
    create records. Test: a role exists that can fill in rows without being able to reshape the view.

### Type and density

44. **Split the type scale by purpose, not just size: single-line Label vs multi-line Copy.** Geist:
    Label is "designed for single-lines, and given ample line-height for highlighting & marrying up
    with icons"; Copy is "designed for multiple lines of text, having a higher line height than
    Label". Rows, menus and metadata use Label; prose uses Copy. Their own annotations pin the
    roles: `label-14` "Most common text style of all. Used in many menus"; `copy-14` "Most commonly
    used text style"; `label-13` "Used as a secondary line next to other labels. Tabular is used
    when conveying numbers"; `label-12` (+Strong, +CAPS) "for tertiary level text in busy views";
    `copy-13` "For secondary text and views where space is a premium". Test: a row title and a body
    paragraph never share a type class.
45. **The small muted metadata label is one step below the row title, with tabular figures when it
    carries numbers, and emphasis via a nested `<strong>` rather than a different class.** Geist's
    Label 13 slot, described as "a secondary line next to other labels", with "Tabular… used when
    conveying numbers for consistent spacing", and Strong/Subtle achieved by "`<strong>` nested as
    the descendant of a given typography class". Test: no bespoke font-size on a metadata label; no
    proportional digits in a numeric metadata line.
46. **Two cuts of one family, split by role.** Linear: "We started using **Inter Display** to add
    more expression to our headings while maintaining their readability and kept using **regular
    Inter** for the rest of the text elements." Attio's help-centre CSS shows the identical pairing
    (Inter body + InterDisplay headings). Vercel does the same with Geist Sans + Geist Mono, where
    mono is reserved for identifiers, code and copyable IDs.
47. **Generate the theme from a handful of inputs, including contrast, instead of maintaining
    per-theme variable sets.** Linear went from "98 specific variables for each theme" to three —
    base colour, accent colour, contrast — which is what made "super high-contrast themes for users
    who need it for accessibility reasons" automatic. Test: adding a theme does not require hand
    authoring a full token set.
48. **Spend less accent, more text contrast.** Linear's post-redesign correction: "limiting how much
    chrome (blue in our case) was used in the calculations applied to our color system. The contrast
    of the content has also been improved by making our text and neutral icons darker in light mode
    and lighter in dark mode." Geist's colour system reaches the same result structurally by giving
    accent no role in the 1–10 neutral ladder.

### Process

49. **Pay visual-layer debt in sweeps, not increments.** Linear (a design reset, part I): "While the
    design debt often happens in small increments, it's best to be paid in larger sweeps. This goes
    against the common wisdom in engineering… If you update just one module or view at a time, the
    overall experience becomes more disjointed. Secondly, if your goal is to reset and rebalance the
    whole product UI and experience, you have to consider all the needs simultaneously."
50. **Bound the sweep by explicitly excluding the riskiest layer.** Linear cut navigation out of
    scope: "I eventually set aside navigation as it became clear the problems were complex and no
    longer solely a design issue. Any updates would require significant engineering work and change
    how users interacted with the product. This felt like an unnecessary risk and would expand the
    scope." Their milestone sequence is a reusable plan: stress tests on the main views → **behavior
    definitions for sidebar, tabs, app headers, view headers** → chrome refresh behind a feature
    flag → private beta → GA. Six weeks total, with a dev-toolbar toggle to A/B the old and new
    chrome side by side.

---

## Sources

**Vercel / Geist** (primary, prescriptive):
`vercel.com/geist/{introduction, colors, typography, materials, table, entity, description,
fieldset, tabs, badge, status-dot, gauge, note, project-banner, empty-state, error, skeleton,
show-more, menu, dots-menu, sheet, breadcrumbs, relative-time-card, destructive-action-modal}`;
component index enumerated from the docs sidebar (77 entries).
Unofficial supplement, labelled as such: `designsystems.one/design-systems/vercel-geist`.

**Linear** (primary):
`linear.app/blog/a-design-reset` (part I, Karri Saarinen, 2024-03-27);
`linear.app/now/how-we-redesigned-the-linear-ui` (part II, Saarinen / Gillet / Eldh / Cascino,
2024-03-28); `linear.app/docs/{display-options, select-issues, peek, filters, inbox,
project-overview, default-team-pages, dashboards}`.

**Attio** (primary): `attio.com/help/reference/managing-your-data/records/{create-and-view-records,
configure-record-pages}`; `.../views/create-and-manage-table-views`;
`.../attio-101/attios-data-model/define-your-data-model-objects-lists-and-views`;
`.../productivity-collaborating/navigating-your-workspace`.

**Notion** (primary): `notion.com/help/{layouts, intro-to-databases, views-filters-and-sorts,
lists, tables, workspace-settings}`;
`notion.com/help/guides/build-the-perfect-workflow-with-customizable-layouts`.

**Raycast** (primary): `manual.raycast.com/{settings, teams/roles-and-permissions,
teams/shared-features}`.

**Height** (archived; product discontinued 2025-09-24):
`height.app` farewell page (via Wayback, capture 2025-10-08);
`help.height.app/en/` collection index (capture 2025-01-15);
`help.height.app/en/collections/10343875-height-2-0` (capture 2025-05-20);
`help.height.app/en/articles/{3606831-height-overview, 4444903-show-attributes-in-task-previews,
3991574-hiding-or-showing-tasks-that-have-been-completed}` (captures 2022-09-27);
shutdown corroboration: productgrowth.in/tools/product-management/height,
reddit.com/r/SaaS thread.

**Measured CSS** (`firecrawl_scrape formats:["branding"]`, all labelled inline as docs/marketing
rather than product): `vercel.com/geist/typography`, `linear.app/docs/display-options`,
`linear.app/homepage`, `attio.com/help/.../create-and-manage-table-views`,
`manual.raycast.com/settings`.
