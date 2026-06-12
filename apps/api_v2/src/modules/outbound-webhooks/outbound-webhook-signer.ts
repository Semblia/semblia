import { createHmac } from "node:crypto";

export type OutboundWebhookSigningInput = {
  timestamp: string;
  rawBody: string;
  secret: string;
};

export function signOutboundWebhookBody({
  timestamp,
  rawBody,
  secret,
}: OutboundWebhookSigningInput) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}

export function buildOutboundWebhookHeaders({
  eventType,
  deliveryId,
  timestamp,
  rawBody,
  secret,
}: OutboundWebhookSigningInput & {
  eventType: string;
  deliveryId: string;
}) {
  const signature = signOutboundWebhookBody({ timestamp, rawBody, secret });

  return {
    "Content-Type": "application/json",
    "X-Semblia-Event": eventType,
    "X-Semblia-Delivery": deliveryId,
    "X-Semblia-Timestamp": timestamp,
    "X-Semblia-Signature": `v1=${signature}`,
  };
}
