# Web V2 API Wiring Requirements

Status: requirements dossier, not an implementation plan
Date: 2026-05-01
Branch: `revamp/v2`
Scope: wire `apps/web_v2` to the completed `apps/api_v2` surface and identify UI/product changes forced by API decisions.

## Boundaries

API documentation is intentionally out of scope. The user is working on a separate NestJS documentation system, so this dossier ignores OpenAPI, Scalar, and API docs generation.

Legacy `apps/api` is out of scope. `apps/web_v2` must use `apps/api_v2` endpoints only.

The API rebuild explicitly excluded billing, dashboard analytics, API keys, notifications, broad ops-admin, and audit logs. Existing UI pages for those areas are called out below, but wiring them now requires a separate product/API decision.

## Evidence And Search Notes

- Read `AGENTS.md`, `docs/codex-claude-memory-migration.md`, `apps/api_v2/docs/orchestration/handoff.md`, `apps/api_v2/docs/orchestration/discovery.md`, and `docs/semblia-v2-architecture-handoff-public-routes.md`.
- `python scripts/codesearch.py query ...` was attempted but Ollama was unreachable, so file-level precision came from graphify plus targeted reads.
- OpenCode delegation was attempted first with `nemotron-3-super-free`; it returned empty assistant messages. Per user instruction, the inventory was re-dispatched to `github-copilot/gpt-5.4-mini`, which produced read-only inventories.
- This file is based on actual controllers, DTOs, services, current `web_v2` files, and the locked public-route handoff. Runtime contracts beat stale shared types where they disagree.

## Global Wiring Requirements

1. Introduce or fix a real `web_v2` API client that unwraps the v2 response envelope.
   - API success shape is `{ success: true, data, meta }`.
   - API error shape is `{ success: false, error: { code, message, details? }, meta }`.
   - Current `apps/web_v2/lib/api-client.ts` returns `res.json()` directly and does not unwrap `data`.
   - Current `useCurrentUser()` calls `apiRequest<ApiUser>("/users/me", token)`, which resolves to `/v2/users/me`; the actual current-user route is `/v2/me`.

2. Authenticated web calls must send a Clerk bearer token.
   - Use the existing Clerk session source.
   - Public render/submit calls must not require dashboard auth.
   - Do not reuse dashboard API-key concepts for public submit.

3. Project-scoped dashboard calls must be slug-routed.
   - Current UI often passes `projectId`.
   - `api_v2` project-scoped routes are `/v2/projects/:slug/...`.
   - `CapabilityGuard` depends on `:slug` and populates `request.projectAccess.projectId`.

4. Add response adapters at the web boundary.
   - Convert ISO date strings to the shapes existing UI components expect, or update components to accept strings consistently.
   - Normalize API enum casing to existing UI casing only if a UI component still requires lowercase.
   - Avoid importing `Mock*` types into new API-backed code.

5. Treat `packages/types/src/v2.ts` as helpful but not authoritative until refreshed.
   - It still advertises some fields that runtime code does not return, for example project `_count.forms`.
   - The runtime controllers, DTOs, services, and tests are the source of truth for this wiring pass.

6. UI controls must become capability-aware before real mutations ship broadly.
   - Owner/Admin: full project management, member management, publishing surfaces, testimonial review/publish.
   - Editor: project view plus testimonial review only.
   - Viewer: project view only.
   - Open issue: the API currently enforces capabilities but does not clearly return the current user's role/capabilities with every project response.

7. Keep optimistic UI only where rollback and server reconciliation are explicit.
   - Current testimonial actions fire mock requests without awaiting.
   - Real wiring must handle loading, failure, rollback/refetch, and permission errors.

8. Preserve the project-first routing model.
   - New functionality should live under `/projects/[slug]/...` unless it is account-wide.
   - Next.js 16 route/layout `params` remain promises and must be awaited.

## Required Surface Inventory

### Foundation Client And Data Ownership

Current files:
- `apps/web_v2/lib/api.ts`
- `apps/web_v2/lib/api-client.ts`
- `apps/web_v2/lib/mock-data.ts`
- `apps/web_v2/hooks/use-current-user.ts`

Requirements:
- Split the simulated API from the real API path. Do not silently mutate `api.ts` into a half-real hybrid.
- Add typed helpers for:
  - authenticated requests
  - public requests
  - paginated responses
  - v2 error rendering
  - date conversion/adapters
- Replace `MockProject`, `MockTestimonial`, `MockWidget`, and local studio entry types at the boundary, not by broad refactoring first.

