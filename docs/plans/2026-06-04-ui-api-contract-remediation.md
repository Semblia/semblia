# UI ↔ API Contract Remediation — Phased Plan

**Date:** 2026-06-04
**Branch:** `revamp/v2`
**Source:** `docs/ui-api-contract-audit-2026-06-04.md` (16 findings, severity-ranked)

Derived execution plan for the audit. One checkpoint commit per phase. Each
phase ends with `tsc --noEmit`, `eslint`, `vitest`, and `pnpm build --filter web_v2`.

User decisions (2026-06-04):

- Sequencing: **Phase 1 only this session, then check in.**
- Phase 3 new pages (webhooks/exports/integrations): **full CRUD/management UI** when reached.

---

## Phase 1 — Drift & defunct-concept cleanup (web_v2 only)

Pure correctness; no backend/DTO edits. Maps to audit findings #5, #6, #11, #13, #15, #16, #14.

1. **#5 dead publish scopes** — drop `responses:publish` / `responses:unpublish`
   from the key-scope picker (`create-key-form.tsx`). (Backend `V2ApiKeyScope`
   literal retained — that dedup is a backend task.)
2. **#6 publish concept in analytics** — the product dropped publish; "approved"
   is now the public/terminal state:
   - KPI `published` → `approved` (count of approved) in adapter + types + dashboard.
   - Funnel: drop the `published` step.
   - Remove `PublishRateCard` (overview + pipeline tabs); delete the component;
     drop `PublishRateData` + `publishRate` from types/adapter.
   - Drop dead `isPublished` from `ContentPerformanceRow` type + adapter; fix
     stale "No published responses yet" copy.
3. **#11 ratingScale** — plumb `ratingScale` through `display.ts` → `ResponseVM`
   → `Stars`, so a 4/10 no longer renders as 4/5.
4. **#13 deviceSplit.unknown** — add `unknown` to local `DeviceSplit` + adapter;
   render it (chart-5 neutral) so device shares use the full denominator.
5. **#15 alerts** — contract `alerts` is a permanent `[]`; remove `AlertsRail`
   (engagement + api tabs), delete component, drop `AlertEntry` + `alerts` from
   types/adapter.
6. **#16 dead analytics-summary wrapper** — remove `fetchAnalyticsSummary` /
   `useAnalyticsSummary` / `AnalyticsSummaryParams` / `analytics.summary` query
   key + the two tests that exercise the dead wrapper. Endpoint + DTO retained
   (MCP server uses it).
7. **#14 api-key dual fields** — UI already consistent on `keyType`/`keyPrefix`
   (the `.type` hits are *event* types). No web change; DTO-level dedup
   (`type`/`prefix`/legacy `permissions`) is a backend task.

## Phase 2 — Surface rich Responses data (deferred to next session)

#4 `moderationRuns[]`, #10 annotation create + sentiment + moderatedAt/By.

## Phase 3 — Net-new Developer surfaces (deferred)

#2 exports (+`downloadExport` client fn), #1 outbound webhooks, #3 integrations,
#7 action-audit. **Full CRUD/management UI.**

## Phase 4 — Collect Studio config expansion (deferred)

#8 behavior/delivery/watermark/consent/videoUrl/OAuth, #9 A/B abWeight, #12 draft publish.
