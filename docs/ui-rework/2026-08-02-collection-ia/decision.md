# Collection IA — the decision, 2026-08-02

Applies `principles.md` (P1–P10) on top of the standing visual language
(`../2026-07-27-internal-ui/visual-language.md`, V1–V8). Nothing here relaxes
a locked rule; the archetypes gain one entry (Method landing).

## Sitemap

- `/[slug]/import` is a top-level destination, between Forms and Responses in
  the sidebar (P10). Responses loses its `children` — Queue was only ever
  there to justify Import's presence.
- Method flows are **pages, not dialogs** (the Senja model, and it kills our
  page-body-replacing pseudo-dialog, which rendered with no scrim and squeezed
  the catalog behind it):
  - `/[slug]/import` — the method landing
  - `/[slug]/import/connect` — auto-import: connectable platforms + their real states
  - `/[slug]/import/web` — paste a public URL
  - `/[slug]/import/spreadsheet` — CSV / XLS / XLSX
  - `/[slug]/import/manual` — paste text proof, with optional source attribution (P3)
  - `/[slug]/import/migrate` — wall-of-love migrations
- `/[slug]/responses/import` 308-redirects to `/[slug]/import` (permanent,
  same pattern as the `/projects/*` legacy map). `responsesImportPath` dies;
  `importPath` + five method builders replace it in `lib/routes.ts`.

## The import landing (new archetype: Method landing)

Header: title + one-line description carrying the source count ("56 sources"
— P2). Body: **five method rows**, one bordered list container (the
collection archetype's list, not tiles — V1 anatomy: icon slot, method name,
one sentence under it, chevron right). Auto-import first, separated from the
four manual-effort methods by the group hairline (their split *is* the
information). No search, no filter pills, no per-method state (P4, P5).

At the foot: "Recent imports" — the last five jobs as quiet rows (source,
counts, status glyph, time), linking to the queue. History is results, not a
control (P5).

## Method pages

Each is a bounded single-decision surface reusing the existing controllers
(`direct-import-dialog-controller`, `spreadsheet-import-dialog-controller`,
`connected-import-dialog-controller`) — the logic is sound; the container was
the defect.

- **Connect**: the seven CONNECTED_API providers as rows with their real
  availability and the one shared OAuth caveat stated once (P4). Connecting
  hands off to the existing connection flow.
- **Web**: URL field first; the public sources render as a picker the URL
  auto-matches against. Source-specific host hints appear after a source is
  chosen.
- **Spreadsheet**: the existing upload → preview → mapping flow, now with room
  to breathe on a page.
- **Manual**: the existing form. Gains "Where is this from?" — an optional
  source select covering the thirteen manual-only platforms (P3), defaulting
  to plain text proof.
- **Migrate**: the wall-migration sources as a short list, URL field per the
  existing flow.

## Forms list

The card (grid default) gains the row's answers (P6): a stat strip — views ·
responses · response rate — from the metrics already on `V2FormSummaryDTO`.
The **list view becomes the default** (P7): row anatomy per V1 with a larger
live preview (preview well ~w-44), name + status dot + hosted path, meta line
under, stats right-of-center as the row's one sanctioned right-edge item
(V1's "really a table" clause — the stats are the table).

## Responses queue

- Empty queue = one empty state. The record column renders only when the list
  has rows (P9).
- Rows lead with the author's avatar (size-8, initials fallback); the status
  dot rides the avatar's corner instead of floating alone (P8, V2 preserved).

## Integrations

No structural change. The 2026-08-01 picker-dialog restructure already
answered the cognitive-load complaint for this surface; the landing leads
with connections and the four providers state their availability honestly in
the picker. Dispositioned, not forgotten.

## Out of scope

Studios (locked out of scope since 2026-07-31), analytics (rebuilt
2026-08-01, no new complaint), the customer-profile/timeline model from
Senja's detail page (our record pane serves moderation, not CRM — adopting
their entity page is a product decision for the user, noted in
open-questions).
