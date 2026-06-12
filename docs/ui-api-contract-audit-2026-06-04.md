# Semblia v2 — UI ↔ API Contract Audit

**Date:** 2026-06-04
**Branch:** `revamp/v2`
**Scope:** What the `web_v2` UI fails to surface that the `api_v2` contract provides — gaps, drifts, over-commits, and subtle contract differences.

## Method

Mapped all 26 API controllers (every `@Get/@Post/@Patch/@Put/@Delete` route) against the UI's client layer (`apps/web_v2/lib/semblia-api.ts`, 100+ functions), its React-Query hooks (`apps/web_v2/hooks/api/*`), the shared DTO contract (`packages/types/src/v2.ts`, 1,202 lines), and the actual route/component tree.

"Surfaced" means a real page or component consumes it — not merely that a client wrapper or hook exists.

**Headline:** The API client is ~95% complete, but three entire product features and a long tail of fields are wired in the client/hook layer with **no UI consumer at all**. The gap is between hooks-exist and pixels-exist. The UI's *quality* on covered surfaces is high; what it lacks is *breadth*.

---

## 1. Entire features built end-to-end in the API + client, with ZERO UI

Full controllers, DTOs, client functions, **and** exported React-Query hooks — but no page and no component imports them. Verified zero consumers outside `hooks/api/`.

| Feature | API surface | Client + hooks | UI |
|---|---|---|---|
| **Outbound webhooks** | 11 routes (`projects/:slug/outbound-webhooks` — CRUD, deliveries, retry, rotate-secret, disable, revoke) | 11 client fns + `use-outbound-webhooks-api.ts` | **None.** No page, no link. Not in Developers overview. |
| **Exports** | `POST exports/csv`, `GET deliveries`, `GET deliveries/:id`, `GET deliveries/:id/download` | `use-exports-api.ts` (`useExportDeliveries`, `useExportDelivery`, `useCreateCsvExport`) | **None.** No export page; the Responses inbox has no "Export CSV" button either. |
| **Native integrations** | `projects/:slug/integrations` — list, connect, patch, disable, native export (Slack / Notion / Linear / GitHub) | `use-integrations-api.ts` (5 hooks) | **None.** No `*integration*` file exists in `components/` at all. |

The Developers overview (`components/developers/developer-overview-client.tsx`) links to only **Keys, Agents, and external Docs**. Webhooks, Exports, and Integrations are advertised in the API-key scope picker ("List endpoints and deliveries", "Trigger new exports", "Manage native integration connections") but a user has no in-app way to use any of them.

