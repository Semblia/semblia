# Data states and list/table craft — primary-source research

**Date:** 2026-07-27
**Scope:** the two recurring defect classes in our internal-UI audit — (a) unhandled
data states and (b) hand-rolled lists/tables — researched against the published
guidance of mature design systems.
**Method:** public primary sources only (vendor design-system sites, vendor docs,
NN/g research articles), fetched and quoted verbatim. No product dashboards were
accessible behind auth; nothing here is inferred from screenshots or concept art.

## Sources actually read (all fetched 2026-07-27)

| Tag | Source | URL |
|---|---|---|
| `CARBON-EMPTY` | IBM Carbon — Empty states pattern | https://carbondesignsystem.com/patterns/empty-states-pattern/ |
| `CARBON-LOAD` | IBM Carbon — Loading pattern | https://carbondesignsystem.com/patterns/loading-pattern/ |
| `CARBON-TABLE` | IBM Carbon — Data table usage | https://carbondesignsystem.com/components/data-table/usage/ |
| `CARBON-NOTIF` | IBM Carbon — Notifications pattern | https://carbondesignsystem.com/patterns/notification-pattern/ |
| `CARBON-TILE` | IBM Carbon — Tile usage | https://carbondesignsystem.com/components/tile/usage/ |
| `CARBON-LAYER` | IBM Carbon — Color usage (layering model) | https://carbondesignsystem.com/elements/color/usage/ |
| `CARBON-AXES` | IBM Carbon — Data viz, axes and labels | https://carbondesignsystem.com/data-visualization/axes-and-labels/ |
| `POLARIS-EMPTY` | Shopify Polaris — Empty state | https://polaris.shopify.com/components/layout-and-structure/empty-state |
| `POLARIS-INDEX` | Shopify Polaris — Index table | https://polaris.shopify.com/components/tables/index-table |
| `POLARIS-DATA` | Shopify Polaris — Data table | https://polaris.shopify.com/components/tables/data-table |
| `POLARIS-RESOURCE` | Shopify Polaris — Resource list | https://polaris.shopify.com/components/lists/resource-list |
| `POLARIS-CARD` | Shopify Polaris — Card | https://polaris.shopify.com/components/layout-and-structure/card |
| `POLARIS-CARDLAYOUT` | Shopify Polaris — Card layout pattern | https://polaris.shopify.com/patterns/card-layout |
| `POLARIS-BANNER` | Shopify Polaris — Banner | https://polaris.shopify.com/components/feedback-indicators/banner |
| `PRIMER-LOAD` | GitHub Primer — Loading pattern | https://primer.style/product/ui-patterns/loading/ |
| `PRIMER-EMPTY` | GitHub Primer — Empty states pattern | https://primer.style/product/ui-patterns/empty-states/ |
| `PRIMER-DEGRADED` | GitHub Primer — Degraded experiences pattern | https://primer.style/product/ui-patterns/degraded-experiences/ |
| `ATLAS-EMPTY` | Atlassian Design System — Empty state usage | https://atlassian.design/components/empty-state/usage |
| `ATLAS-EMPTYMSG` | Atlassian — Designing messages: empty state | https://atlassian.design/foundations/content/designing-messages/empty-state |
| `ATLAS-TABLE` | Atlassian — Dynamic table usage | https://atlassian.design/components/dynamic-table/usage |
| `M3-PROGRESS` | Material 3 — Progress indicators guidelines | https://m3.material.io/components/progress-indicators/guidelines |
| `GEIST-TABLE` | Vercel Geist — Table | https://vercel.com/geist/table |
| `GEIST-EMPTY` | Vercel Geist — Empty State | https://vercel.com/geist/empty-state |
| `GEIST-SKELETON` | Vercel Geist — Skeleton | https://vercel.com/geist/skeleton |
| `GEIST-ENTITY` | Vercel Geist — Entity | https://vercel.com/geist/entity |
| `GEIST-TOAST` | Vercel Geist — Toast | https://vercel.com/geist/toast |
| `GEIST-NOTE` | Vercel Geist — Note | https://vercel.com/geist/note |
| `RADIX-SKELETON` | Radix Themes — Skeleton | https://www.radix-ui.com/themes/docs/components/skeleton |
| `RADIX-CARD` | Radix Themes — Card | https://www.radix-ui.com/themes/docs/components/card |
| `NNG-PROGRESS` | NN/g — Progress Indicators Make a Slow System Less Insufferable (2014) | https://www.nngroup.com/articles/progress-indicators/ |
| `NNG-LIMITS` | NN/g — Response Times: The 3 Important Limits (Nielsen, 1993/2014) | https://www.nngroup.com/articles/response-times-3-important-limits/ |

### What I could NOT verify

- **Stripe** publishes no public product design system with data-state guidance
  comparable to the above. I did not find a primary Stripe source for any of the
  seven questions and have therefore cited nothing from Stripe. Do not let anyone
  add "Stripe says…" to our rules without a URL.
- **Base Web (Uber)** — the `table-semantic` docs page fetched but was too large to
  process within budget. Nothing from Base Web is cited. Its absence is not a
  contradiction of anything below; it is simply unread.
- **Smashing Magazine** — searches restricted to smashingmagazine.com returned no
  results through the search tool. No Smashing article is cited. The NN/g articles
  cover the evidence base (including the Nah 2004 tolerable-waiting-time study that
  `NNG-PROGRESS` references) so the evidence requirement is still met.
