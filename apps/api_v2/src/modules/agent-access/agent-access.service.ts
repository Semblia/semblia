import { Inject, Injectable } from "@nestjs/common";
import { ApiKeyType } from "@workspace/database/prisma";
import type { ApiKeyScope } from "../api-keys/api-keys.dto.js";
import { ApiKeysService } from "../api-keys/api-keys.service.js";
import type {
  AgentAccessPreset,
  CreateAgentKeyBodyDto,
} from "./agent-access.dto.js";

const READ_ONLY_SCOPES = [
  "project:read",
  "submissions:read",
  "testimonials:read",
  "analytics:read",
  "exports:read",
  "webhooks:read",
  "integrations:read",
] satisfies ApiKeyScope[];

export const AGENT_ACCESS_PRESETS: Record<
  AgentAccessPreset,
  {
    id: AgentAccessPreset;
    label: string;
    description: string;
    scopes: ApiKeyScope[];
  }
> = {
  READ_ONLY: {
    id: "READ_ONLY",
    label: "Read only",
    description:
      "Inspect project data, testimonials, analytics, and delivery configuration.",
    scopes: [...READ_ONLY_SCOPES],
  },
  CONTENT_MANAGER: {
    id: "CONTENT_MANAGER",
    label: "Content manager",
    description:
      "Review, annotate, moderate, tag, and publish approved testimonial work.",
    scopes: [
      ...READ_ONLY_SCOPES,
      "submissions:annotate",
      "submissions:moderate",
      "testimonials:publish",
      "testimonials:unpublish",
      "testimonials:tag",
      "testimonials:display_suggest",
    ],
  },
  AUTOMATION_MANAGER: {
    id: "AUTOMATION_MANAGER",
    label: "Automation manager",
    description:
      "Read project data and manage exports, webhooks, and integrations.",
    scopes: [
      ...READ_ONLY_SCOPES,
      "exports:write",
      "webhooks:write",
      "integrations:write",
    ],
  },
  DEVELOPER: {
    id: "DEVELOPER",
    label: "Developer",
    description:
      "Manage developer-facing credentials, agent keys, webhooks, and integrations.",
    scopes: [
      ...READ_ONLY_SCOPES,
      "credentials:read",
      "credentials:write",
      "agent:read",
      "agent:write",
      "webhooks:write",
      "integrations:write",
    ],
  },
};

@Injectable()
export class AgentAccessService {
  constructor(
    @Inject(ApiKeysService) private readonly apiKeysService: ApiKeysService,
  ) {}

  async getOverview(projectId: string) {
    return {
      presets: Object.values(AGENT_ACCESS_PRESETS),
      keys: await this.apiKeysService.list(projectId, {
        keyType: ApiKeyType.AGENT,
      }),
    };
  }

  createKey(userId: string, projectId: string, body: CreateAgentKeyBodyDto) {
    const preset = AGENT_ACCESS_PRESETS[body.preset];

    return this.apiKeysService.create({
      name: body.name,
      userId,
      projectId,
      keyType: ApiKeyType.AGENT,
      scopes: preset.scopes,
      expiresAt: body.expiresAt,
      usageLimit: body.usageLimit,
      rateLimit: body.rateLimit,
    });
  }

  revokeKey(projectId: string, keyId: string) {
    return this.apiKeysService.revoke(projectId, keyId, ApiKeyType.AGENT);
  }

  async listActions(projectId: string) {
    return {
      data: await this.apiKeysService.listUsageEvents(projectId, {
        keyType: ApiKeyType.AGENT,
      }),
    };
  }
}