Open questions:
- Should the real API client live beside `api-client.ts`, replace `api.ts`, or be split by domain under `apps/web_v2/lib/api/`?
- Should React Query become the default for all wired dashboard data, or should the first pass keep the current local `useEffect` state pattern where it already exists?

### Users And Onboarding

Current UI state:
- `apps/web_v2/hooks/use-current-user.ts` is the only real API-style current-user hook, but it points to the wrong route and does not unwrap `data`.
- `apps/web_v2/app/(app)/welcome/_welcome-flow.tsx` uses Clerk directly, stores completion in `localStorage`, and fakes project creation with `setTimeout`.
- `apps/web_v2/app/(app)/layout.tsx` does not gate onboarding.

API contract:
- `GET /v2/me`
- `PATCH /v2/me`
- `POST /v2/me/onboarding/complete`
- User response includes `onboardingCompletedAt`.

Requirements:
- Fix current-user wiring to `/v2/me` and include `onboardingCompletedAt`.
- Replace `localStorage` onboarding completion with server state.
- Wire project creation in welcome flow to `POST /v2/projects`.
- Call `POST /v2/me/onboarding/complete` only after the chosen onboarding completion point.
- Derive any collection link shown in onboarding from the locked hosted convention, not the old `https://collect.semblia.com/${slug}` placeholder.

Open questions:
- Should onboarding be re-enabled now, with `(app)/layout.tsx` redirecting users whose `onboardingCompletedAt` is null?
- Where should `jobTitle`, referral source, and intent answers live? The current API only accepts first name, last name, and avatar.
- Should profile edits write to Clerk, Semblia `/v2/me`, or both?
- After creating a project during onboarding, should the user land on `/projects/:slug/testimonials`, `/projects/:slug/collect`, or the current `/projects` list?

### Projects, Shell, And Settings

Current UI state:
- `useProjects()` fetches `apiGetProjects()` from mock data and filters client-side.
- Project layout, topbar, sidebar, settings page, analytics page, widgets page, collect page, and testimonials page call `getProjectBySlug()` from mock data.
- `ProjectSwitcher` reads `MOCK_PROJECTS` directly.
- `SettingsClient` patches mock data through `apiUpdateProject()` and project deletion is only a mock toast.

API contract:
- `GET /v2/projects` is paginated.
- `POST /v2/projects`
- `GET /v2/projects/:slug`
- `PATCH /v2/projects/:slug`
- `DELETE /v2/projects/:slug`
- `GET /v2/projects/:slug/members`
- `POST /v2/projects/:slug/members`
- `PATCH /v2/projects/:slug/members/:userId`
- `DELETE /v2/projects/:slug/members/:userId`
- `GET /v2/projects/:slug/allowed-origins`
- `PUT /v2/projects/:slug/allowed-origins`
- `POST /v2/projects/:slug/signing-secret`
- `DELETE /v2/projects/:slug/signing-secret`

Requirements:
- Replace project list and detail reads with API-backed data.
- Decide whether the project list remains client-filtered by requesting enough pages, or becomes server-paginated/searchable in the UI.
- Replace topbar/sidebar/project switcher mock reads with the same project source.
- Update settings save to handle real API validation errors and slug conflicts.
- If slug changes, navigate to the new slug after a successful save and refresh all project-scoped caches.
- Wire real project deletion only with owner-safe UX. The API checks owner on delete even though the controller uses `MANAGE_PROJECT`.
- Do not show settings actions that the current role cannot perform.
- Add or explicitly defer UI for allowed origins and public-submit signing secret. These are now central to public form/programmatic submit flows.
- Add or explicitly defer members/collaboration UI. The API exists, but the current UI has no concrete members surface beyond a transfer-ownership stub.

Open questions:
- Should `/projects` support more than 100 projects now, or is `pageSize=100` acceptable for the first wiring pass?
- Should project list search/filter remain client-only for the first pass?
- Should members, allowed origins, and signing secret be added as Settings tabs now, or deferred after basic UI wiring?
- Should API Keys stay visible in project nav even though API keys are out of scope for the completed API surface?
- What should replace the disabled transfer ownership card?

### Testimonials Dashboard

Current UI state:
- `TestimonialsPage` resolves project from mock data and passes `projectId`.
- `TestimonialsClient` uses mock-backed `apiGetTestimonials(projectId, filter)`.
- `useTestimonialModeration()` fires approve/reject/publish calls without awaiting and mutates detail state optimistically.
- Desktop detail uses `apiGetTestimonial(projectId, selectedId)`.

