# API, UI, And Database Gap Map

Status: gap map for API surface completion, not an implementation plan
Date: 2026-05-01
Branch: `revamp/v2`
Scope: compare the current `apps/web_v2` UI, `apps/api_v2` runtime contracts, and `packages/database/prisma/schema.prisma` so the API surface can be completed before UI wiring.

Admin and ops endpoints are excluded. API documentation work is also excluded.

## Executive Verdict

The core v2 API is usable but not yet shaped for the current UI. Users, projects, testimonials, forms, widgets, public submit, and public widget/wall reads exist. The gaps are mostly cross-boundary gaps: response envelope handling, role/capability projection, slug-vs-id wiring, server persistence for studio state, form answers, public hosted surfaces, and visible mock-only product areas.

The database should move before broad UI wiring. The current schema is not rigid, and several API/UI mismatches are better solved by schema changes than by adapters alone:

- Public trust is overloaded onto `Project.allowedOrigins` and `Project.signingSecretEncrypted`.
- Form submissions are currently testimonials with `formId`; custom `answers` are accepted by API validation but not persisted.
- Hosted forms/walls/custom domains do not have a first-class model.
- API keys, billing, notifications, and analytics are visible in the UI but not implemented in `apps/api_v2`; some database tables exist, but their shape does not fully match the UI.
- PII and abuse-control fields on testimonials are stored directly on the testimonial row, which increases privacy blast radius.

## Evidence

- `AGENTS.md`
- `docs/codex-claude-memory-migration.md`
- `apps/api_v2/docs/orchestration/handoff.md`
- `graphify-out/GRAPH_REPORT.md`
- `docs/plans/2026-05-01-web-v2-api-wiring-requirements.md`
- Current controllers, DTOs, services, UI stores/components, and Prisma schema.
- OpenCode read-only inventories:
  - `ses_21b6b7b1affe5BF5wJIsnivtWU`: UI surface inventory.
  - `ses_21b69a672ffec0adjt6BW4qAdJ`: API contract inventory.
  - `ses_21b67d19dffeGrAV92ox3tzEJ3`: database/schema inventory.

`python scripts/codesearch.py query ...` was reachable in this pass and was used for file localization before targeted reads.

## Severity Key

- P0: must be resolved before serious UI wiring.
- P1: should be resolved before a launch-quality v2 API surface.
- P2: visible current UI but separable if the UI is hidden or explicitly marked as mocked/deferred.

## Cross-Surface Gap Matrix