- **Geist Error Card** (https://vercel.com/geist/error-card) has a live demo but
  **no** written Best Practices/Behavior/Content guidance, unlike Geist's other
  components. There is no Geist rule for panel-level error copy; Q4's answer for
  Geist comes from `GEIST-NOTE`, `GEIST-TOAST` and `GEIST-EMPTY` instead.
- Carbon states plainly that it has **no** error-state pattern yet: "A pattern
  providing guidance for error states is currently being planned." (`CARBON-EMPTY`)
  Its error guidance lives inside the *empty-state* pattern, which is itself a
  finding — see Q1.

---

## 1. The full state matrix — what a data surface must handle

### 1a. Carbon's canonical enumeration

Carbon defines an empty state as covering far more than "no data yet". It publishes a
three-type taxonomy in a decision table (`CARBON-EMPTY`, "When to use"):

| Carbon type | Use cases (verbatim) | Goal of the empty state (verbatim) |
|---|---|---|
| **No data empty states** | "First time use, no data yet" | "User understands what will be available on the page when data has been added or is available. They understand how to add data themselves." |
| **User action empty states** | "Provides feedback based on some user action. For example: - No results when searching - Confirmation of completion of a process" | "User understands how to adjust search terms or filters to continue their search." |
| **Error management empty states** | "- Permissions issue - Systems issue - Configuration required" | "User understands the problem and if there are corrective actions available, knows what action to take or has options to correct the issue." |

Carbon then expands "error management" into a second table naming four distinct
error causes, each with its own required copy (`CARBON-EMPTY`):

> | Error type | Explain why there is no data | Explain what the user can do |
> | _Permissions issue_ | The user does not have permission to view the data. | Suggest steps or process to request access. |
> | _Systems issue_ | Problems with a related system are preventing the data from being supplied. | Explain steps the user can take to learn what has happened. For example, viewing an activity log. |
> | _Configuration required_ | Further configuration may be needed to access the data. | Provide an explanation and the first step for the user to take for the required configuration. |
> | _Action not supported_ | For example, the user attempts to upload an unsupported file type. | Explain what file types are supported. |

Carbon also names **where** these must be handled, which is the part our audit keeps
catching: "They can occur anywhere your app can display data, including but not
limited to dashboards, data tables, tiles, full pages, and side panels."
(`CARBON-EMPTY`) And it prescribes the design-time checklist: "What will the pages,
tiles, data tables, and side panels look like without content?" (`CARBON-EMPTY`)

Carbon's loading guidance supplies the remaining states: skeleton states, loading
indicators, **progressive loading** (loading in batches, "The simplest view of the
page loads first, followed by progressively more detailed batches"), and **load more**
("A Load more option can be used to extend a list where only a small fraction of
options are displayed… Using Load more allows the data to load in progressive
batches.") (`CARBON-LOAD`)

### 1b. Polaris's enumeration — encoded as component props, not prose

Polaris is the more useful of the two because its taxonomy is enforced by the API. The
`ResourceList` props are the enumeration (`POLARIS-RESOURCE`):

> `emptyState?React.ReactNode` — "The markup to display when no resources exist yet.
> Renders when set and items is empty."
>
> `emptySearchState?React.ReactNode` — "The markup to display when no results are
> returned on search or filter of the list. Renders when `filterControl` is set, items
> are empty, and `emptyState` is not set. **Defaults to EmptySearchResult.**"
>
> `loading?boolean` — "Overlays item list with a spinner while a background action is
> being performed."
>
> `hasMoreItems?boolean` — "Whether or not there are more items than currently set on
> the items prop."
>
> `isFiltered?boolean` — "Whether or not the list has filter(s) applied."

This is the single most important finding in this document: **Polaris makes
first-run-empty and filtered-empty two different props with two different defaults.**
A list that has one `if (!items.length) return <Empty/>` branch is, by Polaris's own
contract, a bug — not a style problem. `IndexTable` carries the same `emptyState`,
`loading`, and `hasMoreItems` props (`POLARIS-INDEX`).

### 1c. Geist's enumeration — the most complete published list

Geist enumerates six variants explicitly and tells you how to choose (`GEIST-EMPTY`,
"When to use"):

> "Pick the variant by what the user needs: **no-results** for a filtered list that
> returned zero rows, **blank slate** or **informational** for a resource the user
> hasn't created, **cleared** for completed work, **permission** for role or tier
> denials, **error** for a failed load."

Geist also gives the placement rule for permission-denied, which no other system
states as crisply:

> "Render the permission and tier-denial variants full-page when the user lands on a
> route they can't view. Use a Note only when one tile inside an otherwise-accessible
> page is gated." (`GEIST-EMPTY`)

And the boundary against misuse:

> "Don't put critical persistent warnings here. Empty states vanish when the list
> populates; persistent warnings belong in Note or the page header." (`GEIST-EMPTY`)

### 1d. Offline / stale / partial-failure — only Primer documents this

None of Carbon, Polaris, Atlassian, or Geist publishes an "offline/stale" state.
Primer does, under **Degraded experiences**, and it is the sharpest guidance found on
partial failure (`PRIMER-DEGRADED`). It splits every surface into two tiers:

> "**Primary experiences** are those experiences that are essential for the page to be
> useful to the user. In case of availability incidents, if any of these experiences
> can't be provided to users, then it makes sense to show an error page instead."
>
> "**Secondary experiences** are those experiences that are not essential for the page
> to be useful to the user… it makes sense to show the page without them as the page is
> still likely useful to most users."

And the decision rule: "If there's an outage that doesn't affect the primary
experiences of the page, it's best to render a degraded page to reduce disruptions.
Don't attempt to render a page that won't be useful to the user." (`PRIMER-DEGRADED`)

Primer's most quotable line for our audit — and the exact defect we keep shipping:

> "We don't want users to think they've suffered data loss. **If we know a user created
> something, don't show a generic 'empty state'.** It's better to explain that it's
> unavailable, or remove the entire section from the page (including the section's
> heading)." (`PRIMER-DEGRADED`)

### 1e. Reconciled matrix

Carbon and Polaris agree on the *shape* of the taxonomy and disagree only on naming
and on where error lives. Carbon folds error and permission into "empty states";
Polaris and Geist keep error separate from empty. Geist is a strict superset. Merged:

| # | State | Trigger | Carbon name | Polaris mechanism | Geist name | Distinct treatment required? |
|---|---|---|---|---|---|---|
| 1 | **Loading, first paint** | no cached data, request in flight | Skeleton state (`CARBON-LOAD`) | `SkeletonPage` on initial page load (`POLARIS-INDEX`) | Skeleton (`GEIST-SKELETON`) | Yes — skeleton, shape-matched |
| 2 | **Loading, refresh over existing data** | user re-filters / background refetch | Progressive loading (`CARBON-LOAD`) | `loading` prop = "Overlays item list with a spinner" (`POLARIS-RESOURCE`) | Spinner / LoadingDots (`GEIST-SKELETON`) | Yes — keep old rows visible, overlay/inline indicator |
| 3 | **Loading more** | pagination / infinite scroll | Load more (`CARBON-LOAD`) | `hasMoreItems` (`POLARIS-RESOURCE`) | Load More Button | Yes — indicator goes "in the empty space where the new content will appear, not overlapping existing content" (`M3-PROGRESS`) |
| 4 | **Empty, first run** | resource never created | No data empty state | `emptyState` | Blank slate / Informational | Yes |
| 5 | **Empty, filtered / no results** | query or filter returned 0 | User action empty state | `emptySearchState`, defaults to `EmptySearchResult` | No-results | Yes — separate copy, separate CTA |
| 6 | **Empty, cleared / all done** | user completed or cleared everything | User action empty state | (none) | Cleared | Yes — celebratory, no CTA needed |
| 7 | **Error, load failed** | fetch/500 | Error management → *Systems issue* | (none; use Banner) | Error variant, "pairs the body with a copyable request ID and a `Try Again` button" (`GEIST-EMPTY`) | Yes |
| 8 | **Permission denied** | role/tier | Error management → *Permissions issue* | (none) | Permission variant, **full-page** | Yes |
| 9 | **Configuration required** | feature not set up | Error management → *Configuration required* | (none) | (informational) | Yes |
| 10 | **Partial failure** | one panel of N failed | (none — "Error states (future)") | (none) | (none) | Yes — Primer only: replace that region, keep the rest (`PRIMER-DEGRADED`) |
| 11 | **Stale / degraded** | dependency down, data may be old | (none) | (none) | (none) | Yes — Primer only: global warning Banner **above** global nav + in-context messages (`PRIMER-DEGRADED`) |

Note the gap this exposes: states 10 and 11 are documented by exactly one of the seven
systems examined. That is why they are the states everybody ships broken.

---

## 2. Skeleton vs spinner — the documented rule

### 2a. Duration thresholds

Three independent published threshold tables. They do not perfectly agree, which is
itself worth knowing.

**Primer** (`PRIMER-LOAD`, "Adapting to different wait times") — verbatim:

> **Less than 1 second:** Don't show a loading state. Seeing a loading indicator flash
> on the screen could be distracting and make the product feel slower than it is.
>
> **1–3 seconds:** Use an indeterminate loading state. The user won't have enough time
> to process the information in a determinate loading state, and potentially cause
> frustration or confusion about missing information.
>
> **3–10 seconds:** Use a determinate loading state if possible to keep the user
> informed about why they're waiting so long.
>
> **More than 10 seconds:** Use a determinate loading state and avoid blocking other
> interactions by treating the process as a background task if possible.

Primer also caveats it honestly: "The following is meant as general guidance since we
can't accurately predict how long a process will take."

**Material 3** (`M3-PROGRESS`) — verbatim table:

> | **Expected wait time** | **Recommendation** |
> | Instant (under 200ms) | No indicator |
> | Short (between 200ms and 5s) | Loading indicator |
> | Long (Over 5s) | Progress indicator |

**NN/g** (`NNG-PROGRESS`) — the underlying research:

> "Use a progress indicator for any action that takes longer than about 1.0 second."
>
> "**1. Looped animation: Use only for fast actions.** … This indicator should be
> reserved for actions that take between 2-10 seconds. For anything that takes less
> than 1 second to load, it is distracting to use a looped animation… we don't
> recommend looped animation for actions that take longer than 10 seconds, because
> **users quickly grow impatient**."
>
> "**2. Percent-done animation: Use for actions that take 10 seconds or more.**"
>
> "**3. Static progress indicators: Don't use them.**" — i.e. a bare "Loading…" string
> with no motion is explicitly ruled out: "If the system hangs or becomes stuck, the
> user has no way of knowing they need to restart the action."

NN/g's conclusion, with the hedge that matters for us: "The main guideline is to use a
**looped indicator for delays of 2–9 seconds and a percent-done indicator for delays of
10 seconds** or more. But since you can't always estimate the delay precisely in
advance, you may want to **lower the cutoff point** between the two forms of progress
feedback… The bigger the variability in your estimates, the lower the threshold for
showing the more elaborate feedback." (`NNG-PROGRESS`)

The evidence base, quoted: "The researchers found that the people who saw the moving
feedback bar experienced higher satisfaction and were **willing to wait on average 3
times longer** than those who did not see any progress indicators." (`NNG-PROGRESS`,
University of Nebraska-Lincoln study; article also cites Nah, F. (2004),
*Behaviour and Information Technology* 23(3).)

And Nielsen's three perceptual limits, which are the reason for all of the above
(`NNG-LIMITS`): **0.1s** = "reacting instantaneously… no special feedback is
necessary"; **1.0s** = "the limit for the user's flow of thought to stay uninterrupted";
**10s** = "the limit for keeping the user's attention focused on the dialogue."

**Reconciliation:** the systems disagree on the low bound (Primer 1s, M3 200ms) and on
where determinate becomes mandatory (Primer 3s, M3 5s, NN/g 10s). The safe intersection
is: nothing under 200ms, indeterminate from ~300ms–3s, determinate beyond ~3–5s,
background task beyond 10s.

### 2b. Skeleton vs spinner — which shape, not just when

The threshold tables above are about *indeterminate vs determinate*. The
*skeleton vs spinner* question is answered separately and unanimously.

**Carbon** is the bluntest. In its data-table docs: "If extra load time is expected to
display information, **use skeleton states instead of spinners**." (`CARBON-TABLE`)
And the scoping rule (`CARBON-LOAD`):

> "**Only use skeleton states on container-based components** like tiles and structured
> lists or data-based components like data tables and cards. In most cases, action
> components (e.g. buttons, input fields, checkboxes, toggles) do not need to have a
> skeleton state.
>
> **Never** represent toast notifications, overflow menus, dropdown items, modals, and
> loaders with skeleton states. Elements inside a modal may have a skeleton state, but
> the modal itself should not."

Carbon also bounds their lifetime: "They should only appear for only a few seconds,
disappearing once components and content populate the page." (`CARBON-LOAD`)

**Geist** gives the cleanest four-way decision (`GEIST-SKELETON`, "When to use"):

> "Show a Skeleton when async data fills a **known layout**: table rows, card grids,
> profile blocks, sidebars.
>
> For a **single in-flight action**, use Spinner; for an indeterminate **inline wait**,
> use LoadingDots; for **known progress**, use Progress.
>
> Don't use Skeleton as permanent decoration or **as a placeholder for empty states**.
> When there's no data to load, render an EmptyState."

**Polaris** encodes the same split in its props: `SkeletonPage` "on initial page load
for the rest of the page if the loading prop is true and items are processing"
(`POLARIS-INDEX`, `POLARIS-RESOURCE`) versus the `loading` prop which "**Overlays item
list with a spinner** while a background action is being performed."
(`POLARIS-RESOURCE`) So: **skeleton on cold load, spinner overlay on warm refresh.**

**Primer** frames skeletons as a perception device: "For large areas of loading
content, the loading content may be replaced by a vague representation of the content.
This shows users the general shape of the page and could make them perceive the real
content as loading faster." (`PRIMER-LOAD`)

### 2c. The layout-shift argument, in the systems' own words

**Primer:** "A loading indicator should be placed nearest to the content they are
standing in for. **Avoid creating a jarring layout shift when the loaded content
replaces the loading indicator.**" (`PRIMER-LOAD`)

**Geist** is the most specific and the most testable (`GEIST-SKELETON`, "Behavior"):

> "Set `width` and `height` to match the final content so the layout doesn't shift when
> data resolves. **A 200×20 block becoming an 80×16 string reads as a glitch.**"
>
> "Pick `pill`, `rounded`, or `squared` to mirror the eventual element's shape (avatars
> `pill`, buttons and chips `rounded`, image tiles `squared`)."
>
> "When the skeleton wraps children, keep dimensions stable so the reveal swap doesn't
> reflow surrounding content."

**Radix Themes** builds the guarantee into the component: Skeleton "Replaces content
with same shape placeholder that indicates a loading state" and "Skeleton **preserves
the dimensions of children** when they are hidden and **disables interactive
elements**." (`RADIX-SKELETON`) Its documented usage rule for text is a real trap we
have hit: "When using Skeleton with text, you'd usually wrap the **text node itself**
rather than the parent element. This ensures that the text is replaced with a
placeholder of the same size… The difference is especially noticeable when wrapping
longer paragraphs." (`RADIX-SKELETON`)

**Carbon** adds the case where a skeleton is *not* wanted: "Not all items need a
skeleton state and instead can be expressed as negative or white space until they load.
For example, a 600 x 600px image can be shown as a 600 x 600px area of white space until
the full image loads." (`CARBON-LOAD`)

### 2d. Count of indicators, and incremental reveal

**Material 3:** "When multiple items are loading, use a single progress indicator to
show progress for the group. **Don't add progress indicators to every activity.**" And:
"Use a single progress indicator at the top of a page to show progress of the whole
group. Don't add one for every element unless they're activated independently."
(`M3-PROGRESS`)

**Primer** agrees and adds the a11y consequence: "To avoid information overload and
visual noise, consider replacing a series of adjacent loading indicators with a single
loading indicator." plus "Have a single loading announcement for a collection of
SkeletonLoaders / Don't have a loading announcement for every piece of loading
content." (`PRIMER-LOAD`)

**Primer on incremental loading:** "Whenever possible, **show each item in a collection
as soon as it loads. Don't wait for every item in the collection to load** before
showing the items." and "prioritize the most important pieces of data to load first."
(`PRIMER-LOAD`)

**Material 3 on load-more placement:** "When loading more items on a page, place the
circular progress indicator **in the empty space where the new content will appear,
not overlapping existing content**." (`M3-PROGRESS`)

### 2e. Accessibility of loading (non-optional)

- Set `aria-busy="true"` on the live region until updates complete, then `false`: "This
  prevent[s] assistive technologies from announcing updates until the updates are
  complete." (`PRIMER-LOAD`)
- Geist: "Wrap the loading region in `aria-busy="true"` and announce completion with
  `aria-live="polite"` on the **destination container, not the skeleton itself**." and
  "Skeletons are decorative; **avoid placing focusable controls inside them** while
  loading." (`GEIST-SKELETON`)
- Filter results must announce a count: "a screen reader should announce how many
  results were returned from filtering. For example: 'No items match the filter', or
  '5 items match the filter'. … The element with `role="status"` **must always be
  rendered**, not just when the message should be announced." (`PRIMER-LOAD`)
- Reduced motion does **not** mean no spinner: "Animated loading indicators help
  reassure the user that the system isn't frozen, and **should not be disabled when for
  users that prefer reduced motion**. However, the animation… should be kept as subtle
  as possible." (`PRIMER-LOAD`) Geist takes the opposite tack for shimmer specifically —
  "Disable the shimmer with the `no animation` variant on low-power surfaces and respect
  `prefers-reduced-motion`" (`GEIST-SKELETON`) — so the reconciliation is: keep motion
  for *spinners* (system-liveness signal), allow reducing *shimmer* on skeletons.

---

## 3. Empty-state anatomy — exact composition

### 3a. The four published anatomies

**Carbon — five numbered parts** (`CARBON-EMPTY`, "Anatomy"), verbatim:

> 1. **Image (optional):** A non-interactive image that relates to the situation
>    (optional).
> 2. **Title:** A short and concise explanation. Where possible, write this as a
>    positive statement. In this example, "Start by adding data assets" feels more
>    positive than "You don't have any data assets." Alternatively, you could say "You
>    don't have any data assets yet".
> 3. **Body:** Explain clearly the next action to populate the space. You may also
>    explain why the space is empty and include the benefit of taking this step. There
>    are three options for explaining the primary action:
>    - Direct the user to a primary action button positioned underneath the copy
>    - Include a primary action link in the copy
>    - Direct the user to the UI element… This has the benefit of teaching the user
>      where elements are and how they will perform tasks in the future.
> 4. **Primary action—button or link in copy (optional)**
> 5. **Secondary call to action (optional):** If there is a secondary action, such as
>    referencing documentation for further reading, include it as a link below the copy.

**Atlassian — four numbered parts** (`ATLAS-EMPTY`, "Parts"), verbatim:

> 1. **Illustration (optional)**: A spot illustration that relates to the message
>    literally or as a metaphor.
> 2. **Header**: A title that provides a concise description of the current state.
> 3. **Description (optional)**: A short message describing the reason for the state and
>    what to do next.
> 4. **Buttons (optional)**: Next steps or a way to dismiss the message. Can be a
>    primary button, secondary button, or link-styled button.

Atlassian is the only system that publishes the required minimum and the widths:

> "The **only required part** of the empty state component is the heading, which uses
> h600 heading type. If this doesn't fit your case, you may have to consider another
> component or custom design."
>
> "The default width, `wide`, is **464px**. This is based on six columns in the cozy grid
> system. The `narrow` size shrinks the text width to **304px**. That's four columns…
> Use this for empty states in containers smaller than the default width."
> (`ATLAS-EMPTY`)

**Primer — Blankslate slots** (`PRIMER-EMPTY`): Graphic, Primary text, Secondary text,
Primary action, Secondary action, Border. Two notable specifics:

> "The **border is invisible by default**, but can be added to help define the structure
> of the Blankslate component when needed. This can be particularly helpful in page
> layouts where the Blankslate is not the only content on the screen."
>
> "Secondary actions are optional and are represented by a **text link located below the
> primary action button**… **Error states are unlikely to ever have a secondary
> action.**"

For degraded content Primer changes which slots are *required* (`PRIMER-DEGRADED`,
"Blankslate guidance for degraded content"): "Leading visual (required)", "Primary
text", "Secondary text (required)", "Secondary action" — and:

> "**Leading visual**: Use the alert icon. Default to using `fgColor-muted` as the fill
> color. Using `fgColor-attention` could be **too harsh and over-emphasize the error**."
>
> "We have yet to identify a case where a **primary action would be appropriate**."

**Polaris — props + best practices** (`POLARIS-EMPTY`): `heading`, `image`,
`largeImage`, `children` (body), `action`, `secondaryAction`, `footerContent`,
`fullWidth`, `imageContained`.

### 3b. Illustration: optional everywhere, and constrained everywhere

- Carbon: "The size of the space for the empty state should also guide the size of
  image. **If space is limited, use just text.**" And for dashboards: "If you have a
  dashboard with a number of widgets and there is a failure for multiple widgets to
  load, the repetition of the empty state may not have the same impact if you use
  illustrative icons. In this case, **an empty state that uses just text may be
  preferable**." (`CARBON-EMPTY`)
- Atlassian: "This component is optimized for **spot illustrations. Don't resize spot
  heroes or other larger illustrations** to fit a smaller space." / "Consider leaving
  out the illustration if there are other visuals that might be competing on one
  screen, or if the space is too small for a spot illustration." / "Choose an image that
  has a **neutral or humorous tone (never negative)**." (`ATLAS-EMPTY`)
- Primer for errors: "If a Blankslate is being used to convey an error state, the
  graphic **should not attempt to bring delight or be playful**. Instead, the graphic
  should reinforce that something went wrong. Default to using the alert icon."
  (`PRIMER-EMPTY`)
- Accessibility, unanimous: Carbon — "As most empty state illustrations are considered
  decorative, they should be skipped by screen readers… require that decorative images
  are given either an empty `alt` tag or their `role` is assigned `presentation`. As an
  empty `alt` tag is more widely supported, we recommend you align with the WCAG
  guidance and **avoid assigning `role` to `presentation`** until support is more
  ubiquitous." (`CARBON-EMPTY`) Polaris — "Empty state illustrations are implemented as
  decorative images, so they use an empty alt attribute and are skipped by technologies
  like screen readers." (`POLARIS-EMPTY`)

### 3c. One action or several — the rule is one

- Polaris: "Use **only one primary call-to-action button**." (`POLARIS-EMPTY`)
- Atlassian: Do "Include a relevant call to action." / Don't "Include **too many call to
  action buttons** on one page." — the Don't image is captioned "An empty state with
  multiple primary buttons on the page: 'Add files' and 'Use API'". (`ATLAS-EMPTY`)
- Carbon: "Don't cover multiple options in one empty state. **If there are multiple
  things a user can do, pick the most important and keep the focus on that action.**"
  (`CARBON-EMPTY`)
- Carbon, on dashboards specifically: "In situations where there could be multiple empty
  states showing at once, we recommend using a **tertiary button** for the call to
  action. This avoids scenarios with multiple primary action buttons in the UI."
  (`CARBON-EMPTY`)
- Geist quantifies it: "**Cap at one primary CTA, plus one secondary** when the first
  action could legitimately be one of two paths (`Import Repository` and
  `Deploy Template`). **Three CTAs is a smell.**" (`GEIST-EMPTY`)
- Geist on the mechanics: "The CTA must be a real Button or Link, **not an `onClick`
  div**, so it joins the tab order and exposes a role." (`GEIST-EMPTY`)

### 3d. First-run vs no-results — the distinction, per system

**Atlassian** draws it as a named vocabulary distinction (`ATLAS-EMPTYMSG`, "An empty
state vs. a blank slate message"), verbatim:

> "An **empty state** lets people know when they've completed or have cleared a task(s).
> By contrast, a **blank slate** is a type of message in which people have never come
> across or tried a new feature before. Blank slates promote and encourage people to try
> something new.
>
> Use text, design elements, and visual clues to **differentiate where people are in
> their journeys**."

And it maps the three cases to three *tones* (`ATLAS-EMPTY`, "Content guidelines"):

> "- The first time someone views an empty board (**blank slate**) might call for an
> inspirational, motivating, or educational tone.
> - An empty state that appears when a user **finishes all their tasks** could have a
> more celebratory tone and illustration.
> - A general **no-result state** (such as no search results) might be **more neutral**,
> but still motivate by showing next steps."

**Primer** splits it on the primary-text slot (`PRIMER-EMPTY`):

> "If the space is empty because **this the feature hasn't been used yet**, convey the
> intention of the feature in a way that sounds welcoming and human."
>
> "If the space is empty because **the feature is temporarily empty**, convey that the
> feature is empty because of the nature of the feature. For example, if a user is
> trying to view notifications but has no notifications yet."
>
> "If the space is empty **because something went wrong**, concisely summarize the
> problem. For example, 'Repositories could not be loaded due to a system error'."

And on the action slot: "If the space is empty because this the feature hasn't been used
yet, the action should **initiate a creation flow** or link to a feature. If the space
is empty because something went wrong, the action should lead to a **solution, a way to
get more information, or a way to get help**." (`PRIMER-EMPTY`)

**Carbon** treats no-results as a *user action* empty state and gives the required
recovery copy: "if there are no search results suggest adjusting the search or filters."
It also permits omitting body copy when there is genuinely nothing to do: "if your user
has configured alerts and nothing has been triggered, it's not a case of alerts not
being set up but that there is nothing that requires the user's attention. In this case,
supplementary text is not necessary." (`CARBON-EMPTY`)

**Geist** publishes the actual copy templates, which is the most directly usable
guidance found (`GEIST-EMPTY`, "Content"):

> "`title` is Title Case (`No Logs Match Your Filter`); `description` is sentence case
> and **adds new information instead of restating the title**.
>
> **Quote a single typed query verbatim with curly quotes**:
> `No logs match "${query}". Clear the filter to see all logs.` For multi-facet filters
> use the plural template `No {Items} Match Your Filters` and suggest widening or
> clearing.
>
> **Onboarding bodies name the next action that creates the first item**:
> `Push to your Git repository to create your first one.` Tier-gated bodies follow
> `{Feature value} with the {Plan} plan.`
>
> Error variant pairs the body with a **copyable request ID** and a `Try Again` button.
>
> CTA labels are Title Case `Verb + Noun`. **Never `Get Started`, `Continue`, or `OK`.**"

Geist also requires the announcement: "After an async filter change, wrap the region in
`aria-live="polite"` so screen readers announce the new state." (`GEIST-EMPTY`)

Polaris's title rule is action-oriented, with an explicit Do/Don't:
Do "Create orders and send invoices" / Don't "Orders and invoices". Buttons follow
{verb}+{noun}: Do "Create order", "Buy shipping label" / Don't "New order", "Buy".
(`POLARIS-EMPTY`)

### 3e. The empty state replaces the thing — it does not sit inside it

This is the one structural rule and it comes from Carbon (`CARBON-EMPTY`, "Best
practices"), verbatim:

> "**Empty states should replace the element that would ordinarily show**. For example,
> an empty state for a table would replace the table and **the column headers and footer
> should not be present**. This practice avoids having a screen reader read the entire
> table before getting to the message that there is no content in the table. Likewise,
> if you search for something and there are no results, any underlying content should be
> replaced by the empty state message."

Geist states the same rule in implementation terms: "When the underlying list is empty
(filter cleared, never created), render Empty State **outside the table rather than an
empty `<Table.Body>`**." (`GEIST-TABLE`)

Alignment, where documented: Carbon — "Empty state elements should be **left-aligned as
a block**. The one exception… is an empty state in a small tile. In this case the image
should be centered above the left-aligned text and primary action… This exception was
made to prevent the empty state looking too much like content, where it could be skipped
over." (`CARBON-EMPTY`) Atlassian's anatomy is "center-aligned and stacked vertically"
(`ATLAS-EMPTY`). They disagree; Carbon's reasoning is stronger for in-page regions.

Scope, from Polaris: "The empty state component is intended for use when a **full page**
in the admin is empty, and **not for individual elements or areas** in the interface."
(`POLARIS-EMPTY`) So Polaris's `EmptyState` is a page-level component; region-level
empties are composed inside the list/table components via `emptyState` /
`emptySearchState`.

---

## 4. Error-in-place — one panel failed, the rest loaded

### 4a. The layered model (Primer, the only complete treatment)

Primer prescribes **both** a global signal and in-context signals (`PRIMER-DEGRADED`):

> "If there is a critical system error that will degrade the user experience, show a
> **Banner at the top of the page above the global navigation**. Having a global Banner
> helps set the expectation that some parts of the usual UI might be missing or broken.
> **Default to using the `"warning"` variant** of the Banner.
>
> Explain what's wrong and, if possible, link to a page with more detailed information…
>
> **In addition to a global Banner, we should inform users about availability issues in
> context.**"

Then it scales the in-context treatment by the *size of the failed region*:

| Region size | Treatment (verbatim) |
|---|---|
| **Inline / small elements** | "Smaller parts of the UI that cannot be accurately rendered but are too important to exclude entirely can often be replaced with a short error message. By default, replace the affected content with an error message. **Show a warning icon before the message** to help differentiate it from non-degraded content. The message may be colored with `fg.warning`…" |
| **Panels / larger areas** | "If the affected area is large enough, replace the affected UI with a blankslate component that explains why the expected UI isn't there." |
| **Dialogs** | "If the content of a Dialog is not critical and cannot be rendered, **prevent the Dialog from even being opened**… remove the button that triggers the Dialog. … If the Dialog is a core part of a workflow, replace the content of the Dialog with a message explaining why the expected UI isn't there." |
| **Counts** | "When the data required to calculate a count is unavailable, **default to hiding the number**." |
| **Activity indicators / badges** | "…default to **hiding the indicator**." |
| **Nav links** | "When a dynamic link in the navigation is not yet available, fall back to **not rendering it**." + "**Never suppress rendering of the global navigation header.** Rendering a page without global navigation header could make a user feel stuck. Instead, suppress rendering of individual navigation items affected by a system error." |

The budget on error messages per page — a rule we should adopt verbatim:

> "Ideally we can strike a balance and give the user just the right amount of context
> without overwhelming them with error messages. A page with too many error messages
> could communicate an unnecessarily reactionary and negative tone. As a general
> guideline, we suggest **limiting pages to 5 or less outage messages**."
> (`PRIMER-DEGRADED`)

> "Be mindful that rendering too many error messages on the page in `fg.warning` could
> be jarring and **make the page feel broken instead of degraded**."
> (`PRIMER-DEGRADED`)

Buttons that can't work — Primer publishes a decision tree (`PRIMER-DEGRADED`,
"Handling non-functional buttons"): "Could removing the button be disorienting? If no,
don't render the button. If yes: does it respond to a hover or click? If yes, use an
inactive button. If no, use a disabled button." With the accessibility override:
"**Never disable an interactive control that is non-functional due to availability
issues.**" and "A common (but inaccessible) pattern is to show a tooltip with more
information when a user hovers an error message or a disabled button. However,
**tooltips may only be used on focusable elements**." (`PRIMER-DEGRADED`)

Examples of UI Primer says you may *not* silently remove: "The comment box on issues
and pull requests / The 'Request changes' button… / **Submit buttons on forms**."
(`PRIMER-DEGRADED`)

### 4b. Inline vs toast vs full-page — the rule

**Carbon** supplies the governing distinction (`CARBON-NOTIF`):

> "**Task-generated** notifications are initiated in response to user action during a
> specific task. They give users direct, immediate feedback. They **should be placed in
> the region of the page the user is working in** and be related to the user's action."
>
> "**System-generated** notifications are initiated by the application or system,
> independent of user action."

and maps that onto components:

> "**Inline** notifications are nondisruptive and **confined to a specific area in the
> UI**… persist until they are dismissed by the user or the notification is resolved."
> Best practices: "Place inline notifications near their related items." / "Keep the
> message under two lines." / "Do not cover other content with inline notifications."
>
> "**Toasts** are notifications that slide in and out, typically in the top right of
> the page. They are **more disruptive** than inline notifications and are best used
> with **system-generated messages that do not correspond to a specific section of the
> UI**."
>
> "**Banner**: System or product level notifications that are **not specific to a
> task**." Best practices: "Banners should be placed at the top of the content area they
> relate to." / "Place system-wide messages directly below the main header or navigation
> bar." / "Banners are not sticky and should scroll with the other content on the page."
> / "**Only show one banner at a time.**"
>
> "**Modal**: Highly disruptive… Only use a modal when the message is critical and needs
> the user's immediate attention or action."

Carbon's accessibility hard rule: "**Don't use notifications that dismiss on a timer for
critical or emergency messages.** Some users with disabilities need more time to read or
interact with messages and timed actionable toasts may not provide sufficient time.
[WCAG 2.1 SC 2.2.4 (AAA)]" (`CARBON-NOTIF`)

**Polaris** gives the placement hierarchy, three tiers (`POLARIS-BANNER`, "Placement"),
verbatim:

> "- Banners relevant to an **entire page** should be placed at the top of that page,
> below the page header. They should occupy the full width of the content area.
> - Banners related to a **section of a page** (like a card, popover, or modal) should
> be placed **inside that section, below any section heading**. These banners have less
> spacing and a pared-back design to fit within a content context.
> - Banners related to an element **more specific than a section** should be placed
> immediately above or below that element."

Plus the ARIA contract and a focus rule we routinely get wrong: "Critical and warning
banners have a `role="alert"`… All other banners have a `role="status"`." Do: "Move focus
to banners if they're relevant to the merchant's current workflow and need to be
addressed immediately." Don't: "**Move focus to banners if they appear on page load**,
or outside the merchant's current workflow." (`POLARIS-BANNER`)

Polaris's form-error rule (both, not either): "When merchants submit long or complex
forms with errors, use a **critical banner to summarize** what went wrong. Place the
banner at the top of the form and move focus to the banner… **Always include inline
error messages for specific form fields** so that merchants know what to do in context."
(`POLARIS-BANNER`)

Polaris also bans banners as a substitute for good IA: "Not be used to call attention to
what a merchant needs to do in the UI **instead of making the action clear in the UI
itself**." and "Not be the primary entry point to information or actions merchants need
on a regular basis." (`POLARIS-BANNER`)

**Geist** states the toast prohibition most usefully (`GEIST-TOAST`, "When to use"):

> "Use a toast for **non-blocking acknowledgments of user-initiated actions**:
> `Domain added`, `Project archived`, `Deployment canceled`.
>
> **Don't use a toast alone for billing failures, permission denials, or build failures
> the user has to triage.** Pair a ≤6-word toast (`Build failed`) with a **persistent
> row carrying the recovery step and a stable identifier**.
>
> **Field-level validation belongs on the Input, not in a toast.** Persistent
> configuration warnings belong in Note or Banner.
>
> Pick the method by **how the user experienced the event, not by HTTP status**."

Behavior: "Default toasts auto-dismiss; pass `preserve` only when the user must read or
act on the message before it disappears." / "**Don't stack toasts to narrate one async
flow**; emit the success or error toast at the terminal step." Accessibility: "The toast
region announces with `aria-live="polite"`; reserve `assertive` for blocking errors that
interrupt a flow." / "**Don't put primary navigation inside a toast**; transient surfaces
vanish before keyboard users can reach them." (`GEIST-TOAST`)

Geist's Note (the in-region persistent message) closes the triangle (`GEIST-NOTE`):

> "Use a Note for **inline contextual feedback next to the field, card, or section it
> describes**…
>
> Pick **Banner** when the message is page-level or system-wide and needs a CTA,
> **Toast** for transient acknowledgments, **Modal** for destructive confirmations."
>
> "A Note is **persistent until the underlying state changes**; don't add an ad hoc
> dismiss control because it competes with the message."
>
> "**One Note per concept. Stacking three Notes on a card means the page architecture,
> not the Note copy, is wrong.**"
>
> "The optional `NoteAction` holds a **single** inline CTA. Don't pair it with a second
> button."

### 4c. Error copy

- Carbon quotes Nielsen's ninth heuristic as the standard: "Error messages should be
  expressed in **plain language (no codes)**, precisely indicate the problem, and
  constructively suggest a solution." And: "Be respectful of the user and **don't joke
  or use flippant language**." (`CARBON-EMPTY`)
- Carbon's Do/Don't pairs (`CARBON-NOTIF`): Do "Success! Your resource has been
  created." / Don't "503 Service Unavailable". Do "Script failed to run. Check the log
  for more detail." / Don't "Instance was not created." (i.e. don't leave users without
  next steps).
- Primer calibrates specificity in both directions: "Vague messages like 'There was a
  problem' can be frustrating. **Overly specific/literal technical explanations** like
  'The US East-2 database cluster responsible for PR and issue comment data is down'
  give the user an excessive amount of information and could make less technical users
  feel dumb." Target: "Form could not be submitted. Some required fields were empty."
  (`PRIMER-EMPTY`)
- Geist's error-copy grammar: "Error toasts are **two sentences with periods** and end
  with a recovery step: `Couldn't verify domain. Try again.` Use `Couldn't` for
  user-state errors and `Failed to` for system or infra errors; match adjacent shipped
  copy and don't flip mid-flow." (`GEIST-TOAST`)
- Primer requires the terminal state to be reported at all: "**Process failed:** There
  was an error, and the process could not be completed. This step should include an
  error message that explains what went wrong and what the user's next [step] may be.
  For example, if the user can retry the process, include a button to do so."
  (`PRIMER-LOAD`)

---

## 5. List vs table

### 5a. The decision rule

**Polaris** publishes the canonical version under the heading "A resource list isn't a
data table" (`POLARIS-RESOURCE`), verbatim:

> "On wide screens, a resource list **often looks like a table**, especially if some
> content is aligned in columns. Despite this, resource lists and data tables have
> different purposes.
>
> A **data table is a form of data visualization**. It works best to present highly
> structured data for **comparison and analysis**.
>
> If your use case is more about **visualizing or analyzing** data, use the data table
> component. If your use case is more about **finding and taking action on objects**,
> use a resource list."

Reinforced from the table side: data tables should "Not to be used for an actionable
list of items that link to details pages. For this functionality, use the resource list
component." (`POLARIS-DATA`) And the accessibility corollary: Do "Use tables for tabular
data." Don't "**Use tables for layout.** For a table-like layout that doesn't use table
HTML elements, use the resource list component." (`POLARIS-DATA`)

Polaris's third option, `IndexTable`, is the middle case: "An index table displays a
collection of objects of the same type, like orders or products. The main job of an
index table is to help merchants get an at-a-glance of the objects to **perform actions
or navigate** to a full-page representation of it." (`POLARIS-INDEX`)

**Geist** gives the sharpest, most testable trichotomy (`GEIST-TABLE` +
`GEIST-ENTITY`), verbatim:

> "Use `<Table>` for tabular data where **rows share the same shape and at least one
> column is sortable or comparable across rows**.
>
> For a row of **descriptive content paired with a single action** (membership row,
> integration row), use **Entity** instead.
>
> For a **key/value metadata block on a detail page**, use **Description**, not a
> two-column table." (`GEIST-TABLE`)

> "Use `<Entity>` for a row of descriptive content paired with **one or two controls**
> (member rows, integration rows, domain rows).
>
> For tabular data with sortable columns and shared row shape, use **Table** instead.
>
> For a static key/value metadata block on a detail page, use **Description**."
> (`GEIST-ENTITY`)

**Carbon** frames it as when data earns the table (`CARBON-TABLE`, "When to use" / "When
not to use"): use "To organize and display data. / If your user must navigate to a
specific piece of data to complete a task. / Displaying all of a user's resources." Do
not use "When a more complex display of the data or interactions are required. / **As a
replacement for a spreadsheet application.**"

**Atlassian:** "Dynamic tables are best used **if there is a large volume of
information** so that people can **scan, sort and analyse** data." Plus: "Use dynamic
tables when you need to display data in rows and columns, with additional features like
drag and drop and loading states that **go beyond what's available in native HTML
tables**." (`ATLAS-TABLE`)

**Synthesis of the rule:** a real table is earned when (i) every row has the same
shape, **and** (ii) at least one column is sortable or comparable down the column, **and**
(iii) the user's job is comparison/analysis rather than find-and-act. Two of three
means a list row (Polaris `ResourceItem`, Geist `Entity`). Key/value on one record
means a description list, never a two-column table.

### 5b. Column alignment — numeric right-align

**Polaris** builds it into the component API and states the rules as a closed set
(`POLARIS-DATA`):

> `columnContentTypes'text' | 'numeric'[]` — "List of data types, which determines
> content alignment for each column. Data types are 'text,' which aligns left, or
> 'numeric,' which aligns right."
>
> "### Alignment
> Column content types are built into the component props so the following alignment
> rules are followed:
> - **Numerical = Right aligned**
> - **Textual data = Left aligned**
> - **Align headers with their related data**
> - **Don't center align**"

`IndexTable` restates it as two separate best practices: "Numeric cells and titles
should be **right aligned** with the Text component" and "Numeric cells should use the
**numeric style** with the Text component" (`POLARIS-INDEX`) — i.e. right-alignment and
tabular figures are two obligations, not one.

**Geist** states the tabular-figures half explicitly: "Apply `tabular-nums` (or Geist
Mono) to numeric columns **so digits align across rows for comparison**."
(`GEIST-TABLE`)

Supporting content rules from Polaris (`POLARIS-DATA`): headers should "Include units of
measurement symbols so they aren't repeated throughout the columns" — Do "Temperature
°C", Don't "Temperature"; column content should "Not include units of measurement
symbols (put those symbols in the headers)"; and "**Keep decimals consistent.** For
example, don't use 3 decimals in one row and 2 in others."

Header casing: Polaris uses sentence case ("Use sentence case (first word capitalized,
rest lowercase)"), Carbon uses sentence case ("Column titles should use sentence-case
capitalization"), Geist uses Title Case ("Column headers (`<Table.Head>`) are **Title
Case** nouns or noun phrases: `Last Used`, `Requests (7d)`, `Created`, `Status`. **Never
sentences.**"). They disagree on case; they agree headers are short noun phrases, not
sentences. (`POLARIS-DATA`, `CARBON-TABLE`, `GEIST-TABLE`)

Truncation: Polaris says "**Wrap instead of truncate** content. This is because if row
titles start with the same word, they'll all appear the same when truncated."
(`POLARIS-DATA`) Carbon says for over-long column titles: "wrap the text to two lines
and then truncate the rest of the text. The **full text should be shown in a tooltip on
hover**." (`CARBON-TABLE`)

### 5c. Sticky headers, fixed columns, and where the table lives

- Polaris exposes `stickyHeader?boolean` — "Header becomes sticky and pins to top of
  table when scrolling" — and `fixedFirstColumns?number` — "Add fixed columns on
  horizontal scroll", with `hasFixedFirstColumn` **deprecated** in favour of it. It also
  has `firstColumnMinWidth?string`. `IndexTable` has `lastColumnSticky?boolean`.
  (`POLARIS-DATA`, `POLARIS-INDEX`) These are opt-in props, not defaults; no Polaris
  prose mandates sticky headers.
- Carbon does not offer sticky headers in guidance; it instead mandates width:
  "Data tables should be placed in a **page's main content area** and given **plenty of
  space to display data without truncation**… consider giving your data table the **most
  width on the page** to help your user view dense data." (`CARBON-TABLE`)
- Neither Carbon nor Atlassian publishes a sticky-header rule. Do not claim one.

### 5d. Row density

Carbon is the only system with a published density scale (`CARBON-TABLE`, "Sizing"):

> "The data table is available in **five different row sizes**: extra large, large,
> medium, small, extra small.
>
> The column header row `.cds--data-table thead` **should always match the row size of
> the table**. **Extra large row heights are only recommended if your data is expected
> to have 2 lines of content in a single row.**"

With an explicit Do/Don't: "Do use the same row height for the table and header rows." /
"Don't mix row heights for the table and header rows." And a coupled toolbar rule: "The
**tall toolbar should only be paired with the large and extra large row heights** and
the **small toolbar should only be used with the small and extra small row heights**."
(`CARBON-TABLE`)

Polaris exposes `increasedTableDensity?boolean` and `verticalAlign` (defaulting to
`'top'`), plus zebra striping as an opt-in modifier on both tables
(`hasZebraStripingOnData`, `hasZebraStriping`). (`POLARIS-DATA`, `POLARIS-INDEX`)
Carbon's rationale for zebra: "style the table rows with alternating colors to **make
scanning horizontal information easier**." (`CARBON-TABLE`)

**Hover is not optional.** Carbon: "The data table's row hover state **should always be
enabled** as it can help the user visually scan the columns of data in a row **even if
the row is not interactive**." (`CARBON-TABLE`) Polaris: `hoverable?boolean` —
"Table row has hover state. **Defaults to true.**" (`POLARIS-DATA`)

### 5e. Row selection

Carbon (`CARBON-TABLE`, "Selectable"):

> "By default, the selectable variant allows users to select more than one row… To select
> a row, the user must select the checkbox associated with the row. The user can select
> all rows at once by selecting the checkbox in the column header. **Checkboxes in the
> rows have only two states, checked and unchecked. However, the check all checkbox in
> the column header has three states, check[ed], unchecked, and indeterminate.**"
>
> "The data table also supports a **single-select radio button** control, limiting the
> user to selecting only one row at a time. The radio button is placed in the first
> column on the left side."
>
> "**The expandable icon always appears first and to the left of the selection icon.**"

Polaris adds cross-page selection and keyboard range-select (`POLARIS-INDEX`):
`selectedItemsCount?number | "All"`, `paginatedSelectAllActionText`,
`paginatedSelectAllText`, and "IndexTable also supports **multi-selection of a range of
rows by keypressing the `Shift` key**." Row-level `selected?: boolean | "indeterminate"`
supports subheader tri-state, and `selectionRange?: [number, number]` lets a subheader
row select its children.

Accessibility floor, from Atlassian: "**Never rely on highlighted rows to convey
important meaning, selection, or focus**, as this isn't accessible to people with visual
disabilities." (`ATLAS-TABLE`) And Geist for list rows: "For multi-select rows, the
leading Checkbox carries `aria-label="Select {entity name}"` so the row is selectable
**without relying on the visual label**." (`GEIST-ENTITY`)

### 5f. Bulk actions

Carbon (`CARBON-TABLE`, "Batch actions"):

> "Once an item from the table is selected, the **batch action bar appears at the top of
> the table**, presenting a set of possible actions to apply to all select[ed] items…
> **When batch mode is active, single action icons and overflow menus on the row should
> be disabled.**
>
> To exit the batch action mode, the user can select the **cancel button on the far
> right** of the bar or deselect all items."

Toolbar budget: "Include **up to five actions** within the table toolbar. More actions
can be made available through an overflow menu, combo button, or similar components."
(`CARBON-TABLE`)

Inline (per-row) actions: "When the overflow menu contains **fewer than three options,
keep the actions inline as icon buttons** instead. This approach reduces a click and
makes available actions visible at a glance." Overflow menus are "persistent on each row"
by default, with `overflowMenuOnHover` as an opt-in — "**For mobile and touch devices the
data table will detect if the user agent supports hover-over and persist the overflow
menus even if the `overflowMenuOnHover` prop is enabled.**" (`CARBON-TABLE`)

Geist's per-row budget: "The right column holds **at most one or two controls**. If the
row needs more, move secondary actions into a Dots Menu." And: "Keep right-column buttons
**Verb + Noun** (`Remove Member`, `Resend Invite`). **Bare verbs like `Remove` or
`Confirm` lose context once the row scrolls offscreen.**" (`GEIST-ENTITY`)

Polaris on bulk-action copy and responsive behaviour: "Follow the **verb + noun formula**
for bulk actions"; `promotedBulkActions` are "Up to **2** bulk actions that will be given
more prominence" (`POLARIS-RESOURCE`); and hiding them on small screens is conditional —
"We only recommend hiding bulk actions on screens smaller than **490px**… Hiding bulk
actions means a merchant can't select multiple items at once, so it should **only be
used when the bulk actions are not essential** to the merchant's workflow."
(`POLARIS-INDEX`)

Where table-level actions live, per Polaris: "**Table actions are placed to the right in
the header** to keep them discoverable. They are typically actions that allow merchants
to add item[s] or select items that will display in the table." (`POLARIS-CARDLAYOUT`)
And per-item actions never go in the header: Do "Place actions that affect specific list
items on the item itself." / Don't "Place action[s] in the header unless it represents
the entire card." (`POLARIS-CARDLAYOUT`)

### 5g. Pagination and counts

- Polaris, both tables: "**Paginate when the current list contains more than 50 items.**"
  (`POLARIS-INDEX`, `POLARIS-RESOURCE`)
- Carbon: "The pagination component is **always placed at the bottom** of the data
  table." (`CARBON-TABLE`)
- Atlassian: "If there's more than the maximum number of rows for one page, the
  pagination component appears at the end of the table." (`ATLAS-TABLE`)
- Geist copy spec: "Pagination labels are `Previous` and `Next`. Page-count copy reads
  `Page 2 of 7` or `21–40 of 142` **with an en-dash inside the range**." (`GEIST-TABLE`)
- Polaris content rule on headings and truncated sets: Do "Products" / "Showing 50
  products", Don't "*No heading*"; and "Indicate when **not all members of a resource
  are being shown**" — Do "Popular products this week", Don't "Products".
  (`POLARIS-INDEX`, `POLARIS-RESOURCE`)
- Geist sortable headers: "Sortable column headers are **buttons**. The visible label
  stays Title Case; the sort-direction arrow is **decorative** and the button
  **announces the next sort state** to assistive tech." (`GEIST-TABLE`) Carbon: three
  states — "unsorted (`arrows`), sorted-up (`arrow--up`) or sorted-down (`arrow--down`)…
  **Only the sorted column displays an icon, and unsorted icons are only visible on
  hover.**" (`CARBON-TABLE`) Polaris: "Sortable tables use the `aria-sort` attribute…
  They also use `aria-label` on sorting buttons." (`POLARIS-DATA`)

### 5h. Table accessibility hard rules (Atlassian, most complete)

Verbatim (`ATLAS-TABLE`, "Accessibility"):

> "- Provide a visual `caption` for complex tables… If you don't use a `caption`, then
> you'll need to use `label` to describe the table for assistive technologies. **Avoid
> using both as they may conflict.**
> - **Never rely on highlighted rows** to convey important meaning, selection, or focus…
> - **Never put additional controls like links or buttons in table headings.**
> - **Never use tables to build visual layouts.** Only use tables for structured data,
> and **avoid headless tables**.
> - Clearly label columns with simple language…
> - When offering edit options, make sure that the label for the button is **unique to
> each row** and references the row that's being edited. For example, '**Edit component
> 3**' not '**Edit**'."

Atlassian on row editing: "For more complex tables where there are multiple types of
editable content, add an edit link to the more actions button. **Use a modal dialog or
dedicated page for entering content instead of input fields that are directly part of
the dynamic table.**" (`ATLAS-TABLE`) And on row errors: "If an error occurs, **highlight
the affected row or text input** with a supporting error icon, and help people know how
to proceed to resolve the error." (`ATLAS-TABLE`)

---

## 6. Nested surfaces — the explicit anti-nesting guidance

None of the target systems publishes a bare sentence reading "never nest a card in a
card". What they publish is stronger and more testable: a **hard cap on nesting depth**,
a **ban on elevation for in-page containers**, a **ban on nesting tables**, and a
**decreasing-padding law**. Together these make card-in-card-in-card unbuildable in a
compliant way.

### 6a. Carbon: three layers, and that is the ceiling

Carbon's layering model is a finite stack (`CARBON-LAYER`), verbatim:

> "There are **four layers within a theme: base layer, layer 01, layer 02, and
> layer 03.** Layers stack one on top of the other in a set order. **Each step in UI
> color (excluding interaction colors) is another layer** and will require the use of a
> different set of layering tokens."

And the code-level cap:

> "Components can be **nested inside the layer component up to three level[s]**, the
> last level corresponding to the 03 layer set tokens. By default, tokens use the 01
> layer set tokens in the first layer."

Carbon's worked example shows exactly where the layers go, and it spends them on real
structure rather than decoration:

> "…the starting **base layer** is the page area behind and above the tabs… The tab
> content area attached to the selected tab is also only one layer above the base and so
> also uses `$layer-01` as its background. In the tab's main section, the **text input
> field** is placed on top of `$layer-01` making it a part of the next layer level…
> Also a part of the second layer level are the **tiles** in the sub-section… However,
> components added on top of the tiles—the text input and overflow menu—are considered
> part of **third layer level**." (`CARBON-LAYER`)

So in Carbon's accounting, a form field inside a tile inside a tab panel already consumes
all three layers. A card inside a card inside a panel has no tokens left.

Carbon also restricts when a whole-theme swap is legitimate: "**Only use inline theming
for major shifts in color, like high contrast moments.** The more subtle transitions of
color in a product are handled within each theme through the layering model tokens. It is
unlikely that you'll need to inline a White theme within the Gray 10 theme…"
(`CARBON-LAYER`)

### 6b. Carbon: in-page containers have no elevation, full stop

`CARBON-TILE`, "When not to use", verbatim:

> "Tiles reside on the **same plane as the page background layer and do not have
> elevation**. Tiles organize essential information and have the **same visual hierarchy
> as content on the same page**.
>
> **Do not add a drop shadow to tiles** and use them to reveal secondary information,
> actions, or notifications. Use modals, popovers, and dialogs that have elevation and
> are appropriate for this use case instead."

Carbon also separates the vocabulary: "Tiles are simple and foundational. Cards can be
very complex. Cards are built upon the tile foundation… **Carbon does not have a card
pattern.**" (`CARBON-TILE`) — i.e. Carbon's answer to grouping is a flat, shadowless,
background-tinted container, not a card.

Uniformity within a group is required: Do "match the tile variants in groups." / Don't
"mix different variants of tiles in groups." (`CARBON-TILE`)

### 6c. Carbon: do not nest tables, and do not cramp them

`CARBON-TABLE`, "Placement", verbatim:

> "Data tables should be placed in a page's main content area and given plenty of space
> to display data without truncation. **Avoid placing data tables inside data tables or
> smaller containers where the information can feel cramped or needs truncation.**"

And where a condensed grid forces adjacency, Carbon prescribes a **tint change**, not
another border: "The data table can be used on a condensed grid, but care should be taken
to avoid any unintentional relationships with other UI elements. **Use a hybrid grid or a
dissimilar background color** to avoid the components blending in to each other."
(`CARBON-TABLE`)

Carbon's escape hatch for content that wants to be a nested panel is a route change, not
a nested surface: "When the content in the expanded area feels cramped, consider
**taking the user to a dedicated page, side panel, or data table** to view the
information and complete tasks." (`CARBON-TABLE`)

### 6d. Polaris: how to express grouping *inside* an already-bounded region

Polaris's Card-layout pattern is the most complete published answer to "I'm already
inside a card and I need to group things." Its four mechanisms, in Polaris's own words
(`POLARIS-CARDLAYOUT`):

**1. Card sections — a heading plus a content block, not a nested box.**

> "Card sections are used to group content in cards, and to separate such groups when
> there are more than one. A section typically has a heading and a main block of
> content, such as a list or a form layout."
>
> Do "Use a card with multiple sections to group content that shares purpose."
>
> Don't "**Use card sections to divide list items.** Instead, use the appropriate list
> component or build a bespoke list structure within a single section."
>
> Do "**Omit the section title in cards with a single section.** However, maintain the
> space-200 gap as typically used between section titles and content."

**2. Nested stacks with *differing gaps* — grouping by rhythm, not by container.**

> "Stacks can also be nested to apply different gaps between different groups of content.
> **It's the difference between the gap sizes that creates the effect of grouping and
> hierarchy.** Elements with tighter gaps are perceived as more related than those with a
> looser gap."

Polaris publishes the actual four-step gap ladder, which is directly portable:

> "**Space-100** is the tightest gap in cards and is used to group the most related
> elements." → between elements within a form-layout item; between simple list items.
>
> "**Space-200** is the second tightest gap and is typically used to separate blocks of
> content inside card sections." → between the header/body/footer of a single-section
> card; between a section heading and its content; between items that are themselves
> space-100 stacks.
>
> "**Space-300** gaps are typically used to ensure clear separation between blocks
> containing closely related but **irregularly shaped** content, such as form layout
> items. … By increasing the gap size, content blocks can be more readily perceived as
> unified, discrete items."
>
> "**Space-400** is the loosest card gap and is typically used to space cards with
> multiple sections. **The gap size is the same as the card padding, which structures
> sections as neatly merged cards.**"
>
> Don't "Use space-400 inside card sections, as it can disconnect content that belongs
> together. Instead, default to space-200 and upsize to space-300 if the former seems too
> tight."
>
> Don't "Use a flat hierarchy for content that should have different spatial
> relationships." / Don't "Use a flat hierarchy that causes section titles to **float
> with equal space to sections above and below**."

That last "Don't" is the exact defect our audit keeps flagging as "sections float".

**3. The decreasing-padding law for the nesting that is genuinely necessary.**

> "It's common that cards have containers nested inside them. **When these containers
> have visual boundaries, such as with borders or dividers**, then padding is used to
> create space between its content and border.
>
> **The general rule is that the deeper an element is nested, the smaller its padding
> is.**" (default card padding is space-400; the illustrated nested container is
> space-300)

