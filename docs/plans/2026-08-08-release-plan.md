# Release Plan — Public Launch 2026-08-31

Date: 2026-08-08. Owner: orchestrator (Claude), business gates: user.
Evidence: six-surveyor release-readiness audit run 2026-08-08 (web_v2 gaps,
public runtime/embeds, api_v2 completeness, production deploy path,
customer-connection loop, engineering debt). Findings verified against code,
not docs. This plan is the canonical launch scope; per-item file evidence
lives in the audit output referenced from `docs/continuity/progress.md`.

## The verdict in one paragraph

The internal dashboard is in unusually good shape: zero TODOs, no stub pages,
every nav entry resolves, `useDataState` almost everywhere. The broken half is
everything that touches the *user's customer*: every share link the product
hands out derives its host from the project slug against hardcoded (and
mutually inconsistent) domains in violation of the API's own
`PublicSurfaceHost` contract; the widget embed script has no host behind it;
embedded forms are CSP-blocked because nothing ever writes
`settings.allowedOrigins`; team-invite emails CTA to a route that does not
exist; onboarding's climax hands every new user a fabricated URL to an
unpublished form; and there is no way to request a testimonial from a customer
at all. The production spine is carefully built but covers only
app + api — hosted forms, walls, and widget embeds all live outside it.

## Launch definition

Public launch = a stranger can sign up at `app.semblia.com`, create a project,
publish a form, send the link/QR/email request to a real customer, receive the
submission, moderate it, publish it to a hosted wall and an embedded widget on
their own site, and be billed — with transactional email live and every URL
the product displays actually resolving. "Be billed" is an executable gate,
not a checkbox: a real checkout completes in the staging rehearsal, the
mirrored Razorpay webhooks reconcile the local subscription state, and the
post-cutover verification includes a billing smoke before launch is declared.

Explicitly **out of scope** for 2026-08-31 (recorded, not forgotten):

- Self-serve custom domains (stays "support can point a domain manually").
- SAML/SSO (the plan-switcher bullet advertising it is removed — WS-F).
- Full customer/CRM entity UI (the entity is *designed* in WS-D so outreach
  does not have to be rebuilt on it; UI is post-launch).
- Inbound connected providers (X/LinkedIn/Google/YouTube/Play) — gated on
  external approvals; tiles stay honestly gated (WS-F fixes the dishonest
  Authorize button). Manual/CSV/migration imports are in scope and work.
- Marketing site / waitlist — not in this repo; flagged as a go-to-market
  dependency the user owns (see User gates).
- `@semblia/react` npm package (snippets removed at launch; package later).

## Workstreams

Severity tags from the audit: [P0] = a paying user or the launch hits it in
week one. Effort S/M/L. Everything not tagged "user/operator" is code I own.

### WS-A — Every link the product shows must work [P0]

1. One canonical host resolver reading API-issued `PublicSurfaceHost` rows
   (`usePublicSurfaceHosts` exists, consumed by exactly one file today).
   Stop *generating* the four hardcoded non-canonical bases in share
   affordances and email: `forms.semblia.com/f` (semblia-urls),
   `semblia.com/wall` (semblia-urls), `<slug>.testimonials.semblia.com`
   (project-utils), and the API thank-you fallback
   (response-detail.service). Serving-side compatibility paths stay per the
   2026-07-14 decisions — bare `forms.semblia.com` with explicit
   `?projectId=` and the apex `/wall/:slug` legacy adapter keep working and
   keep their tests; only the product stops handing them out. Wall canon is
   `<label>.walls.semblia.com` (already locked 2026-07-14 — the
   studio/QR/social-copy strings just never caught up). Effort M.
2. Onboarding: publish the seeded default form in the create transaction and
   source the "You're live" URL from the issued host; honest host-status
   handling instead of a live Open onto a dead page. Effort S.
3. Forms get the share drawer (QR, copy, social) the widgets already have —
   reuse `widget-share-drawer`; the input surface deserves it more than the
   output surface. Effort S.
4. Root route for the collection host (today `/` on a forms host 404s; the
   Domains page "Open" button points there). Effort S.

### WS-B — Embeds must deliver [P0]

1. Widget `embed.js` hosting: serve the built `packages/widgets-embed` bundle
   from the app origin (web_v2 `public/` + build step), and point
   `WIDGET_EMBED_SRC` at it. Rationale: `app.semblia.com` is already in the
   launch rollout — no new DNS, cert, or CDN artifact for launch day;
   `widgets.semblia.com` can become an alias later without changing embeds
   already pasted (the snippet is re-copyable). Kill the dead
   `embed.semblia.com/preview` link and the fabricated `@semblia/react`
   snippets; fix the `"project-slug"` placeholder fallback. Effort M.
2. Form embed CSP: populate `frame-ancestors` from the project's trusted
   origins at publish (the same project-level contract widget embeds already
   use), fix the spec factory that hard-codes a non-empty origin list so the
   regression can actually fail, and say in the share/setup UI that the
   destination domain must be a trusted origin. Effort M.
