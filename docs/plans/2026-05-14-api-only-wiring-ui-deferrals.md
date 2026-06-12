# API-Only Wiring And UI Deferrals

Date: 2026-05-14

> **Status: superseded as of 2026-05-28.** Every item in the "Remaining Follow-Up Work" table below has shipped, and the `apps/web_v2/lib/mock-data*` layer has been deleted entirely. Specifically:
>
> - Testimonials list/detail components — wired as `7b3d1dc` `feat(web_v2): wire testimonials list/detail to live V2 API`.
> - Analytics dashboard — endpoint `90443dd` (2026-05-15) per `docs/plans/2026-05-15-analytics-api-expansion.md`; UI wired as `bd1a7d6` `feat(web_v2): wire analytics dashboard to live V2 API`; `apps/web_v2/lib/analytics/aggregate.ts` deleted in the same pass.
> - Widget studio — wired as `e542957` `feat(web_v2): wire widget gallery to live V2 API`; form studio wired as `88af22f` `feat(web_v2): wire form studio to live V2 draft API`.
> - Billing — full Razorpay Subscriptions integration shipped in B1-B7 (see `docs/continuity/progress.md` billing track and `docs/billing-security-audit-2026-05-26.md`).
> - Mock layer — deleted entirely as `c057ec9` `refactor(web_v2): delete mock-data layer in favor of V2 DTOs`.
>
> The "Deferred API/UI Boundary Questions" and "Next Safe Step" sections are also obsolete. Open work that genuinely remains lives in `docs/continuity/progress.md`; consult it before treating any line below as current. The document is preserved as historical record of the 2026-05-14 wiring state, not as live guidance.

---


## Scope

This pass continues the `web_v2` API wiring without changing UI pages, layout, visual components, or product flows. The safe implementation boundary is the typed API client plus React Query hook layer.

## API-Only Wiring Added

- `apps/web_v2/lib/semblia-api.ts` now exposes typed functions for backend routes that already exist but were not yet available to `web_v2` consumers:
  - current organization summary
  - notifications list, unread count, mark-read, mark-all-read, and preferences
  - project analytics summary and public analytics event capture
  - public surface host resolution
  - project action-audit reads
  - outbound webhook endpoints, deliveries, retry, and secret rotation
  - CSV export delivery creation and reads
  - native integration connections and one-way export delivery creation
- `apps/web_v2/hooks/api/*` now exposes hook-level seams for those same domains using the shared live-query options and centralized query keys.

## Live Hook Usage Added

- 2026-05-15 follow-up: `apps/web_v2/components/nav/notification-bell.tsx` and `apps/web_v2/app/(account-shell)/account/notifications/page.tsx` now use the live notification hooks instead of `MOCK_NOTIFICATIONS`/`getUnreadNotificationCount`.
- The bell reads `useNotificationsList({ pageSize: 5 })` plus `useUnreadNotificationCount()` and marks unread linked notifications through `useMarkNotificationRead()`.
- The account notifications page renders a live notification inbox with `useNotificationsList({ pageSize: 20 })`, unread count, notification preferences read status, `useMarkNotificationRead()`, and `useMarkAllNotificationsRead()`.

## Phase 1 Completion (2026-05-14)

The following items from the original "UI Rework Skipped" list have been completed:

- **API keys**: All 4 components (`api-keys-client.tsx`, `api-key-list-item.tsx`, `api-key-detail-client.tsx`, `create-key-dialog.tsx`) fully rewritten to use `V2ApiKeyDTO`, `useApiKeysList`, `useRevokeApiKey`, `useRotateApiKey`, `useCreateApiKey`, and `useApiKeyEvents`. Legacy `use-api-keys.ts` has no remaining consumers.
- **Page-level identity**: All 10 `[slug]` server pages now use `serverFetchProjectBySlug` instead of `getProjectBySlug`. No server component imports `mock-data.ts`.
- **Shared utilities**: `timeAgo`, `PROJECT_TYPE_LABELS`, `MODERATION_STATUS_LABELS` centralized in `lib/format.ts`. All `components/` consumers updated.

## Phase 2 Completion (2026-05-15)