**4. Padding is for bounded containers only; invisible groups get stacks.**

> Do "Use padding inside **visually scoped containers**, such as the header of a data
> table."
>
> Don't "**Use padding for invisible containers, such as card sections or form
> layouts.** Instead, use block stacks."
>
> Don't "Use padding to create space between elements. Instead, use block stacks."

**5. Height limit, with a specific remedy.**

> Don't "Allow cards to become so tall that they are difficult to overview. Instead,
> provide a **footer action that allows merchants to expand and collapse** the content."
> (`POLARIS-CARDLAYOUT`)

Polaris's Card component itself is deliberately minimal: default padding
`{xs: '400', sm: '500'}`, 8px radius, `--p-color-bg-surface` background,
`--p-shadow-300`, `background?: ColorBackgroundAlias`. Its best practices cap actions:
"Avoid too many call-to-action buttons or links and **only one primary call to action per
card**" and place them by role: "Use calls to action on the bottom of the card for next
steps and use the space in the upper right corner of the card for persistent, optional
actions (such as Edit)." (`POLARIS-CARD`, `POLARIS-CARDLAYOUT`)

Header/footer action placement, verbatim Don'ts from `POLARIS-CARDLAYOUT`:

> Don't "**Place call-to-actions in the card header.** Instead, place them in the card
> footer where merchants typically find actions that progress towards their goals."
>
> Don't "**Group actions in the header by default.** Instead, use these guidelines to
> find placements that have meaning to merchants."
>
> Don't "**Group section actions in the card header**, as it disconnects them from what
> they control. Instead, place such actions in the respective section header."
>
> Do "Default to using **basic buttons in the footer**. Only use a primary button when
> it's the most important action on the page."
>
> Do "Use an **action list if the card has more than two call-to-actions**."

