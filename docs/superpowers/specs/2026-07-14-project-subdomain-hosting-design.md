# Project-Subdomain Public Hosting Design

**Date:** 2026-07-14

**Status:** Approved in conversational design review; awaiting review of this
written specification

## Decision Summary

Semblia will give every project two immutable, provider-hosted identities:

- forms and iframe embeds: `<project-host>.forms.semblia.com`;
- hosted walls: `<project-host>.walls.semblia.com`.

The initial `<project-host>` label is derived from the project's slug when the
project is created. Renaming the project or changing its dashboard slug does not
change either free hosted address. A future verified custom domain can become
canonical, but the original Semblia-hosted address remains a stable fallback.

Canonical public routes are:

- hosted form: `https://acme.forms.semblia.com/f/contact-us`;
- iframe form: `https://acme.forms.semblia.com/embed/contact-us`;
- primary wall: `https://acme.walls.semblia.com/`;
- additional wall: `https://acme.walls.semblia.com/w/customer-love`.

One wildcard DNS record, certificate, and deployment per surface serves every
project. Project creation never creates DNS records or certificates.

## Context

The repository currently contains conflicting contracts:

- continuity decisions describe shared hosted form paths at
  `forms.semblia.com/f/:slug` and walls at `semblia.com/wall/:slug`;
- project creation already seeds `${slug}.forms.semblia.com` and
  `${slug}.walls.semblia.com` `PublicSurfaceHost` rows;
- the forms CDK stack already expects `*.forms.semblia.com`;
- form slugs are unique only within a project, so `/f/:slug` on one shared host
  is not an authoritative tenant key;
- `forms_runtime` still has a temporary `projectId` query/default bridge;
- the runtime signs with one deployment secret while the API currently verifies
  the same header against per-project signing secrets;
- project slugs are mutable, but seeded host rows do not follow updates;
- the wall page advertises itself as indexable while the application-level
  `robots.txt` disallows crawling everywhere.

This design makes the existing host registry authoritative, removes ambiguous
tenant resolution, and keeps the free-hosting model operationally inexpensive.

## Goals

- Give projects polished, stable free hosted URLs without per-project DNS or
  certificate operations.
- Resolve tenant identity from an active database host record, never from a
  client-supplied project identifier.
- Keep forms and walls on their existing separate AWS and Vercel runtimes.
- Preserve existing links during a controlled transition where they can be
  resolved unambiguously.
- Make hosted forms non-indexable and make eligible public walls crawlable with
  correct canonical metadata.
- Close API/database gaps around host uniqueness, defaults, deletion, runtime
  trust, and primary-wall selection.
- Leave a clean extension point for verified custom domains.

## Non-Goals

- Purchasing or operating a separate registrable user-content domain.
- Self-service custom-domain verification, certificate issuance, teardown, or
  client-side upgrade/upsell UI.
- Deploying CloudFormation or Vercel changes, mutating production DNS, or
  applying a live data backfill as part of this code change.
- Unifying forms and walls behind one edge runtime.
- Allowing arbitrary customer JavaScript on hosted surfaces.
- Changing the forms renderer, widget renderer, moderation model, or response
  lifecycle except where host-bound serving requires it.

## Research Findings

### Options considered

| Model                                       | Result                | Reason                                                                                                                                                                                         |
| ------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-project split hosts                     | Selected              | Fits the existing AWS forms runtime, Vercel wall runtime, host seeds, and project-scoped form slugs. It gives the clearest free-plan identity with one wildcard per surface.                   |
| One project host such as `acme.semblia.com` | Deferred              | Attractive visually, but requires a central edge router, a global reserved-subdomain namespace, and dispatch across two deployments. It also combines forms and walls on one origin.           |
| Shared service paths                        | Rejected as canonical | Slightly simpler DNS, but less polished and unable to use `/f/:slug` safely without also carrying project identity. Search engines cannot assign a distinct site name at a subdirectory level. |
| Separate user-content domain                | Rejected for now      | Provides the strongest cookie and reputation boundary, but requires another domain and an additional routing decision that the project is not budgeting for now.                               |

### Cost and operational impact

