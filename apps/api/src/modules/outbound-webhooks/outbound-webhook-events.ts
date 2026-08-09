export const OUTBOUND_WEBHOOK_EVENTS = [
  "submission.created",
  "submission.moderated",
  "export.delivery_failed",
  "agent.action_created",
] as const;

export type OutboundWebhookEventType = (typeof OUTBOUND_WEBHOOK_EVENTS)[number];

export function isOutboundWebhookEvent(
  value: string,
): value is OutboundWebhookEventType {
  return OUTBOUND_WEBHOOK_EVENTS.includes(value as OutboundWebhookEventType);
}