### 6e. Radix Themes: the two escape hatches — `ghost` and `Inset`

Radix Themes gives Card a `variant` of `"surface" | "classic" | "ghost"`
(`RADIX-CARD`) — `ghost` being a card with no surface treatment, i.e. the structural
grouping without a second visible boundary. And for content that must reach the edges of
an already-bounded region, Radix supplies a dedicated component rather than a nested box:

> "### With inset content
> Use the **Inset** component to align content **flush with the sides of the card**."
> (`RADIX-CARD`)

Its example is `<Inset clip="padding-box" side="top" pb="current">` wrapping an image
inside a `<Card size="2">` — negative-margin-to-edge, which is exactly the Polaris
`Bleed` idea: Do "Apply padding to the card by default, and use **bleed with a negative
margin** to optically adjust content if needed." (`POLARIS-CARDLAYOUT`)

### 6f. Message stacking is a nesting smell too

Geist names the architectural diagnosis directly: "**One Note per concept. Stacking three
Notes on a card means the page architecture, not the Note copy, is wrong.**"
(`GEIST-NOTE`) Carbon: "Avoid overloading a single page with multiple callouts."
(`CARBON-NOTIF`) Polaris: "Only show one banner at a time" is Carbon's phrasing; Polaris's
is "Focus on a single theme, piece of information, or required action to avoid
overwhelming merchants." (`CARBON-NOTIF`, `POLARIS-BANNER`)

