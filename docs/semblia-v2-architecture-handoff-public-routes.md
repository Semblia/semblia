# Semblia v2 Architecture Handoff

## Public Submission, Publish Surfaces, Security, and Collaboration

**Author:** Software Architecture

**Audience:** Engineering Lead, Backend Engineer, Frontend Engineer, Product/Engineering Manager

**Status:** Historical build brief; current data-model decisions live in `docs/continuity/decisions.md` and `packages/database/prisma/schema.prisma`.

**Purpose:** This document converts the architectural discussions from the original public-routes pass into an implementation-oriented handoff for Semblia v2. Use it for background, not as the current execution contract.

---

## 1. Context and Intent

Semblia v2 is being shaped around a project-first testimonial platform model, where a `Project` is the primary organizing unit and owns collection, moderation, publishing surfaces, widgets, forms, and related access control concerns.

For the current build phase, the most important architectural goal is to standardize how public testimonial submission works across:

- Semblia-hosted subdomains
- future verified custom domains
- server-to-server or self-hosted programmatic callers

This handoff also locks the initial access-control model for project collaboration, clarifies public route security, and sets expectations for widget/public wall behavior.

---

## 2. Core Architectural Decisions

The following decisions are **locked** for the current implementation cycle.

### 2.1 Public submission endpoint

Semblia will use a **single canonical public submit endpoint** for testimonial intake:

`POST /v2/testimonials/public/projects/:slug`

This route is slug-keyed and does not require a dashboard API key for ordinary browser-origin submissions.

There will **not** be a separate `/programmatic/...` public submit path in v2. The operation is the same regardless of caller. What changes is the trust mechanism used to admit the request.

### 2.2 Two trust modes on one endpoint

The endpoint supports two trust modes:

1. **Browser-origin trust**
   - The request is allowed when the incoming `Origin` matches the project’s allowed origin set.
   - This supports the default hosted Semblia collection surface and later verified custom domains.

2. **Programmatic trust**
   - The request is allowed when the request carries a valid HMAC signature.
   - This supports server-to-server or self-hosted callers that cannot rely on browser `Origin`.

These two trust modes are evaluated on the same endpoint, not on separate public APIs.

### 2.3 Trust evaluation order

The request-admission order is:

1. If `X-Semblia-Signature` is present, perform HMAC verification.
2. If HMAC verification fails, reject immediately.
3. If no HMAC header is present, evaluate browser trust via `Origin`.
4. If neither trust path passes, reject.

This is a strict waterfall, not a fallback chain. A failed HMAC attempt must not fall through to an `Origin` check.

---

## 3. Public Submission Security Model

### 3.1 Locked HMAC algorithm

The public submission HMAC algorithm is locked to:

- **HMAC-SHA-256**

This should match the existing operational familiarity already established around signed provider verification patterns and keeps implementation straightforward.

### 3.2 Replay protection requirements

HMAC alone is not sufficient. Public programmatic submissions must include replay protection.

The locked replay-protection model is:

- A timestamp is included in the signed material.
- The server enforces a **5-minute freshness window**.
- The implementation supports optional nonce tracking for stricter replay protection where needed.
- Idempotency support is added separately to prevent duplicate creates from retries.

Recommended request headers:

- `X-Semblia-Timestamp`
- `X-Semblia-Signature`
- `Idempotency-Key`

### 3.3 Idempotency requirements

Public submit must support idempotent retries.

Locked decision:

- Accept `Idempotency-Key` on public submit.
- Use a **24-hour dedupe window**.
- A repeated request with the same key for the same project and semantic payload should not create a second testimonial record.

This is especially important for:

- client retry storms
- network instability
- webhook-like server callers
- browser retries from hosted/public forms

### 3.4 Browser trust semantics

For browser-origin public submit, Semblia will validate:

- **`Origin` only**

Semblia will **not** treat `Host` as a trust signal. `Host` identifies the destination server and is not a proof that the request originated from an approved customer-controlled surface.

`Referer` may be logged for debugging, but it is not a primary authorization signal.

### 3.5 Origin matching semantics

`allowedOrigins` matching in v2 is locked to:

- strict origin equality
- exact scheme + host + port
- no protocol wildcards
- no subdomain wildcards
- no suffix matching

Examples of valid stored values:

- `https://acme.testimonials.semblia.com`
- `https://proof.acme.com`

Examples explicitly not supported in v2:

