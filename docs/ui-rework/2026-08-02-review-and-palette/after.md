# After — verified state

All checks rendered in the real app via the Playwright harness
(system Chrome, Clerk test login, project `agency-portfolio`).

- **Dark palette**: `/responses`, `/account/billing`, detail page shot in
  dark at 1440 — surfaces read neutral charcoal; computed tokens confirmed
  cool-neutral (lab b-component negative). Light mode unchanged.
- **Billing**: Usage band and Plans grid aligned to the fieldset gutter;
  "View plans" no longer clipped; Payment methods / Invoice history empty
  states no longer float in a void. Light + dark.
- **Responses list**: full-width rows (avatar + lifecycle dot, name, 2-line
  excerpt at a readable measure, meta line, timestamp right). Toolbar:
  pills + source select + sort select + search; form select absent with a
  single form (by design). URL state drives the API: verified
  `?source=import&sort=rating_asc` returns imports only, 4/5 before 5/5,
  and the selects reflect the URL.
- **Responses detail**: click-through from a row lands on
  `/[slug]/responses/[id]`; header = back link · author · status badge · age ·
  overflow-delete. Left rail: identity, consent verdict + matrix,
  provenance (source/received/trust), automated check ("Advisory only",
  no lecture). Right: stars + quote (+ per-question answers when present;
  a `role:"rating"` answer is suppressed when the star row already shows
  it). Decision bar: Approve filled, Reject quiet, A/R/Esc wired. Mobile
  390px: quote + decision first, person after, one page scroll.
- **Tests**: web_v2 responses suite retargeted to the detail pieces
  (AuthorRail / Testimonial / DecisionBar) — 50 pass; api_v2 gains a
  formId/origin narrowing regression test — 24 pass in the module.

## Second iteration — Senja reference applied properly

The user rejected the first detail page against Senja's customer view.
What their screen does better, and what changed in response (verified by
re-rendered light/dark/mobile screenshots, then adversarially critiqued by
a three-lens agent panel — reference fidelity, canon compliance, visual QA
— whose confirmed findings were also applied):

- **The person is the hero.** Rail leads with a size-13 avatar + name
  (the page's h1) + role; the header drops the duplicate name and keeps
  back · status · age · overflow.
- **The conversation is visible.** Each answer renders as a tinted panel
  (one container level, per canon — not a bordered card) headed by the
  question that was asked; imports say "In their words" instead of the
  synthetic "Imported proof" label; the Primary chip appears only when
  other answers exist.
- **Consent is one sentence** — "You can use this testimonial publicly."
  (or the blocked reason) on a success/warning tint, with the
  Granted/Withheld matrix behind "Consent, in full".
- **The verdict is the last line of the evidence.** The decision bar
  docks under the consent note inside the reading column (same grid),
  killing the ~500px void the pinned bar left on short records and the
  clipped keyboard hint. Approved records gain "Copy text".
- **The rail uses `DefinitionList`** (the Record-surface primitive)
  instead of a local FactRow fork; the Trust row is omitted for imports
  (Source already says it).

Deliberately skipped from the critique: submitter email in the rail (PII
stays out of the display-safe DTO by design) and Senja's editable
customer-entity prompts (recorded product question in
`docs/continuity/open-questions.md`); 44px touch targets (the app-wide
control scale is the canon's density choice).

Non-blocking notes

- The forms/source/sort selects use the bordered `size="sm"` Select —
  consistent with SearchField's weight in the toolbar row.
- Seeded review data (7 manual imports) left in place from the previous
  session for the user's own visual pass.
