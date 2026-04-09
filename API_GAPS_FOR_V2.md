# API Gaps for V2 Backlog

Data points in the Prisma schema that are underutilised in the current implementation.
Each entry notes the **model/field**, the **gap**, and the **suggested implementation**.

---

## 1. Testimonial Impression Tracking

**Schema gap**: No `TestimonialImpression` model exists.
**What we have**: `WidgetAnalytics` records each widget *load*, but not which individual testimonials were *shown* within that widget load.
**Design surface**: A per-testimonial "shown X times" counter on the testimonial detail page; a top-performing testimonials list.
**Suggested V2 addition**:
```sql
model TestimonialImpression {
  id           String   @id @default(cuid())
  testimonialId String
  widgetId     String
  projectId    String
  device       String?
  country      String?
  timestamp    DateTime @default(now())
  @@index([testimonialId, timestamp])
  @@index([projectId, timestamp])
}
```

---

## 2. Widget Analytics Aggregation Endpoint

**Schema**: `WidgetAnalytics` stores `loadTime`, `device`, `browser`, `country`, `layoutType` per load event.
**Gap**: No `/v2/projects/:id/widgets/:widgetId/analytics/summary` endpoint — data exists but is never aggregated for display.
**Design surface**: Widget detail page should show avg load time chart, device breakdown donut, country top-5, layout type usage.

---

## 3. API Key Usage Visualisation

**Schema**: `ApiKey.usageCount`, `ApiKey.usageLimit`, `ApiKey.rateLimit`, `ApiKey.lastUsedAt`.
**Gap**: Usage count is stored but never exposed as a time-series. No `/v2/projects/:id/api-keys/:keyId/usage` endpoint.
**Design surface**: API Keys page should show a mini sparkline of daily request counts per key.
**Suggested DB support**:
```sql
model ApiKeyDailyUsage {
  id            String   @id @default(cuid())
  apiKeyId      String
  date          String   // YYYY-MM-DD in UTC
  requestCount  Int      @default(0)
  lastRequestAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@unique([apiKeyId, date])
  @@index([date])
}
```

---

## 4. Testimonial Source Import UX

**Schema**: `Testimonial.source`, `Testimonial.sourceUrl`, `Testimonial.oembedData`.
**Gap**: Fields exist to store imported tweets / LinkedIn posts, but no import wizard exists.
**Design surface**: "Import testimonial" flow — paste a tweet/post URL → oEmbed fetch → pre-filled form.

---

## 5. Moderation Score Visualisation

**Schema**: `Testimonial.moderationScore` (0–1 float), `Testimonial.moderationFlags` (JSON array of reasons).
**Gap**: Score is stored post-analysis but never surfaced to project owners. Owners only see approve/reject; they don't know *why* something was flagged.
**Design surface**: Testimonial review panel should show "Spam confidence: 72%" with a breakdown of flags (e.g., ["profanity", "duplicate_ip"]).

---

## 6. Tag System & Filtering

**Schema**: `Tag` model with M2M to `Testimonial`.
**Gap**: Tags are stored but no tag management page or tag-based filtering UI exists.
**Design surface**: Tag pills on each testimonial, tag filter bar on the testimonials inbox, a dedicated `/projects/:slug/tags` management route.

---

## 7. Per-Type Notification Preferences

**Schema**: `NotificationPreferences.emailEnabled` (single boolean).
**Gap**: No per-type toggle (e.g. email me for SECURITY_ALERT but not for every NEW_TESTIMONIAL).
**Design surface**: Notification settings page with a matrix of notification type × channel (email, in-app).
**Suggested V2 addition**: Expand `NotificationPreferences` with per-type JSON column.

---

## 8. Billing History / Invoice View

**Schema**: `SubscriptionPayment` — full payment history with `paidAt`, `amount`, `currency`, `invoiceStatus`, `externalInvoiceId`.
**Gap**: No `/v2/billing/payments` endpoint or billing history UI.
**Design surface**: Billing settings page should list past invoices with status badges and download links (via Razorpay redirect).

---

## 9. Collection Form Impression Logging

**Schema**: No model for tracking how many times the collection form URL was visited vs. submitted.
**Gap**: We know submission *counts* (testimonial rows) but not conversion rate (visits → submissions).
**Design surface**: Collect page should show "Form opened X times, Y submitted (Z% conversion)" banner.
**Suggested V2 addition**:
```sql
model FormImpression {
  id        String   @id @default(cuid())
  projectId String
  ip        String?  @db.VarChar(45)
  userAgent String?  @db.Text
  timestamp DateTime @default(now())
  @@index([projectId, timestamp])
}
```

---

## 10. Project-Level Analytics Summary

**Schema**: `WidgetAnalytics.country`, `WidgetAnalytics.device` already exist per widget.
**Gap**: No project-level rollup — "which countries do my testimonial readers come from across all widgets?".
**Design surface**: Project hub "Reach" section — world heatmap or top-5 countries, total widget impressions.

---

## 11. `collectionFormUrl` Custom Domain

**Schema**: `Project.collectionFormUrl` — a full URL stored per project.
**Gap**: Currently auto-generated as `/t/:slug`. The field implies custom domain support was planned.
**Design surface**: Collect settings — "Use custom domain" toggle with DNS validation UI.
**Suggested DB support**: `collectionFormUrl` alone is unlikely to be enough. Custom domains will probably need a dedicated verification model, for example:
```sql
model CustomDomain {
  id                String   @id @default(cuid())
  projectId         String
  host              String   @unique
  verificationToken String   @unique
  status            String   @default("pending")
  verifiedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  @@index([projectId, status])
}
```

---

## 12. Subscription Period Progress

**Schema**: `Subscription.currentPeriodStart`, `Subscription.currentPeriodEnd`.
**Gap**: Period dates exist but billing UI shows no "renews in X days" or period progress bar.
**Design surface**: Billing page header — current plan badge + "Renews Jan 15 (12 days)" micro-copy.
