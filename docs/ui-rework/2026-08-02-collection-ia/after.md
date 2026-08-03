# Collection IA — after, 2026-08-02

Branch `feat/internal-ui-rework-2026-07` (continues PR #53). Verified with the
Playwright harness (Chrome ext offline): light + dark at 1440, mobile at 390,
seeded through the real pipeline (7 manual imports → worker → pending queue).

## Delivered

**Sitemap.** Import is a top-level section between Forms and Responses;
Responses lost its `children` and is a plain link again. Old
`/responses/import` 308s to `/import` (chains from the legacy `/projects/*`
map). `lib/routes.ts` carries `importPath` + five method builders;
`responsesImportPath` is gone.

**Import.** The 56-tile catalog page is deleted. The landing asks one
question — five method rows, one sentence each, auto-import above the
hairline, recent imports as a quiet band at the foot. Each method is its own
page (`/import/{connect,web,spreadsheet,manual,migrate}`), reusing the
existing controllers; the pseudo-dialog that replaced the page body with no
scrim is gone with its host. Thirteen "Manual only" platform tiles became one
optional "Where is this from?" attribution select inside the manual flow. The
web page detects the source from the pasted URL's host and keeps the select
visible for correction; submit stays off until a source is committed, with
the reason beside the field. Connect states each provider's real
availability, with the shared OAuth caveat said once above the list.

**Forms.** List view is the default (a single form no longer floats as one
card in a void); the row's live preview grew to the card's 16:10 at h-20 w-32
(skeleton + widget row moved in lockstep); the grid card gained the same
views · responses · rate strip the row carries.

**Responses.** Queue rows lead with the author's initials avatar, lifecycle
dot on its corner, checkbox swapping in on hover/select. An empty queue is
ONE empty state at full width — the record column only renders when there is
something to select, which also removed the duplicated error surface the
placeholder used to carry.

**Integrations.** No change — the 2026-08-01 picker-dialog restructure
already answered the cognitive-load complaint. Verified by screenshot:
landing leads with connections; the picker states blocked providers in place.

## Sweep of the surfaces last session left unreviewed

Webhooks, API keys, exports, activity, account profile/security/notifications,
settings general/social/domains/security/danger — all screenshot-reviewed at
1440 light. Composition holds everywhere. Noted, not fixed:

- Webhooks shows "New endpoint" in both the header and the empty state
  (integrations hides the header CTA on first run — one-line inconsistency).
- Notifications keeps a bordered inbox card with per-row Open/Mark-read; it
  reads fine but is the one account surface still on a contained card.
- Domains lists two "Collection page · Default" rows — the known hosts
  double-seed backend defect, visible but not a UI bug.

## Deferred

- Senja's customer-profile page (entity rail + proof timeline) is a product
  model beyond the moderation record — recorded in `open-questions.md`.
- Forms row metrics sit right-of-title (ItemRow contract); a table-like
  stat column per the Senja row would be a further step if the user wants it.
