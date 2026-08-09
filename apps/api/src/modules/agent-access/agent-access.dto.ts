import { z } from "zod";
import { apiKeyParamsSchema } from "../api-keys/api-keys.dto.js";

export const agentAccessPresetValues = [
  "READ_ONLY",
  "CONTENT_MANAGER",
  "AUTOMATION_MANAGER",
  "DEVELOPER",
] as const;

export const agentAccessPresetSchema = z.enum(agentAccessPresetValues);

const expiresAtSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "expiresAt must be a valid ISO date-time",
  });

export const createAgentKeyBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  preset: agentAccessPresetSchema,
  expiresAt: expiresAtSchema.nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  rateLimit: z.number().int().min(1).max(10_000).optional(),
});

export const agentKeyParamsSchema = apiKeyParamsSchema;

export type AgentAccessPreset = z.infer<typeof agentAccessPresetSchema>;
export type CreateAgentKeyBodyDto = z.infer<typeof createAgentKeyBodySchema>;
export type AgentKeyParamsDto = z.infer<typeof agentKeyParamsSchema>;
