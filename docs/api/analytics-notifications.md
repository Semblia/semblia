# Semblia Analytics And Notifications

Status: current v2 API contract checkpoint, last reconciled 2026-06-03.

Analytics, notifications, and billing are real API surfaces. Billing is backed by Razorpay Subscriptions mirrored into local read models via webhooks.

## Analytics summary

Project-scoped analytics reads are under `/v2`:

```text
GET /projects/:slug/analytics/summary?days=30
```

The summary combines daily rollup rows with live submission, form impression, widget load, submission impression, and published testimonial counts.

## Public analytics events

Public UI surfaces can record low-trust browser events through:

```text
POST /v2/analytics/events/form-view
POST /v2/analytics/events/widget-load
POST /v2/analytics/events/submission-impression
POST /v2/analytics/events/hosted-page-view
```

These endpoints validate project/widget/submission relationships before incrementing `ProjectAnalyticsDaily`.

Example widget load event:

```json
{
  "widgetId": "widget_123",
  "loadTimeMs": 128,
  "browser": "Chrome",
  "device": "desktop",
  "country": "US",
  "version": "web_v2"
}
```

Example hosted page view event:

```json
{
  "hostname": "acme.testimonials.semblia.com"
}
```

## Notifications

Authenticated user notification routes:

```text
GET  /v2/notifications
GET  /v2/notifications/unread-count
POST /v2/notifications/:notificationId/read
POST /v2/notifications/read-all
GET  /v2/notifications/preferences
PUT  /v2/notifications/preferences
```

Launch notification types:

```text
SUBMISSION_CREATED
SUBMISSION_MODERATED
SUBMISSION_FLAGGED
SUBMISSION_APPROVED
SUBMISSION_REJECTED
EXPORT_DELIVERY_FAILED
EXPORT_DELIVERY_READY
AGENT_ACTION_CREATED
PROJECT_INVITE_RECEIVED
PROJECT_INVITE_ACCEPTED
OUTBOUND_WEBHOOK_DELIVERY_FAILED
SECURITY_ALERT
```

Preferences support the global email switch plus per-type `email` and `inApp` booleans.