| Surface | UI current state | API current state | Database current state | Gap | Recommended action |
|---|---|---|---|---|---|
| API client foundation | `apps/web_v2/lib/api-client.ts` returns raw `res.json()` and `use-current-user.ts` calls `/users/me`. | Global prefix is `/v2`; success responses are `{ success, data, meta }`; errors are `{ success, error, meta }`; current user route is `/v2/me`. | No schema issue. | P0 mismatch. Every real UI call will read the wrong shape unless wrapped. | Add a real v2 client that unwraps success, normalizes errors, supports public/auth requests, and fixes `/v2/me`. Refresh shared types after runtime contracts settle. |
| Users and onboarding | Welcome flow is dark and uses `localStorage("semblia:onboarding:done")`; profile/security mostly use Clerk. | `GET /v2/me`, `PATCH /v2/me`, `POST /v2/me/onboarding/complete`. | `User.onboardingCompletedAt` exists. | P0 for onboarding; no server-backed redirect gate in web. Optional onboarding answers have nowhere to live. | Wire current user and onboarding completion. If job title/referral/intent matter, add `UserOnboardingProfile` or explicit nullable fields, not ad hoc Clerk metadata. |
| Projects shell/list | Project list, switcher, topbar, sidebar, pages, and settings use `MOCK_PROJECTS`/`getProjectBySlug`. | `GET/POST /v2/projects`, `GET/PATCH/DELETE /v2/projects/:slug`; list is paginated; detail is capability-guarded. | `Project` has main identity/settings fields and counts are computed by API. | P0 route/data mismatch: UI expects broad project objects and often uses `projectId`; API is slug-first and does not return current user's role/capabilities. | Keep slug canonical. Add a project response `access` block: `role`, `capabilities`, and possibly `isOwner`. Add `_count.forms`. |
| Project settings | UI edits name, slug, description, visibility, moderation flags, profanity level, website, social links, tags. Delete is mock-only. | Patch covers these fields; delete exists and owner-only. | Project fields exist. `collectionFormUrl` and `formConfig` are legacy-ish overlap with first-class forms. | P0/P1. UI can save most settings, but slug change redirect, delete UX, and legacy form fields need decisions. | Return updated slug and let web redirect. Decide whether to remove/deprecate `Project.collectionFormUrl` and `Project.formConfig` once `CollectionForm` is canonical. |
| Membership and capabilities | No full collaboration UI yet, but UI controls need gating before real mutations. | Members CRUD exists; `CapabilityGuard` computes role/capabilities internally. | `ProjectMember` has unique `(projectId,userId)` and basic indexes. | P0 for safe UI mutations: role/capabilities are not projected to web. P1 performance index missing for member listing. | Add access projection to project/list/detail. Add `@@index([projectId, role, createdAt])`. Keep owner safety checks. |
| Public trust settings | UI does not yet expose allowed origins or signing secret controls. | Allowed origins and signing-secret rotate/clear exist under project routes. HMAC submit hard-rejects invalid signatures before origin fallback. | `Project.allowedOrigins String[]`; `signingSecretEncrypted` and rotated timestamp live on `Project`. | P0 for programmatic public submit; P1 for security and scale. Array origins and single secret field are too blunt for custom domains and audit/rotation. | Normalize into `ProjectTrustedOrigin` and `ProjectSigningSecret` or `ProjectPublicCredential`. Track status, verification, createdBy, lastUsedAt, rotatedAt, revokedAt. |
| Testimonials dashboard | Inbox/detail uses mock list/detail by `projectId`; approve/reject/publish are optimistic and not awaited in bulk paths. | Slug routes exist: list/detail/approve/reject/publish with filters/search/sort/pagination. | `Testimonial` has moderation, publication, author, source, rating, formId, and indexes. | P0 slug/id mismatch and rollback behavior. P1 bulk performance gap. | Wire by slug, await mutations, refetch or patch cache. Consider batch moderation endpoints for bulk approve/reject/publish to avoid N network calls. |
| Testimonial privacy and abuse data | UI needs public-safe testimonials and private moderation fields. | Auth responses include email/moderation fields; public responses omit email. Trust service stores IP and user-agent on testimonial create. | Author email, IP, and user-agent are stored directly on `Testimonial`. | P1 security gap. Public projection is safe, but DB privacy blast radius is broad. | Split private contact/abuse fields into `TestimonialPrivateMetadata` with encrypted email/IP/userAgent where needed plus hashed normalized email/IP for moderation/rate checks. |
| Public testimonials | No final public hosted UI route wired in `web_v2`; API route exists for submit/list. | `POST/GET /v2/testimonials/public/projects/:slug`; HMAC or Origin trust; idempotency; 60s cached public list. | `PublicSubmitIdempotency` is project-scoped only. | P1. Shared idempotency namespace can collide between forms/testimonials and future public surfaces. | Add `surface` or `route` discriminator and unique `(projectId, surface, idempotencyKey)`. Keep 24h expiry and add cleanup job/index. |
| Forms/collect studio | Entire form list and draft/saved state lives in `zustand` + `localStorage` (`semblia:studio-configs:v1`). Rich config includes questions, layout, tokens, conditional logic, metrics. | Auth CRUD exists for `/v2/projects/:slug/forms`; `config` is opaque JSON. Public list and submit exist. Auth DTO returns hardcoded analytics zeros. | `CollectionForm` stores config JSON, active flag, weight, metadata. No form submission/answer table. | P0/P1. API accepts `answers` for submissions but does not persist them; analytics fields are fake; schema version is implicit. | Add `schemaVersion` to `CollectionForm.config` or column. Add `CollectionFormSubmission` with `projectId`, `formId`, `testimonialId?`, `answers Json`, rating fields, submitter private metadata, trust mode, createdAt. |
| Form rating model | Form UI supports stars, NPS, emoji, custom questions. | Form submit extends testimonial body and allows `rating` 1-10. Testimonial submit allows `rating` 1-5. | `Testimonial.rating` is one nullable `SmallInt`. | P0 if NPS/10-point matters. A 10-point form rating does not fit a 1-5 testimonial model cleanly. | Store form answers separately. Keep testimonial `rating` as 1-5 public testimonial rating, and store NPS/custom ratings in submission answers or typed answer rows. |
| Public forms and A/B | UI supports multiple forms per project with `isActive` and `abWeight`. | Public list returns all active forms for a project; no selection semantics. | `CollectionForm.abWeight` exists; no impression/assignment API semantics. | P1 product/API gap. Client-side A/B selection is easy to tamper with and hard to measure. | Add server-side active-form selection endpoint or host-aware render endpoint that records `FormImpression` and returns chosen form. Keep public list only if the UI truly needs a picker. |
| Widget studio | Widget list/editor state lives in `zustand` + `localStorage` (`semblia:widget-studio:v1`); UI has draft/saved snapshots. | Auth widget CRUD exists with flattened normalized fields and nested response DTO; public embed/wall reads exist. | `Widget` has normalized columns for current config and metrics relation. | P0/P1. API supports saved config, not server-persisted drafts. UI has stale share URLs and some value-range differences. | Decide saved-only vs server drafts. Recommended first pass: saved config lives server-side; local draft remains client-only until save. Add adapters and update ranges/URLs. |
| Widget public surfaces | UI share drawer still contains placeholder CDN/SDK/wall URLs. | Public reads are `GET /v2/widget-embeds/:widgetId` and `GET /v2/walls/:wallSlug`. | `Widget.wallSlug` is global unique. No host/domain table. | P0 for final share copy; P1 for hosted/custom-domain architecture. | Add `PublicSurface`/`PublicHost` table for forms, widgets, and walls. Keep `wallSlug` as a route key but do not treat it as the full hosting model. |
| Hosted/custom domains | UI needs final URLs for collection forms and walls. | Trust service allows default `https://<slug>.testimonials.semblia.com`; widget/wall public reads are path routes. | No domain verification model. | P1. Current schema cannot represent custom domain status, ownership, verification, or host routing. | Add host model: `projectId`, `feature`, `resourceType`, `resourceId?`, `hostname`, `status`, `verificationTokenHash`, `verifiedAt`, `primary`, timestamps; unique hostname. |
| Analytics | Project analytics page builds KPIs and time series from mocks. | No analytics API in `api_v2`. | Event-ish tables exist: `WidgetAnalytics`, `TestimonialImpression`, `FormImpression`, `ApiKeyDailyUsage`. | P2 if hidden; P0/P1 if analytics page remains visible as real UI. Raw events alone can be expensive for dashboards. | Either hide analytics or add read-only summary/time-series endpoints. For performance, add daily rollup tables such as `ProjectMetricDaily` and write through from event capture. |
| API keys | Project API keys UI is visible and mock-backed; expects publishable/secret types, allowed origins/IPs, prefix, last four, events, usage. | No `api_v2` API key module. | `ApiKey` exists but older shape: hash, permissions JSON, usage counters; `ApiKeyDailyUsage` exists. | P2 if hidden; P0 if visible. Current DB does not match UI enough for secure launch. | Revamp API key schema before API implementation: key type, prefix, hash, last4, scopes, allowed origins/IPs, status, rotation metadata, event table. Never return secret except create/rotate. |
| Billing | Account billing page uses mock subscription, invoices, payment methods, billing profile. | No billing API in `api_v2`; Razorpay webhook is ledger-only. | `Plan`, `Subscription`, `SubscriptionPayment` exist. No obvious payment-method or billing-profile shape matching UI. | P2 if hidden; P0/P1 if visible. | Keep hidden or implement read-only billing profile/subscription/invoice endpoints from provider-backed tables. Do not invent payment mutations without a provider decision. |
| Notifications | Notification bell and account notifications are mock/placeholder. | No notifications module in `api_v2`. | `Notification`, `NotificationPreferences`, `NotificationOutbox` exist. | P2 if hidden; P1 if visible. | Implement minimal list/read/preferences endpoints or hide. Add pagination and unread count endpoint if bell remains. |
| Webhooks | No app UI dependency. | Clerk and Razorpay webhook endpoints exist. | Webhook ledger tables exist. | No current UI gap. Retention/status cleanup are operational concerns. | Leave out of UI surface completion except where Clerk upsert is required for `/v2/me`. |

