# API, UI, And Database Gap Map – Consolidated With Locked Decisions

_Date: 2026-05-02_
_Branch: `revamp/v2`_

Status: **Gap map plus locked decisions for v2 API surface completion**, not a full implementation plan.

Scope: Same as the original gap map – compare `apps/web_v2` UI, `apps/api_v2` runtime contracts, and `packages/database/prisma/schema.prisma` so the API surface can be completed before serious UI wiring; admin/ops endpoints and API docs remain out of scope.

## Executive Verdict

The core v2 API is usable but not yet shaped for the current UI; users, projects, testimonials, forms, widgets, public submit, and public widget/wall reads already exist. The gaps are still primarily cross-boundary: response envelope handling, role/capability projection, slug-vs-id wiring, server persistence for studio state and form answers, public hosted surfaces, and mock-driven product areas.

Two meta-decisions now govern the rest of the work. First, the backend and database are canonical: API and schema move first even if they diverge from current mocks, and the UI is expected to adjust to the new contracts rather than constraining them. Second, UI differences are tracked explicitly in a living UI wiring/diff document, and those mismatches are resolved by updating `web_v2` to the new surface.

## Public Trust And Hosts

### Public submit and trust modes

Tresta uses a single public submit route: `POST /v2/testimonials/public/projects/:slug`. That endpoint supports two trust modes on the same route: browser-origin trust, where `Origin` must match the project’s allowed origin set, and programmatic trust, where a valid HMAC signature proves the request was sent by a server holding the project signing secret.

Trust evaluation is intentionally strict. If `X-Tresta-Signature` is present, HMAC verification happens first and a failed HMAC must be rejected immediately; only when no HMAC header is present does the server evaluate browser `Origin`, and if neither path succeeds the request is rejected.

API keys are **not** used for public submit. Public collection flows rely on `Origin`/CORS for approved browser hosts and `signingSecret` + HMAC for server-to-server public submit; `ApiKey` is a separate credential system for authenticated private APIs.

### Normalize trust and hosts now

The original gap map identified trust as overloaded onto `Project.allowedOrigins String[]` and `Project.signingSecretEncrypted`, with no first-class host or custom-domain model. That is now locked for normalization into dedicated records such as `ProjectTrustedOrigin`, `ProjectSigningSecret`, and `PublicSurfaceHost`, with unique hostnames and explicit status/verification metadata.

The signing secret remains a separate credential from `ApiKey`. It must be stored as recoverable encrypted secret material, excluded from default project selects, rotatable, and revealed only through deliberate management flows because HMAC verification requires raw secret material server-side.

### Hosted domains and infra responsibility

Default hosted domains are derived from project identity rather than stored redundantly. The collection surface is `<project-slug>.testimonials.tresta.app`, and the hosted wall surface is `<project-slug>.walls.tresta.app`. These default hosted origins are treated as implicitly valid and should not be copied into `allowedOrigins`.

Wildcard DNS plus app-level routing handles the dynamic subdomain problem. A common SaaS pattern is to create wildcard records once and route any matching host into the app, where the application resolves `Host` to the correct tenant or project at runtime instead of mutating DNS per customer.

In this architecture, infra and `apps/api_v2` own hosted-route resolution. `apps/web_v2` consumes canonical URLs and host data from the API, but does not own host mapping, `Origin` trust, or wildcard-domain logic.

The rendering split is also locked: `apps/api_v2` resolves and authorizes the host, while `apps/web_v2` renders the public page experience. Trust and multi-tenant host logic stay centralized in the API layer.

### Custom domains

Custom-domain verification remains intentionally deferred as a workflow, but not as a data model. The system is now explicitly shaped so custom domains can be represented in `PublicSurfaceHost` and related trust tables immediately, even if self-serve verification, certificate lifecycle, and onboarding UX are postponed.

The practical decision is: model custom hosts now, automate later. Default URLs may be the only surfaced UI in early v2, while custom domains can be introduced through limited or manual flows without forcing another schema rewrite later.

