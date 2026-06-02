import { z } from "zod";

export const analyticsSummaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(366).default(30),
});

export type AnalyticsSummaryQueryDto = z.infer<
  typeof analyticsSummaryQuerySchema
>;

export const analyticsDashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  compare: z.enum(["prev", "none"]).default("prev"),
});

export type AnalyticsDashboardQueryDto = z.infer<
  typeof analyticsDashboardQuerySchema
>;

const analyticsOptionalTextSchema = z.string().trim().min(1).max(255);

export const formViewEventBodySchema = z
  .object({
    projectSlug: z.string().trim().min(1).max(255),
    formId: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const widgetLoadEventBodySchema = z
  .object({
    widgetId: z.string().trim().min(1).max(255),
    loadTimeMs: z.coerce.number().int().min(0).max(60000).default(0),
    browser: analyticsOptionalTextSchema.optional(),
    device: analyticsOptionalTextSchema.optional(),
    country: z.string().trim().min(2).max(8).optional(),
    errorCode: analyticsOptionalTextSchema.optional(),
    version: analyticsOptionalTextSchema.default("web_v2"),
  })
  .strict();

export const submissionImpressionEventBodySchema = z
  .object({
    submissionId: z.string().trim().min(1).max(255),
    widgetId: z.string().trim().min(1).max(255),
    device: analyticsOptionalTextSchema.optional(),
    country: z.string().trim().min(2).max(8).optional(),
  })
  .strict();

export const hostedPageViewEventBodySchema = z
  .object({
    hostname: z.string().trim().min(1).max(255).optional(),
    projectSlug: z.string().trim().min(1).max(255).optional(),
  })
  .strict()
  .refine((body) => body.hostname || body.projectSlug, {
    message: "Either hostname or projectSlug is required",
  });

export type FormViewEventBodyDto = z.infer<typeof formViewEventBodySchema>;
export type WidgetLoadEventBodyDto = z.infer<typeof widgetLoadEventBodySchema>;
export type SubmissionImpressionEventBodyDto = z.infer<
  typeof submissionImpressionEventBodySchema
>;
export type HostedPageViewEventBodyDto = z.infer<
  typeof hostedPageViewEventBodySchema
>;