## Database Revamp Recommendations

### 1. Normalize Public Trust And Hosted Surfaces

Current state:
- `Project.allowedOrigins String[]`
- `Project.signingSecretEncrypted`
- `Project.signingSecretRotatedAt`
- no host/custom-domain table

Recommended direction:
- `ProjectTrustedOrigin`
  - `id`, `projectId`, `origin`, `kind`, `status`, `verifiedAt`, `createdByUserId`, timestamps
  - unique `(projectId, origin)`
  - index `(projectId, status)`
- `ProjectSigningSecret`
  - `id`, `projectId`, `version`, `secretHash?`, `secretEncrypted`, `status`, `createdByUserId`, `rotatedAt`, `revokedAt`, `lastUsedAt`
  - active secret uniqueness per project
- `PublicSurfaceHost`
  - `id`, `projectId`, `feature` (`testimonials`, `forms`, `widgets`, `walls`), `resourceType`, `resourceId`, `hostname`, `status`, `verificationTokenHash`, `verifiedAt`, `primary`, timestamps
  - unique `hostname`
  - index `(projectId, feature, status)`

Why:
- Safer secret rotation and auditability.
- Clean custom-domain verification later.
- No string-array rewrites under concurrency.
- Host routing becomes explicit instead of scattered through UI copy and service logic.

