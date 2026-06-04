import { z } from "zod";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";

export const apiKeyScopeValues = [
  "project:read",
  "responses:read",
  "responses:annotate",
  "responses:moderate",
  "analytics:read",
  "exports:read",
  "exports:write",
  "webhooks:read",
  "webhooks:write",
  "integrations:read",
  "integrations:write",
  "credentials:read",
  "credentials:write",
  "agent:read",
  "agent:write",
] as const;

export const agentDisallowedScopeValues = [
  "billing:write",
  "members:write",
  "project:delete",
  "credentials:reveal",
  "responses:source_write",
] as const;

export const apiKeyScopeSchema = z.enum(apiKeyScopeValues);

const expiresAtSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "expiresAt must be a valid ISO date-time",
  });

export const createApiKeyBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(apiKeyScopeSchema).min(1).max(apiKeyScopeValues.length),
  expiresAt: expiresAtSchema.nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  rateLimit: z.number().int().min(1).max(10_000).optional(),
});

export const apiKeyParamsSchema = projectSlugParamsSchema.extend({
  keyId: z.string().trim().min(1),
});

export type ApiKeyScope = z.infer<typeof apiKeyScopeSchema>;
export type CreateApiKeyBodyDto = z.infer<typeof createApiKeyBodySchema>;
export type ApiKeyParamsDto = z.infer<typeof apiKeyParamsSchema>;
