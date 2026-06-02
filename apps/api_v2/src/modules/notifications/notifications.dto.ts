import { z } from "zod";

export const notificationTypeSchema = z.enum([
  "SUBMISSION_CREATED",
  "SUBMISSION_MODERATED",
  "SUBMISSION_FLAGGED",
  "SUBMISSION_APPROVED",
  "SUBMISSION_REJECTED",
  "EXPORT_DELIVERY_FAILED",
  "EXPORT_DELIVERY_READY",
  "AGENT_ACTION_CREATED",
  "PROJECT_INVITE_RECEIVED",
  "PROJECT_INVITE_ACCEPTED",
  "OUTBOUND_WEBHOOK_DELIVERY_FAILED",
  "SECURITY_ALERT",
]);

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  type: notificationTypeSchema.optional(),
});

export const notificationParamsSchema = z.object({
  notificationId: z.string().min(1),
});

export const notificationTypePreferenceSchema = z.object({
  email: z.boolean().default(true),
  inApp: z.boolean().default(true),
});

const notificationTypePreferencesSchema = z
  .object({
    SUBMISSION_CREATED: notificationTypePreferenceSchema.optional(),
    SUBMISSION_MODERATED: notificationTypePreferenceSchema.optional(),
    SUBMISSION_FLAGGED: notificationTypePreferenceSchema.optional(),
    SUBMISSION_APPROVED: notificationTypePreferenceSchema.optional(),
    SUBMISSION_REJECTED: notificationTypePreferenceSchema.optional(),
    EXPORT_DELIVERY_FAILED: notificationTypePreferenceSchema.optional(),
    EXPORT_DELIVERY_READY: notificationTypePreferenceSchema.optional(),
    AGENT_ACTION_CREATED: notificationTypePreferenceSchema.optional(),
    PROJECT_INVITE_RECEIVED: notificationTypePreferenceSchema.optional(),
    PROJECT_INVITE_ACCEPTED: notificationTypePreferenceSchema.optional(),
    OUTBOUND_WEBHOOK_DELIVERY_FAILED:
      notificationTypePreferenceSchema.optional(),
    SECURITY_ALERT: notificationTypePreferenceSchema.optional(),
  })
  .strict();

export const updateNotificationPreferencesBodySchema = z.object({
  emailEnabled: z.boolean().optional(),
  typePreferences: notificationTypePreferencesSchema.optional(),
});

export type NotificationListQueryDto = z.infer<
  typeof notificationListQuerySchema
>;
export type NotificationParamsDto = z.infer<typeof notificationParamsSchema>;
export type UpdateNotificationPreferencesBodyDto = z.infer<
  typeof updateNotificationPreferencesBodySchema
>;