- **TestimonialsInbox**: Refactored to slug-only boundary per Codex guidance. Accepts only `slug`, derives `projectId`, `_count.testimonials`, `_count.pendingModeration`, and `collectionUrl` via `useProject(slug)` internally. Guards rendering until `project.id` exists. Note: `TestimonialsClient` list/detail components still use `MockTestimonial` and legacy `apiGetTestimonials` — full field-level migration is follow-up work.
- **SettingsClient**: Adapted to `V2ProjectDTO` directly. Added `normalizeProject()` helper for stable nullable field normalization (`description ?? ""`, `websiteUrl ?? ""`, `socialLinks ?? {}`, `tags ?? []`, `profanityFilterLevel ?? "OFF"`). Added `recordToSocialLinks`/`socialLinksToRecord` converters between flat API record and rich UI `SocialLinks` type. Wired `useUpdateProject` and `useDeleteProject` mutations.

## Remaining Follow-Up Work

The following surfaces still depend on mock-data or mock-shaped component props at the **component** level.

| Area | Current mock dependency | Why deferred |
| --- | --- | --- |
| Testimonials list/detail components | `apps/web_v2/components/testimonials/testimonials-client.tsx`, `testimonial-row.tsx`, `testimonial-detail.tsx`, `use-testimonial-moderation.ts` | Use `MockTestimonial`, `apiGetTestimonials`, `apiApproveTestimonial`, `apiRejectTestimonial`. Needs component-level prop changes to use V2 testimonial hooks. |
| Analytics dashboard | `apps/web_v2/components/analytics/analytics-dashboard.tsx` | Dashboard computes mock time series locally. The `useAnalyticsSummary` hook is ready, but chart/data mapping is UI work. |
| Widget studio internals | `apps/web_v2/components/widgets/studio/*`, `apps/web_v2/components/widgets/preview-renderers/*` | Widget previews use `MockProject`/`MockTestimonial` in local draft assumptions. Page-level identity is wired; full studio persistence is out of scope per Codex. |
| Billing | All billing surfaces | Blocked on source-of-truth decision (DB/Razorpay/provider-sync). Do not touch. |

Surfaces with no existing first-class page yet:

- Action audit, outbound webhook deliveries, CSV export deliveries, and native integration delivery streams have typed hooks, but `web_v2` does not currently expose dedicated pages/components for them. Adding those views is product/UI work, so this follow-up does not invent new screens.

## Deferred API/UI Boundary Questions

- Authenticated CSV download currently returns `text/csv` from `GET /v2/projects/:slug/exports/deliveries/:deliveryId/download`. A future UI pass should decide whether to fetch the file directly with a Clerk token, proxy through a Next route handler, or expose a short-lived download URL from `api_v2`.
- Billing remains blocked on the source-of-truth decision recorded in `docs/continuity/open-questions.md`; this pass does not add billing client behavior beyond the existing read-only placeholders.

## Next Safe Step

Testimonials inbox and settings are now live-wired. The next safest surface is **analytics dashboard** (`useAnalyticsSummary` hook is ready, chart mapping is bounded). After that, the **testimonial list/detail** components can be migrated to V2 hooks. Widget studio internals and billing remain deliberately out of scope.

## 2026-05-19 Settings rebuild

The project Settings area was rebuilt as sub-routes (General / Branding / Visibility / Social / Hosts / Trust / Members / Danger) under a shared `SettingsShell`. Trust now consumes the previously unrendered `useAllowedOrigins`, `useReplaceAllowedOrigins`, `useGenerateSigningSecret`, and `useClearSigningSecret` hooks. Members consumes `useProjectMembers` plus three newly added mutation hooks (`useAddProjectMember`, `useUpdateProjectMember`, `useRemoveProjectMember`). Hosts derives the deterministic `<slug>.testimonials.semblia.com` / `<slug>.walls.semblia.com` hostnames client-side. Two backend gaps remain for Codex delegation: `GET /v2/projects/:slug/public-surface-hosts` (so Hosts can swap derivation for live data) and an email-keyed invite path for `addProjectMember` (so Members can replace its "Coming soon" affordance).