### 6g. Summary of the permitted grouping mechanisms inside a bounded region

Ranked by the systems' preference, all sourced above:

1. **Nested stacks with differing gaps** (`POLARIS-CARDLAYOUT`) — no new boundary at all.
2. **Section heading + content block**, section title omitted when there's only one
   (`POLARIS-CARDLAYOUT`).
3. **Divider / border-subtle between siblings** — Carbon's tile example uses
   `$border-subtle-02` *between* tiles rather than a box around each (`CARBON-LAYER`).
4. **Background tint change via the next layer token** — one step only, and it counts
   against the three-layer budget (`CARBON-LAYER`).
5. **Inset / bleed** for edge-to-edge content (`RADIX-CARD`, `POLARIS-CARDLAYOUT`).
6. **A new route, side panel, or dedicated page** when the content is genuinely too big
   (`CARBON-TABLE`).

Never: a shadow on an in-page container (`CARBON-TILE`); a table inside a table
(`CARBON-TABLE`); a card section per list item (`POLARIS-CARDLAYOUT`); padding used as
inter-element spacing (`POLARIS-CARDLAYOUT`); equal gaps above and below a section title
(`POLARIS-CARDLAYOUT`).

---

## 7. Zero vs null — legitimate zero versus unknown / not-applicable

This is the thinnest area in published guidance. Exactly one target system states a
character-level convention, and it is unambiguous.

