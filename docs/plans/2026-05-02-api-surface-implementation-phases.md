# Tresta V2 API Surface Implementation Phases

Date: 2026-05-02
Scope: backend/database first, then `web_v2` adaptation. Admin and ops endpoints remain out of scope.

Status note: this file is the phase map, not the live progress ledger. Phase 1a through 1d are already complete; read `docs/continuity/progress.md` for current status before starting work.

This is the implementation map for the consolidated API/UI/database decisions in `docs/plans/2026-05-02-api-ui-db-gap-map consolidated.md`. A phase is a module, and each subphase is a related submodule that can be implemented, reviewed, and verified independently.

## Phase 1 - Database Foundation

Goal: establish durable canonical models before API and UI code depend on unstable mocks or overloaded project fields.

### 1a - Public trust and host models

- Add first-class trusted-origin records for browser public submit and hosted collection surfaces.
- Add first-class signing-secret records for server-to-server HMAC public submit.
- Add first-class public-surface host records for default hosted domains and modeled custom domains.
- Keep API keys separate from public submit trust.
- Preserve existing project fields only as compatibility shims until API services are migrated.

### 1b - Form submission and testimonial projection source

- Add `CollectionFormSubmission` as the canonical source for answers, ratings, trust metadata, and analytics inputs.
- Add links from submissions to projects, forms, optional projected testimonials, and public idempotency records.
- Keep testimonial projection explicit and driven by form config mapping rather than inferred labels.

### 1c - Testimonial private metadata split

- Add a private metadata model for email, IP, user agent, hashes, and retention metadata.
- Move new writes away from public/display-safe testimonial rows.
- Remove legacy testimonial PII fields only after API services and migrations are ready.

### 1d - Studio drafts

- Add a shared server-side draft model for forms and widgets.
- Include `version`, `updatedBy`, `updatedAt`, and optimistic concurrency support.
- Treat browser local state as a short-lived UX buffer only.

### 1e - Auxiliary product data

- Align API key records for private/project API usage.
- Confirm billing read projections for plan, subscription, and invoice history.
- Confirm notification persistence for the visible notifications surface.
- Add analytics capture/rollup tables where existing event tables are not enough.

## Phase 2 - Common API Contracts

Goal: normalize cross-cutting response contracts before feature modules fan out.

### 2a - Project access block

- Add an `access` block to project responses.
- Derive capabilities from backend role-to-capability rules.
- Remove client-side role/capability reimplementation from `web_v2`.

### 2b - Shared DTO and client contract updates

- Update API DTOs and shared types for normalized trust, host, drafts, submission, analytics, billing, notifications, and API key surfaces.
- Keep OpenAPI/docs generation out of this phase because the documentation system is being replaced separately.

### 2c - Error, idempotency, and concurrency conventions

- Standardize optimistic concurrency failures.
- Standardize public submit trust failures.
- Standardize idempotency response behavior for public submit and server-to-server callers.

## Phase 3 - Public Surface API

Goal: make public collection, hosted walls, and public submit real API-backed surfaces.

### 3a - Host resolution

- Resolve default hosted domains and custom domains in `api_v2`.
- Authorize host/resource/project combinations in the API layer.
- Return render payloads for `web_v2` public pages.

### 3b - Public submit trust enforcement

- Keep `POST /v2/testimonials/public/projects/:slug` as the single public submit route.
- Support browser Origin trust and HMAC signing-secret trust only.
- Ensure failed HMAC never falls through to Origin trust.

### 3c - Submission-to-testimonial projection

- Persist every successful submit as a `CollectionFormSubmission`.
- Project testimonials from submissions for supported testimonial flows.
- Use explicit `testimonialMapping` keyed by stable field IDs.

## Phase 4 - Studio API

Goal: replace durable local/mock studio state with server-owned resources.

### 4a - Forms

- Implement form read/write endpoints over server-side config and drafts.
- Support shared draft versioning and conflict handling.
- Preserve stable field IDs for mapping and analytics.

### 4b - Widgets and walls

- Implement widget and wall draft/edit endpoints over server-side drafts.
- Keep hosted wall routing compatible with normalized public host records.
- Preserve current display settings while moving persistence to API contracts.

### 4c - Testimonials

- Read display-safe testimonial rows by default.
- Require explicit private metadata access paths for sensitive fields.
- Keep moderation and approval workflows compatible with submission projections.

## Phase 5 - Auxiliary API Surfaces

Goal: make visible v2 product areas API-backed without overcommitting provider-specific behavior.

### 5a - Analytics

- Capture public form views, form submissions, widget loads, testimonial impressions, and hosted page events.
- Expose read endpoints from captured events/rollups.

### 5b - Notifications

- Expose project/user notification lists and state changes needed by `web_v2`.
- Keep delivery integrations separate from the visible notifications surface unless already backed by API code.

### 5c - Billing

- Expose read-only plan, subscription, and invoice-history projections.
- Keep checkout, payment method edits, billing address edits, plan switching, and cancellation disabled.

### 5d - API keys

- Keep API keys reserved for authenticated private/project APIs.
- Expose creation, listing, rotation, and revocation only for private API usage.
- Do not use API keys for public submit trust.

## Phase 6 - Web V2 Adaptation

Goal: wire `web_v2` to the new contracts after backend/database contracts settle.

### 6a - API client and project shell

- Update `web_v2` API client types and data loaders.
- Drive navigation and permissions from project response `access` blocks.

### 6b - Studio wiring

- Move forms, widgets, walls, and testimonials to API-backed resources and drafts.
- Keep local browser state as a transient edit buffer only.

### 6c - Public rendering

- Render public collection pages and hosted walls from API-resolved host payloads.
- Keep host authorization and multi-tenant trust decisions centralized in `api_v2`.

### 6d - Auxiliary wiring

- Wire analytics, notifications, billing, and API keys to real API responses.
- Keep disabled billing mutations visibly unavailable until provider behavior is settled.

## Phase 7 - Verification And Hardening

Goal: close each module with explicit security, contract, and UI behavior checks.

### 7a - Security checks

- Verify auth boundaries, project access enforcement, public trust separation, PII split, and HMAC failure behavior.

### 7b - Performance checks

- Verify indexes for project-scoped reads, host lookup, idempotency, analytics aggregation, drafts, and submission history.

### 7c - Build and UI checks

- Run package builds and targeted type/lint checks.
- Run browser checks for adapted public and studio surfaces once `web_v2` is wired.

## Current Starting Point

Live status is tracked in `docs/continuity/progress.md`.

At initial plan creation, the recommended first slice was Phase 1a because normalized trust/host tables unblock public submit and public rendering without forcing `web_v2` into another contract churn loop. As of 2026-05-02, Phase 1a through 1d are complete; the next pending database-foundation slice is Phase 1e unless `docs/continuity/progress.md` says otherwise.