### 2. Split Form Submissions From Testimonial Rows

Current state:
- `CollectionForm.config Json`
- public form submit creates a `Testimonial`
- submitted `answers` are validated but not persisted

Recommended direction:
- `CollectionForm.schemaVersion` or `configVersion`.
- `CollectionFormSubmission`
  - `id`, `projectId`, `formId`, `testimonialId?`
  - `answers Json`
  - `ratingValue?`, `ratingScale?`
  - `trustMode`, `idempotencyKey?`, `payloadHash?`
  - `createdAt`
  - relation to private submitter metadata
  - indexes `(projectId, createdAt)`, `(formId, createdAt)`, `(projectId, formId, createdAt)`
- Optional `CollectionFormSubmissionAnswer` only if individual answers need search/reporting soon.

Why:
- Prevents NPS/custom answer data from being squeezed into testimonial columns.
- Enables real form analytics.
- Keeps public testimonial projection clean.

### 3. Reduce Testimonial PII Blast Radius

Current state:
- `authorEmail`, `ipAddress`, and `userAgent` live on `Testimonial`.

Recommended direction:
- Keep public/display fields on `Testimonial`.
- Move sensitive contact/abuse data to `TestimonialPrivateMetadata`:
  - encrypted email/IP/user-agent if needed for support/moderation
  - normalized email hash and IP hash for dedupe/rate checks
  - retention fields
- Keep public serializers strict.

Why:
- Lower privacy risk.
- Easier deletion/export later.
- Abuse checks still remain performant through hashes.