### 7a. Geist — the em dash, and an explicit ban on the alternatives

`GEIST-TABLE`, "Behavior", verbatim:

> "Render **`—`** in cells where a value is **unknown or not applicable**. **Don't
> substitute `N/A`, `null`, or an empty string.**"

That is the rule. Note what it implies by omission: a legitimate `0` is a value and
renders as `0`. The em dash is reserved for the absence of a value. It also rules out the
two failure modes we actually ship — a blank cell (indistinguishable from a layout bug)
and a leaked `null`/`undefined`.

### 7b. Primer — unavailable is not zero, so hide it rather than render a wrong number

`PRIMER-DEGRADED`, verbatim:

> "**Handling unavailable counts** — When the data required to calculate a count is
> unavailable, **default to hiding the number**. If the count is shown inside of an
> interactive element, a tooltip may be displayed on **focus and hover** to explain the
> missing count."
>
> "**Handling activity indicators** — When the data is unavailable to determine whether
> to show an activity indicator (most commonly used for notification badges), default to
> **hiding the indicator**."

And the general prohibition on faking it, with a worked Do/Don't on table cells:

> Do "Render an error message in place of the content." / Don't "**Don't attempt to render
> UI that is missing critical information.**" — the Don't image is captioned "Image of
> Memex table with '**undefined of undefined**'." (`PRIMER-DEGRADED`)

Plus the rule that a real zero and a failed load must never share a presentation: "**If
we know a user created something, don't show a generic 'empty state'.** It's better to
explain that it's unavailable…" (`PRIMER-DEGRADED`)

So Primer's model is three-valued: **a known number renders**, **a known-zero renders as
0** (it is a known number), **an unknown suppresses the affordance entirely** rather than
rendering `0` or `—` in a badge. The difference from Geist is contextual, not
contradictory: Geist governs a table cell (which must keep its column shape, hence `—`);
Primer governs an inline count/badge (which can vanish without breaking layout).

### 7c. Carbon — never interpolate a gap, and label its bounds

For time-series and charts, Carbon is explicit that missing ≠ zero and missing ≠
continuous (`CARBON-AXES`), verbatim:

> "**Gaps in data** — **Never interpolate between periods when data is unavailable.
> Always label both the start and end point during which data is not available.**"
>
> "If data isn't available between axis breakpoints, **leave the area empty**."
>
> "**Never change axis ticks increments to accommodate data availability.** If any form
> of axis compression is required, use the provided axis break styling to visually denote
> the compression."

And on the zero baseline, which is the other half of "a zero is a real value":

> "**Always start numerical axes at zero for part-to-whole and comparisons charts**, such
> as bar and area chart. Truncating the Y axis can distort the perception, making a small
> difference look big and significant."
>
> "Line charts and scatter plots are less sensitive to this distortion because they are
> intended to communicate trends and not the relative size of the difference. In these
> cases, cropping the Y axis helps users more easily identify the direction of change."
> (`CARBON-AXES`)

