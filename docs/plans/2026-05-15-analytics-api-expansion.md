# Analytics API Expansion for Dashboard Wiring

Date: 2026-05-15
Owner: Codex (build) — Claude orchestrates and commits the checkpoint
Branch: `revamp/v2`

## Purpose

`apps/web_v2/components/analytics/analytics-dashboard.tsx` is the last large UI surface still driven entirely by mock data through `lib/analytics/aggregate.ts`. The existing `GET /v2/projects/:slug/analytics/summary` returns only daily totals; the dashboard expects ~15 derived shapes (funnel, pipeline, publish rate, top sources, ratings distribution, widget engagement, top countries, content performance, API usage, day-hour heatmap, device split, prev-period comparison).

The existing event/aggregate tables already contain enough data to back most of these shapes; only **per-API-key daily series** and **operational alerts** have no current backing. This document specifies the new endpoints and DTOs so Codex can implement them without further round-tripping.

## Source-of-truth tables already populated

- `ProjectAnalyticsDaily` — daily totals per project (formViews, formSubmissions, widgetLoads, testimonialImpressions, hostedPageViews, apiRequests)
- `FormImpression` — raw form-impression events (projectId, formId, ipAddress, userAgent, timestamp)
- `WidgetAnalytics` — raw widget load events (widgetId, projectId, loadTime, layoutType, browser, device, country, errorCode, version, timestamp)
- `TestimonialImpression` — raw testimonial impressions (testimonialId, widgetId, projectId, device, country, timestamp)
- `CollectionFormSubmission` — canonical submissions (projectId, createdAt, …)
- `Testimonial` — moderation status, isPublished, autoPublished, rating, oauthProvider, source, content, authorName, authorCompany, createdAt, updatedAt
- `ApiKey` — usageCount, usageLimit, rateLimit, lastUsedAt, isActive, type, name, keyPrefix

## Out of scope for this pass

- **Per-API-key daily usage series** (would require a new `ApiKeyUsageDaily` table or rollup of an `ApiKeyUsageEvent` table that does not exist). For v1, return totals plus `lastUsedAt`, `usageCount`, `rateLimit`, and an empty `series: []`. Frontend will render a flat sparkline placeholder.
- **Operational alerts** (load-time/error-rate exceedance). Not a v1 backend feature. Return `alerts: []`. Frontend hides the alerts rail when empty.

## Endpoint plan

All routes are project-scoped, `@RequireCapability(Capability.VIEW_PROJECT)`, mounted under `@Controller("projects/:slug/analytics")`. Reuse the same `request.projectAccess.projectId` resolution pattern as the existing `getSummary` handler.

Add **one consolidated endpoint** that returns the full dashboard payload in a single round trip:

```
GET /v2/projects/:slug/analytics/dashboard
  ?days=30                  // default 30, clamp 1..365
  &compare=prev|none        // default prev — returns prev-period totals + daily
```

A single endpoint matches the UI's "one fetch per dashboard load" pattern and avoids fan-out from the React hook layer. Keep the existing `GET /v2/projects/:slug/analytics/summary` route as-is for backwards compatibility (it is consumed by the agent/MCP server).

## Response DTO

Add to `packages/types/src/v2.ts`:

```ts
export interface V2AnalyticsDailyPointDTO {
  day: string;                   // YYYY-MM-DD
  formViews: number;
  formSubmissions: number;
  approved: number;              // moderation transitions (approximation: testimonials whose moderationStatus=APPROVED and updatedAt that day)
  rejected: number;              // updatedAt that day with moderationStatus=REJECTED
  flagged: number;               // updatedAt that day with moderationStatus=FLAGGED
  published: number;             // testimonials whose isPublished=true and updatedAt that day
  widgetLoads: number;
  testimonialImpressions: number;
  hostedPageViews: number;
  apiRequests: number;
  avgLoadMs: number;             // mean WidgetAnalytics.loadTime that day, 0 when no loads
  errorCount: number;            // WidgetAnalytics rows with errorCode != null that day
}

export interface V2AnalyticsFunnelDTO {
  steps: Array<{
    key: "form_impressions" | "submitted" | "approved" | "published";
    label: string;
    value: number;
  }>;
}

export interface V2AnalyticsPipelineDTO {
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  autoResolved: number;          // testimonials with autoPublished=true
  totalWithAutoMod: number;      // total testimonials in the project
  medianApprovalHours: number | null;
}

export interface V2AnalyticsPublishRateDTO {
  totalApproved: number;
  totalPublished: number;
  publishRate: number;           // 0..100, totalPublished / totalApproved * 100, 0 when totalApproved=0
  autoPublishedShare: number;    // 0..100, autoPublished / totalPublished * 100, 0 when totalPublished=0
}

export interface V2AnalyticsSourceEntryDTO {
  source: string;                // raw key: oauthProvider ?? source ?? "manual"
  count: number;
  approvalRate: number;          // 0..100
  oauthVerified: boolean;        // any testimonial in this bucket has oauthProvider set
}

export interface V2AnalyticsRatingsDTO {
  distribution: { rating: 1 | 2 | 3 | 4 | 5; count: number }[];
  average: number;               // 0 when no ratings
  total: number;
}

export interface V2AnalyticsWidgetEngagementDTO {
  widgetId: string;
  widgetName: string;
  widgetType: string;
  layoutType: string;
  totalLoads: number;
  avgLoadMs: number;
  errorCount: number;
  impressions: number;           // TestimonialImpression count where widgetId matches
  lastLoadAt: string | null;     // ISO
}

export interface V2AnalyticsCountryEntryDTO {
  countryCode: string;           // ISO-2 from event rows; "UNKNOWN" when null
  impressions: number;           // TestimonialImpression + WidgetAnalytics summed
}

export interface V2AnalyticsDeviceSplitDTO {
  mobile: number;
  tablet: number;
  desktop: number;
  unknown: number;
}

export interface V2AnalyticsContentRowDTO {
  testimonialId: string;
  authorName: string;
  authorCompany: string | null;
  content: string;
  impressions: number;
  rating: number | null;
  moderationStatus: string;
  isPublished: boolean;
  createdAt: string;
}

export interface V2AnalyticsApiKeyUsageDTO {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  keyType: "SECRET" | "PUBLISHABLE" | "AGENT";
  usageCount: number;
  usageLimit: number | null;
  rateLimit: number;
  lastUsedAt: string | null;
  isActive: boolean;
  series: number[];              // always [] for v1; reserved for future per-key daily rollup
}

export interface V2AnalyticsHeatmapCellDTO {
  day: number;                   // 0..6, 0=Sunday (UTC)
  hour: number;                  // 0..23 (UTC)
  count: number;
}

export interface V2AnalyticsDashboardDTO {
  range: {
    days: number;
    since: string;               // ISO
    until: string;               // ISO
  };
  totals: V2AnalyticsSummaryDTO["totals"] & {
    approved: number;            // current-period count of moderationStatus=APPROVED rows updated in range
    rejected: number;
    flagged: number;
  };
  daily: V2AnalyticsDailyPointDTO[];
  previous: {
    range: { days: number; since: string; until: string };
    totals: V2AnalyticsDashboardDTO["totals"];
    daily: V2AnalyticsDailyPointDTO[];
  } | null;                      // null when compare=none
  funnel: V2AnalyticsFunnelDTO;
  pipeline: V2AnalyticsPipelineDTO;
  publishRate: V2AnalyticsPublishRateDTO;
  topSources: V2AnalyticsSourceEntryDTO[];      // sorted desc by count
  ratings: V2AnalyticsRatingsDTO;
  widgetEngagement: V2AnalyticsWidgetEngagementDTO[];
  topCountries: V2AnalyticsCountryEntryDTO[];   // sorted desc by impressions, top 10
  deviceSplit: V2AnalyticsDeviceSplitDTO;
  contentPerformance: V2AnalyticsContentRowDTO[]; // top 10 by impressions
  apiKeyUsage: V2AnalyticsApiKeyUsageDTO[];
  oauthVerifiedShare: number;    // 0..100
  submissionsByDayHour: V2AnalyticsHeatmapCellDTO[];
  alerts: [];                    // reserved; always empty in v1
}
```

## Query semantics

- `days` clamps to `[1, 365]`. Default `30`.
- `compare`: `"prev" | "none"`. Default `"prev"`. When `"prev"`, also compute the immediately preceding window of the same length.
- `since` = `startOfUtcDay(now, days)` (matches existing `analytics.service.ts` helper).
- Prev window: `since_prev = startOfUtcDay(now, days * 2)` … `until_prev = since - 1ms`.

## Implementation notes

