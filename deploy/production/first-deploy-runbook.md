# First production deploy — the one ordered runbook

This is the single ordered sequence for taking Semblia to production for the
2026-08-31 launch. It replaces the ordering role of the three partial
runbooks, which stay as reference annexes for their own detail:

- [`README.md`](README.md) — the app/API spine mechanics (host setup,
  deploy.sh, backup, rollback, secrets table).
- [`public-surface-hosting.md`](public-surface-hosting.md) — forms/widgets/
  walls activation detail and its four written approval gates. Its step-9
  "switch generated client URLs last" is **superseded**: WS-A already
  switched every client to API-issued hosts, so product-emitted forms/walls
  URLs dead-end until DNS is live — which is why certificates and DNS are
  front-loaded here.
- [`../../apps/forms/deploy/README.md`](../../apps/forms/deploy/README.md) —
  forms CDK synth/deploy shape and the CloudFront policy contract
  (`cloudfront-notes.md`).

The older `docs/superpowers/plans/2026-07-14-project-subdomain-hosting-activation.md`
remains evidence only: its `--filter api_v2` / `apps/forms_runtime` /
`apps/web_v2` paths are pre-rename (read `api` / `apps/forms` / `apps/app`),
and its "keep the apex `/wall/:slug` canonical" step is superseded by the
2026-08-09 subdomain-only doctrine (the adapter is deleted).

Two naming rules that look wrong but are deliberate (decisions.md,
2026-08-09): the `API_V2_*` and `FORMS_RUNTIME_*` env vars, the
`VERCEL_WEB_V2_PROJECT_ID` secret, CDK construct ids, and the
`semblia-api-v2` JWT audience were **not** renamed by WS-H — use them
verbatim. Do not "correct" them.

## Who does what

Every AWS/Vercel/Clerk/Razorpay/Resend/Cloudflare/npm mutation below is
**operator-owned** (the accounts are yours); the orchestrator prepares exact
commands and can drive them with you present. Every step marked **[GATE]**
needs your explicit written approval before it runs — approvals are per-gate,
never blanket (open-questions.md, production activation row).

## Host census (what must exist at launch)

| Host | Serves | Platform |
| --- | --- | --- |
| `semblia.com` (apex) | marketing site | Vercel project for `apps/marketing` — **does not exist yet (WS-I)**; provision the domain/cert now, deploy when WS-I lands |
| `app.semblia.com` | dashboard | Vercel (`apps/app`, project id in `VERCEL_WEB_V2_PROJECT_ID`) |
| `api.semblia.com` | API + worker | Docker host, reverse proxy → `127.0.0.1:8100` |
| `forms.semblia.com` + `*.forms.semblia.com` | hosted/embedded forms | CloudFront + Lambda (`apps/forms` CDK stack) |
| `walls.semblia.com` + `*.walls.semblia.com` | walls | served by `apps/app` on Vercel via host routing; domains assigned to the app project |
| `widgets.semblia.com` | `GET /embed.js` only | CloudFront + S3 (`packages/widgets-embed` CDK stack) |
| `docs.semblia.com` | docs site | Vercel project for `apps/docs` — **does not exist yet (WS-K)**; `EXTERNAL_DOCS_URL` already links to it |
| `send.semblia.com` | email only | Resend DKIM/MAIL-FROM DNS records, no web serving |
| `admin.semblia.com` | admin app | **[GATE] undecided** — deploy `apps/admin`, or leave undeployed; either way the API's `ADMIN_CLERK_*` production env stays required, so the admin Clerk application must exist |

Not a host, but DNS-adjacent: the uploads S3 bucket needs CORS allowing
browser `PUT` from `https://forms.semblia.com` and
`https://*.forms.semblia.com`, or every hosted-form file upload fails
client-side while all server checks stay green.

## The ordered sequence

Steps 1–2 are the slow/irreversible ones (day-scale lead times: ACM
validation, Vercel wildcard TXT verification, Resend DKIM, DNS propagation).
Start them first; everything else proceeds while they bake. The operator
batch was due to start **Aug 20** — it is already the critical path.

### 1. GitHub production environment