### 7d. Polaris — the totals row uses an empty string as a deliberate placeholder

`POLARIS-DATA`, prop documentation, verbatim:

> `totals?any[]` — "List of numeric column totals, highlighted in the table's header
> below column headings. **Use empty strings as placeholders for columns with no
> total.**"

And the accompanying best practice, which prevents inventing values: data tables should
"Include a summary row to surface the column totals" but "**Not include calculations
within the summary row**." (`POLARIS-DATA`)

### 7e. Carbon — a genuinely-nothing state may need no next step

Carbon's one statement bearing on "zero is fine and requires no apology"
(`CARBON-EMPTY`):

> "There may be situations where next steps are not possible or supplementary text is not
> required… For example, if your user has configured alerts and nothing has been
> triggered, **it's not a case of alerts not being set up but that there is nothing that
> requires the user's attention. In this case, supplementary text is not necessary.**"

### 7f. What is *not* published

- No target system publishes a rule for **zero in a metric tile** (e.g. whether "0" gets
  muted styling). Carbon's dataviz mentions a zero inflection point for heat maps but I
  did not read that page in full and will not paraphrase it.
- No target system publishes a distinction between `—` (unknown) and a separate glyph for
  "not applicable". Geist collapses both into `—`.
- Do not attribute an em-dash convention to Polaris, Carbon, Atlassian, Primer, or
  Material — only Geist states it.

---

## Rules we will enforce

Testable assertions. Each cites the source that authorises it. "Reviewable" means a human
can check it from the diff; "automatable" means a lint/test could check it.

### Data states

1. **Every data-fetching surface renders from an explicit discriminated state, not from
   truthiness of the data array.** The union must include at minimum: `loading-initial`,
   `loading-refresh`, `loading-more`, `empty-first-run`, `empty-filtered`, `error`,
   `forbidden`. *(Reconciled from `CARBON-EMPTY` three-type taxonomy + `POLARIS-RESOURCE`
   separate `emptyState`/`emptySearchState`/`loading`/`hasMoreItems` props + `GEIST-EMPTY`
   six variants.)* — automatable: no component may branch on `data?.length === 0` as its
   only empty check.
2. **First-run empty and filtered empty are two different renders with two different copy
   strings and two different actions.** First-run's action creates the first record;
   filtered-empty's action clears or widens the filter. *(`POLARIS-RESOURCE`:
   `emptyState` vs `emptySearchState` defaulting to `EmptySearchResult`; `GEIST-EMPTY`
   "no-results for a filtered list that returned zero rows, blank slate or informational
   for a resource the user hasn't created"; `ATLAS-EMPTYMSG` "An empty state vs. a blank
   slate message".)*
