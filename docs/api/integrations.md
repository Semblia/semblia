# Tresta Integrations And Exports

Status: current v2 API contract checkpoint, last reconciled 2026-06-03.

Tresta integrations are intentionally thin, one-way export destinations. Tresta does not import remote edits, sync provider membership, or depend on provider webhooks for core state.

## CSV exports

All routes are under `/v2`.

```text
POST /projects/:slug/exports/csv
GET  /projects/:slug/exports/deliveries
GET  /projects/:slug/exports/deliveries/:deliveryId
```

CSV exports are database-backed async delivery artifacts. They include display-safe submission fields by default and exclude private metadata, IP address, raw user agent, and email private metadata.

## Native integration connections

```text
GET   /projects/:slug/integrations/connections
POST  /projects/:slug/integrations/connections
PATCH /projects/:slug/integrations/connections/:connectionId
POST  /projects/:slug/integrations/connections/:connectionId/disable
POST  /projects/:slug/integrations/connections/:connectionId/exports
```

Supported launch providers:

```text
SLACK
NOTION
LINEAR
GITHUB
```

Supported auth strategies:

```text
CLERK_OAUTH
NATIVE_OAUTH
MANUAL_SECRET
```

The initial implementation resolves user connected-account OAuth tokens through the Clerk token-provider boundary. Missing or revoked connected tokens fail as connect-required authorization errors.

## Provider behavior

| Provider | Launch behavior                                                             |
| -------- | --------------------------------------------------------------------------- |
| Slack    | Post an approved or moderated submission summary to a selected channel.     |
| Notion   | Create a page or database row for an approved submission.                   |
| Linear   | Create an issue from negative or flagged feedback or a selected submission. |
| GitHub   | Create an issue from selected feedback or submission workflow events.       |

## Export payload contract

Native exports accept a display-safe payload:

```json
{
  "eventType": "submission.moderated",
  "payload": {
    "title": "Moderated submission from Ada Lovelace",
    "summary": "Short internal summary",
    "content": "Display-safe submission text",
    "authorName": "Ada Lovelace",
    "rating": 5,
    "sourceUrl": "https://app.tresta.app/projects/acme/submissions/sub_123",
    "submissionId": "sub_123",
    "labels": ["launch-candidate"]
  }
}
```

Provider adapters may transform this payload for provider-native fields, but they must preserve the display-safe boundary.

## Delivery records

CSV and native exports use `ExportDelivery` records so operators and agents can inspect delivery status, attempts, errors, artifact metadata, and completion state.
