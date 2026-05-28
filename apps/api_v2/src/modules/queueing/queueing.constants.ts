export const DEFAULT_DELIVERY_ATTEMPTS = 3;
export const DEFAULT_DELIVERY_BACKOFF_MS = 30_000;
export const QUEUE_LOCK_TTL_MS = 55_000;

export const QUEUE_MAINTENANCE_LOCK = "locks:queue-maintenance";
export const EMAIL_OUTBOX_LOCK = "locks:email-outbox";

export const QUEUE_COUNT_STATUSES = [
  "waiting",
  "active",
  "delayed",
  "failed",
  "completed",
] as const;

export type QueueCountStatus = (typeof QUEUE_COUNT_STATUSES)[number];
export type QueueCounts = Record<QueueCountStatus, number>;