- `*.acme.com`
- `https://*.acme.com`
- `acme.com` without scheme

This keeps the first implementation precise, auditable, and easy to reason about.

---

## 4. CORS and Public Route Integration

### 4.1 Architectural conflict to account for

There is an important integration detail between global app CORS and project-level origin authorization.

If the application uses a static global CORS allowlist at bootstrap time, the browser may reject a custom-domain request during preflight **before** the route-level project `Origin` guard ever runs.

That means project-aware origin authorization cannot rely solely on a static global CORS configuration if public submit is expected to work from project-specific custom origins.

### 4.2 Locked implementation direction

For public submit, the implementation must do one of the following:

- use a **dynamic CORS resolver** that consults the project’s allowed origins; or
- isolate public submit into a route group whose CORS behavior is compatible with project-resolved origin checks

What is explicitly **not** acceptable:

- relying on only a static app-wide allowlist for public testimonial submission

This is a concrete engineering requirement, not an optional refinement.

---

## 5. Domain and Host Model

### 5.1 Default hosted Semblia surface

The default hosted collection surface is conceptually:

`<project-slug>.testimonials.semblia.com`

This hosted origin should be treated as implicitly valid for a project.

### 5.2 Stored vs derived default origin

Locked decision:

- The default Semblia-hosted origin should be **derived lazily** from `project.slug`
- It should **not** be persisted redundantly in `allowedOrigins`

Rationale:

- avoids drift on slug rename
- reduces redundant state
- keeps the default hosted origin deterministic

### 5.3 Custom domains

Custom domains remain part of the architectural direction, but the exact automated verification flow is intentionally left unresolved in this document.

For the current build phase:

- the system should be shaped so that verified custom domains can later join the `allowedOrigins` set
- until that deeper system is designed, custom-domain entries may be considered a manually curated or administrative concern

See the deferred decisions section for why this remains intentionally open.

---

## 6. Secret Storage and Credential Separation

### 6.1 `signingSecret` is not an API key

Public-submit HMAC signing must not reuse the existing `ApiKey` model semantics.

Reason:

- API keys are hash-stored credentials suited to header-based authentication
- HMAC verification requires recoverable secret material on the server side

Therefore, the public-submit signing secret must be modeled separately from `ApiKey`.

### 6.2 Locked secret-storage posture

The project-level public-submit signing secret should be:

- stored as recoverable secret material
- encrypted at rest
- excluded from default project selects
- revealed once or rarely through a deliberate credential-management flow
- rotatable

Implementation direction:

- prefer envelope encryption or equivalent encrypted-at-rest handling
- do not expose the plaintext secret in routine project reads
- do not return it in normal dashboard project payloads

### 6.3 `ApiKey` role in v2

`ApiKey` remains useful in v2, but **not** for public-submit signing.

Its role should remain tied to authenticated programmatic API access such as:

- read-oriented programmatic integrations
- controlled project-scoped API access
- future analytics or management surfaces where API-key auth is appropriate

This keeps API-key auth and HMAC-signed public ingest as separate credential systems with clear intent.

### Note:

- API keys are not used as identifiers for public submit or hosted surface trust.
- Public submit uses a slug-keyed endpoint with Origin or HMAC trust, and the signing secret is modeled separately from ApiKey.
- The current UI/API diff is real and must be addressed during implementation, not treated as cosmetic documentation drift.

---

## 7. Data Model Changes Required

The current schema is close to what is needed, but a few additions or constraints should be treated as required schema work for this phase.

### 7.1 Project additions

Recommended additions to `Project`:

- `allowedOrigins`  
  A strict list of explicitly allowed browser origins for public submit, excluding the derived default hosted Semblia origin.

- `signingSecretEncrypted` (name illustrative)  
  Encrypted project-level HMAC verification secret.

- optional `signingSecretRotatedAt`  
  Useful for operational introspection and support.

### 7.2 Submission request dedupe store

Add a dedicated idempotency ledger for public submit, or reuse an existing durable idempotency pattern if done cleanly.

The important behavior is:

- project-scoped dedupe
- 24-hour retention window
- safe replay of semantically identical requests

### 7.3 Query projection hygiene

Any secret-bearing or privacy-sensitive fields must be excluded from default query projections.

At minimum, do not include in default public-facing or normal project payloads:

- signing secret material
- raw PII fields that are not needed by the caller

---

## 8. Submission-Backed Testimonial Data, Privacy, and Error Safety