- CloudFront supports wildcard alternate domain names; the certificate must
  cover both `forms.semblia.com` and `*.forms.semblia.com`. An ACM public
  certificate used by an integrated AWS service does not add a per-project
  certificate charge. Traffic, Lambda duration, API traffic, and logs remain
  usage-based costs.
- Vercel supports wildcard domains and automated certificate management. One
  wildcard assignment serves all wall projects; project count does not create a
  per-host DNS workflow.
- Cloudflare wildcard DNS is sufficient, but Universal SSL does not cover this
  nested wildcard shape on the base zone. The records therefore remain
  DNS-only and TLS terminates at CloudFront and Vercel. This avoids adding
  Cloudflare's paid nested-certificate product.
- The shared-path and wildcard-host models have essentially the same runtime
  cost. The material cost drivers are requests, rendering, API/database work,
  uploads, moderation, and logs—not the number of project labels.

Primary references:

- [CloudFront alternate domain names](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
- [AWS Certificate Manager pricing](https://aws.amazon.com/certificate-manager/pricing/)
- [Cloudflare wildcard DNS](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/)
- [Cloudflare Universal SSL limitations](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/)
- [Vercel wildcard-domain guidance](https://vercel.com/docs/platforms/multi-tenant-platforms/limits)
- [Vercel wildcard setup without Vercel nameservers](https://vercel.com/kb/guide/wildcard-domain-without-vercel-nameservers)

### Identifier precedent

Clerk deliberately separates mutable human identifiers from stable provider
infrastructure. Organization slugs are mutable, but Clerk does not allow the
provider-issued development-instance domain to be changed. Production custom
domain changes are explicit migrations that can require DNS, certificates, new
keys, and downtime. Semblia follows the stable provider-host precedent: project
names and dashboard slugs may change, while the free public hostname remains
fixed.

References:

- [Clerk organization slug update](https://clerk.com/docs/reference/backend/organization/update-organization)
- [Clerk production-domain migration](https://clerk.com/docs/guides/development/deployment/changing-domains)

### SEO and UX

- Google supports site names at the domain or subdomain level, not at a
  subdirectory level. A project wall subdomain can therefore present a distinct
  project identity that a shared `semblia.com/wall/...` path cannot.
- The deep subdomain is a free-plan compromise, not a replacement for the
  customer's own domain. Client UX may encourage custom domains later.
- Forms are transactional collection pages, not search landing pages. They
  receive both an HTML robots directive and `X-Robots-Tag: noindex, nofollow`.
- Walls are indexable only when the project is active and public, the wall is
  active and published, and at least one rendered response is public. Other
  wall states emit `noindex`.
- Every indexable wall uses a self-canonical URL on its default host. A future
  verified custom domain can become the default; the Semblia host then becomes
  an alias.
- Search Console's domain-property model can aggregate Semblia's subdomains for
  platform operations, while individual custom domains remain customer-owned.

References:

- [Google site-name guidance](https://developers.google.com/search/docs/appearance/site-names)
- [Google robots and noindex guidance](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google review-snippet guidance](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)

## Public URL Contract

### Forms

- `GET /f/:formSlug` renders a published hosted form.
- `GET /embed/:formSlug` renders the iframe delivery surface.
- Runtime action routes remain internal implementation details beneath the same
  project hostname.
- Form slugs remain unique within a project; the hostname supplies the project
  namespace.
- `forms.semblia.com` serves shared loaders/assets and a service-level response.
  It is never a default tenant.

### Walls

- `/` renders the project's primary wall.
- `/w/:wallSlug` renders another active wall only when it belongs to the
  hostname's project.
- `walls.semblia.com` is a service-level host and never selects a tenant.

### Legacy URLs

- A legacy shared form URL that carries enough unambiguous project context may
  redirect to the project host. A bare `forms.semblia.com/f/:slug` cannot be
  redirected solely by slug because form slugs are project-scoped; it returns a
  safe not-found/service response rather than guessing.
- `semblia.com/wall/:wallSlug` can continue resolving because wall slugs are
  globally unique. It points search engines to, or redirects safe page requests
  toward, the project-hosted canonical URL after wildcard activation.
- Existing shared asset URLs remain valid.

## Identity Lifecycle

Semblia exposes four different identities and does not conflate them:

1. `Project.id` is the immutable internal identity.
2. `Project.name` is freely mutable display text.
3. `Project.slug` is the mutable dashboard/API route slug.
4. `PublicSurfaceHost.hostname` is the immutable free hosted identity.

At project creation, the initial project slug is validated as a DNS label and
used to create both free hosts in the same transaction. A later project-slug
change does not edit those hosts. The API returns the hosted URLs explicitly so
clients never reconstruct them from the current project slug.

Free hosted names are not reusable. Deleting a project disables and retires its
host records instead of deleting them. This prevents published links from later
pointing at an unrelated tenant. A future explicit hosted-address migration can
be designed if demand justifies aliases; it is not part of this release.

## Database Design

### `PublicSurfaceHost`

The existing table remains the canonical registry. The implementation will:

- normalize stored hostnames to lowercase without a port or trailing dot;
- retain the global unique hostname constraint;
- make `projectId` nullable with `onDelete: SetNull` so retired names survive
  project deletion;
- add `retiredAt` and require retired rows to be `DISABLED` and non-default;
- require every active row to have a live project and a valid resource;
- standardize project-level rows as `resourceType = PROJECT` and
  `resourceId = project.id`;
- enforce at most one active default per project, feature, resource type, and
  resource ID with a partial unique index;
- enforce that a default is active and verified;
- retain `PENDING_VERIFICATION` for future custom domains.

`isDefault` means canonical for its feature/resource; it does not mean
"Semblia-managed." A new project starts with each Semblia hostname active and
default. If verified custom-domain support later promotes a custom hostname,
the transaction demotes the Semblia hostname to active/non-default without
changing or releasing it. Removing that custom domain restores the immutable
Semblia hostname as default. The resolver derives `isCanonical` from this
single-default rule; no second canonical flag is introduced.

The hostname validator applies full DNS length/label rules. Semblia-managed
free labels additionally use lowercase ASCII letters, digits, and internal
hyphens; cannot begin or end with a hyphen; are at most 63 characters; and
cannot use this launch reserved-name set: `www`, `app`, `api`, `admin`,
`assets`, `static`, `cdn`, `status`, `support`, `help`, `mail`,
`autodiscover`, `forms`, or `walls`. The validator owns this list so project
creation and the audit CLI cannot drift.

Project creation will use ordinary transactional creates rather than
`createMany({ skipDuplicates: true })`. A host collision aborts the whole
project transaction and returns a clear `409` instead of silently creating a
project without one of its public surfaces.

Project deletion first retires its hosts, then deletes the project in the same
transaction. The retained unique hostname rows are the tombstones.

### Primary wall

`Widget` gains an `isPrimaryWall` flag. A PostgreSQL check constraint named
`widget_primary_wall_eligible` enforces that a primary row is active, has kind
`WALL_OF_LOVE`, has a non-null wall slug, and has a non-null published snapshot.
A partial unique index named `widget_one_primary_wall_per_project` allows at
most one primary row per project. The write service enforces the same rules
before relying on these database backstops.

- The first eligible wall becomes primary automatically.
- Existing projects select the earliest-created eligible wall during backfill.
- Removing or deactivating the primary wall promotes the next eligible wall in
  the same transaction, or leaves the project without a primary wall.
- A project-authorized API operation can select a different eligible primary
  wall. Client controls are outside this implementation.

## API Architecture

### Authoritative resolver

`PublicSurfacesService` becomes the sole host-to-resource policy boundary.
Internal callers use a typed method; the public-safe endpoint remains:

`GET /v2/public-surfaces/resolve?hostname=<host>&feature=<COLLECTION|WALL>`

`feature` is required for runtime consumers. The service:

1. normalizes the hostname;
2. performs an exact lookup for an active row and expected feature;
3. rejects rows without a live/active project or consistent resource mapping;
4. resolves the active default hostname for canonical metadata;
5. returns only display-safe project and resource data.

The response includes the requested hostname, canonical hostname/URL,
`isCanonical`, feature, resource type/id, safe project branding, and either
form-routing or wall-routing data. Stale endpoint strings that reference removed
API routes are deleted or replaced with current typed resource links.

No resolver path falls back to a globally configured default project. Unknown,
disabled, mismatched, retired, or unverified hosts are indistinguishable to the
public caller.

### Runtime trust

The existing `FORMS_RUNTIME_SIGNING_SECRET` becomes what its name implies: a
deployment-level credential shared only by `forms_runtime` and `api_v2`. It is
not compared with a customer's `ProjectSigningSecret`.

Runtime proxy requests use separate runtime headers so customer HMAC trust
remains independently usable:

- `X-Semblia-Runtime-Host`;
- `X-Semblia-Runtime-Timestamp`;
- `X-Semblia-Runtime-Signature`.

The signature covers a version, timestamp, HTTP method, API path, normalized
public hostname, and SHA-256 body hash. Verification is constant-time and uses
the existing five-minute freshness window. The API resolves the signed hostname
and verifies that the requested form belongs to that project before snapshot,
upload-intent, or submission work begins. Existing per-project HMAC and browser
Origin trust remain separate modes; a present but invalid signature always
hard-rejects.

The current runtime endpoints gain host-based resolution. The existing
`projectId` branch remains temporarily available only when the viewer hostname
is exactly `forms.semblia.com` and the request matches this allowlist:

- `GET /f/:formSlug`;
- `GET /embed/:formSlug` when iframe delivery is enabled;
- `POST /f/:formSlug/submissions`;
- `POST /f/:formSlug/uploads/presign`.

For API proxy calls, the runtime attests the exact viewer hostname through the
signed `X-Semblia-Runtime-Host` value. Host-based and legacy inputs are mutually
exclusive. Any other hostname, method, or path carrying `projectId` is rejected;
wildcard requests never accept it as a tenant override.

### Project and wall operations

- Project creation validates the initial free-host label and creates both hosts
  atomically.
- Project updates never rewrite free hosts.
- Project deletion retires hosts atomically.
- Wall create/publish/update/delete paths maintain `isPrimaryWall`.
- Public wall reads accept the resolved project constraint in addition to
  `wallSlug`; a globally unique slug alone is no longer sufficient for the
  project-hosted route.
- The idempotent primary-wall operation is
  `PUT /v2/projects/:slug/widgets/:widgetId/primary-wall`; it rejects widgets
  outside the project or widgets that are not eligible walls.
- Stale slug-derived hosted-origin exceptions are removed from
  `PublicSubmitTrustService` and `config/security.ts`. Browser traffic does not
  receive a broad `*.forms.semblia.com` API CORS grant: hosted pages submit
  same-origin to `forms_runtime`, and the runtime calls `api_v2` server to
  server with runtime HMAC trust.

## Forms Runtime

CloudFront captures the normalized viewer hostname and forwards it in a trusted
origin header. The edge function overwrites any viewer-supplied copy of that
header. The hostname is already part of the cache key and remains so. The
runtime API client likewise strips viewer-supplied `X-Semblia-Runtime-*`
headers and creates fresh outbound values itself.

For a wildcard request, `forms_runtime`:

1. ignores browser `projectId` parameters;
2. resolves the original host as `COLLECTION` through the API;
3. requests the project-bound form snapshot by slug;
4. renders action URLs on the same canonical project host;
5. signs snapshot-adjacent proxy calls, upload intents, and submissions with the
   runtime credential and bound hostname.

Production wildcard requests fail closed if host resolution or API access
fails. `FORMS_RUNTIME_PROJECT_ID` and the static host map remain local/test or
explicit legacy compatibility aids, never production wildcard fallbacks.

Every hosted form and iframe response includes `X-Robots-Tag: noindex,
nofollow`; the HTML document also carries the matching meta directive. Canonical
metadata does not advertise a form for indexing.

## Wall Runtime

Vercel routes `*.walls.semblia.com` to `web_v2`. The existing `proxy.ts`
recognizes that hostname suffix before the control-plane auth gate and rewrites
wall-host requests into a dedicated public wall-host route tree. Those route
handlers independently revalidate the hostname and call the API resolver; the
rewrite is routing convenience, not the trust boundary. The same proxy handles
host-specific `robots.txt` and `sitemap.xml` routes.

- `/` loads the resolver-provided primary wall or returns `404` when none
  exists.
- `/w/:wallSlug` loads only a wall in the resolved project.
- The existing `/wall/:wallSlug` route remains a legacy adapter.
- Canonical, Open Graph, and structured metadata use the default host.
- Host-aware `robots.txt` keeps the control-plane hosts disallowed while
  allowing eligible wall hosts.
- Each eligible wall host exposes a small `sitemap.xml` containing the primary
  and additional indexable wall URLs.
- Wall HTML uses host-only cookies if it ever needs cookies; customer-hosted
  pages must not receive broad `Domain=.semblia.com` session cookies.

The dedicated wall-host route tree is dynamic and opts out of Next's HTML/Data
Cache for launch. The API/Redis payload cache is keyed by normalized hostname,
project ID, and wall slug. No cache may use `/` or `/w/:slug` alone as a tenant
key. A later CDN HTML cache is permitted only with proof that scheme, hostname,
path, and relevant query state are all in the cache key.

The current self-serving `AggregateRating` and `Review` JSON-LD is removed.
Eligible walls emit accurate `Organization` and `WebSite` structured data only;
individual displayed reviews remain ordinary page content without a promise of
Google review-star eligibility.

## Infrastructure

### Forms / AWS

- CloudFront alternate domain names include both `forms.semblia.com` and
  `*.forms.semblia.com`.
- The ACM certificate is in `us-east-1` and covers both names.
- The wildcard DNS record is DNS-only at Cloudflare and targets the CloudFront
  distribution.
- The CloudFront function preserves the original host, and the cache policy
  includes it.
- `formsRuntimeCustomDomains` continues failing loudly; custom-domain
  automation is not smuggled into this change.

### Walls / Vercel

- `*.walls.semblia.com` is assigned to the `web_v2` project.
- Cloudflare delegates the required ACME challenge label as documented by
  Vercel and keeps the wildcard routing record DNS-only.
- The exact `walls.semblia.com` host is configured separately.

The repository receives configuration and a runbook only. Actual DNS, ACM,
CloudFront, and Vercel mutations require a separate approved production action.

## Migration and Rollout

### Data audit and backfill

An idempotent CLI supports `--dry-run` and explicit apply modes. Dry-run is the
default and reports counts without secrets or response data:

- projects missing either free host;
- invalid or non-normalized hostnames;
- duplicate/default conflicts;
- active rows without consistent project/resource links;
- known legacy Semblia host rows;
- projects with zero or multiple primary walls;
- projects without hosts whose current slug cannot safely produce a free
  hostname.

Apply mode:

- normalizes safe host rows;
- fills `resourceId` for project-level rows;
- creates missing free hosts when no conflict exists;
- selects the earliest eligible primary wall where needed;
- demotes known legacy defaults without deleting their rows;
- refuses to invent a replacement public label for an invalid/conflicting
  project and reports it for manual resolution.

Application startup never runs this backfill. A production operator reviews the
dry-run output before applying it.

### Activation order

1. Ship an expand migration that adds nullable retirement/primary-wall fields
   without enforcing new constraints against existing rows.
2. Ship the compatible API resolver/trust changes and audit CLI.
3. Run the audit in the target environment; apply only after review.
4. Apply the contract migration that adds the new checks and partial unique
   indexes after the backfill reports a clean state. This is a second deployment
   artifact for an existing database, not a pending migration bundled ahead of
   the operator-reviewed backfill; a fresh empty database may apply the expand
   and contract sequence together.
5. Deploy `forms_runtime` and `web_v2` host-based behavior while shared routes
   still work.
6. Synthesize/verify CloudFront and validate Vercel domain configuration.
7. Create the approved wildcard/exact DNS and certificate bindings.
8. Verify project-host requests and cross-tenant failures.
9. Switch generated links and canonical metadata to project hosts.
10. Retire the exact-host `projectId` compatibility branch in a later cleanup
    after access logs show it is no longer needed.

## Failure Handling

| Condition                                         | Public behavior                               | Operational behavior                                       |
| ------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| Unknown, retired, disabled, or wrong-feature host | Opaque `404`                                  | Structured resolution-miss metric; no tenant details       |
| Wall/form does not belong to resolved project     | Opaque `404`                                  | Cross-project rejection metric                             |
| Resolver/API unavailable                          | `503`                                         | Fail closed; never use a default project                   |
| Invalid/reserved initial host label               | `400`                                         | Validation details safe for project owner                  |
| Active or tombstoned hostname collision           | `409`                                         | Whole project transaction rolls back                       |
| Missing/expired/invalid runtime signature         | `401`                                         | Security event with request ID, not payload                |
| No primary wall                                   | `404` at wall root                            | Explicit state; additional `/w/:slug` walls may still work |
| Ineligible wall                                   | Page may remain reachable but emits `noindex` | Eligibility reason available to server/client DTOs         |

Submission idempotency continues protecting retried form posts. Logs never
record answers, consent values, uploaded bytes, credentials, or signing input.

## Observability

Metrics and structured logs cover:

- resolver hits/misses by feature and outcome;
- canonical versus alias requests;
- cross-project rejections;
- runtime-signature failures and freshness failures;
- exact-host legacy compatibility use;
- projects missing a primary wall;
- backfill dry-run/apply counts;
- CloudFront/Vercel host smoke status.

Hostnames and project IDs are operational identifiers and may be logged; form
answers and response content may not.

## Verification

### API/database

- Schema validation and migration tests for nullable retired hosts, partial
  default uniqueness, and primary-wall uniqueness.
- Unit/integration tests for normalization, exact feature matching, canonical
  default resolution, retired hosts, resource consistency, and safe DTOs.
- Transaction tests for project create/delete, collision rollback, project-slug
  changes not changing hosts, and primary-wall maintenance.
- Runtime trust tests covering canonical input, method/path/host/body binding,
  timestamp expiry, constant-time mismatch behavior, and separation from
  customer project secrets.
- Cross-project snapshot, upload-intent, submission, and wall rejection tests.
- Backfill dry-run, apply, conflict, and idempotency tests.

### Forms runtime

- Request-context tests proving hostname authority and ignored wildcard
  `projectId` input.
- Unknown/disabled/API-down fail-closed tests.
- Host-bound snapshot, upload, submission, redirect, cache-key, and noindex
  tests.
- Exact-host legacy compatibility tests isolated from wildcard behavior.
- CDK synthesis assertions for exact/wildcard aliases, certificate coverage,
  forwarded original host, and cache policy.

### Walls/web

- Host routing for root primary and `/w/:wallSlug`.
- Cross-project and no-primary `404` behavior.
- Two different wall hosts requesting `/` in alternating order must never
  receive each other's HTML or API payload, including warm-cache requests.
- Legacy apex-route canonical behavior.
- Host-aware robots, sitemap, canonical, Open Graph, and index-eligibility tests.
- Structured-data regression coverage.

### Closeout gates

- affected-package typecheck, lint, unit/integration tests, and builds;
- full `api_v2`, `forms_runtime`, and `web_v2` test suites;
- Prisma format/validate and migration verification;
- CloudFront CDK synthesis;
- local end-to-end requests with explicit valid and hostile `Host` headers;
- `git diff --check`;
- `python scripts/update-indexes.py` and
  `python scripts/rebuild-graphify.py`, or the exact tool blocker if the local
  index runtime is unavailable.

No task is reported complete based only on unit tests. Host-bound runtime and
cross-tenant negative behavior must be demonstrated end to end in the local
environment before handoff.

## Acceptance Criteria

- A new project receives exactly one immutable active default forms host and
  one immutable active default walls host in its creation transaction.
- Changing project name or slug leaves those free hosts unchanged.
- Deleting a project retires its hostnames so they cannot be reused.
- A wildcard form request resolves only by hostname and cannot be redirected to
  another project with `projectId` input.
- Runtime signing uses the deployment credential and does not require identical
  customer project secrets.
- A wall host renders its primary wall at `/` and rejects another project's wall
  slug.
- Forms are non-indexable; eligible wall hosts expose crawlable robots,
  self-canonicals, and a correct sitemap.
- Shared-host compatibility never guesses an ambiguous tenant.
- Infrastructure changes synthesize cleanly, but no production infrastructure
  is changed without separate approval.
- Continuity documentation describes the project-host model as canonical and
  the prior shared-path model as superseded.
