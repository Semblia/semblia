import { RequestMethod } from "@nestjs/common";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { ApiKeyStatus, ApiKeyType, Prisma } from "@workspace/database/prisma";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { ApiKeysController } from "./api-keys.controller.js";
import { ApiKeyAuthenticator } from "./api-key-auth.guard.js";
import {
  generateCredentialSecret,
  hashCredentialSecret,
  verifyCredentialSecret,
} from "./api-key-hasher.js";
import { ApiKeysService } from "./api-keys.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

const mockApiKeyFindMany = vi.fn();
const mockApiKeyFindFirst = vi.fn();
const mockApiKeyCreate = vi.fn();
const mockApiKeyUpdate = vi.fn();
const mockDailyUsageFindMany = vi.fn();
const mockDailyUsageUpsert = vi.fn();
const mockTransaction = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    apiKey: {
      findMany: mockApiKeyFindMany,
      findFirst: mockApiKeyFindFirst,
      create: mockApiKeyCreate,
      update: mockApiKeyUpdate,
    },
    apiKeyDailyUsage: {
      findMany: mockDailyUsageFindMany,
      upsert: mockDailyUsageUpsert,
    },
  },
} as unknown as PrismaService;

function makeKey(overrides: Record<string, unknown> = {}) {
  return {
    id: "key_1",
    name: "Production API",
    keyPrefix: "tsk_live_1234abcd",
    keyType: ApiKeyType.SECRET,
    status: ApiKeyStatus.ACTIVE,
    lastFour: "wxyz",
    userId: "user_1",
    projectId: "project_1",
    permissions: null,
    scopes: ["project:read"],
    usageCount: 0,
    usageLimit: null,
    rateLimit: 100,
    isActive: true,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date("2026-05-03T00:00:00.000Z"),
    updatedAt: new Date("2026-05-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("ApiKeysController", () => {
  it("declares project-scoped API key routes with capability guards", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ApiKeysController)).toBe(
      "projects/:slug/api-keys",
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, ApiKeysController.prototype.list),
    ).toBe("/");
    expect(
      Reflect.getMetadata(METHOD_METADATA, ApiKeysController.prototype.list),
    ).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(GUARDS_METADATA, ApiKeysController)).toEqual([
      CapabilityGuard,
    ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ApiKeysController.prototype.list,
      ),
    ).toEqual([Capability.VIEW_CREDENTIALS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ApiKeysController.prototype.create,
      ),
    ).toEqual([Capability.MANAGE_CREDENTIALS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ApiKeysController.prototype.rotate,
      ),
    ).toEqual([Capability.MANAGE_CREDENTIALS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        ApiKeysController.prototype.events,
      ),
    ).toEqual([Capability.VIEW_CREDENTIALS]);
  });
});

describe("api key hashing", () => {
  it("hashes generated credential secrets without storing the raw value", () => {
    const generated = generateCredentialSecret("SECRET");
    const storedHash = hashCredentialSecret(generated.secret);

    expect(generated.keyPrefix).toMatch(/^tsk_live_[a-f0-9]{8}$/);
    expect(generated.secret.startsWith(`${generated.keyPrefix}.`)).toBe(true);
    expect(storedHash).toMatch(/^scrypt:/);
    expect(storedHash).not.toContain(generated.secret);
    expect(verifyCredentialSecret(generated.secret, storedHash)).toBe(true);
    expect(verifyCredentialSecret(`${generated.secret}x`, storedHash)).toBe(
      false,
    );
  });
});

describe("ApiKeysService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a SECRET key and returns the raw secret only in the creation response", async () => {
    mockApiKeyCreate.mockImplementation(async ({ data }) =>
      makeKey({
        name: data.name,
        keyPrefix: data.keyPrefix,
        keyType: data.keyType,
        lastFour: data.lastFour,
        scopes: data.scopes,
        usageLimit: data.usageLimit,
        rateLimit: data.rateLimit,
        expiresAt: data.expiresAt,
      }),
    );

    const service = new ApiKeysService(prismaMock);
    const result = await service.create({
      userId: "user_1",
      projectId: "project_1",
      keyType: ApiKeyType.SECRET,
      name: "Production API",
      scopes: ["project:read", "submissions:read"],
    });

    expect(mockApiKeyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          keyType: ApiKeyType.SECRET,
          keyHash: expect.stringMatching(/^scrypt:/),
          permissions: Prisma.JsonNull,
          scopes: ["project:read", "submissions:read"],
        }),
      }),
    );
    expect(result.secret).toBe(result.key);
    expect(result.secret.startsWith(`${result.keyPrefix}.`)).toBe(true);
    expect(result).not.toHaveProperty("keyHash");
  });

  it("lists metadata without returning raw secrets", async () => {
    mockApiKeyFindMany.mockResolvedValue([makeKey()]);

    const service = new ApiKeysService(prismaMock);
    const result = await service.list("project_1", {
      keyType: ApiKeyType.SECRET,
    });

    expect(mockApiKeyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project_1", keyType: ApiKeyType.SECRET },
      }),
    );
    expect(result[0]).toMatchObject({
      id: "key_1",
      keyPrefix: "tsk_live_1234abcd",
      scopes: ["project:read"],
    });
    expect(result[0]).not.toHaveProperty("secret");
  });

  it("revokes keys by project boundary", async () => {
    mockApiKeyFindFirst.mockResolvedValue(makeKey());
    mockApiKeyUpdate.mockResolvedValue(
      makeKey({
        status: ApiKeyStatus.REVOKED,
        isActive: false,
        revokedAt: new Date("2026-05-03T00:01:00.000Z"),
      }),
    );

    const service = new ApiKeysService(prismaMock);
    const result = await service.revoke(
      "project_1",
      "key_1",
      ApiKeyType.SECRET,
    );

    expect(mockApiKeyFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "key_1",
          projectId: "project_1",
          keyType: ApiKeyType.SECRET,
        },
      }),
    );
    expect(mockApiKeyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ApiKeyStatus.REVOKED,
          isActive: false,
        }),
      }),
    );
    expect(result.status).toBe(ApiKeyStatus.REVOKED);
  });
});

describe("ApiKeyAuthenticator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiKeyUpdate.mockReturnValue(Promise.resolve({}));
    mockDailyUsageUpsert.mockReturnValue(Promise.resolve({}));
    mockTransaction.mockResolvedValue([]);
  });

  it("authenticates active project-bound agent keys into actor context and records usage", async () => {
    const generated = generateCredentialSecret("AGENT");
    mockApiKeyFindFirst.mockResolvedValue({
      id: "key_agent_1",
      keyHash: hashCredentialSecret(generated.secret),
      keyType: ApiKeyType.AGENT,
      scopes: ["project:read", "agent:read"],
      userId: "user_1",
      projectId: "project_1",
      usageCount: 0,
      usageLimit: null,
    });

    const authenticator = new ApiKeyAuthenticator(prismaMock);
    const result = await authenticator.authenticate(generated.secret);

    expect(result?.actor).toMatchObject({
      actorType: "agent_key",
      userId: "user_1",
      projectId: "project_1",
      credentialId: "key_agent_1",
      scopes: ["project:read", "agent:read"],
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockApiKeyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key_agent_1" },
        data: expect.objectContaining({ usageCount: { increment: 1 } }),
      }),
    );
    expect(mockDailyUsageUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          apiKeyId: "key_agent_1",
          requestCount: 1,
        }),
      }),
    );
  });
});
