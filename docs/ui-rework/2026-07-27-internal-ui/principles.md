# Internal UI rework — principles

Date: 2026-07-27. Branch `feat/internal-ui-rework-2026-07`.

Scope: the **inside** of every dashboard page. The app shell/navigation was
rebuilt on 2026-07-26 (`docs/ui-rework/2026-07-26-app-shell/`) and is out of
scope. This pass is explicitly **not a reskin** — the tokens stay, the
structure changes.

## The directive, restated

> "not simply a reskin, but clean restructuring, cleaner layouts, consistent
> designs, avoid bad patterns like cards on cards, unhandled empty states, bad
> lists … every single screen should be meaningful, thought out, structured, and
> all data populations attended to … Decide on one canonical design system,
> moving away from the stock ShadCN reskin that we have right now, keeping only
> the accessibility that it provides."

Two things are therefore in scope that are not visual at all: the **moderation
surface**, which does not exist in the UI despite a complete backend; and the
**inbound Import Center**, whose UI shipped in PR #52 and is judged bad.

## What is locked and not being re-litigated

Per `.claude/rules/task-approach.md`, decisions in `docs/continuity/decisions.md`
are not reopened without the user. So this pass keeps:

- **The typeface and palette.** Inter + warm-linen/amber-sand "Quiet Precision ·
  Measured Ink" was locked 2026-07-11 (PR #42). The directive asks for
  restructuring and explicitly not a reskin, so the canonical system is a
  structural layer *over* these tokens. (Flagged for the user: the design skill's
  default advice would swap Inter for a less common face. That would be a reskin
  and a re-litigation, so it is deliberately not done here.)
- **Full-bleed layout.** No centered `max-w-*` page rail (2026-06-13).
- **The Measured Ink signature kit** — dot-paper only where artifacts sit,
  dot-matrix waiting, amber focus, ink-press physics, rise-not-zoom, sliding
  amber underline, one motion vocabulary.
- **ShadCN's behaviour layer.** Radix primitives, focus management, ARIA wiring,
  and keyboard semantics in `components/ui` are kept as-is. What gets replaced is
  the *composition* layer above them — the hand-rolled containers and page
  scaffolding that make surfaces read as a demo.

## Principles

### P1 — One surface law; nesting is a bug, not a style choice

The token set already has three levels — `--background`, `--surface`, `--card`.
That is the entire vocabulary and it is not extensible by call sites. There are
currently **152 hand-rolled `rounded-* + border` surfaces**; every one is a place
where a page invented its own container. A bounded region may contain **exactly
one** level of visible container. Grouping *inside* an already-bounded region is
expressed with dividers, section headers, insets, or a background-tint change —
never another border+radius. `SettingsSection` is itself a card, so a bordered
child inside it is by definition the cards-on-cards defect.

### P2 — Data state is a primitive's job, never a page's

The four surfaces users live in (Responses, Forms, Widgets, Analytics) have zero
query-error handling and all render "you have nothing yet" when the API fails.
That is not four bugs; it is the predictable outcome of letting every page
hand-write its own `loading ? … : empty ? …` ladder. One primitive owns the state
matrix, consumes the query result, and makes "empty state while `isError`"
**unrepresentable**. Every state below is a named, designed surface:

initial-loading · first-run-empty · filtered-empty · error · partial/degraded ·
background-refreshing · not-found · permission-denied · loading-more ·
pagination-exhausted

### P3 — Every value on screen is accounted for, including its absence

A field is not "rendered"; it is rendered *for every value it can hold*. A
legitimate `0` must not look like unknown. A rating renders with its scale or not
at all — `4` alone is a lie when the scale is 10. A response with no text body is
a video or audio testimonial, not an em-dash. A null author is "Anonymous", not
blank. A paginated list either shows a pagination affordance or proves the API
returned everything. Truncated content always has a way to read the whole thing.

### P4 — Never offer an action the API will refuse

If a control cannot succeed, it is disabled with the reason stated *before* the
click, not after. The live example: publishing is hard-gated on per-field consent
(`responses.service.ts:937-957`), yet the inbox shows "Feature" on every approved
response, so the user gets *"Couldn't update. Try again."* for something that can
never succeed. Error copy never tells a user to retry a permanent failure.

### P5 — A list earns its anatomy; a table earns its columns

One row anatomy per entity type, applied identically everywhere that entity
appears. If values need to be compared down a column, it is a real table with
shared column widths, right-aligned numerics, and `tabular-nums` — not flex rows
that merely look tabular. Volume dictates affordances: past roughly one screen a
list owes the user search, sort, and pagination; where the job is repetitive
triage it owes bulk selection.

### P6 — Screens tell the truth about the system

Availability, provider state, and readiness are shown honestly. A provider that
cannot be used because its OAuth app is not configured says so, in plain
language, instead of appearing as an inviting logo. Raw enum values
(`PENDING_VERIFICATION`, `SUBMISSION_MODERATED`) never reach a user's eyes. A
machine judgement is presented as advisory, and it is always visible that the
human decision overrides it.

### P7 — Restraint over decoration; no defaults left standing

Inherited from `.impeccable.md` and enforced here: nothing is wrapped in a card
merely because it is content. No repeated identical card grids. No hero-metric
template. No sparkline that conveys nothing. No modal doing a page's job. Not
every button is primary. Already verified clean and must stay clean: no
side-stripe borders, no gradient text.

### P8 — Reuse, extend, never fork

Per `.impeccable.md` #6 and `feedback_commits_and_reuse`: compose the shared
primitives. If a primitive falls short, extend the primitive. The forks this pass
must delete rather than tolerate: `analytics/card-empty.tsx` duplicating
`shared/empty-state.tsx`, the near-identical keys/agents subtrees, and the
duplicated list machinery between `form-list.tsx` and `widget-list.tsx`.

## How each screen is judged done

1. Composes shared primitives; hand-rolls no page chrome and no container.
2. One container level; no nested bordered surfaces.
3. Every applicable data state is a designed surface, error included.
4. Every field handled for zero, null, absent, overflowing, and maximal values.
5. No action offered that the contract will refuse.
6. Reads as the same product as its neighbours.