1. **Reuse `analytics.service.ts`'s `startOfUtcDay` helper.** Move it to a private static or shared helper if needed.
2. **Daily timeseries with moderation transitions:** join `ProjectAnalyticsDaily` rows by `day` with grouped Testimonial updatedAt counts. Use a single Prisma `$queryRaw` for the moderation transition group-by; PostgreSQL `DATE_TRUNC('day', "updatedAt" AT TIME ZONE 'UTC')` keyed by `moderationStatus` is fine. Days with no row in either side must still appear in the response — generate the day axis in JS and zero-fill.
3. **Average load time / error count per day** come from `WidgetAnalytics`. Group by `DATE_TRUNC('day', timestamp)` with `AVG(loadTime)`, `COUNT(*) FILTER (WHERE "errorCode" IS NOT NULL)`. Zero-fill missing days.
4. **Pipeline counts** are project-wide totals across all Testimonial rows (not range-scoped), matching the existing mock semantics. `medianApprovalHours`: pull `updatedAt - createdAt` for APPROVED rows; compute median in JS (limit query to a few thousand rows; if a project ever has more, use `percentile_cont(0.5)` SQL).
5. **Top sources:** group Testimonial rows by `COALESCE(oauthProvider, source, 'manual')`, count + approval ratio.
6. **Ratings:** group Testimonial by `ROUND(rating)` where `rating IS NOT NULL`. Cap to integer ratings 1-5.
7. **Widget engagement:** group WidgetAnalytics by widgetId for `totalLoads`, `AVG(loadTime)`, `COUNT(errorCode)`, `MAX(timestamp)`. Join Widget for `name`/`type`/`layout`. Cross-reference TestimonialImpression for `impressions` per widget.
8. **Top countries:** UNION ALL of WidgetAnalytics.country + TestimonialImpression.country, group, sort desc, top 10. NULL → `"UNKNOWN"`.
9. **Device split:** group both event tables by lowercased `device`; map to mobile/tablet/desktop/unknown. Unknown when null or unmapped.
10. **Content performance:** Testimonial rows ranked by TestimonialImpression count desc, limit 10. Include rows with 0 impressions only if count of testimonials < 10.
11. **API key usage:** list project's ApiKey rows. `series: []`. No new tables.
12. **Heatmap:** `CollectionFormSubmission` grouped by `EXTRACT(DOW FROM createdAt)`, `EXTRACT(HOUR FROM createdAt)` in UTC. Restrict to current range window.
13. **`oauthVerifiedShare`:** `Testimonial` rows where `oauthProvider IS NOT NULL` over total Testimonial rows.

## Performance budget

- One controller call should be at most ~8-10 database round trips. Use `Promise.all` and Prisma group-by where possible.
- Avoid N+1 widget loops; pre-fetch widgets and impressions then merge.
- Cap content performance to 10 rows; cap top sources to no limit (rare for a project to have >10 source buckets); cap top countries to 10.

## Validation

Use the existing `analyticsSummaryQuerySchema` style. Add `analyticsDashboardQuerySchema`:

```ts
export const analyticsDashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  compare: z.enum(["prev", "none"]).default("prev"),
});
```

## Test coverage requirements

Add `apps/api_v2/src/modules/analytics/analytics-dashboard.spec.ts` covering:

1. Auth/capability: missing capability → 403; missing slug → 404.
2. Days clamp: `?days=0` → 400; `?days=400` → 400.
3. Empty project (zero data): all numeric fields are 0, arrays are `[]`, `medianApprovalHours: null`, `previous` present with same shape, `alerts: []`, `apiKeyUsage[].series: []`.
4. With seed data: daily zero-fill ordering, funnel monotonicity (each step ≤ previous), `publishRate` correctness, pipeline totals sum to total testimonials, ratings distribution honors rounding, top sources sorted desc, top countries sorted desc and capped to 10, content performance capped to 10 and sorted desc.
5. `compare=none` returns `previous: null`.
6. Snapshot: full DTO shape conforms to TypeScript type at compile time (use `expectTypeOf` from `vitest`).

Reuse the existing fixture/seed helpers in `analytics.spec.ts` where present.

## Deliverables checklist (Codex)

- [ ] `packages/types/src/v2.ts` — DTO additions and barrel export
- [ ] `packages/types` build passes (`pnpm --filter @workspace/types build`)
- [ ] `apps/api_v2/src/modules/analytics/analytics.dto.ts` — new query schema + body types
- [ ] `apps/api_v2/src/modules/analytics/analytics.service.ts` — new `getDashboard(projectId, options)` method, helper functions kept private
- [ ] `apps/api_v2/src/modules/analytics/analytics.controller.ts` — new `GET /dashboard` handler reusing capability guard
- [ ] `apps/api_v2/src/modules/analytics/analytics-dashboard.spec.ts` — new suite per coverage requirements
- [ ] `apps/api_v2/src/modules/analytics/analytics.spec.ts` — keep existing tests green
- [ ] `apps/api_v2` typecheck, lint, test, build all pass
- [ ] OpenAPI docs regenerate cleanly (`docs/api/openapi.json` shows new route)
- [ ] Honor existing security posture: throttle defaults are inherited; no PII leakage in the dashboard response (do not include IP, userAgent, raw private metadata, or email anywhere)
- [ ] Mark the existing `analytics.service.ts` `getSummary` path untouched in behavior

## Verification commands the orchestrator will run after Codex returns

```
pnpm --filter @workspace/types build
pnpm --filter api_v2 typecheck
pnpm --filter api_v2 lint
pnpm --filter api_v2 test
pnpm build --filter api_v2
python scripts/update-indexes.py
python scripts/rebuild-graphify.py
```

Followed by a single checkpoint commit on `revamp/v2` with a focused subject line such as:

```
feat(api_v2): expand analytics with consolidated dashboard endpoint
```

After this lands, the orchestrator (Claude) will wire `apps/web_v2/components/analytics/analytics-dashboard.tsx` to the new `useAnalyticsDashboard` hook in a follow-up commit, retiring `lib/analytics/aggregate.ts` and the `getProjectBySlug`/`getTestimonialsByProject`/`getWidgetsByProject`/`getApiKeysByProject` mock pulls.