API contract:
- `GET /v2/projects/:slug/testimonials`
- `GET /v2/projects/:slug/testimonials/:testimonialId`
- `PATCH /v2/projects/:slug/testimonials/:testimonialId/approve`
- `PATCH /v2/projects/:slug/testimonials/:testimonialId/reject`
- `PATCH /v2/projects/:slug/testimonials/:testimonialId/publish` with `{ published: boolean }`
- List query supports `status`, `type`, `search`, `sort`, `page`, `pageSize`.

Requirements:
- Switch testimonial API calls from `projectId` to `projectSlug`.
- Keep the existing list query model; it mostly matches the API.
- Replace fire-and-forget moderation with awaited mutations, failure handling, and list/detail refetch.
- Keep bulk approve/reject as sequential per-item calls unless a bulk API is explicitly added later.
- Hide or disable publish controls for roles without `PUBLISH_TESTIMONIALS`.
- Hide the testimonials route or show an access-denied state for roles without `REVIEW_TESTIMONIALS`.
- Preserve safe display of author email only on authenticated dashboard surfaces.

Open questions:
- Should editors see approved/rejected testimonials if they have `REVIEW_TESTIMONIALS`, or only pending/flagged work queues?
- Should the dashboard expose a separate "Published" filter? The API list filter is moderation status, while publish is a boolean.
- Is bulk approve/reject still desired without a bulk endpoint, or should it be deferred until bulk API exists?

### Public Testimonial Submit/List

Current UI state:
- No complete public hosted submission surface is wired to the new trust model.
- Public collection preview currently redirects back to dashboard collect.

API contract:
- `POST /v2/testimonials/public/projects/:slug`
- `GET /v2/testimonials/public/projects/:slug`
- Browser-origin trust via exact allowed `Origin`.
- Programmatic trust via HMAC headers.
- Optional `Idempotency-Key`.
- Public list returns approved and published testimonials only.

Requirements:
- Build public submit clients separately from authenticated dashboard clients.
- Public browser submit must rely on `Origin`, not dashboard auth.
- Programmatic examples should use `X-Semblia-Signature`, `X-Semblia-Timestamp`, and optional `Idempotency-Key`.
- Public list consumers must not expect author email.

Open questions:
- Which `web_v2` route should serve the default hosted collection form surface for `<project-slug>.testimonials.semblia.com`?
- Should public hosted pages be part of this wiring phase or a separate routing/infrastructure phase?
- Should the dashboard expose generated examples for HMAC submit now, or only store/rotate the signing secret?

### Forms And Collect Studio

Current UI state:
- `FormConfigList` and `StudioShell` are entirely Zustand/localStorage-backed.
- `ensureProject()` creates a local default form with mock metrics.
- Create, duplicate, delete, active toggle, A/B weights, save, and reset are local only.
- Studio config is the rich `apps/web_v2/lib/collect/studio-types.ts` `FormConfig`.

API contract:
- `GET /v2/projects/:slug/forms`
- `POST /v2/projects/:slug/forms`
- `GET /v2/projects/:slug/forms/:formId`
- `PATCH /v2/projects/:slug/forms/:formId`
- `DELETE /v2/projects/:slug/forms/:formId`
- All dashboard form routes require `MANAGE_PROJECT`.
- Form `config` is an opaque JSON object.
- Authenticated form DTO includes placeholder analytics fields: `submissions`, `views`, `responseRate`, `avgRating`, `lastSubmissionAt`.
- Public render: `GET /v2/forms/public/projects/:slug`
- Public submit: `POST /v2/forms/public/projects/:slug/:formId/submissions`
- Public submission body extends testimonial submit and accepts `answers`, but `answers` are not yet persisted into a first-class response model.

Requirements:
- Replace local project seeding with `GET /projects/:slug/forms`.
- Create forms by POSTing a default `FormConfig` JSON object.
- Initialize studio draft/saved snapshots from the API form `config`.
- Save studio changes by PATCHing `config` and any changed entry metadata.
- Reset should reset to the last server-backed saved state, not just localStorage.
- Delete/duplicate/toggle active must call the API and then refresh local caches.
- Preserve A/B weight UI only if the backend behavior is accepted as active product behavior.
- Public form rendering must use only active forms.
- Do not claim custom question answers are persisted until the API actually stores them.

UI changes forced by the API:
- The API treats form config as opaque JSON, so the UI owns config shape validation for now.
- `body.answers` is accepted but not persisted meaningfully; rich custom-question collection is not complete as a product loop.
- Form public submission can create testimonials with rating up to 10, while the testimonial model and dashboard rating display often assume 1-5.

