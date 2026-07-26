# Inbound Imports

## Purpose and safety boundary

Inbound imports bring externally collected proof into a project as a canonical `FormResponse`. They are separate from outbound Slack, Notion, Linear, GitHub, webhook, and CSV-export integrations.

Every accepted item is created as `PENDING` + `PRIVATE`. Importing, syncing, or retrying never approves or publishes it: a project reviewer uses the normal moderation/publish workflow. The importer keeps display-safe provenance, not provider tokens, raw remote payloads, signed URLs, or spreadsheet bytes.

The importer reserves a project/source/external-identity hash before creating a response. Re-importing the same provider item, wall card, or mapped spreadsheet row is a duplicate and does not alter the existing response. Deleting the response removes that identity so an intentional later import is possible.

## Capability matrix

`GET /v2/projects/:slug/imports/catalog` is the authoritative, release-specific source list. The UI renders its status and reason rather than inferring availability.

| Category                   | Sources and path                                                                                                                                                                                                                                                                                              | Status / fallback                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files                      | CSV, XLS, XLSX                                                                                                                                                                                                                                                                                                | Available: upload, preview, explicit mapping, async import. Maximum 10 MiB, one selected sheet, 2,000 rows, 100 columns, and 10,000 characters per cell.                                                   |
| Manual proof               | Text proof with attribution and optional public URL                                                                                                                                                                                                                                                           | Available after the project operator confirms storage/publishing rights.                                                                                                                                   |
| Official connected         | X, LinkedIn, YouTube comments, Google Business Profile reviews, Google Play reviews                                                                                                                                                                                                                           | Implemented through Clerk OAuth plus provider APIs. Availability depends on Clerk configuration, provider approval, consent, and discovered resources. Spreadsheet/manual remain safe fallbacks.           |
| Official URL               | Vimeo comments                                                                                                                                                                                                                                                                                                | Implemented with a server-held Vimeo token; `SETUP_REQUIRED` until configured. Spreadsheet/manual remain available.                                                                                        |
| Profiled public import     | Testimonial.to, Senja, Famewall, public WordPress.com comments                                                                                                                                                                                                                                                | Catalog-approved HTTPS hosts only, with credible public proof. No login, cookies, or general-purpose scraping. Product Hunt and Reddit are manual/spreadsheet only pending approved commercial API access. |
| Wall migration             | Testimonial.to, Senja, Famewall                                                                                                                                                                                                                                                                               | Profiled public wall extraction or provider export/spreadsheet. Items stay pending/private and deduplicated.                                                                                               |
| Best-effort wall migration | Endorsal, Shoutout, WiserReview, Trustmary, Feedspace, Boast, Vocal Video, Shapo, Walls.io, Taggbox, EmbedSocial                                                                                                                                                                                              | Best-effort public extraction only; use provider export and spreadsheet mapping when a wall lacks credible structured proof.                                                                               |
| Manual/spreadsheet only    | Amazon, Airbnb, Apple App Store/Podcasts, AppSumo, Capterra, Chrome Web Store, Facebook, Fiverr, G2, HomeStars, Instagram, Pinterest, Realtor.com, Skillshare, SourceForge, TikTok, Trustpilot, Udemy, Whop, Yelp, Zillow, Threads, Slack, Discord, Telegram, WhatsApp, plus similarly marked catalog sources | No unauthenticated scraping. Export where permitted, then import the file or add proof manually with attribution.                                                                                          |

- `AVAILABLE`: runnable with current server configuration.
- `SETUP_REQUIRED`: implemented but missing server credential or Clerk/provider setup; never ask an end user for a secret.
- `MANUAL_ONLY`: automated retrieval is unavailable, disallowed, or deliberately unsupported.
- `BLOCKED`: no safe supported path; show the catalog reason unchanged.

## Flow contracts

### Spreadsheet

1. Upload CSV, XLS, or XLSX as a private import-source asset.
2. Choose a sheet and map the required testimonial text; author, rating, URL, date, and tags are optional.
3. Confirm rights, submit the durable job, and inspect imported, duplicate, skipped, and failed counts.

Formulas are not evaluated; formula-looking values stay text. The private source asset is removed at terminal job state, with failed cleanup retried by the worker seam.

### Manual, public URL, and migration

