import { z } from "zod";
import { isIP } from "node:net";
import { paginationQuerySchema } from "../../common/dto/pagination.dto.js";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";
import {
  isBlockedHostname,
  isBlockedIpAddress,
} from "./outbound-webhook-url-safety.js";
import { OUTBOUND_WEBHOOK_EVENTS } from "./outbound-webhook-events.js";

const LOCALHOST_HTTP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
]);

export const outboundWebhookEventSchema = z.enum(OUTBOUND_WEBHOOK_EVENTS);

export const outboundWebhookUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .superRefine((value, ctx) => {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Webhook URL must be a valid absolute URL",
      });
      return;
    }

    if (url.username || url.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Webhook URL must not include credentials",
      });
    }

    if (value.includes("*")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Webhook URL must not include wildcards",
      });
    }

    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const isLocalHttp =
      protocol === "http:" && LOCALHOST_HTTP_HOSTS.has(hostname);

    if (
      !isLocalHttp &&
      (isBlockedHostname({ hostname }) ||
        (isIP(hostname.replace(/^\[/, "").replace(/\]$/, "")) !== 0 &&
          isBlockedIpAddress({ address: hostname })))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Webhook URL host is not allowed",
      });
    }

    if (protocol === "https:") {
      return;
    }

    if (isLocalHttp && process.env.NODE_ENV !== "production") {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Webhook URL must use https://, except localhost HTTP outside production",
    });
  });

const uniqueEventsSchema = z
  .array(outboundWebhookEventSchema)
  .min(1)
  .max(20)
  .transform((events) => [...new Set(events)]);

export const createOutboundWebhookEndpointBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  url: outboundWebhookUrlSchema,
  subscribedEvents: uniqueEventsSchema,
});

export const updateOutboundWebhookEndpointBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    url: outboundWebhookUrlSchema.optional(),
    subscribedEvents: uniqueEventsSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.url !== undefined ||
      value.subscribedEvents !== undefined,
    {
      message: "At least one endpoint field must be provided",
    },
  );

export const outboundWebhookEndpointParamsSchema =
  projectSlugParamsSchema.extend({
    endpointId: z.string().trim().min(1),
  });

export const outboundWebhookDeliveryParamsSchema =
  projectSlugParamsSchema.extend({
    deliveryId: z.string().trim().min(1),
  });

export const outboundWebhookDeliveriesQuerySchema =
  paginationQuerySchema.extend({
    endpointId: z.string().trim().min(1).optional(),
    status: z
      .enum([
        "PENDING",
        "DELIVERING",
        "SUCCEEDED",
        "FAILED",
        "EXHAUSTED",
        "ALL",
      ])
      .default("ALL"),
    eventType: outboundWebhookEventSchema.optional(),
  });

export type CreateOutboundWebhookEndpointBodyDto = z.infer<
  typeof createOutboundWebhookEndpointBodySchema
>;
export type UpdateOutboundWebhookEndpointBodyDto = z.infer<
  typeof updateOutboundWebhookEndpointBodySchema
>;
export type OutboundWebhookEndpointParamsDto = z.infer<
  typeof outboundWebhookEndpointParamsSchema
>;
export type OutboundWebhookDeliveryParamsDto = z.infer<
  typeof outboundWebhookDeliveryParamsSchema
>;
export type OutboundWebhookDeliveriesQueryDto = z.infer<
  typeof outboundWebhookDeliveriesQuerySchema
>;