## Submissions, Testimonials, Ratings, And PII

### Form submissions and testimonials

Every successful form submit now creates a `CollectionFormSubmission`, which becomes the canonical record for answers, rating scale/value, trust metadata, idempotency linkage, and future analytics. The schema remains open enough to support future non-testimonial form use cases, but the current product scope is still testimonial-centric, so v2 only needs to project testimonials from those submissions.

That means testimonials are no longer the primary storage for collected answers. Instead, they are a projection from `CollectionFormSubmission` for testimonial-producing flows, with `testimonialId` remaining optional on the submission row so the model can expand later without another conceptual rewrite.

Form-to-testimonial projection is explicit. `FormConfig` should carry a `testimonialMapping` block keyed by stable field IDs for content, author, company, rating, and related testimonial fields. The API must not infer semantic meaning from editable question labels.

### Cross-device drafts from day one

Studio persistence is no longer local-only. Forms and widgets must support server-side drafts and cross-device editing from the start, while any local `zustand` or `localStorage` state is only a short-lived UX buffer rather than the source of truth.

The draft topology is one shared draft per resource, not one draft per user. Draft records should include at least `version`, `updatedBy`, and `updatedAt`, and write APIs must use optimistic concurrency so concurrent edits fail clearly instead of silently overwriting each other.

This choice aligns more closely with richer editors that autosave draft state server-side and let users resume on another device, rather than save-only testimonial tools that rely entirely on explicit local editing sessions.

### Rating model

The current schema tension around ratings is resolved by separating public testimonial rating from form analytics rating. `Testimonial.rating` remains a 1–5 public display rating, while `CollectionFormSubmission` stores `ratingValue` and `ratingScale` for NPS or other custom scales.

No form should ask respondents for both NPS and star rating for the same concept by default. If a form uses a 1–5 star question, that value may map directly into `Testimonial.rating`; if a form uses only NPS 0–10, that NPS stays in submission analytics and the testimonial either has no star rating or uses a separate explicit star question.

NPS is therefore not automatically converted into stars in v2. NPS remains an analytics and routing primitive, while public testimonial widgets keep a simple and consistent 1–5 rating model or no rating at all.

### Hard split for testimonial PII

`Testimonial` is now treated as a public/display-safe record only. Sensitive fields such as email, IP address, and user agent move into a separate `TestimonialPrivateMetadata` structure so the primary testimonial table stops carrying the full privacy blast radius.

This split should include encrypted raw fields where needed for moderation or support, hashed normalized email/IP for abuse checks, and retention metadata so deletion/export workflows become easier later. Public and semi-public responses must never leak those fields, and error responses must stay sanitized accordingly.

## Access Model And Capability Projection

The collaboration model stays intentionally simple: `OWNER`, `ADMIN`, `EDITOR`, and `VIEWER`, with a hardcoded role-to-capability map rather than a policy engine or dynamic ACL system. Capability names include at least review/publish permissions and project or publish-surface management where needed.

The locked decision is that access is API-driven. Project list/detail responses must include an `access` block such as `access.role`, `access.capabilities`, and `access.isOwner`, so the frontend can safely gate controls without reimplementing authorization rules client-side.

The backend remains authoritative. The UI reads and respects the projected capabilities, but never tries to derive or reinterpret access policy on its own.

## Auxiliary Surfaces

### Analytics

Analytics is in scope and must be real, not hidden. The current UI uses mocks and the database has event-like tables such as `WidgetAnalytics`, `TestimonialImpression`, `FormImpression`, and `ApiKeyDailyUsage`, so the correct v2 move is to provide read-only summary and time-series endpoints over real data, ideally backed by daily rollups for performance.

Analytics also needs event capture in this phase, not read endpoints over mostly empty tables. Public form views, widget loads, testimonial impressions, and related events should populate the visible analytics surface with real data.

### Notifications

Notifications are also in scope. The schema already includes `Notification`, `NotificationPreferences`, and `NotificationOutbox`, so the v2 surface should provide at least list, unread count, mark-read, and basic preference management for the visible bell and account notifications UI.