Manual entry creates one pending/private record after rights confirmation. Public URL and migration imports require a catalog source and explicit URL. The server validates and previews the source before saving a recurring public connection. Automated wall retrieval is available only for explicitly profiled sources; every other wall remains manual/spreadsheet-only until its retrieval policy and deletion lifecycle are implemented. Provider export plus spreadsheet mapping is the reliable fallback.

Public fetching is HTTPS-only. It accepts no URL credentials, login, cookies, or script execution; resolves and pins a public address; revalidates redirects; blocks private/link-local/metadata ranges; and bounds redirects, time, body size, content types, candidates, and text. It imports only credible public proof and returns `NO_IMPORTABLE_PROOF` rather than manufacturing a testimonial from a marketing page.

### Connected and recurring imports

The connection flow is authorize with Clerk, discover server-authorized resources, select a resource, then create the connection. Tokens remain in Clerk; the worker requests a current token only when it runs. Never put tokens in UI, job configuration, logs, or errors.

Connections support **Sync now**, automatic six-hour sync while auto-sync is enabled, pause/disable, re-enable, and delete. Sync now and scheduled work use the same bounded processor and cursor. Disabling/deleting prevents future scheduling but does not delete imported responses. Provider rate limits retain bounded retry delay; authorization failures require reauthorization.

## Provider and Clerk setup

Configure providers in Clerk and provider dashboards as an operator, then expose only the corresponding connection to users. Product review, tenant eligibility, OAuth consent verification, quotas, and API-plan access are provider-side prerequisites; a Clerk connection does not guarantee endpoint/resource approval.

| Provider                | Operator configuration                                                                                  | Baseline scope or secret                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| X                       | Enable Clerk X connection; configure X OAuth app, callback URLs, plan, and products.                    | `tweet.read`, `users.read`, `offline.access`                                                                                                                             |
| LinkedIn                | Enable Clerk LinkedIn OIDC; configure app/callback URLs; request only approved products/scopes.         | `openid`, `profile`, and restricted `r_member_social`; LinkedIn approval is required to retrieve member posts. Never claim recommendation or arbitrary profile scraping. |
| YouTube                 | Enable Google in Clerk; configure consent screen/callbacks; enable YouTube Data API.                    | `https://www.googleapis.com/auth/youtube.readonly`                                                                                                                       |
| Google Business Profile | Enable Google in Clerk; configure Google consent screen/callbacks and applicable Business Profile APIs. | `https://www.googleapis.com/auth/business.manage`                                                                                                                        |
| Google Play             | Enable Google in Clerk and Android Publisher/Google Play APIs; ensure Play Console access.              | `https://www.googleapis.com/auth/playdeveloperreporting`, `https://www.googleapis.com/auth/androidpublisher`                                                             |
| Vimeo                   | Server configuration only, not Clerk.                                                                   | `IMPORTS_VIMEO_ACCESS_TOKEN`, stored in the server secret manager and never browser-exposed.                                                                             |

After OAuth changes, test create, reauthorize, resource discovery, one Sync now, disable, enable, and delete in a non-production project before offering the source to customers.

### Trustpilot exception

Trustpilot is intentionally **manual/spreadsheet only**. Its official storage/deletion lifecycle requires recurring deletion reconciliation; Semblia does not automate that lifecycle. Do not add an API key or enable Trustpilot sync until reconciliation, retention ownership, and provider contract have been designed and verified.

## Operator checklist

1. Apply the database migration and deploy API and worker together.
2. Ensure the import queue/worker and scheduler are running.
3. Configure the relevant Clerk connection plus provider products, redirect URLs, scopes, consent screen, and test-account access.
4. Set `IMPORTS_VIMEO_ACCESS_TOKEN` only if Vimeo is required; keep it in the server secret manager and restart/redeploy as required.
5. Verify catalog availability without exposing secrets.
6. In a test project, exercise spreadsheet preview/mapping, manual proof, profiled public URL, connected Sync now, duplicate re-import, and pause/enable/delete.
7. Confirm every imported response is private/pending and source-attributed; approve/publish one only through normal moderation.
8. Retain provider exports/permissions and rights confirmation for audit. Never bypass a provider's terms, login, paywall, rate limit, or deletion obligation.

## Support triage

Capture job ID, connection ID, catalog source key, terminal error code, counts, and time. Never attach tokens, signed URLs, raw provider responses, or the private spreadsheet. `REAUTHORIZATION_REQUIRED` means reauthorize; `PROVIDER_RATE_LIMITED` means wait for the provider delay; `NO_IMPORTABLE_PROOF` means use export/manual entry rather than broadening the scraper.
