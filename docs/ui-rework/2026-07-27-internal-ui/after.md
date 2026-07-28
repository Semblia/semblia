# After — internal UI restructure

Date: 2026-07-28/29. Branch `feat/internal-ui-rework-2026-07`.

## What happened, honestly

The pass ran in two halves, and the first half was wrong.

**First half — systems.** Built the primitive layer (`DataState`, `DataList`,
`DataTable`, `Section`, `StatusBadge`, `MetricValue`, `DetailSheet`,
`useListSelection`), the moderation surface, and one API contract fix. Then
briefed eight agents with `decision.md` — a *rule set* — and swept every
remaining surface with it.

**The user stopped the session mid-run.** Verdict: "the UI is extremely poorly
structured … visual hierarchy is broken all over … alignment, and layouts?
That's the last thing I expected you of all agents to fail on."

Every specific was correct. On the rebuilt Responses queue: content clustered
left with a badge pinned 400px right and a void between; approve and reject as
identical ghost buttons; a raw `<input type="checkbox">` in the app's most
repeated interaction; the record panel floating over the page's own header.
Across the app: 56 import sources as 56 rows at ~100px each with one sentence
repeated eleven times.

**Root cause.** "Restructuring" was treated as state correctness. Verification
was accessibility trees, console errors, and tests — never *looking at a
rendered screen and asking whether the composition was good*. And the visual
research the user asked for was skipped: a prior session's scraped
design-system *documentation* was treated as equivalent to studying products.
Rules produce correct and characterless; eight agents given only rules produced
it eight times.

**Second half — design.** Stopped the sweep, checkpointed its structural work
(`7084ba25`), drove a browser over GitHub issues, Plausible, Linear, and Geist,
and wrote `visual-language.md` from what they actually do. Then rebuilt against
it, screenshotting and critiquing every surface.

## Rules that came out of looking

Recorded in full in `visual-language.md`. The one that mattered most:
**metadata goes under the title, never opposite it.** GitHub's issue row has an
empty right edge; that single arrangement is what removes the void.

## Delivered

**Product**

- **No project dashboard.** `/[project]` redirects to the queue. A landing page
  whose content is links onward is navigation rendered twice.
- **Moderation exists in the UI.** The submission-moderation pipeline had run
  since Phase 6 with nothing showing its results.

**Responses — the flagship**

- Real two-column split, both columns in flow: 380px list + record. The record
  was a fixed overlay covering the page header.
- Row: status glyph in a fixed left slot, metadata under the title, hover- and
  focus-revealed approve/reject overlaying the timestamp so rows never grow or
  reflow. 145px → ~98px.
- Approve carries the raised fill; reject is quiet. `A`/`R` rule and advance
  before the mutation settles.
- Radix `Checkbox`, replacing the native input.
- The record reads as a testimonial being judged: rating, quote at reading
  size, attribution set the way it will appear once featured, then only what
  bears on the decision. Consent matrix and provenance behind disclosures.

**Directories** — Import Center and Integrations converged on one tile grid.
Import went from ~5,600px of rows to four rows per group. Repeated policy text
hoisted to the group that owns it.

**Numbers that were lying** — "Approval rate 133.3%" (independent window
aggregates); a trend chart drawing a flat line on zero and calling it data; a
funnel splicing an em dash into the middle of a sentence.

**Never offer an action the API will refuse** — `V2ResponseDTO` gains
`publishable` + `publishBlockedReason` (not client-derivable: the DTO nulls out
the very fields whose consent is missing). A 403 on a project renders a denial
surface with no retry instead of the generic "Try again" route error.

**Form measure** — settings and account bodies bounded at `max-w-5xl`,
left-aligned. Set at the page, not the section, so a page never has two right
edges. Not the centred rail retired on 2026-06-13.

**Also** — grids capped at three columns for rich entities; page-level empties
centred; widget previews centred in their frame; the "Other" project-type label
dropped; `SessionsList`'s stray `useQuery` moved behind a hook.

## Verification

`tsc` clean · `eslint` clean (2 pre-existing warnings) · 332 tests green ·
`pnpm build --filter web_v2` green. Browser-verified at 1440 and 390, light and
dark: the queue and its split, the collapsed mobile record, the forbidden
surface, the import directory, integrations, analytics, members, billing,
widgets, projects home.

## Not done

Named plainly rather than left to be discovered:

- **Developers** — webhooks, exports, activity, and the key/agent detail pages
  carry the structural sweep but have not been visually reviewed.
- **Account** — profile, security, and notifications, same.
- **Settings** — general, branding, social, security, domains, danger: measure
  applied, contents not individually reviewed.
- **Forms list** — the card is still thin for the preview it carries.
- **Studios** — out of scope for this pass and untouched.
- The structural sweep's own output (`7084ba25`) has not been re-read
  line-by-line against `visual-language.md`.
