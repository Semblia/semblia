import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ApiKeyType } from "@workspace/database/prisma";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import type { ApiKeysService } from "../api-keys/api-keys.service.js";
import { AgentAccessController } from "./agent-access.controller.js";
import {
  AGENT_ACCESS_PRESETS,
  AgentAccessService,
} from "./agent-access.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

const disallowedAgentScopes = [
  "billing:write",
  "members:write",
  "project:delete",
  "credentials:reveal",
  "responses:source_write",
];

describe("AgentAccessController", () => {
  it("declares project-scoped agent access routes with read/write capability splits", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AgentAccessController)).toBe(
      "projects/:slug/agent-access",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AgentAccessController.prototype.getOverview,
      ),
    ).toBe("/");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AgentAccessController.prototype.getOverview,
      ),
    ).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(GUARDS_METADATA, AgentAccessController)).toEqual(
      [CapabilityGuard],
    );
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        AgentAccessController.prototype.getOverview,
      ),
    ).toEqual([Capability.VIEW_AGENT_ACCESS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        AgentAccessController.prototype.createKey,
      ),
    ).toEqual([Capability.MANAGE_AGENT_ACCESS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        AgentAccessController.prototype.listActions,
      ),
    ).toEqual([Capability.VIEW_AGENT_ACCESS]);
  });
});

describe("AGENT_ACCESS_PRESETS", () => {
  it("keeps agent presets away from disallowed source, billing, member, and project-delete scopes", () => {
    for (const preset of Object.values(AGENT_ACCESS_PRESETS)) {
      expect(preset.scopes).not.toEqual(
        expect.arrayContaining(disallowedAgentScopes),
      );
    }

    expect(AGENT_ACCESS_PRESETS.DEVELOPER.scopes).toEqual(
      expect.arrayContaining([
        "credentials:read",
        "credentials:write",
        "agent:read",
        "agent:write",
      ]),
    );
  });
});

describe("AgentAccessService", () => {
  it("creates AGENT keys from presets instead of caller-provided arbitrary scopes", async () => {
    const apiKeysService = {
      create: vi.fn().mockResolvedValue({ id: "key_agent_1" }),
      list: vi.fn(),
      revoke: vi.fn(),
      listUsageEvents: vi.fn(),
    } as unknown as ApiKeysService;
    const service = new AgentAccessService(apiKeysService);

    await service.createKey("user_1", "project_1", {
      name: "Agent",
      preset: "CONTENT_MANAGER",
    });

    expect(apiKeysService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        projectId: "project_1",
        keyType: ApiKeyType.AGENT,
        scopes: AGENT_ACCESS_PRESETS.CONTENT_MANAGER.scopes,
      }),
    );
  });

  it("returns presets and existing agent keys for the overview", async () => {
    const apiKeysService = {
      create: vi.fn(),
      list: vi.fn().mockResolvedValue([{ id: "key_agent_1" }]),
      revoke: vi.fn(),
      listUsageEvents: vi.fn(),
    } as unknown as ApiKeysService;
    const service = new AgentAccessService(apiKeysService);

    const result = await service.getOverview("project_1");

    expect(apiKeysService.list).toHaveBeenCalledWith("project_1", {
      keyType: ApiKeyType.AGENT,
    });
    expect(result.presets).toHaveLength(4);
    expect(result.keys).toEqual([{ id: "key_agent_1" }]);
  });
});
