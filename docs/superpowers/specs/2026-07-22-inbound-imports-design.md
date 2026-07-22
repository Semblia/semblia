# Inbound Imports and Migrations Design

**Date:** 2026-07-22  
**Status:** Approved for autonomous implementation by the user's 2026-07-22 goal directive  
**Owner:** Codex  
**Branch:** `codex/inbound-imports`

## 1. Outcome

Semblia will gain a project-scoped Import Center that turns externally collected proof into canonical, immutable `FormResponse` records. The first release covers:

- CSV, XLS, and XLSX spreadsheets;
- manual text proof;
- official connected imports for X, LinkedIn, YouTube, and Google Business Profile;
- bounded public-page imports for sources whose public pages can be fetched without login and whose policy allows this use;
- migrations from major testimonial-wall providers through their public wall or export surface;
- a source catalog that clearly distinguishes available, setup-required, manual-only, and blocked sources;
- optional six-hour automatic sync for official API connections and eligible public review/wall URLs, plus an explicit Sync now action;
- a native frontend workbench, job history, row-level results, and an entry point from the Responses inbox.

Imported proof starts `PENDING` and `PRIVATE`, passes through the existing moderation queue, and is never automatically published. Importing never mutates remote content or an existing Semblia response.

## 2. Current State

The existing integrations surface is outbound-only:

- asynchronous CSV export;
- outbound webhooks;
- one-way Slack, Notion, Linear, and GitHub delivery;
- Clerk connected-account OAuth and server-side token retrieval for those four providers.

There is no inbound import route, job, adapter, deduplication identity, or UI. `FormResponse` is the canonical feedback record, but it currently requires a collection form and published form version. That requirement is untrue for migrated or externally imported proof and must become optional for imported records.

## 3. Research Baseline

The signed-in Senja app was inspected directly on 2026-07-22. Its import landing page advertises 30 sources and exposes five paths:

1. auto-import;
2. import from a public web URL;
3. CSV/XLS/XLSX upload;
4. manual text, video, or screenshot proof;
5. Testimonial.to wall migration.

The live auto-import picker showed 18 sources even though the page copy says 21. Semblia will use the visible and documented capabilities, not the marketing count, as the parity reference.

Public demand signals include requests for Threads, YouTube comments, and Goodreads. References:

- [Senja bulk spreadsheet import](https://support.senja.io/can-i-import-testimonials-in-bulk-6la3d)
- [Senja public-page import](https://support.senja.io/import-testimonials-from-web-page-h03px)
- [Senja LinkedIn import constraints](https://support.senja.io/import-testimonials-from-linkedin-4ioak)
- [Senja Testimonial.to migration](https://support.senja.io/can-i-migrate-to-senja-from-testimonialto-2gj2c)
- [Threads request](https://feedback.senja.io/p/import-testimonialsmentions-from-threads)
- [YouTube comments request](https://feedback.senja.io/p/import-youtube-comments)
- [Goodreads request](https://feedback.senja.io/p/goodreads)
- [Testimonial.to import guide](https://help.testimonial.to/en/articles/6223081-import-existing-testimonials)

## 4. Approaches Considered

### A. One generic scraper

Fetch any URL and heuristically copy text. This is quick to demonstrate but fragile, unsafe around SSRF, difficult to deduplicate, and unacceptable where login or provider terms prohibit automated access.

### B. Official APIs only

Build a separate OAuth/API client for every source. This is legally clean but excludes spreadsheet migrations, public review sites without usable APIs, and most wall providers. It also makes long-tail expansion unnecessarily slow.

### C. Capability-based hybrid — selected

Use official connected APIs where they exist, structured public-page extraction only for explicitly allowed sources, native spreadsheet/manual ingestion, and wall-specific migration profiles over one safe fetch/extraction engine. Sources that cannot be implemented responsibly remain visible with an exact reason and safe fallback.

This approach maximizes coverage without pretending that every public-looking page is legally or technically scrapeable.

## 5. Product Model

### 5.1 Import modes

`ImportMode` has five durable values:

- `SPREADSHEET`
- `MANUAL`
- `PUBLIC_URL`
- `CONNECTED_API`
- `MIGRATION`

### 5.2 Source availability

The API-owned source catalog returns one of:

- `AVAILABLE`: usable without additional platform configuration;
- `SETUP_REQUIRED`: implemented, but the Semblia OAuth app/provider and scopes must be enabled;
- `MANUAL_ONLY`: automated retrieval is unavailable or inappropriate; users can enter proof and attribution themselves;
- `BLOCKED`: no viable legal/technical path is shipped. The response includes a concise reason.

The frontend does not invent or override availability. Unknown future enum values use a safe fallback label.

### 5.3 Source catalog

The launch catalog is intentionally broader than Senja's visible picker.

| Group                     | Sources                                                                                                                                                                                                              | Shipped path                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Files                     | CSV, XLS, XLSX                                                                                                                                                                                                       | Spreadsheet upload, preview, mapping, async import                               |
| Direct                    | Manual text proof                                                                                                                                                                                                    | Single-record import with attribution and rights confirmation                    |
| Connected social          | X, LinkedIn                                                                                                                                                                                                          | Clerk OAuth plus official APIs; manual/spreadsheet fallback                       |
| Connected reviews         | Google Business Profile, YouTube comments, Google Play reviews                                                                                                                                                       | Clerk Google OAuth plus official APIs; manual/spreadsheet fallback                |
| Public social/community   | Product Hunt, Reddit, Vimeo, any website                                                                                                                                                                             | Vimeo uses its official API with a server credential; the other entries are manual/spreadsheet fallbacks |
| Public review/app sources | Public WordPress.com comments                                                                                                                  | Bounded HTTPS-only extraction with a per-domain allow policy; Product Hunt, Reddit, and other review/app sources are manual/spreadsheet only unless their catalog entry explicitly says otherwise |
| Wall migrations           | Testimonial.to, Senja, Famewall, Endorsal, Trustmary, Trust, Shoutout, Feedspace, Boast, Vocal Video, WiserReview, Shapo, Walls.io, Taggbox, EmbedSocial                                                             | Testimonial.to, Senja, and Famewall have explicit profiles; other public walls are best-effort with provider export/spreadsheet fallback |
| Manual-only/private       | Facebook, Instagram, TikTok, Threads, Slack, Discord, Telegram, WhatsApp, Amazon, Airbnb                                                                                                                             | Manual entry or spreadsheet export; no broad public scraper                      |

LinkedIn is not advertised as arbitrary account scraping. The official adapter imports only content the connected account and approved LinkedIn app scopes may read. X API availability and cost are platform-side setup concerns, not reasons to omit the implementation.

## 6. Data and Contract Changes

### 6.1 Imported responses

`FormResponseTrustMode` gains `IMPORT`. `FormResponse` gains an `origin` field with `FORM` and `IMPORT` values. For `IMPORT` records:

- `formId`, `versionId`, and `version` are null;
- `answers` contains normalized, display-safe imported answer objects;
- denormalized rating and author fields are populated from the normalized candidate;
- `sourceMetadata` carries only safe provenance such as `source`, `sourceUrl`, `externalId`, and `importJobId`;
- original provider payloads, tokens, email addresses, and arbitrary HTML are not exposed or retained;
- `reviewStatus` is `PENDING` and `publishStatus` is `PRIVATE`;
- the existing moderation queue receives the record after commit.

Form-submitted responses remain non-null in their runtime path and wire DTO. Project response DTOs make form/version and the nested form summary nullable.

### 6.2 Import jobs

`ImportJob` stores:

- project, actor, mode, source key, status, and timestamps;
- a sanitized configuration JSON value;
- an optional private source `MediaAsset` for spreadsheets;
- total, imported, duplicate, skipped, and failed counts;
- one sanitized terminal error code/message;
- a connection ID for connected syncs when applicable.

Queue payloads contain only `jobId`. They never contain spreadsheet bytes, provider tokens, or testimonial text.

`ImportItem` stores a row/index, result status, source URL, normalized external ID hash, optional response ID, and a bounded error code/message. It does not store the raw provider record.

`ResponseImportIdentity` enforces project/source/external-ID deduplication independently of a job. The database stores a SHA-256 identity hash and the resulting response relation. Re-running the same file, wall, or provider sync produces `DUPLICATE`, not a second response.

### 6.3 Import connections

`ImportConnection` is separate from outbound `IntegrationConnection` because its lifecycle, cursor, schedule, and provider set differ. It stores:

- a stable source key and auth strategy (`CLERK_OAUTH` or `PUBLIC_URL`);
- connected Clerk user and Clerk provider identifier when OAuth is used;
- one catalog-approved public review/wall URL when public polling is used;
- requested scopes and non-secret provider config;
- enabled/disabled status;
- sync cursor, last sync time, and last sanitized error;
- auto-sync enabled state.

OAuth access/refresh tokens remain in Clerk. The worker obtains a current token only when executing a sync.

### 6.4 Private import assets

`MediaAssetPurpose` gains `IMPORT_SOURCE`. Import source files are private, project-scoped, size-limited, and downloadable only through the existing signed-storage seam. The worker deletes the private object and database asset after a terminal job state. Failed cleanup is logged without leaking object keys and is retryable by a later cleanup pass.

## 7. Ingestion Pipeline

All adapters emit the same bounded `ImportCandidate`:

```ts
type ImportCandidate = {
  externalId: string;
  sourceUrl: string | null;
  sourceCreatedAt: string | null;
  text: string;
  ratingValue: number | null;
  ratingScale: number | null;
  authorName: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  tags: string[];
};
```

The processor performs, in order:

1. load the durable job and atomically claim it;
2. obtain candidates from the selected adapter with provider-specific timeouts and page limits;
3. validate lengths, rating bounds, URLs, and the maximum item count;
4. hash the stable source identity;
5. transactionally reserve `ResponseImportIdentity` and create a private pending `FormResponse` plus `ImportItem`;
6. mark duplicates without modifying the original response;
7. enqueue existing moderation for each newly created response after commit;
8. update job counts and terminal status;
9. remove a spreadsheet source asset.

A failed candidate does not roll back successful siblings. A process crash is safe to retry because identity reservation is unique and job/item transitions are idempotent.

When a trustworthy provider timestamp exists, the response `createdAt` preserves that source time (clamped to a non-future valid date) and `sourceMetadata.importedAt` records the actual ingestion time. Without a source timestamp, `createdAt` is the import time.

## 8. Spreadsheet Contract

The server parses CSV, legacy XLS, and XLSX with the official SheetJS Community Edition tarball. Limits are enforced before and after parsing:

- maximum upload: 10 MiB;
- maximum workbook sheets considered: one user-selected sheet;
- maximum rows per job: 2,000;
- maximum columns: 100;
- maximum cell text: 10,000 characters;
- formulas are never evaluated;
- empty rows are ignored;
- spreadsheet values are normalized deterministically.

Preview returns sheet names, headers, up to five safe sample rows, and the bounded row count. The user maps required `text` and optional author/rating/source/tag columns. Mapping is stored with the job; it is not inferred again in the worker.

CSV formula-looking output is treated as plain input text. Imported values are never re-exported as executable spreadsheet formulas by this feature.

## 9. Public Fetch and Extraction Safety

The public importer accepts only `https` URLs and applies all of the following:

- source-domain allow policy from the catalog;
- no URL credentials;
- DNS resolution before connect;
- block loopback, link-local, private, carrier-grade NAT, documentation, multicast, and cloud-metadata ranges for IPv4 and IPv6;
- pin each request to the validated address to prevent DNS rebinding;
- revalidate every redirect, with at most three redirects;
- 10-second timeout;
- 2 MiB response-body limit;
- HTML/JSON content-type allowlist;
- no script execution;
- no cookie forwarding and no authenticated scraping;
- bounded extraction count and text length;
- sanitized errors that never echo secrets or full remote bodies.

Extraction prefers, in order:

1. provider-specific embedded JSON known to be present on public wall pages;
2. schema.org `Review`, `CreativeWork`, `SocialMediaPosting`, and aggregate item data in JSON-LD;
3. provider-profile selectors for public wall cards;
4. Open Graph/title/description for a single public post;
5. a narrowly scoped generic review/article fallback.

If no credible testimonial text is found, the job fails with `NO_IMPORTABLE_PROOF`; it never fabricates content from the page title.

## 10. Official Connected Adapters

Clerk supports connected social accounts and backend `getUserOauthAccessToken`. Semblia uses Clerk's `createExternalAccount`/reauthorize flow with additional scopes and verifies scopes again on the server.

- **X:** official X API v2. Import an authorized account timeline or specified post IDs. Required baseline scopes: `tweet.read`, `users.read`, `offline.access`.
- **LinkedIn:** official LinkedIn REST API. Import only posts available to the connected member/app. Required scopes are requested only when the LinkedIn app has the corresponding approved product access. Arbitrary recommendations and public-profile scraping are not claimed.
- **YouTube:** YouTube Data API comments for a connected/selected channel or video using Google OAuth.
- **Google Business Profile:** Business Profile APIs for locations administered by the connected Google account.

OAuth connection creation discovers allowed resources before persistence. A public polling connection validates and previews its single URL before persistence. No normal flow asks users to type opaque provider account/location IDs. Enabling auto-sync creates or updates a BullMQ Job Scheduler; disabling or revoking removes it. Manual Sync now uses the same processor and cursor contract.

## 11. API Surface

All routes are authenticated and project-scoped under `/v2/projects/:slug/imports`.

- `GET /catalog`
- `GET /jobs`
- `GET /jobs/:jobId`
- `POST /spreadsheets/preview`
- `POST /jobs/spreadsheet`
- `POST /jobs/manual`
- `POST /jobs/public-url`
- `POST /jobs/migration`
- `GET /connections`
- `GET /providers/:provider/resources`
- `POST /connections`
- `PATCH /connections/:connectionId`
- `POST /connections/:connectionId/sync`
- `POST /connections/:connectionId/enable`
- `POST /connections/:connectionId/disable`
- `DELETE /connections/:connectionId`

Listing requires project view/review access. Creating imports and managing connections require an operating project member. Provider token retrieval additionally requires a real Clerk user actor.

## 12. Frontend Experience

The Responses page gains one restrained primary action: **Import proof**. It opens a dedicated `/projects/:slug/responses/import` workbench rather than a modal.

The workbench follows the existing Measured Ink system:

- canonical `PageHeader` and full-bleed `PageBody`;
- a left `SectionNav` for Quick import, Connected sources, Public sources, and Migrate;
- one active workflow in the main pane;
- a compact source row catalog with availability/status, not a repetitive card grid;
- native file input semantics and an accessible dashed drop area;
- explicit loading, empty, validation, remote-fetch failure, conversion failure, partial success, and completed states;
- `aria-busy` on async regions and visible keyboard focus;
- responsive stacking that preserves every operation on small screens;
- import history below the active workflow with exact row counts and bounded errors.

Every import requires a rights confirmation stating that the project owner has permission to store and publish the submitted proof. This confirmation becomes the imported consent snapshot. It is not a substitute for provider terms; blocked sources remain blocked.

Imported response rows show their source label/link instead of pretending they came from a Semblia form.

## 13. Error and Privacy Behavior

- Imports are partial-success by design; row-level failures are retained without raw payloads.
- Remote 401/403 responses become `REAUTHORIZATION_REQUIRED` where appropriate.
- Rate limits become retryable `PROVIDER_RATE_LIMITED` errors with bounded backoff.
- Provider tokens, signed URLs, object keys, raw HTML, and spreadsheet bytes never appear in API errors, audit metadata, or logs.
- Import source metadata exposed to the web remains display-safe.
- Users can delete imported responses through the existing response deletion path; identity rows cascade so a deliberate later re-import is possible.
- Deleting an import job does not delete its responses. Job deletion is not included in this release.

## 14. Verification

Automated coverage includes:

- DTO rejection and capability checks;
- nullable form/version contract compatibility;
- spreadsheet preview/mapping and CSV/XLS/XLSX fixtures;
- formula, size, row, column, and text bounds;
- SSRF, redirect, timeout, content-type, and body-size defenses;
- JSON-LD, Open Graph, provider wall, and no-result fixtures;
- X, LinkedIn, YouTube, and Google provider envelopes using mocked external HTTP only;
- duplicate and retry idempotency;
- partial job success and asset cleanup;
- moderation enqueue after commit;
- catalog status and frontend fallback behavior;
- accessible import workbench interactions and job states.

Runtime verification uses the real local stack: web on `:3002`, API and worker on `:8100`/worker process, Postgres, Redis, private upload, and a headed browser. Provider live calls are verified where local Clerk provider configuration exists; otherwise the complete authorization/setup-required state and mocked adapter contract are verified without claiming a live provider connection.

The final branch must pass the repository local PR gate, official local reviewer check/review, hosted required check, review-thread sweep, and hosted mergeability proof.

## 15. User-Side Setup at Handoff

The code does not treat provider configuration as a blocker. The final handoff will list the exact items that remain platform-side:

- enable/configure Clerk X, LinkedIn, and Google social connections;
- set provider OAuth client credentials and Semblia callback URLs in Clerk/provider consoles;
- approve the exact additional scopes/products required by X, LinkedIn, YouTube, and Google Business Profile;
- ensure production API/worker have the existing Clerk, Redis, database, and private object-storage environment values;
- apply the included database migration through the protected release process.

No customer-facing manual API key or destination-ID entry is introduced.