### Billing

Billing remains a real surface, but the expected v2 shape is primarily read-only. The existing tables (`Plan`, `Subscription`, `SubscriptionPayment`) and webhook-ledger flows should support current plan, subscription status, and invoice history, without inventing payment mutations until the provider/source-of-truth behavior is fully settled.

For now, payment methods, billing-address edits, checkout, plan switching, and cancellation remain disabled until provider behavior is settled. The API surface should expose read-only projections first rather than pretending those workflows are safe to mutate.

### API keys

API keys remain a separate programmatic access layer for authenticated private APIs, not for public testimonial submit. The gap map already notes that the current `ApiKey` schema is not sufficient for secure launch and should be revamped to include a better key model with scopes, prefix/last4, status, rotation metadata, and usage/event tracking.

The product decision is that API keys are not dropped, but they are clearly separated from browser `Origin` trust and HMAC signing secrets. Public submit continues to use `Origin` or HMAC, while API keys evolve as the credential for authenticated programmatic access to private project APIs.

## Consolidated Locked Decisions

The following decisions are locked across the gap map and architecture handoff.

| Area                   | Locked decision                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Public submit trust    | Use a single public submit route with two trust modes: browser `Origin` and HMAC signing secret; failed HMAC never falls through to `Origin`. |
| API keys vs signing    | `signingSecret` is not an API key; public submit does not use API keys.                                                                       |
| Trust storage          | Normalize into `ProjectTrustedOrigin` and `ProjectSigningSecret` (or equivalent) now.                                                         |
| Hosted routing         | Infra + `api_v2` own wildcard/default hosted domains and host resolution; `web_v2` consumes canonical URLs from API.                          |
| Public rendering       | `api_v2` resolves/auths the host; `web_v2` renders public form and wall page experiences.                                                     |
| Custom domains         | Model now, automate later.                                                                                                                    |
| Drafts                 | Forms and widgets get one shared server-side draft per resource with versioned optimistic concurrency.                                        |
| Form submit storage    | Every successful form submit creates `CollectionFormSubmission`.                                                                              |
| Testimonial projection | Current v2 scope is testimonial-focused; testimonials are projected from submissions.                                                         |
| Testimonial mapping    | Form-to-testimonial projection uses explicit `testimonialMapping` field IDs in form config, never label inference.                             |
| Ratings                | NPS/custom ratings stay on submissions; `Testimonial.rating` stays 1–5 only.                                                                  |
| Testimonial PII        | Hard split into `TestimonialPrivateMetadata` now.                                                                                             |
| Access control         | API-driven capability projection via `access` block; UI does not rederive auth.                                                               |
| UI mismatch policy     | API + DB are canonical; UI diffs are documented and frontend adapts to the new surface.                                                       |
| Auxiliary surfaces     | Analytics, notifications, billing, and API keys all remain in scope; API keys stay separate from public submit trust.                         |
| Billing mutations      | Billing v2 is read-only first: plan, subscription, and invoice history only until provider behavior is settled.                               |
| Analytics events       | Analytics includes event capture in this phase, not only read endpoints.                                                                      |

## Implementation Consequences

The original sequencing still mostly holds, but several decisions are now no longer open questions. Database foundation work now definitely includes trust normalization, host modeling, form submission storage, testimonial-private metadata split, and draft persistence structures for forms and widgets.

Core API completion also now has a clearer target. It must include project access projection, testimonial dashboard wiring to slug-based and capability-aware routes, form submission persistence, explicit testimonial mapping, shared versioned drafts, public host-aware routing, analytics event capture plus read models, notifications, read-only billing projections, and the revamped API-key surface where applicable.

The UI wiring phase becomes a contract-adaptation phase rather than a negotiation over backend shape. The frontend must replace mocks, switch from IDs to slugs where needed, consume `access` blocks and hosted-surface metadata, and follow the maintained UI-diff document for all mismatches introduced by the corrected API surface.