> Current-state note (2026-06-03): the old `Testimonial` projection table has been removed. Testimonial product routes are backed by `CollectionFormSubmission`; raw/private metadata lives in `SubmissionPrivateMetadata`.

### 8.1 Error-response safety

Public routes must not leak sensitive submission or verifier metadata in error bodies.

At minimum, public and semi-public failures must not expose:

- `authorEmail`
- `ipAddress`
- `userAgent`
- `oauthSubject`
- any internal moderation reasoning beyond safe high-level error categories

### 8.2 Input validation

All public submission payloads should be validated using the same strict validation posture expected elsewhere in v2.

The expected implementation standard is:

- schema-first validation
- deterministic field-level rejection
- no permissive passthrough of unknown fields on public ingest without deliberate review

### 8.3 Privacy state

Raw IP address, user agent, and author email are not public DTO fields and are not stored on a testimonial projection. Sensitive raw values live in submission-owned encrypted private metadata with normalized hashes for abuse-control and support workflows.

---

## 9. Authorization Model for Authenticated Surfaces

### 9.1 Collaboration scope

Semblia should support lightweight project-level collaboration without becoming a general-purpose enterprise policy engine.

### 9.2 Locked role model

Use the existing project member role model:

- `OWNER`
- `ADMIN`
- `EDITOR`
- `VIEWER`

This phase will use a **hardcoded role-to-capability map**.

There will be:

- no custom policy table
- no per-project dynamic rule builder
- no Casbin- or ACL-style policy engine in this phase

### 9.3 Locked capability set

The capability model should separate review from publish authority.

Minimum capability set:

- `review_testimonials`
- `publish_testimonials`
- `manage_publish_surfaces`

Suggested hardcoded mapping:

| Role   | review_testimonials | publish_testimonials | manage_publish_surfaces |
| ------ | ------------------- | -------------------- | ----------------------- |
| OWNER  | Yes                 | Yes                  | Yes                     |
| ADMIN  | Yes                 | Yes                  | Yes                     |
| EDITOR | Yes                 | No                   | No                      |
| VIEWER | No                  | No                   | No                      |

This keeps collaboration useful for lean teams while avoiding an oversized permissions rewrite.

### 9.4 Authz enforcement expectation

All authenticated project routes must enforce:

- valid Clerk session
- project membership or ownership
- capability check when the action is not universally allowed to all members

Examples:

- review queue access requires `review_testimonials`
- publish/unpublish requires `publish_testimonials`
- widget/public wall configuration requires `manage_publish_surfaces`

---

## 10. Public Publish Surfaces and Wall Routing

### 10.1 Public wall route shape

The wall/public publish surface should be treated as a public read model distinct from dashboard widget CRUD.

Route naming can evolve, but public walls should be clearly separated from authenticated widget management concerns.

### 10.2 `wallSlug` uniqueness

Locked decision:

- `wallSlug` remains **globally unique** in v2 so long as the public route is wall-slug-only

Rationale:

- the current data model already supports globally unique wall slugs
- keeping slug-only public reads requires uniqueness at global scope
- per-project uniqueness would require a different URL model

### 10.3 Route migration note

If any existing scaffold or early phase used a widget-prefixed public wall path, later implementation work should treat the final public wall route shape as a migration/refactor task, not as a reason to preserve a less clear public contract.

### 10.4 Slug-reservation note

Because global uniqueness creates naming pressure, the implementation should include:

- reserved-word protection
- normalization rules
- safe fallback generation where needed

---

## 11. Widget and Wall Caching

### 11.1 Locked initial cache strategy

Public widget and wall payloads should use a **short TTL cache** in the initial implementation.

Recommended starting point:

- 60-second TTL
- optionally stale-while-revalidate if operationally convenient

### 11.2 What is intentionally not required in the launch slice of this layer

The following are not day-one requirements for this build phase:

- cache-tag invalidation system
- explicit purge orchestration
- surrogate-key purge infrastructure

Short TTL is the preferred first step because it is simple, predictable, and sufficient for early publish-surface correctness.

### 11.3 Mutation freshness expectation

When a testimonial is approved, unpublished, republished, or deleted, public surfaces may remain stale until the short TTL expires.

That is an acceptable tradeoff for the first implementation.

---

## 12. Implementation Notes and Non-Negotiable Security Gates

The build brief should explicitly require the implementation to cover:

- strict request validation on public submit
- controller-level rate limiting on public routes
- no PII leaks in error responses
- membership-based authorization on authenticated endpoints
- project-scoped `Origin` checks for browser public submit
- HMAC verification for programmatic public submit
- replay protection on HMAC-signed requests
- idempotency support on public submit

These should be treated as acceptance criteria, not suggestions.

---

## 13. Deferred by Design

The following two items remain **intentionally ambiguous** and should not be prematurely locked in this implementation pass.

### 13.1 Custom-domain verification flow

The architecture supports the concept of verified custom domains, but the exact verification system remains unresolved.

Examples of deeper questions intentionally deferred:

- DNS TXT verification vs HTTP verification
- certificate and lifecycle handling
- self-serve domain onboarding experience
- failure and renewal behavior

For now, only the surrounding architecture is being shaped to allow this feature later.

### 13.2 Canonical widget-studio persistence shape

The product currently has rich widget-studio concepts, but the long-term canonical backend representation is intentionally not locked in this document.

Examples of deeper questions intentionally deferred:

- scalar columns vs structured JSON
- UI-draft schema vs delivery schema
- whether studio config is identical to runtime publish config
- normalization boundaries between widget design, content selection, and delivery concerns

This needs a separate system-design pass and should remain open for now.

---

## 14. Out of Scope for This Build Pass

The following are explicitly out of scope unless later pulled into a dedicated design brief:

- full custom-domain automation
- user-defined authorization policies
- wildcard origin matching
- unified secret-management platform redesign
- explicit cache purge infrastructure
- enterprise-grade policy engines
- premature persistence canon for all widget-studio state

---

## 15. Recommended Engineering Checklist

### Backend

- Add project-level allowed-origin persistence
- Add encrypted signing-secret persistence
- Implement public submit guard with dual trust modes
- Implement signed timestamp verification and 5-minute freshness check
- Add idempotency-key dedupe for public submit
- Ensure HMAC failure does not fall through to Origin validation
- Add safe serializer/projection rules for public and dashboard payloads
- Implement capability-aware project authz middleware/guard

### Frontend / Product Surface

- Continue using slug-based hosted collection URL semantics
- Treat default hosted Semblia origin as derived, not configured
- Keep collaboration UI aligned to hardcoded role capabilities
- Avoid exposing unresolved custom-domain automation as fully self-serve in this phase

### Delivery / QA

- Test browser submit from hosted Semblia subdomain
- Test browser submit from an allowed custom origin scenario
- Test rejection from disallowed origin
- Test signed programmatic submit success
- Test HMAC replay rejection
- Test duplicate retry with same idempotency key
- Test publish/unpublish staleness behavior under short cache TTL
- Test member-role enforcement across review and publish actions

---

## 16. Final Build Brief Position

This architecture intentionally favors:

- one public submit route
- two explicit trust modes
- strict trust semantics
- simple collaboration roles
- clear separation between API keys and HMAC signing
- deterministic origin allowlisting
- low-complexity cache behavior
- deliberate deferral of deeper domain-verification and widget-canonicalization work

That balance is appropriate for the current Semblia v2 phase because it strengthens public submission and publishing reliability without forcing premature system complexity.

## 17. Additional Locked Decisions

The following residual decisions are now locked for the current implementation phase.

### 17.1 Master encryption key for project signing secrets

Project-level `signingSecretEncrypted` values will be encrypted using a master application key supplied via environment variable.

Locked decision:

- env var name: `API_V2_SECRET_ENCRYPTION_KEY`
- format: base64-encoded 32-byte key
- usage: wraps and unwraps project-level signing secrets at the application layer until a dedicated KMS-backed solution is introduced

Implementation note:

- add strict env validation for this variable in the v2 config bootstrap
- fail fast at startup if the value is missing or malformed

### 17.2 Idempotency-key collision behavior

Public submit idempotency keys are replay-safe only when the same key is reused for the same semantic request.

Locked decision:

- if the same `Idempotency-Key` is reused with the same project but a different payload hash, return `409 Conflict`
- if the same `Idempotency-Key` is reused with the same payload, return the original stored response
- collision behavior must be deterministic and documented

### 17.3 Public submit idempotency ledger

Public submit will use a dedicated Postgres-backed idempotency ledger.

Locked decision:

- create a `PublicSubmitIdempotency` table
- store:
  - `id`
  - `projectId`
  - `idempotencyKey`
  - `payloadHash`
  - `responseStatusCode`
  - `responseBody` (JSON snapshot or equivalent serialized response)
  - `createdAt`
  - `expiresAt`