3. **Filtered-empty copy quotes the user's query verbatim and names the recovery.**
   Single query: `No X match "<query>". Clear the filter to see all X.` Multi-facet:
   `No X match your filters.` + widen/clear. *(`GEIST-EMPTY`; `CARBON-EMPTY` "if there
   are no search results suggest adjusting the search or filters".)*
4. **Permission-denied renders full-page when the whole route is gated, and as an
   in-region Note when one panel of an otherwise-accessible page is gated.** It is never
   a generic empty state. *(`GEIST-EMPTY`; `CARBON-EMPTY` permissions-issue row requires
   "Suggest steps or process to request access".)*
5. **If we know the user has data, a failed load never renders an empty state.** It
   renders an unavailable/error state, or the section is removed including its heading.
   *(`PRIMER-DEGRADED`, verbatim.)*
6. **A panel that fails while its siblings succeed replaces only itself.** Small elements
   → inline message with a leading warning icon; panels → a blankslate with a muted alert
   icon, required secondary text, and no primary action. *(`PRIMER-DEGRADED`.)*
7. **No page renders more than five outage/error messages.** *(`PRIMER-DEGRADED`, "we
   suggest limiting pages to 5 or less outage messages".)* — reviewable.
8. **Global degradation shows one warning-variant banner above the global nav, and the
   global nav itself is never suppressed.** Individual broken nav items are omitted;
   the header stays. *(`PRIMER-DEGRADED`.)*
9. **Every empty/error/forbidden state offers a path forward or explains why there is
   none.** *(`CARBON-EMPTY`: "As a general rule, don't lead the user into a dead end";
   `PRIMER-EMPTY`: "Try to push the user forward via an alternative path until they truly
   hit a dead end".)*

### Loading

10. **Nothing shows a loading indicator for a wait under 200ms.** *(`M3-PROGRESS` "Instant
    (under 200ms) → No indicator"; `PRIMER-LOAD` "Less than 1 second: Don't show a
    loading state"; `NNG-LIMITS` 0.1s = instantaneous.)*
11. **Cold load of a known layout uses a skeleton; refresh over already-rendered data
    keeps the old rows and uses an overlay/inline indicator.** *(`POLARIS-RESOURCE`
    `SkeletonPage` on initial load vs `loading` prop = spinner overlay; `GEIST-SKELETON`
    "Show a Skeleton when async data fills a known layout"; `CARBON-TABLE` "If extra load
    time is expected to display information, use skeleton states instead of spinners".)*
12. **Every skeleton's width, height, and corner shape match the element it replaces, and
    the reveal causes zero layout shift.** *(`GEIST-SKELETON` "A 200×20 block becoming an
    80×16 string reads as a glitch"; `PRIMER-LOAD` "Avoid creating a jarring layout
    shift"; `RADIX-SKELETON` "preserves the dimensions of children".)* — automatable via
    a CLS assertion on the loading→loaded transition.
13. **Skeletons wrap the text node, not its container.** *(`RADIX-SKELETON`.)*
14. **Skeletons are never applied to buttons, inputs, checkboxes, toggles, toasts,
    overflow menus, dropdown items, modals, or loaders.** A modal's *contents* may
    skeleton; the modal may not. *(`CARBON-LOAD`, verbatim.)*
15. **A skeleton is never used to represent "no data".** When there is nothing to load,
    render the empty state. *(`GEIST-SKELETON`.)*
16. **One loading indicator per loading region, not one per element.** *(`M3-PROGRESS`
    "Don't add progress indicators to every activity"; `PRIMER-LOAD` "consider replacing
    a series of adjacent loading indicators with a single loading indicator".)*
17. **Collections stream: render each item as it arrives rather than waiting for the whole
    page.** *(`PRIMER-LOAD`, verbatim.)*
18. **A load-more indicator sits in the space the new rows will occupy, never over the
    existing rows.** *(`M3-PROGRESS`.)*
19. **Waits beyond ~3–5s use a determinate indicator; beyond 10s the work becomes a
    background task the user can navigate away from.** *(`PRIMER-LOAD` 3–10s / >10s;
    `M3-PROGRESS` >5s; `NNG-PROGRESS` percent-done ≥10s and "lower the cutoff point"
    when variance is high; `NNG-LIMITS` 10s attention limit.)*
20. **No static "Loading…" text as the only indicator.** *(`NNG-PROGRESS` "Static progress
    indicators: Don't use them.")* — automatable.
21. **Every loading region sets `aria-busy="true"` while pending and announces completion
    on the destination container with `aria-live="polite"`; one announcement per
    collection.** Filter results announce a count via an always-rendered
    `role="status"` element. *(`GEIST-SKELETON`, `PRIMER-LOAD`.)*
22. **Spinner motion is not removed under `prefers-reduced-motion`; skeleton shimmer may
    be.** *(`PRIMER-LOAD` vs `GEIST-SKELETON`.)*
23. **No focusable control lives inside a skeleton.** *(`GEIST-SKELETON`.)*

### Empty-state anatomy

24. **Heading is the only required part.** Illustration, body, and actions are optional and
    each must justify itself. *(`ATLAS-EMPTY` "The only required part of the empty state
    component is the heading".)*
25. **Exactly one primary action, at most one secondary. Three CTAs is a defect.**
    *(`POLARIS-EMPTY` "Use only one primary call-to-action button"; `GEIST-EMPTY` "Cap at
    one primary CTA, plus one secondary… Three CTAs is a smell"; `CARBON-EMPTY` "pick the
    most important".)* — reviewable/automatable.
26. **Where multiple empty states can appear on one screen (dashboards), CTAs downgrade to
    tertiary and illustrations drop to text-only.** *(`CARBON-EMPTY`, both rules
    verbatim.)*
27. **The empty state replaces the element it stands in for — including a table's column
    headers and footer.** *(`CARBON-EMPTY`, verbatim; `GEIST-TABLE` "render Empty State
    outside the table rather than an empty `<Table.Body>`".)* — automatable: assert
    `queryByRole('table')` is null in the empty state.
28. **Empty-state illustrations carry `alt=""` and are never given
    `role="presentation"`.** *(`CARBON-EMPTY`, `POLARIS-EMPTY`.)* — automatable.
29. **Error empty states use a muted alert icon, never a playful illustration, and have no
    secondary "learn more" action.** *(`PRIMER-EMPTY`, `PRIMER-DEGRADED`.)*
30. **Error empty states surface a copyable identifier and a retry action.**
    *(`GEIST-EMPTY` "Error variant pairs the body with a copyable request ID and a
    `Try Again` button"; `PRIMER-LOAD` "if the user can retry the process, include a
    button to do so".)*
31. **Empty-state CTAs are `Verb + Noun`. `Get Started`, `Continue`, `OK`, `Try X` and
    bare nouns are banned.** *(`GEIST-EMPTY`; `POLARIS-EMPTY` Do "Create order" / Don't
    "New order", Do "Activate Apple Pay" / Don't "Try Apple Pay".)* — reviewable.
32. **The empty-state CTA is a real `<button>`/`<a>`, never a clickable div.**
    *(`GEIST-EMPTY`.)* — automatable.
33. **Body copy does not restate the heading.** *(`GEIST-EMPTY`; `ATLAS-EMPTYMSG` "Avoid
    repeating content from the title"; `POLARIS-BANNER` "Avoid repeating the heading".)*
34. **Empty-state blocks are left-aligned within in-page regions; centring is reserved for
    small tiles (image centred above left-aligned text).** *(`CARBON-EMPTY`. Noted
    disagreement with `ATLAS-EMPTY`, which centres; we follow Carbon because its stated
    reason — preventing the empty state from reading as content — applies to our
    dashboards.)*
35. **Empty-state text measure is capped (~464px wide / ~304px in narrow containers).**
    *(`ATLAS-EMPTY`.)*

### Messaging placement

36. **Feedback caused by the user's own action in a region renders in that region, not as
    a toast.** *(`CARBON-NOTIF` task-generated "should be placed in the region of the page
    the user is working in".)*
37. **Toasts are only for non-blocking acknowledgements of user-initiated actions.**
    Billing failures, permission denials, and anything needing triage get a persistent
    surface; field validation goes on the field. *(`GEIST-TOAST`, verbatim.)* — reviewable.
38. **No toast auto-dismisses if it carries the only copy of a critical message or an
    action.** *(`CARBON-NOTIF` WCAG 2.2.4 rule; `GEIST-TOAST` `preserve`.)*
39. **Banner placement follows the three-tier rule: page-level → top of page below the
    page header, full content width; section-level → inside the section below its heading,
    reduced spacing; element-level → immediately adjacent to the element.**
    *(`POLARIS-BANNER`, verbatim.)*
40. **One banner at a time; one Note per concept.** Three stacked messages on one card is
    an architecture defect, not a copy defect. *(`CARBON-NOTIF`, `GEIST-NOTE`.)*
41. **Critical/warning messages get `role="alert"`; everything else `role="status"`. Focus
    is never moved to a message that appears on page load.** *(`POLARIS-BANNER`.)* —
    automatable.
42. **Form submission errors get both a summary banner at the top of the form (with focus
    moved to it on submit) and per-field inline errors.** *(`POLARIS-BANNER`.)*
43. **Non-functional controls are removed if removal isn't disorienting; otherwise
    rendered inactive — never `disabled` — and never explained only via a tooltip on a
    non-focusable element.** Submit buttons and core-workflow controls are never silently
    removed. *(`PRIMER-DEGRADED`.)*
44. **Error copy contains no HTTP codes or infra internals, and always ends with a next
    step.** `Couldn't …` for user-state errors, `Failed to …` for system errors.
    *(`CARBON-NOTIF` Do/Don't; `PRIMER-EMPTY`; `GEIST-TOAST`.)*

### List vs table

45. **A `<table>` is only used when every row has the same shape AND at least one column is
    sortable/comparable down the column AND the user's task is comparison or analysis.**
    Otherwise: a list row for find-and-act, a description list for one record's key/values.
    *(`GEIST-TABLE`, `GEIST-ENTITY`, `POLARIS-RESOURCE` "A resource list isn't a data
    table", `POLARIS-DATA`.)* — reviewable, and the single most load-bearing rule here.
46. **A two-column table is never used for a record's metadata.** *(`GEIST-TABLE` "use
    Description, not a two-column table".)* — automatable.
47. **`<table>` is never used for layout, and no headless tables ship.** *(`ATLAS-TABLE`
    verbatim; `POLARIS-DATA` Don't "Use tables for layout".)* — automatable.
48. **Numeric columns are right-aligned, text columns left-aligned, headers aligned with
    their data, and nothing is centre-aligned.** *(`POLARIS-DATA`, verbatim four-line
    rule.)* — automatable.
49. **Numeric columns render with tabular figures (`font-variant-numeric: tabular-nums`
    or the mono face).** *(`GEIST-TABLE`; `POLARIS-INDEX` "Numeric cells should use the
    numeric style".)* — automatable.
50. **Units live in the header, not in every cell, and decimal precision is constant down
    a column.** *(`POLARIS-DATA`, verbatim.)* — reviewable.
51. **Column headers are short noun phrases, never sentences; header casing is one house
    style applied everywhere.** *(`GEIST-TABLE` Title Case; `POLARIS-DATA` /
    `CARBON-TABLE` sentence case — pick one and be consistent, the sources disagree on
    case but agree on "not sentences".)*
52. **Row content wraps rather than truncating; over-long *headers* may truncate to two
    lines with the full text in a hover tooltip.** *(`POLARIS-DATA`, `CARBON-TABLE`.)*
53. **Header row height equals body row height, and toolbar height is paired to row
    density (tall toolbar only with large/XL rows, small toolbar only with small/XS
    rows).** *(`CARBON-TABLE`, verbatim.)*
54. **Row hover tint is always enabled, even when the row is not clickable.**
    *(`CARBON-TABLE`, verbatim; `POLARIS-DATA` `hoverable` defaults true.)*
55. **Selection state is never conveyed by row highlight alone.** *(`ATLAS-TABLE`,
    verbatim.)* — automatable.
56. **Row checkboxes carry a row-identifying accessible name (`Select <entity name>`), and
    per-row action buttons are unique per row (`Edit component 3`, not `Edit`).**
    *(`GEIST-ENTITY`, `ATLAS-TABLE`.)* — automatable.
57. **The select-all header control is tri-state (checked / unchecked / indeterminate);
    row checkboxes are two-state.** *(`CARBON-TABLE`, verbatim.)*
58. **Shift-click selects a contiguous range.** *(`POLARIS-INDEX`.)*
59. **Bulk actions appear in a bar at the top of the table on first selection, disable
    per-row action icons and overflow menus while active, and expose an explicit cancel at
    the far right.** *(`CARBON-TABLE`, verbatim.)*
60. **Bulk action labels follow verb + noun; at most two are promoted to visible
    buttons.** *(`POLARIS-INDEX`/`POLARIS-RESOURCE`.)*
61. **A table toolbar carries at most five actions; the rest go to an overflow menu.**
    *(`CARBON-TABLE`.)* — reviewable.
62. **Per-row: fewer than three actions render as inline icon buttons; three or more
    collapse into one overflow/dots menu.** A list row's right column holds at most two
    controls. *(`CARBON-TABLE`, `GEIST-ENTITY`.)*
63. **Table-level actions (add, column settings) sit at the right of the header;
    item-level actions sit on the item.** *(`POLARIS-CARDLAYOUT`.)*
64. **No links or buttons inside `<th>`, except the sort control itself, which is a real
    `<button>` that announces the next sort state; sort arrows are decorative.**
    *(`ATLAS-TABLE`, `GEIST-TABLE`, `POLARIS-DATA` `aria-sort`.)* — automatable.
65. **Only the currently-sorted column shows a persistent sort icon; unsorted indicators
    appear on hover/focus only.** *(`CARBON-TABLE`.)*
66. **Lists and tables paginate past 50 items; pagination sits at the bottom; labels are
    `Previous`/`Next` with a `Page N of M` or `21–40 of 142` (en dash) count.**
    *(`POLARIS-INDEX`/`POLARIS-RESOURCE` 50-item threshold; `CARBON-TABLE` placement;
    `GEIST-TABLE` copy.)*
67. **Every list/table is headed by the resource name, and any partial set says so
    ("Popular products this week", not "Products").** *(`POLARIS-INDEX`,
    `POLARIS-RESOURCE`.)*
68. **In-table editing uses a modal or a dedicated page, not inputs embedded in rows.**
    *(`ATLAS-TABLE`.)*
69. **A row-level error highlights that row with an error icon and states the recovery.**
    *(`ATLAS-TABLE`.)*
70. **A loading list renders skeleton rows, not an empty body.** *(`GEIST-ENTITY` "Render
    the Skeleton variant… during load instead of an empty row"; `CARBON-TABLE` "use
    skeleton states instead of spinners".)*

### Nested surfaces

71. **Maximum surface-nesting depth is three background steps from the page base.** Beyond
    that, the content moves to a new section, panel, or route. *(`CARBON-LAYER` "four
    layers within a theme: base layer, layer 01, layer 02, and layer 03" and "nested…
    **up to three level[s]**".)* — reviewable; countable in the DOM.
72. **In-page containers get no shadow.** Elevation is reserved for modals, popovers, and
    dialogs. *(`CARBON-TILE`, verbatim.)* — automatable.
73. **A table is never nested inside another table, or inside a container that forces
    truncation.** *(`CARBON-TABLE`, verbatim.)* — automatable.
74. **Grouping inside an already-bounded region uses, in order of preference: differing
    stack gaps → a section heading → a subtle divider → one background-tint step (which
    counts against rule 71) → inset/bleed. Not a second card.**
    *(`POLARIS-CARDLAYOUT`, `CARBON-LAYER`, `RADIX-CARD` `Inset` + `ghost`.)*
75. **List items are never each wrapped in their own card section or sub-card.**
    *(`POLARIS-CARDLAYOUT`, verbatim Don't.)* — automatable.
76. **Padding is only applied to containers that have a visible boundary. Spacing between
    elements comes from stack gaps.** *(`POLARIS-CARDLAYOUT`, both verbatim Don'ts.)*
77. **When nesting is genuinely required, inner padding is strictly smaller than outer
    padding.** *(`POLARIS-CARDLAYOUT` "the deeper an element is nested, the smaller its
    padding is".)* — automatable against our space scale.
78. **A section title is closer to its own content than to the section above it — never
    equidistant.** Section separation uses the loosest gap (= the card padding value);
    intra-section spacing is two steps tighter. *(`POLARIS-CARDLAYOUT` space-100/200/300/400
    ladder and the "titles float between groups" Don't.)* — automatable.
79. **A single-section card omits the redundant section title but keeps the title-to-content
    gap.** *(`POLARIS-CARDLAYOUT`.)*
80. **Sibling containers in a group are the same variant and the same shape — no mixing.**
    *(`CARBON-TILE`, verbatim.)*
81. **One primary action per card. Progress-forward CTAs go in the footer (basic buttons by
    default); persistent modify/view actions go top-right as tertiary icon buttons with
    tooltips; more than two footer CTAs collapse into an action list.**
    *(`POLARIS-CARD`, `POLARIS-CARDLAYOUT`.)*
82. **Section-scoped actions live in that section's header, never grouped into the card
    header.** *(`POLARIS-CARDLAYOUT`, verbatim.)*
83. **A card that grows too tall to scan gains an expand/collapse footer action rather than
    being split into nested cards.** *(`POLARIS-CARDLAYOUT`.)*

### Zero vs null

84. **A legitimate zero renders as `0`.** Zero is a value and is never suppressed, muted
    into invisibility, or replaced with a dash. *(Implied by `GEIST-TABLE` reserving `—`
    for "unknown or not applicable"; supported by `CARBON-AXES` "Always start numerical
    axes at zero for part-to-whole and comparisons charts" — zero is a meaningful
    quantity.)*
85. **A table cell whose value is unknown or not applicable renders an em dash `—`. Never
    `N/A`, never `null`, never an empty string.** *(`GEIST-TABLE`, verbatim.)* —
    automatable.
86. **`undefined`, `null`, `NaN`, `Invalid Date`, and "undefined of undefined" must never
    reach the DOM.** *(`PRIMER-DEGRADED` Don't, verbatim caption.)* — automatable.
87. **An inline count or badge whose source data is unavailable is hidden entirely, not
    rendered as `0`.** If it sits inside an interactive element, a tooltip on focus *and*
    hover explains the absence. *(`PRIMER-DEGRADED`, verbatim.)*
88. **Charts never interpolate across a gap. The gap is drawn as a gap and both its start
    and end are labelled.** *(`CARBON-AXES`, verbatim.)*
89. **Axis tick increments are never adjusted to hide missing data; use the documented axis
    break instead.** *(`CARBON-AXES`, verbatim.)*
90. **Bar and area charts start their numeric axis at zero; line and scatter charts may
    crop.** *(`CARBON-AXES`, verbatim.)*
91. **A totals/summary row leaves non-summable columns blank rather than printing 0, and
    performs no calculations of its own.** *(`POLARIS-DATA`, verbatim.)*
92. **A "genuinely nothing happened" state (0 alerts, 0 flagged items) is written as
    reassurance with no CTA — it is not framed as a setup failure.** *(`CARBON-EMPTY`,
    verbatim.)*

---

## Appendix: the three threshold tables side by side

Keep this visible when picking a loading treatment; the sources genuinely disagree and we
must pick one row per band.

| Wait | Primer (`PRIMER-LOAD`) | Material 3 (`M3-PROGRESS`) | NN/g (`NNG-PROGRESS`, `NNG-LIMITS`) |
|---|---|---|---|
| <0.1s | — | — | "reacting instantaneously… no special feedback is necessary" |
| <200ms | (covered by <1s: none) | "No indicator" | — |
| 200ms–1s | "Don't show a loading state" | "Loading indicator" | ">1.0 second" is the trigger point for an indicator |
| 1–3s | "Use an indeterminate loading state" | "Loading indicator" | Looped animation "reserved for actions that take between 2-10 seconds" |
| 3–5s | "Use a determinate loading state if possible" | "Loading indicator" (up to 5s) | Looped animation |
| 5–10s | "Use a determinate loading state if possible" | "Progress indicator" | Looped animation (percent-done "may be used… if the action involves processing a series of documents or registries") |
| >10s | "determinate… treat[] the process as a background task if possible" | "Progress indicator" | "Percent-done animation: Use for actions that take 10 seconds or more"; "clearly signposted way for the user to interrupt the operation" |

Our adopted bands (intersection, biased toward the stricter source in each row):
**<200ms** nothing · **200ms–3s** indeterminate (skeleton for a known layout, spinner for a
single action) · **3–10s** determinate where progress is knowable, otherwise indeterminate
plus explanatory text · **>10s** determinate, cancellable, non-blocking.
