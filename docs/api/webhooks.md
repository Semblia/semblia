# Semblia Webhooks

Status: current v2 API contract checkpoint, last reconciled 2026-05-30.

Outbound webhooks are project-scoped async deliveries. Semblia signs each delivery with the endpoint's webhook signing secret.

## Endpoint routes

All routes are under `/v2`.

```text
GET    /projects/:slug/outbound-webhooks
POST   /projects/:slug/outbound-webhooks
PATCH  /projects/:slug/outbound-webhooks/:endpointId
POST   /projects/:slug/outbound-webhooks/:endpointId/rotate-secret
POST   /projects/:slug/outbound-webhooks/:endpointId/disable
GET    /projects/:slug/outbound-webhooks/deliveries
```

Webhook endpoint creation and secret rotation return the raw `whsec_...` signing secret exactly once.

## Event catalogue

```text
submission.created
submission.moderated
export.delivery_failed
agent.action_created
```

Subscriptions require explicit event names. Wildcard subscriptions are not part of the launch contract.

## Delivery headers

```text
X-Semblia-Event: submission.moderated
X-Semblia-Delivery: del_...
X-Semblia-Timestamp: 2026-05-10T00:00:00.000Z
X-Semblia-Signature: v1=<hex_hmac_sha256>
Content-Type: application/json
```

## Signature input

The signature input is:

```text
<timestamp>.<raw_body>
```

`raw_body` is the exact JSON byte string sent by Semblia. Do not parse and reserialize the payload before verification.

## Verification example

```ts
import crypto from "node:crypto";

export function verifySembliaWebhook(input: {
  rawBody: string | Buffer;
  timestamp: string;
  signatureHeader: string;
  signingSecret: string;
  toleranceMs?: number;
}) {
  const toleranceMs = input.toleranceMs ?? 5 * 60 * 1000;
  const sentAt = Date.parse(input.timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > toleranceMs) {
    return false;
  }

  const expected =
    "v1=" +
    crypto
      .createHmac("sha256", input.signingSecret)
      .update(`${input.timestamp}.`)
      .update(input.rawBody)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(input.signatureHeader),
  );
}
```

## Replay window recommendation

Reject webhook deliveries older than five minutes unless your receiver is deliberately processing a backfill. Store processed `X-Semblia-Delivery` IDs to make receivers idempotent.

## Retry semantics

- Semblia queues deliveries asynchronously.
- Non-2xx responses and network failures are retryable until attempts are exhausted.
- Requests have a bounded network wait.
- Stored response snippets are capped.
- Failure notifications use the generic `export.delivery_failed` event where configured.

## Payload safety

Webhook and export payloads are display-safe by default. They must not include private metadata such as email private metadata, IP address, raw user agent, or hidden submission internals unless a future private export scope explicitly allows it.
