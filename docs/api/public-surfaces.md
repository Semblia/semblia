# Tresta Public Surfaces

Status: current v2 API contract checkpoint, last reconciled 2026-06-03.

Public surfaces are browser-facing collection and wall experiences. The API owns host resolution and trust decisions; `web_v2` owns rendering.

## Host resolution

Use this route before rendering a hosted public page:

```text
GET /v2/public-surfaces/resolve?hostname=<host>
GET /v2/public-surfaces/resolve?hostname=<host>&feature=COLLECTION
GET /v2/public-surfaces/resolve?hostname=<host>&feature=WALL
```

The resolver normalizes URL or hostname input, looks up an active `PublicSurfaceHost`, and returns project branding plus canonical public API endpoints.

Collection hosts return:

```text
forms:        /v2/forms/public/projects/:slug
testimonials: /v2/testimonials/public/projects/:slug
```

Wall hosts return active wall resources for the project. If there is exactly one active wall, `endpoints.wall` is set to `/v2/walls/:wallSlug`; otherwise the UI should choose from the returned `walls` list.

## Default hosted origins

New projects get default hosted public surface hosts:

```text
https://<project-slug>.testimonials.tresta.app
https://<project-slug>.walls.tresta.app
```

Browser collection still uses public surface ID plus trusted domain/origin. Server submitters use the server submit secret and `X-Tresta-Signature`; failed HMAC never falls back to browser origin trust.

## Public data routes

Existing public data routes remain:

```text
GET  /v2/forms/public/projects/:slug
POST /v2/forms/public/projects/:slug/:formId/submissions
GET  /v2/testimonials/public/projects/:slug
POST /v2/testimonials/public/projects/:slug
GET  /v2/widget-embeds/:widgetId
GET  /v2/walls/:wallSlug
```

Public submit routes support `X-Idempotency-Key` for safe retries. The testimonial public route is a product-facing route only: successful direct submits persist `CollectionFormSubmission` records through the direct-submission backing form, not a separate `Testimonial` projection table.