3. Uploads: align the PRODUCT_FEEDBACK template's PDF promise with the server
   allowlist, reconcile the 200MB-vs-100MB video cap, and add the bucket CORS
   requirement + upload leg to the public-hosting verification. Effort S.
4. Embed failure states: the form iframe currently fails as a silent 480px
   void; give it the error state the widget loader already has. Effort S.

### WS-C — Email must be truthful and complete [P0]

1. Team invites: add the `/invitations/:id` accept surface (the API endpoint
   and web client function already exist, called by nothing), auto-claim
   pending invites on sign-in, and make the members-page copy true. Enforce
   the `teamMembers` plan limit in the same path. Effort M.
2. Send-state honesty: thank-you annotation/toast currently claim success
   before any send is attempted; reflect SUPPRESSED/EXHAUSTED delivery state
   back onto the annotation/UI. Alert on `oldestPendingEmailDelivery` age so
   a stalled outbox is loud. Enforce `EMAIL_DAILY_LIMIT` before send.
   Effort M.
3. Reply-To: per-delivery reply-to (project owner's email) so "reply to reach
   them directly" stops being false. `List-Unsubscribe` + suppression on the
   one email class sent to non-users (Gmail/Yahoo bulk-sender compliance —
   deliverability for ALL Semblia mail rides on this). Effort M.
4. Close the loop: emit the already-declared-but-never-fired
   SUBMISSION_APPROVED owner notification, and send the customer a
   consent-aware "your testimonial is live" email — the highest-ROI email in
   this product category. Effort M.

### WS-D — Request a testimonial (the ask) [P0 product]

The single biggest competitive gap and the user's stated goal ("the tool
itself must be able to build the connection between the user and their
customers"). Every direct competitor leads with "send a request"; Semblia
ships collection and display and leaves the ask to the user's own tooling —
while also (correctly, for PII) blocking contact export.

Launch scope, lean v1:

- Compose a request from a form: paste/enter recipient emails (+ optional
  personal note), branded email with the published form link, sent through
  the existing `EmailDelivery` pipeline (new `FORM_REQUEST` template key).
- Track per-recipient: sent / submitted (match on `authorEmailHash`, which is
  already computed and indexed but read by nothing today). No opens/clicks at
  launch.
- Suppression honored (ties into WS-C3's unsubscribe list).
- Schema: a `FormRequest` + recipient rows designed so a future
  Customer/Contact entity can adopt them (entity designed now, UI later).

Full contact management, sequences, reminders: post-launch.

### WS-E — Production path [P0 mixed: code + operator]

Code (mine):

1. Repair the `20260722010000_inbound_imports` checksum drift — by updating
   the stored checksum on already-migrated databases (or resetting the dev
   database; there is no production data), never by rewriting applied
   migration files or blanket `migrate resolve --applied` — drop the
   `CREATE INDEX CONCURRENTLY` from `20260726000000` (table is empty at
   launch; a blocking build costs nothing), and add a CI job that rehearses
   `prisma migrate deploy` against a scratch Postgres 17. That rehearsal
   passing is a launch gate, so hand-authored SQL can never reach launch
   unrehearsed again. Effort S.
2. web_v2 production env contract: fail the build when `NEXT_PUBLIC_API_URL`
   is missing in production instead of silently shipping `localhost:8100`;
   declare the required Vercel env set in-repo. Require the customer
   `CLERK_SECRET_KEY` in production env validation and reflect it in
   `/health`. Effort S.
3. Release ordering + rollback: deploy API/migrations before promoting web;
   use a durable GHCR credential (or `pull_policy` change) so `rollback.sh`
   works after the workflow token dies; fix the `runtime.env`
   double-use `$`-interpolation hazard. Effort M.
4. forms_runtime into the release path: build + `cdk synth` gate in CI,
   explicit non-mock context enforcement, and the deploy documented as a
   first-class release step. Effort M.
5. One ordered first-deploy runbook replacing the three partial ones — the
   audit's 12-step sequence, written down with the irreversible/slow steps
   (ACM, wildcard verification, DKIM, DNS) front-loaded. Effort S.

Operator/user (cannot be done from this repo — see User gates): DNS, Vercel
project + domains + env, Clerk production instances, Razorpay live keys,
Resend domain + DKIM, AWS account/S3/ACM, the CDK first deploy, and the
final cutover approval.

### WS-F — Honesty batch (cheap, do early) [P1]

Remove/repair every place the product currently lies: SSO & SAML plan bullet
(no SAML exists anywhere); plan prices hard-coded in web vs admin/Razorpay
records (read from API); import "Connect a platform" Authorize button live on
SETUP_REQUIRED providers (gate on availability like Integrations already
does); "Removable on Pro" branding claim with no plan gate (gate it —
`showBranding` is also the organic-acquisition lever); notifications
error-state (`useDataState` like every other surface); bell `href="#"`;
`/loader.js` Phase-8 placeholder served publicly (404 it); `/design`
showcase reachable by customers (guard it); ACCOUNT_DEFAULTS_LOGO
upload purpose accepted with no product behind it (reject at DTO);
help/docs links pointing at three different dead destinations (single
destination, honest until docs exist). Each S effort.

### WS-G — Hardening + QA (the leeway) [P1]

The two real react-hooks bugs (key-detail edit loss, duplicate verification
email); delete the 895-line dead `preview-renderers` folder; verify the SSRF
DNS-rebinding spec actually runs on Linux CI; `py -3.11` documented for
update-indexes; security re-audit of new WS-D surface; full authenticated
browser QA walks (both themes, 390px, all five import methods, full
collect→moderate→publish→embed loop against a staging stack); performance
and a11y passes on public surfaces.

## Timeline (23 days)

| Dates | Focus |
| --- | --- |
| Aug 8 (today) | Audit done. Plan committed. WS-E1 migration repair + WS-F honesty batch started — smallest diffs, immediately de-risking. |
| Aug 9–13 | WS-A links spine + WS-B embeds. These two make the product's existing promises true. PR per workstream, driven to mergeable. |
| Aug 13–15 | WS-C email truthfulness + invites. |
| Aug 15–20 | WS-D request-a-testimonial v1 (schema → API/worker → UI → tests). The one new feature of the release. |
| Aug 19–22 | WS-E production-path code + the single runbook. **User/operator tasks must start by Aug 20** — ACM validation, Vercel wildcard verification, Resend DKIM, and DNS propagation have day-scale lead times. |
| Aug 22–24 | Staging rehearsal: full first-deploy sequence against a scratch environment; migrate-deploy rehearsal green in CI. |
| Aug 24–28 | WS-G hardening + QA + **bug-fix leeway** (nothing new lands after Aug 27 — code freeze). |
| Aug 29–31 | Production cutover (user-approved, per the protected workflow), post-deploy verification with one real project end-to-end, launch. |

Slack in the plan: WS-D is the only L-sized item; if it slips past Aug 20 the
cut line is tracking (ship send-only, add submitted-matching in week one
post-launch) — the composer itself does not slip. Invoking that cut line
amends the WS-D launch scope recorded in `decisions.md` (which notes this
fallback); acceptance at launch is then send + suppression only, with
submitted-matching a committed week-one follow-up.

## User gates (decisions + operator tasks; dated)

Decisions needed (async, none block work starting):

1. **Approve this scope** — especially WS-D in, custom-domains/SAML/CRM-UI
   out. Proceeding under the 2026-08-08 goal directive until countermanded.
2. **EMAIL_ENABLED=true at launch** — the deploy contract currently mandates
   false "until separately approved". Launch is that approval moment; the
   product loop does not function without it. Needs: Resend domain verified,
   `EMAIL_FROM`/`EMAIL_REPLY_TO` chosen. Decide by Aug 20.
3. **Widget embeds served from the app origin at launch** (WS-B1 rationale)
   — objection window until Aug 12, then it ships.
4. **Marketing site / waitlist**: not in this repo. Where does
   `semblia.com` (apex) point on Aug 31, and who builds the landing page?
   The apex also currently hosts the legacy `/wall/:slug` adapter decision.

Operator tasks (I prepare exact instructions in the WS-E runbook; you
execute where accounts/credentials are yours). Start by **Aug 20**:

- AWS: production account, S3 bucket + IAM, us-east-1 ACM cert for
  `forms.semblia.com` + `*.forms.semblia.com`, Secrets Manager entries,
  first `cdk deploy` (I can drive it with you present).
- Vercel: production project, full env set (contract from WS-E2), domains
  `app.` + `walls.` + `*.walls.semblia.com` (wildcard needs the paid plan +
  TXT verification).
- Clerk: production instance(s), authorized parties, webhook to prod API.
  Decision inside this: the admin app has no deploy path but its Clerk keys
  are hard-required — deploy admin, or relax the validator (WS-E2 handles
  the code side either way).
- Razorpay: live keys, plan records created in admin, webhook secret.
- Resend: domain + DKIM/SPF on `send.semblia.com`, daily quota.
- Cloudflare DNS cutover at short TTL, per the runbook, on launch window.
- Merge PRs as they go mergeable (starting with #57, mergeable now).

## Standing risks

- The first production run of anything is happening during launch week by
  definition; the Aug 22–24 staging rehearsal exists to eat that variance.
- Inbound provider approvals (X/LinkedIn/Google) will not arrive by Aug 31;
  the catalog stays honest about it (WS-F).
- CodeScene/CodeRabbit advisory sweeps add ~half a day per PR; the timeline
  prices that in (per-PR gates, not batched at the end).
