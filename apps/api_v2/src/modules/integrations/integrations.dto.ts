import { z } from "zod";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";
import { OUTBOUND_WEBHOOK_EVENTS } from "../outbound-webhooks/outbound-webhook-events.js";

export const integrationProviderSchema = z.enum([
  "SLACK",
  "NOTION",
  "LINEAR",
  "GITHUB",
]);

export const integrationAuthStrategySchema = z.enum([
  "CLERK_OAUTH",
  "NATIVE_OAUTH",
  "MANUAL_SECRET",
]);

const providerConfigSchema = z.record(z.string(), z.unknown()).default({});

export const createIntegrationConnectionBodySchema = z
  .object({
    provider: integrationProviderSchema,
    authStrategy: integrationAuthStrategySchema.default("CLERK_OAUTH"),
    clerkProvider: z.string().trim().min(1).max(120).optional(),
    externalAccountId: z.string().trim().min(1).max(255).optional(),
    scopes: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
    config: providerConfigSchema,
  })
  .superRefine(validateProviderConfig);

export const updateIntegrationConnectionBodySchema = z
  .object({
    externalAccountId: z.string().trim().min(1).max(255).nullable().optional(),
    scopes: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
    config: providerConfigSchema.optional(),
  })
  .refine(
    (value) =>
      value.externalAccountId !== undefined ||
      value.scopes !== undefined ||
      value.config !== undefined,
    { message: "At least one integration connection field must be provided" },
  );

export const integrationConnectionParamsSchema = projectSlugParamsSchema.extend(
  {
    connectionId: z.string().trim().min(1),
  },
);

export const nativeIntegrationExportPayloadSchema = z.object({
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(2000).optional(),
  content: z.string().trim().max(5000).optional(),
  authorName: z.string().trim().max(255).optional(),
  rating: z.number().min(0).max(10).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
  testimonialId: z.string().trim().max(255).optional(),
  submissionId: z.string().trim().max(255).optional(),
  labels: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
});

export const createNativeIntegrationExportBodySchema = z.object({
  eventType: z.enum(OUTBOUND_WEBHOOK_EVENTS),
  payload: nativeIntegrationExportPayloadSchema,
});

export type CreateIntegrationConnectionBodyDto = z.infer<
  typeof createIntegrationConnectionBodySchema
>;
export type UpdateIntegrationConnectionBodyDto = z.infer<
  typeof updateIntegrationConnectionBodySchema
>;
export type IntegrationConnectionParamsDto = z.infer<
  typeof integrationConnectionParamsSchema
>;
export type CreateNativeIntegrationExportBodyDto = z.infer<
  typeof createNativeIntegrationExportBodySchema
>;

function validateProviderConfig(
  value: { provider: string; config: Record<string, unknown> },
  ctx: z.RefinementCtx,
) {
  switch (value.provider) {
    case "SLACK":
      requireConfigString(value.config, "channelId", ctx);
      return;
    case "NOTION":
      requireOneConfigString(
        value.config,
        ["parentPageId", "dataSourceId"],
        ctx,
      );
      return;
    case "LINEAR":
      requireConfigString(value.config, "teamId", ctx);
      return;
    case "GITHUB":
      requireConfigString(value.config, "owner", ctx);
      requireConfigString(value.config, "repo", ctx);
      return;
  }
}

function requireConfigString(
  config: Record<string, unknown>,
  key: string,
  ctx: z.RefinementCtx,
) {
  if (typeof config[key] !== "string" || !config[key].trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["config", key],
      message: `${key} is required for this provider`,
    });
  }
}

function requireOneConfigString(
  config: Record<string, unknown>,
  keys: string[],
  ctx: z.RefinementCtx,
) {
  if (
    keys.some((key) => typeof config[key] === "string" && config[key].trim())
  ) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["config"],
    message: `One of ${keys.join(", ")} is required for this provider`,
  });
}