> Second-order effect: the `download` route for exports has **no client function at all** (`downloadExport` doesn't exist), and `V2ExportDeliveryDTO.artifactAssetId` is never read — so even if the list were surfaced, the artifact couldn't be retrieved.

---

## 2. Orphaned client/hooks (built, exported, never consumed)

- **Project action-audit** — `GET projects/:slug/action-audit` + `useProjectActionAudit` (`use-project-audit-api.ts`). **Zero consumers.** The per-project audit trail (who moderated, who rotated keys, actor/target/action) is invisible.
- **Analytics summary** — `fetchAnalyticsSummary` / `useAnalyticsSummary` (the `/analytics/summary` endpoint). **Zero consumers** — superseded by `useAnalyticsDashboard`. Dead wrapper; the endpoint still ships.
- **Form draft *publish*** — `PUT forms/:formId/draft/publish` (with `publishStudioDraftBodySchema` + version control) has **no client function and no UI**. The Collect studio only calls `saveFormDraft` (`PUT …/draft`). `V2StudioDraftDTO.publishedVersion` is never read, so there's no "unpublished changes" indicator and no publish action.

---

## 3. Capabilities the API can set, but the UI renders read-only or not at all

### Collect Form Studio — `V2FormConfigDTO` blocks never surfaced as controls
The studio model (`lib/collect/studio-types.ts`) covers **content, branding, layout, custom questions, loader/success screens** — but the following DTO config exists *only* in the type mirror (`lib/collect/types.ts`) with **no editable control** in any `components/collect/` file:

- `behavior.oauthProviders` (Google / GitHub **verified-submitter sign-in**) — significant: this feeds `autoApproveVerified`, the analytics `oauthVerifiedShare`, and the per-source `oauthVerified` flag, none of which the user can turn on.
- `behavior.allowAnonymous`, `behavior.notifyOnSubmission` (per-form email), `behavior.allowFingerprintOptOut`
- `behavior.moderation` (per-form **auto/manual** override — only the account/project-level toggle is surfaced)
- `fields.videoUrl` (video testimonial collection) and `fields.consent` (`declaration` vs `checkbox` + label)
- `delivery.customDomain`, `delivery.pathSuffix`, `delivery.embedScriptEnabled`
- `watermark.show` / `watermark.position`

> **Structural drift:** the API models a **fixed field set** (`fields.{email, rating, jobTitle, company, avatar, videoUrl, consent}`, each with `enabled/required`, rating `scale: 5|10`), while the studio models **arbitrary custom questions**. These two shapes do not map cleanly onto each other — the standard typed fields and their `required`/`scale` semantics aren't reliably expressible from the question-based UI.

### A/B testing weight — display-only
`V2FormConfigEntry.abWeight` is **settable** in the API on both create and update (`forms.dto.ts:35,45`) and drives form ordering (`orderBy abWeight desc`). The UI **displays** `{abWeight}%` (`form-item-card.tsx:190`, `form-item.tsx:188`) but offers **no control to set it**. A/B traffic splitting is a visible metric you can't configure.

### Annotations — read-only
`response-detail.tsx` *renders* existing annotations (note + labels), and `createResponseAnnotation` / its hook (with `note`, `labels`, `sentiment`) exist — but **no component lets a reviewer create one**. Also `annotation.sentiment` is never displayed even when present.

---

## 4. DTO fields the API returns but the UI never renders

### `V2ResponseDTO` (the Responses inbox) drops the richest data
The `ResponseVM` flattener (`lib/responses/view-model.ts`) discards:

- **`moderationRuns[]`** — the entire AWS-first moderation pipeline output (per-artifact `decision`, `score`, `categories: Record<string,number>` confidences, `provider`, `status`, `flags`). **Zero references anywhere in the UI.** Instead the inbox reads only `metadata.moderationFlags` (a loose string array). The structured pipeline that commit `00474a4` added is invisible to reviewers.
- **`ratingScale`** — `Stars` renders `rating` with no scale denominator, so a `4/10` rating displays as 4 of an assumed 5 stars. Subtle but real misrepresentation.
- **`moderatedAt` / `moderatedByActorType` / `moderatedByActorId`** — reviewers can't see who moderated or when.

### `V2AnalyticsDeviceSplitDTO.unknown` dropped
The adapter (`lib/analytics/dto-adapter.ts:223-227`) maps `mobile/tablet/desktop` but **silently omits `unknown`**, so device-split shares are computed against an incomplete denominator.

---

## 5. Drifts & defunct-concept leakage

### "Publish" was removed from the product, but the contract still advertises it everywhere
The Responses surface dropped publish (commit `a0835b0`; `useResponseModeration` has no publish; `moderateResponse` is approve/reject/flag only). Yet:

- **API-key scope picker** (`components/developers/keys/create-key-form.tsx:147-155`) still offers **`responses:publish`** ("Publish so they appear publicly") and **`responses:unpublish`** as grantable scopes — dead scopes mapping to no functioning behavior. (`V2ApiKeyScope` still declares both.)
- **Analytics dashboard actively renders publish for a defunct action**: `publish-rate-card.tsx` (publishRate, autoPublishedShare), the funnel's `"published"` step, `totals.publishedTestimonials`, and `content-performance-table.tsx` reading `isPublished`. Users see a "publish rate" they can no longer influence.

### `V2ApiKeyDTO` carries duplicated transitional fields, consumed inconsistently
`type` **and** `keyType`; `prefix` **and** `keyPrefix`; plus a legacy `permissions: {widgets, responses, analytics}` object **alongside** the modern `scopes[]`. The developer UI mixes them: `.keyType` (4×) and `.type` (4×), `.keyPrefix` (9×). Pick one; the dual surface invites divergence.

### `alerts` is a permanent empty tuple
`V2AnalyticsDashboardDTO.alerts: []` is typed as an always-empty array, yet the UI ships `components/analytics/alerts-rail.tsx`. The rail can never populate — an over-commit on the UI side against a stubbed contract field.

---

## 6. Asymmetries & subtler contract differences

- **Forms have a publish lifecycle; widgets don't.** Forms expose `…/draft` **and** `…/draft/publish`; widgets expose only `…/draft`. The UI publishes neither, but the API asymmetry means a future "publish" affordance would behave differently per surface.
- **`successAction` shape mismatch (handled, not broken):** DTO uses `content.successAction = {kind:"message"} | {kind:"redirect", url}`; the studio uses `success.action` + `success.redirectUrl`. The adapter bridges it — flagged only because it's an easy place for a field-name regression.
- **Runtime/public endpoints** (`runtime/forms/resolve|submit`, `forms/public/...`, `responses/public/...`, `widget-embeds/:id`, `walls/:slug`) are correctly *not* in the app client — they're for the embed/hosted runtime. Confirmed **not** a gap.

---

## Severity summary

| # | Finding | Severity |
|---|---|---|
| 1 | Outbound webhooks — full stack, no UI | **High** (advertised, unreachable) |
| 2 | Exports — full stack, no UI; no `download` client fn | **High** |
| 3 | Native integrations — full stack, no UI | **High** |
| 4 | `moderationRuns` (AWS pipeline) never surfaced | **High** (built feature invisible) |
| 5 | Dead `responses:publish/unpublish` scopes offered in key UI | **Medium** (grants nothing) |
| 6 | Publish-rate / published-funnel analytics for a removed concept | **Medium** (misleading) |
| 7 | Project action-audit — orphan hook, no UI | **Medium** |
| 8 | Form `behavior`/`delivery`/`watermark`/`consent`/`videoUrl`/OAuth not editable | **Medium** |
| 9 | A/B `abWeight` display-only (not settable) | **Medium** |
| 10 | Annotations read-only (create unwired; `sentiment` unshown) | **Medium** |
| 11 | `ratingScale` dropped → wrong star denominator | **Low–Medium** |
| 12 | Form draft `publish` + `publishedVersion` unused | **Low–Medium** |
| 13 | `deviceSplit.unknown` dropped | **Low** |
| 14 | API-key dual `type/keyType`, `prefix/keyPrefix`, legacy `permissions` | **Low** (tech-debt) |
| 15 | `alerts` permanent `[]` vs shipped alerts-rail | **Low** |
| 16 | `useAnalyticsSummary` dead wrapper | **Low** |

---

## Bottom line

The UI's quality on the surfaces it covers (analytics dashboard, widget studio, responses moderation, billing, keys/agents) is high and largely field-complete. What it lacks is breadth:

1. Three production-grade backend features — **outbound webhooks, exports, native integrations** — plus the **project audit log** have no entry point.
2. The **AWS moderation pipeline's structured output** (`moderationRuns`) is thrown away at the view-model boundary.
3. Several **form-config capabilities** (OAuth-verified submissions, per-form notifications/moderation, video collection, delivery/domain, consent) are reachable only by calling the API directly.
4. The post-"publish-removal" cleanup is **incomplete**: publish lingers in API-key scopes and across the analytics surface.