Protected `production` environment, required reviewer, no self-approval;
populate the secrets table in [`README.md`](README.md#github-production-environment)
(Vercel trio, SSH quartet, `WIDGETS_*` — the widgets values arrive in step 4).

### 2. Provider provisioning — start everything in parallel [operator]

- **AWS**: production account; uploads S3 bucket + least-privilege IAM;
  Secrets Manager entry for the forms signing secret (32+ chars — the ARN is
  what CDK receives, never the value); **ACM certs in us-east-1**:
  one with SANs exactly `forms.semblia.com` + `*.forms.semblia.com`, one
  single-SAN `widgets.semblia.com`. Add the ACM validation CNAMEs in
  Cloudflare as **DNS-only**.
- **Vercel**: production project for `apps/app` (its id →
  `VERCEL_WEB_V2_PROJECT_ID`); full env set from
  [`apps/app/.env.example`](../../apps/app/.env.example) — the production
  build **fails** if `NEXT_PUBLIC_API_URL` is missing or malformed (the
  release workflow pins `VERCEL_ENV=production` itself; also turn on the
  project's "Enable access to System Environment Variables" toggle so any
  build made on Vercel's own infrastructure gets the same guard); domains
  `app.semblia.com`, `walls.semblia.com`, `*.walls.semblia.com` (wildcard
  needs the paid plan + TXT verification). For apex + `docs.`: create their
  Vercel projects and add/verify the domains **now** (verification and cert
  issuance are the slow half); actually deploying to them waits for
  WS-I/WS-K to land.
- **Clerk**: production instance for customers (authorized parties
  `https://app.semblia.com`, webhook → prod API) and the separate
  `semblia-admin` application (its keys are hard-required by the API env
  validator regardless of the admin-deploy decision).
- **Razorpay**: live keys, webhook secret; plan records are created in the
  admin app (source of pricing truth) — **[GATE]** decide the
  admin.semblia.com row first.
- **Resend**: verify the domain on `send.semblia.com` — DKIM/SPF records
  were configured 2026-06-13 (decisions.md), so **verify, don't re-create**;
  Zoho's admin panel can lag DNS and is not evidence of a Resend failure.
  Choose `EMAIL_FROM`/`EMAIL_REPLY_TO` (the template's
  `Semblia <notifications@semblia.com>` is an example, not a decision) and
  set the daily quota.
- **npm**: `@semblia` org + granular publish tokens (WS-J launch gates
  `@semblia/react` + `@semblia/node`).

### 3. API host setup [operator]

Per [`README.md`](README.md#first-host-setup): `/opt/semblia`, populate
`runtime.env` from the template (mind the `$`-quoting rule — the preflight
rejects ambiguous values), run the preflight validator to
`Production environment valid`. Customer `CLERK_SECRET_KEY` is now
production-required; `/health` reports `dependencies.clerkConfigured`.

### 4. CDK first deploys [GATE — public-surface-hosting.md gates 1–2]

Build first (`pnpm --filter forms build` / widgets build), then synth in
**api mode** with the real ARNs, inspect the synth against
`cloudfront-notes.md` (aliases exact+wildcard, viewer-host function,
GET/HEAD-only caching, no raw secret text), then `cdk deploy`:

- `apps/forms` forms-runtime stack (`formsRuntimeMode=api` — the mode is now
  a **required** context; a bare deploy fails instead of silently shipping
  mock).
- `packages/widgets-embed` CDN stack; its outputs feed the
  `WIDGETS_EMBED_BUCKET` / `WIDGETS_CDN_DISTRIBUTION_ID` secrets in step 1.

Then set the uploads-bucket CORS policy (forms exact+wildcard origins).

### 5. Public-hosting backfill [GATE]

`pnpm --filter api run public-hosting:backfill` — dry-run twice, review,
approved apply, then a `changed=0` re-run as proof.

### 6. Database contract migration [GATE — separate artifact]

The `project_subdomain_hosting_contract` migration is deliberately **not in
the tree**; it ships as its own reviewed artifact (SQL spec in the
superpowers activation plan, Task 2) only after the backfill reports zero
blocking conflicts. Until it lands, host invariants are app-enforced, not
DB-enforced — do not imply otherwise.

### 7. DNS cutover at short TTL [GATE — operator]

> Steps 7–9 execute **twice**: first against the scratch environment as the
> staging rehearsal (step 10), and only after that rehearsal passes, against
> production (step 11). Never run them against production first.

DNS binds **immediately before** the first workflow dispatch (step 8), never
after: the workflow's final `verify-public` job probes
`https://app.semblia.com` and `https://api.semblia.com`, so those names must
resolve to the new infrastructure before the dispatch or the run fails right
after the domains were promoted. All records **DNS-only** (no Cloudflare
proxy/orange cloud), short TTL; confirm each resolves from an independent
resolver before dispatching:

- `app.semblia.com` → Vercel; `walls.` + `*.walls.` → Vercel (app project)
- `api.semblia.com` → the API host's reverse proxy (502 until step 8 deploys
  the API is expected)
- `forms.` + `*.forms.` → the forms CloudFront domain
- `widgets.` → the widgets CloudFront domain
- apex + `docs.` → their Vercel projects (when WS-I/WS-K land)

### 8. Dispatch the protected release workflow [GATE]

`production-release.yml` (type `DEPLOY_PRODUCTION`). Ordering inside the
workflow: after `verify`, the API image publish, widgets publish, and the
**staged** web build (`--skip-domain`) run **in parallel**; the
API/migrations/worker host deploy waits only on the image; **promotion** of
the production domains waits on both the staged build and the host deploy,
then the public verifier runs. Watching the Actions run, the staged web
build and the host deploy overlapping is normal — nothing serves the
production domains until `promote-web`. The **in-tree** migration chain
rehearses against a scratch Postgres 17 in CI on every PR; the separate
contract-migration artifact (step 6) is NOT covered by that rehearsal and
must be rehearsed explicitly against the staging database before any
production dispatch that includes it.

### 9. Verification battery

- `scripts/production/spine.mjs` (app + api /health; also asserts
  `clerkConfigured` is what boot validation guaranteed).
- `scripts/verify-public-hosting.ps1` — the two-tenant forms/walls isolation
  matrix.
- `curl -sI https://widgets.semblia.com/embed.js` — 200,
  `application/javascript`.
- Headed-browser walk: one synthetic hosted-form submission **with a file
  attachment** (the only end-to-end proof of the uploads CORS leg), then the
  full collect → moderate → publish → embed loop.
- Provider dashboards: Resend event log, Razorpay webhook deliveries, Clerk
  webhook deliveries.

### 10. Staging rehearsal (Aug 22–24) [GATE] — before any production run

Run this sequence against **scratch equivalents of every named target** —
never the production ones. Concretely: the rehearsal must NOT bind
`app.semblia.com`/`api.semblia.com` (or any production hostname) in step 7,
and must NOT dispatch the `DEPLOY_PRODUCTION`-confirmed workflow in step 8 —
that workflow is deliberately production-only (hard-coded hostnames,
protected environment). Instead the rehearsal substitutes: scratch DNS names
(or a temporary subdomain set), a scratch Vercel project, a scratch host,
and the workflow's steps executed as their equivalent manual commands
(`vercel build/deploy --skip-domain/promote`, `deploy.sh`) against those
targets. The exact scratch topology (separate provider accounts vs the
production accounts pre-cutover, which hostnames) is an **open operator
decision** — recorded in `docs/continuity/open-questions.md`; resolve it
before Aug 22.

Rehearse **with `EMAIL_ENABLED=true`** (requires `EMAIL_UNSUBSCRIBE_SECRET`
+ `API_PUBLIC_URL` set — a non-prod deploy without them sends
project-voiced mail with no unsubscribe header). The rehearsal exists to eat
the first-run variance; a step that surprises you here gets fixed here.

### 11. Production cutover (Aug 29–31) [GATE — per-step approvals]

Repeat 7–9 against production with the user approving each gate. The launch
definition includes the billing smoke: one real checkout with mirrored
Razorpay webhooks reconciling, and one real project driven end to end.

### 12. Close out

Raise DNS TTLs; record the deployed SHA (it is the rollback target);
confirm rollback works by design review (image is in the host cache; the web
rollback is `vercel promote <previous-url>` with `VERCEL_ORG_ID` +
`VERCEL_PROJECT_ID` set — exact form in
[`README.md`](README.md#application-rollback)); update
`docs/continuity/progress.md`.