Open questions:
- Is multi-form A/B testing a real v2 product commitment now, or should the UI be simplified to one active form until analytics/splitting exists?
- Should the public form renderer support all current studio question types on day one?
- Where should arbitrary `answers` be persisted and displayed?
- Should NPS/10-point rating be mapped into testimonial `rating`, kept separate, or deferred?
- Should localStorage drafts remain as offline/unsaved drafts after API wiring, or should the studio become server-only?

### Widgets And Widget Studio

Current UI state:
- `WidgetList` and `WidgetStudioShell` are entirely Zustand/localStorage-backed.
- `ensureProject()` seeds one embed and one wall per project.
- Create, duplicate, delete, active toggle, rename, save, reset, content selection, and share drawer are local only.
- Share drawer hardcodes:
  - `https://cdn.semblia.com/embed.js`
  - `@semblia/react`
  - `https://semblia.com/wall/${slug}`
  - `https://embed.semblia.com/preview/${widgetId}`

API contract:
- `GET /v2/projects/:slug/widgets`
- `POST /v2/projects/:slug/widgets`
- `GET /v2/projects/:slug/widgets/:widgetId`
- `PATCH /v2/projects/:slug/widgets/:widgetId`
- `DELETE /v2/projects/:slug/widgets/:widgetId`
- All dashboard widget routes require `MANAGE_PUBLISH_SURFACES`.
- Public embed: `GET /v2/widget-embeds/:widgetId`
- Public wall: `GET /v2/walls/:wallSlug`
- Public embed only serves active `EMBED` widgets.
- Public wall only serves active `WALL_OF_LOVE` widgets.
- Wall slugs are globally normalized, reserve-word-protected, and may be generated by the server.
- Public payload omits author email.

Requirements:
- Replace local widget seeding with `GET /projects/:slug/widgets`.
- Map frontend `WidgetStudioConfig` to API create/update body:
  - `kind`, `layout`, `theme`
  - design tokens: `preset`, `accent`, `text`, `bg`, `line`, `surface`, `radius`, `fontFamily`, `fontHead`, `cardStyle`, `density`
  - visibility flags
  - behavior fields
  - `contentMode` and `pickedIds`
  - `wallSlug`, `wallTitle`, `wallSubhead`
  - `isActive`
- Initialize editor snapshots from API `config`.
- Save/reset/delete/duplicate/toggle must call the API and refresh caches.
- Show backend wall-slug validation errors in the wall slug field.
- Picked testimonial controls must use API-backed testimonials, not mock data.
- Share drawer copy and generated snippets must be updated or hidden until the embed/CDN/SDK strategy is decided.
- Wall URLs should follow the locked hosted convention `<project-slug>.walls.semblia.com` when the hosted route exists; do not keep `semblia.com/wall/:slug` as final copy without confirmation.

UI changes forced by the API:
- The API has different limits than current comments/types in places. For example, `maxItems` is 1-100 and `rotateInterval` is 1000-60000 server-side.
- The backend public wall handle is `wallSlug`, not project slug, but the hosted convention is project-slug based. This needs a clear UI rule.
- Public widgets only render approved and published testimonials. Current hand-pick UI pulls approved testimonials from mock data without checking publish visibility.

Open questions:
- Should the widget studio keep localStorage drafts after API wiring?
- Should hand-picking allow approved-but-unpublished testimonials, or only testimonials that are both approved and published?
- What is the real embed snippet for v2 before the SDK research is done?
- Should the React/npm SDK snippet be hidden until the SDK exists?
- How should the dashboard present hosted wall URLs if API public reads are `/v2/walls/:wallSlug` but hosted convention says `<project-slug>.walls.semblia.com`?
- Are widget metrics expected to be real in this pass, or should they stay zero/placeholders?

### Public Forms, Embeds, And Walls

Requirements:
- Public form, embed, and wall clients must be separate from authenticated dashboard clients.
- Public reads should tolerate 60-second cache staleness after mutations.
- Public payloads must use safe projections and must not show private fields like author email.
- Hosted surfaces need a route/domain plan before UI links can be considered final.

Open questions:
- Which app handles wildcard host routing for `<project-slug>.testimonials.semblia.com` and `<project-slug>.walls.semblia.com`?
- Do we need a local-development host simulation for these domains before wiring public flows?
- Should public wall route resolution use project slug, wall slug, or both at the frontend layer?

### Analytics

Current UI state:
- `AnalyticsDashboard` builds data from mock projects, testimonials, widgets, API keys, and mock time series.
- It includes tabs for overview, collection, pipeline, engagement, sources, and API.