### 4. Add Capability Projection Without Duplicating Policy

Current state:
- `ProjectAccessService` computes role/capabilities for guards.
- UI does not receive role/capabilities.

Recommended direction:
- Do not add a policy table yet.
- Reuse hardcoded role-to-capability map.
- Project list/detail response should include:
  - `access.role`
  - `access.capabilities`
  - `access.isOwner`

Why:
- UI can hide/disable unsafe controls without reimplementing auth logic.
- Backend remains authoritative.

### 5. Decide Visible Auxiliary Surfaces Up Front

If only admin/ops are excluded, then API keys, billing, analytics, and notifications are still visible UI surfaces and need one of two treatments:

1. Implement real minimal APIs now.
2. Hide or clearly disable the UI until their phase exists.

Recommended split:
- Implement notifications minimally if the bell remains.
- Implement project analytics as read-only summaries if the analytics tab remains.
- Implement API keys only after schema revamp.
- Keep billing read-only or hidden until provider/source-of-truth is confirmed.

## P0 API Deltas Before UI Wiring

1. Real v2 web client:
   - unwrap `{ success, data, meta }`
   - throw/render `{ success:false, error }`
   - support Clerk token auth
   - support public requests without bearer tokens

2. Current user contract:
   - web hook calls `/v2/me`
   - include `onboardingCompletedAt`
   - optionally add onboarding profile storage if those answers matter

3. Project access projection:
   - include role/capabilities in project list/detail responses
   - add `_count.forms`
   - keep slug canonical

4. Studio persistence decision:
   - forms: persist canonical config plus real submissions/answers
   - widgets: saved-only server model or server drafts

5. Public surface foundation:
   - normalize origins/secrets/hosts before adding UI controls
   - keep HMAC-first hard reject behavior

6. Visible mock-only routes:
   - choose implement vs hide for API keys, billing, analytics, notifications

## Suggested Implementation Sequencing

1. Contract repair phase:
   - response envelope client
   - `/v2/me`
   - shared type refresh
   - project access projection

2. Database foundation phase:
   - public trust tables
   - public surface host table
   - form submission/answers table
   - testimonial private metadata split if accepted
   - member/project/form/widget indexes

3. Core API completion phase:
   - projects settings/access/counts
   - testimonials dashboard/bulk moderation
   - forms CRUD/submissions/analytics basics
   - widgets CRUD/public URL payloads

4. Visible auxiliary surface phase:
   - analytics summaries
   - notifications/unread/preferences
   - API keys after schema revamp
   - billing only after provider/source-of-truth decision

5. UI wiring phase:
   - replace mock data by domain
   - keep local drafts intentionally where chosen
   - remove or gate mock-only pages

## Clarifications Needed

1. When you say "leaving admin/ops endpoints," should API keys, billing, analytics, and notifications be treated as in-scope because they are visible in the current UI?
   - By admin endpoints, I meant the application wide admin routes. So, the mentioned features are in-scope for API completion since they are visible in the UI.
2. Should form and widget drafts persist server-side across devices, or is local draft plus server saved config acceptable for v2?
3. Should form submissions create testimonials only when the form has a testimonial-style question, or should every form submission create a testimonial row?
4. Should NPS/10-point ratings appear in testimonial widgets, or stay form-analytics-only?
5. Which app handles wildcard/default hosted domains for `<project-slug>.testimonials.semblia.com`, forms, and walls?
6. Should public host/custom-domain support be modeled now even if the UI only exposes default hosted URLs first?

## Non-Assumptions

- I am not assuming the existing Prisma schema should be preserved.
- I am not assuming mock-visible UI areas are launch requirements unless you confirm they should stay visible.
- I am not assuming localStorage studio persistence is acceptable after API wiring.
- I am not assuming API-key or billing behavior without a security/provider decision.
- I am not assuming admin/ops gaps matter for this pass.
