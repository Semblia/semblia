# Semblia Public Surfaces

Status: staged expand-state contract. Public host activation is pending explicit
production approval; no DNS, certificate, CloudFront, Vercel, or database
contract migration is performed by this repository artifact.

The API is the authoritative tenant resolver and trust boundary. `forms_runtime`
and `web_v2` render only after it resolves an active, feature-correct host.

## Stable public addresses

Each project receives its Semblia-managed form and wall hostname atomically at
creation. The free-host label is derived from the project slug at that creation
boundary and the issued hostname is immutable thereafter:

```text
https://<immutable-host>.forms.semblia.com/f/:formSlug
https://<immutable-host>.forms.semblia.com/embed/:formSlug
https://<immutable-host>.walls.semblia.com/
https://<immutable-host>.walls.semblia.com/w/:wallSlug
```

Rename does not change these addresses. Deletion disables the retained
`PublicSurfaceHost` rows as tombstones; neither disabled nor retired names can
be reused. `forms.semblia.com` and `walls.semblia.com` are exact service hosts,
never default tenants. `forms.semblia.com/f/:slug` remains a narrow legacy
compatibility path while activation is staged; it must require an explicit
compatible project context and must not select a tenant from the slug.

The current mutable project slug is never authority to reconstruct a public
hostname. Clients consume API-issued `PublicSurfaceHost` values; they do not
derive hosts from the project's current name or dashboard/API slug.

## Resolution and trust

```text
GET /v2/public-surfaces/resolve?hostname=<host>&feature=COLLECTION|WALL
```

Resolution normalizes the input and accepts only an active, unretired row with
the requested feature, correct resource/project relationship, and canonical or
permitted alias state. Unknown, disabled, retired, wrong-feature, or
cross-project requests fail closed as opaque `404`; resolver failure is `503`.

Runtime requests are signed over timestamp, method, complete path and query,
normalized host, and raw body. A failed signature is `401` and never falls back
to Origin trust. Wildcard forms hosts ignore/reject `projectId` as tenant
authority. Snapshot, submission, upload, and wall access are constrained to the
resolved project; the former global runtime snapshot-id path is absent.

Forms responses are `noindex`; iframe CORS is not shared through a cache.
Hosted walls use host-bound cache keys, `no-store` HTML behavior, eligibility
aware robots, self-canonical/Open Graph metadata, and accurate Organization and
WebSite JSON-LD (not self-serving review-star markup).

## Backfill and staged contract

The expand migration is
`20260714000000_project_subdomain_hosting_expand`. The reviewed backfill is
manual-only and defaults to dry-run:

```powershell
pnpm.cmd --filter api_v2 public-hosting:backfill -- --dry-run
pnpm.cmd --filter api_v2 public-hosting:backfill -- --apply
```

It defaults to `forms.semblia.com` and `walls.semblia.com`, reports sanitized
counts, and never runs during application startup. It may normalize safe rows,
create missing non-conflicting free hosts, select an eligible primary wall, and
report manual conflicts; it cannot invent a replacement identity.

There is intentionally no `20260714010000_project_subdomain_hosting_contract`
migration in this artifact. The contract migration, DNS/domain routing, and
client/canonical URL switch belong exclusively to the separately approved
activation plan.

## Observability

Single-line structured events include resolution result, canonical/alias use,
cross-project rejection, runtime signature rejection (with request id), exact
host compatibility use, and missing primary wall. Events include only stable
outcome fields, normalized hostname/project/feature where needed, and
`metricValue: 1`. They never include form slugs, answers, body hashes,
signatures, origins, request bodies, credentials, or upstream payloads.