- enforce a unique constraint on `(projectId, idempotencyKey)`

Rationale:

- public submit dedupe is request-oriented, not job-oriented
- response replay needs durable storage
- payload-hash collision handling is easier and safer in Postgres than in ephemeral cache-only flows

Retention:

- records may expire after 24 hours and be cleaned by scheduled job

### 17.4 Capability extension for authenticated project surfaces

The initial capability model is expanded slightly so that non-publish authenticated routes do not fall back to scattered role-only checks.

Locked capability set:

- `review_testimonials`
- `publish_testimonials`
- `manage_publish_surfaces`
- `manage_project`
- `manage_members`

Capability intent:

- `manage_publish_surfaces`: widget and hosted-wall configuration, publish-surface behavior, public-facing surface management
- `manage_project`: project settings, form CRUD, widget CRUD where not already covered by publish-surface operations, integrations, API-key management
- `manage_members`: invite, remove, and role-change for project members

Admin and ops-only surfaces remain outside project collaboration scope and continue to require separate administrative authorization.

Locked role map:

| Role   | review_testimonials | publish_testimonials | manage_publish_surfaces | manage_project | manage_members |
| ------ | ------------------- | -------------------- | ----------------------- | -------------- | -------------- |
| OWNER  | Yes                 | Yes                  | Yes                     | Yes            | Yes            |
| ADMIN  | Yes                 | Yes                  | Yes                     | Yes            | Yes            |
| EDITOR | Yes                 | No                   | No                      | No             | No             |
| VIEWER | No                  | No                   | No                      | No             | No             |

### 17.5 Dynamic CORS resolver caching

If public submit uses a dynamic CORS resolver, preflight handling must avoid unnecessary database load.

Locked decision:

- add a small in-memory LRU cache for CORS resolution
- cache key: `(projectSlug, origin)`
- TTL: 60 seconds

Purpose:

- reduce repeated DB reads on browser preflight traffic
- keep resolver behavior consistent with the short-cache philosophy already adopted for public reads

This cache is an optimization layer only. The database remains the source of truth.

### 17.6 Allowed-origin scheme rules

Allowed-origin validation will enforce a production-safe scheme policy.

Locked decision:

- production origins must be `https://`
- `http://` entries are rejected except for local development hosts
- allowed development exceptions:
  - `http://localhost:<port>`
  - `http://127.0.0.1:<port>`
  - `http://[::1]:<port>` where supported

This rule applies both to dashboard configuration validation and to any internal admin tooling that writes allowed origins.

### 17.7 Reserved words for `wallSlug`

Reserved-word protection for public wall slugs is now explicitly defined.

Starter reserved list:

- `admin`
- `api`
- `www`
- `app`
- `dashboard`
- `login`
- `signup`
- `settings`
- `embed`
- `public`
- `walls`
- `widgets`
- `forms`
- `testimonials`
- `account`
- `billing`
- `support`
- `status`
- `docs`
- `blog`

Rule:

- this list is a starter denylist, not a final canonical universe
- implementation may expand the set over time without changing the contract

### 17.8 Hosted surface domain conventions

Hosted surface naming should be explicit enough that later publish-surface work does not reinvent the domain model.

Locked hosted conventions for now:

- collection form surface: `<project-slug>.testimonials.semblia.com`
- hosted wall surface: `<project-slug>.walls.semblia.com`

Clarification:

- embeddable widgets remain script/embed-driven and do not require their own hosted subdomain in this phase
- if a later phase promotes a hosted widget page as a first-class surface, that can be added separately

### 17.9 Rate-limit buckets by trust mode

Rate limiting for public submit will be split by trust mode.

Locked decision:

- browser-origin submissions use a stricter anonymous bucket
- HMAC-verified submissions use a higher verified-caller bucket

Recommended starter policy:

- browser-origin bucket: lower ceiling, keyed by `projectId + client fingerprint/IP bucket`
- HMAC bucket: higher ceiling, keyed by `projectId + signing principal`
- exact numbers remain configurable, but the bucket classes are distinct and must not be merged

Recommended initial defaults:

- browser-origin: `10 requests / minute / project + client bucket`
- HMAC: `120 requests / minute / project + signing principal`

This preserves protection for public hosted forms while avoiding unnecessarily tight ceilings for trusted server-to-server callers.