API contract:
- No dedicated analytics API was part of the completed API surface.
- Widget metrics in widget DTOs are limited and may be placeholder/aggregate values.
- Form analytics fields are placeholders.

Requirements:
- Do not pretend analytics is wired as part of the API surface wiring.
- Either keep Analytics explicitly mocked, hide it behind a placeholder, or create a new analytics API phase.

Open questions:
- Should Analytics remain visible with mock data during the first real API wiring pass?
- Should the API tab be hidden because API keys and API usage are out of scope?
- Which analytics panels are required for launch versus later?

### API Keys, Billing, Notifications, Alerts, Ops Admin

Current UI state:
- API Keys project pages and hooks are mock-backed.
- Billing account pages are mock-backed.
- Notification bell uses `MOCK_NOTIFICATIONS`.
- Analytics alert rail is derived from mock analytics data.

API contract:
- API keys, billing, and notification APIs are out of scope for the completed `api_v2` pass.
- Alerts and ops-admin expose only `_status` placeholders and have no concrete `web_v2` contract.

Requirements:
- Decide per surface before implementation:
  - keep mock as explicitly non-production
  - hide from nav
  - replace with "coming later"
  - start a separate API phase
- Do not wire alerts/ops-admin `_status` as if it were a real product surface.

Open questions:
- Should API Keys stay in the project sidebar for now?
- Should billing remain account-visible while backed only by mocks?
- Should the notification bell be hidden until a notification API exists?
- Should ops/admin be excluded from `web_v2` entirely for now?

## Proposed Wiring Sequence

This is a requirements sequence, not permission to implement without review.

1. Client foundation
   - envelope unwrapping
   - error normalization
   - Clerk token plumbing
   - public unauthenticated client
   - date/DTO adapters

2. Users, onboarding, and projects
   - current user
   - project list/detail
   - project shell/topbar/sidebar/project switcher
   - settings save/delete
   - decide onboarding behavior before wiring welcome flow

3. Testimonials dashboard
   - list/detail
   - approve/reject/publish
   - capability-aware controls
   - refetch/rollback behavior

4. Forms dashboard studio
   - list/create/delete/duplicate/toggle
   - editor snapshot hydration
   - save/reset
   - resolve answers/rating/A-B questions before declaring public form complete

5. Widgets dashboard studio
   - list/create/delete/duplicate/toggle
   - editor snapshot hydration
   - save/reset
   - hand-picked content source
   - share drawer copy/snippets after hosted/embed decisions

6. Public hosted/render surfaces
   - public form render/submit
   - public embed render
   - public wall render
   - subdomain/custom-domain routing decisions

7. Deferred or hidden surfaces
   - analytics
   - API keys
   - billing
   - notifications
   - alerts/ops-admin

## Clarifications Needed From The User

1. Should onboarding be re-enabled now using `onboardingCompletedAt`, or should it remain dark while core dashboard wiring lands?
2. Should `jobTitle`, referral source, and intent answers be persisted? If yes, where?
3. Should `/projects` handle server pagination now, or is loading up to 100 projects acceptable for the first pass?
4. Should members, allowed origins, and signing secret controls be added to Settings in this wiring pass?
5. Should API Keys, Billing, Notifications, and Analytics remain visible while their APIs are not in scope?
6. Is multi-form A/B testing committed for v2 launch, or should we simplify to one active form first?
7. Where should custom form `answers` be stored and surfaced?
8. Should forms support 10-point/NPS ratings as testimonials, or should that be modeled separately?
9. Should studios keep localStorage drafts after API wiring?
10. For widgets, should hand-picking include approved-but-unpublished testimonials, or only testimonials that are already public?
11. What should the v2 embed snippet be before SDK research lands?
12. Should React/npm SDK snippets be hidden until the SDK is real?
13. What is the dashboard-facing URL rule for walls: project hosted domain, wall slug URL, or both?
14. Which app/server will handle wildcard hosted domains for forms and walls?
15. Should public hosted pages be wired now, or should dashboard CRUD come first with hosted rendering as a later phase?

## Non-Assumptions

- I am not assuming API docs will be generated or updated in this pass.
- I am not assuming mock-backed UI pages are production-ready just because they exist.
- I am not assuming localStorage studio persistence is acceptable after real API wiring.
- I am not assuming SDK, CDN, or hosted-domain URLs are real until you confirm the delivery model.
- I am not assuming collaboration UI should be invented just because the backend endpoints exist.
