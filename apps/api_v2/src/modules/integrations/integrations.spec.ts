import { RequestMethod, ForbiddenException } from "@nestjs/common";
import {
  DeliveryStatus,
  ExportDestinationProvider,
  ExportDestinationStatus,
  IntegrationAuthStrategy,
  IntegrationProvider,
} from "@workspace/database/prisma";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { ClerkService } from "../clerk/clerk.service.js";
import { IntegrationsController } from "./integrations.controller.js";
import {
  createNativeIntegrationExportBodySchema,
  createIntegrationConnectionBodySchema,
} from "./integrations.dto.js";
import { IntegrationsService } from "./integrations.service.js";
import { ClerkConnectedAccountTokenProvider } from "./token-providers/clerk-connected-account-token-provider.js";
import { IntegrationHttpClient } from "./providers/integration-http-client.js";
import { SlackExportProvider } from "./providers/slack-export.provider.js";
import { NotionExportProvider } from "./providers/notion-export.provider.js";
import { LinearExportProvider } from "./providers/linear-export.provider.js";
import { GithubExportProvider } from "./providers/github-export.provider.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

const mockTransaction = vi.fn();
const mockConnectionCreate = vi.fn();
const mockConnectionFindMany = vi.fn();
const mockConnectionFindFirst = vi.fn();
const mockConnectionUpdate = vi.fn();
const mockDestinationFindMany = vi.fn();
const mockDestinationCreate = vi.fn();
const mockDeliveryCreate = vi.fn();
const mockDeliveryFindFirst = vi.fn();
const mockDeliveryUpdate = vi.fn();
const mockAuditCreate = vi.fn();
const mockQueueAdd = vi.fn();
const mockGetToken = vi.fn();
const mockProviderDeliver = vi.fn();
const mockProviderListResources = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    integrationConnection: {
      create: mockConnectionCreate,
      findMany: mockConnectionFindMany,
      findFirst: mockConnectionFindFirst,
      update: mockConnectionUpdate,
    },
    exportDestination: {
      findMany: mockDestinationFindMany,
      create: mockDestinationCreate,
    },
    exportDelivery: {
      create: mockDeliveryCreate,
      findFirst: mockDeliveryFindFirst,
      update: mockDeliveryUpdate,
    },
    projectActionAudit: {
      create: mockAuditCreate,
    },
  },
} as unknown as PrismaService;

const queueMock = {
  add: mockQueueAdd,
};

const tokenProviderMock = {
  getToken: mockGetToken,
};

const actor = {
  actorType: "user" as const,
  userId: "user_1",
  clerkOrgPermissions: [],
  scopes: [],
};

function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: "iconn_1",
    projectId: "project_1",
    provider: IntegrationProvider.SLACK,
    authStrategy: IntegrationAuthStrategy.CLERK_OAUTH,
    connectedByUserId: "user_1",
    clerkProvider: "slack",
    externalAccountId: "team_1",
    status: "ACTIVE",
    scopes: ["chat:write"],
    config: { channelId: "C123" },
    lastCheckedAt: null,
    createdAt: new Date("2026-05-10T10:00:00.000Z"),
    updatedAt: new Date("2026-05-10T10:00:00.000Z"),
    ...overrides,
  };
}

function makeDestination(overrides: Record<string, unknown> = {}) {
  return {
    id: "dest_1",
    projectId: "project_1",
    provider: ExportDestinationProvider.SLACK,
    name: "Slack export",
    config: { connectionId: "iconn_1", providerConfig: { channelId: "C123" } },
    status: ExportDestinationStatus.ACTIVE,
    createdAt: new Date("2026-05-10T10:00:00.000Z"),
    updatedAt: new Date("2026-05-10T10:00:00.000Z"),
    ...overrides,
  };
}

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "nexp_123",
    projectId: "project_1",
    destinationId: "dest_1",
    ruleId: null,
    eventType: "submission.moderated",
    payload: {
      title: "Great feedback",
      content: "Semblia helped us ship.",
      connectionId: "iconn_1",
      provider: "SLACK",
    },
    status: DeliveryStatus.PENDING,
    attempts: 0,
    nextAttemptAt: null,
    error: null,
    artifactContent: null,
    artifactContentType: null,
    artifactFilename: null,
    completedAt: null,
    createdAt: new Date("2026-05-10T10:00:00.000Z"),
    updatedAt: new Date("2026-05-10T10:00:00.000Z"),
    destination: makeDestination(),
    ...overrides,
  };
}

function makeService() {
  const slackProvider = {
    provider: IntegrationProvider.SLACK,
    deliver: mockProviderDeliver,
    listResources: mockProviderListResources,
  } as unknown as SlackExportProvider;

  return new IntegrationsService(
    prismaMock,
    queueMock as never,
    new ProjectActionAuditService(prismaMock),
    tokenProviderMock,
    slackProvider,
    { provider: IntegrationProvider.NOTION } as unknown as NotionExportProvider,
    { provider: IntegrationProvider.LINEAR } as unknown as LinearExportProvider,
    { provider: IntegrationProvider.GITHUB } as unknown as GithubExportProvider,
  );
}

describe("IntegrationsController", () => {
  it("declares project-scoped integration routes with integration capabilities", () => {
    expect(Reflect.getMetadata(PATH_METADATA, IntegrationsController)).toBe(
      "projects/:slug/integrations",
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, IntegrationsController),
    ).toEqual([CapabilityGuard]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        IntegrationsController.prototype.listConnections,
      ),
    ).toEqual([Capability.VIEW_INTEGRATIONS]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        IntegrationsController.prototype.createConnection,
      ),
    ).toEqual([Capability.MANAGE_INTEGRATIONS]);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        IntegrationsController.prototype.createNativeExport,
      ),
    ).toBe("connections/:connectionId/exports");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        IntegrationsController.prototype.disableConnection,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        IntegrationsController.prototype.enableConnection,
      ),
    ).toBe("connections/:connectionId/enable");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        IntegrationsController.prototype.revokeConnection,
      ),
    ).toBe(RequestMethod.DELETE);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        IntegrationsController.prototype.listResources,
      ),
    ).toBe("providers/:provider/resources");
  });
});

describe("integration DTOs", () => {
  it("allows Clerk OAuth connections to be created before destination selection", () => {
    expect(
      createIntegrationConnectionBodySchema.parse({
        provider: "SLACK",
      }),
    ).toMatchObject({
      provider: "SLACK",
      authStrategy: "CLERK_OAUTH",
      config: {},
    });

    expect(
      createIntegrationConnectionBodySchema.parse({
        provider: "GITHUB",
        authStrategy: "MANUAL_SECRET",
        config: { owner: "semblia", repo: "web" },
      }),
    ).toMatchObject({
      provider: "GITHUB",
      authStrategy: "MANUAL_SECRET",
      config: { owner: "semblia", repo: "web" },
    });
  });

  it("still requires provider-specific config for manual connections", () => {
    expect(() =>
      createIntegrationConnectionBodySchema.parse({
        provider: "SLACK",
        authStrategy: "MANUAL_SECRET",
        config: {},
      }),
    ).toThrow(/channelId/);
  });

  it("strips private fields from native export payloads", () => {
    const parsed = createNativeIntegrationExportBodySchema.parse({
      eventType: "submission.moderated",
      payload: {
        title: "Approved submission",
        content: "Great product.",
        authorEmail: "private@example.com",
        ipAddress: "127.0.0.1",
      },
    });

    expect(parsed.payload).not.toHaveProperty("authorEmail");
    expect(parsed.payload).not.toHaveProperty("ipAddress");
  });
});

describe("IntegrationsService", () => {
  let service: IntegrationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) =>
      callback(prismaMock.client),
    );
    mockQueueAdd.mockResolvedValue({ id: "job_1" });
    service = makeService();
  });

  it("creates a Clerk OAuth connection with an audit row", async () => {
    mockGetToken.mockResolvedValue({
      accessToken: "xoxb-token",
      scopes: ["chat:write", "channels:read", "groups:read"],
    });
    mockConnectionCreate.mockImplementation(async ({ data }) =>
      makeConnection({
        provider: data.provider,
        authStrategy: data.authStrategy,
        connectedByUserId: data.connectedByUserId,
        clerkProvider: data.clerkProvider,
        scopes: data.scopes,
        config: data.config,
      }),
    );

    const created = await service.createConnection(
      "project_1",
      {
        provider: "SLACK",
        authStrategy: "CLERK_OAUTH",
        scopes: [],
        config: {},
      },
      actor,
    );

    expect(mockGetToken).toHaveBeenCalledWith({
      userId: "user_1",
      provider: "slack",
      requiredScopes: ["chat:write", "channels:read", "groups:read"],
    });
    expect(created).toMatchObject({
      provider: IntegrationProvider.SLACK,
      connectedByUserId: "user_1",
      clerkProvider: "slack",
      scopes: ["chat:write", "channels:read", "groups:read"],
    });
    expect(mockAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        action: "integration_connection.created",
        targetType: "integration_connection",
      }),
    });
  });

  it("normalizes empty OAuth scope updates before saving", async () => {
    mockConnectionFindFirst.mockResolvedValue(makeConnection());
    mockGetToken.mockResolvedValue({
      accessToken: "xoxb-token",
      scopes: ["chat:write", "channels:read", "groups:read"],
    });
    mockConnectionUpdate.mockImplementation(async ({ data }) =>
      makeConnection({
        scopes: data.scopes,
        config: data.config,
      }),
    );

    const updated = await service.updateConnection(
      "project_1",
      "iconn_1",
      {
        scopes: [],
        config: { channelId: "C456" },
      },
      actor,
    );

    expect(mockGetToken).toHaveBeenCalledWith({
      userId: "user_1",
      provider: "slack",
      requiredScopes: ["chat:write", "channels:read", "groups:read"],
    });
    expect(mockConnectionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopes: ["chat:write", "channels:read", "groups:read"],
          config: { channelId: "C456" },
        }),
      }),
    );
    expect(updated.scopes).toEqual([
      "chat:write",
      "channels:read",
      "groups:read",
    ]);
  });

  it("lists OAuth-discovered provider resources for destination selection", async () => {
    mockProviderListResources.mockResolvedValue({
      provider: "SLACK",
      items: [
        {
          id: "C123",
          label: "customer-love",
          config: { channelId: "C123" },
          metadata: { isPrivate: false },
        },
      ],
      nextCursor: null,
    });
    mockGetToken.mockResolvedValue({
      accessToken: "xoxb-token",
      scopes: ["chat:write", "channels:read", "groups:read"],
    });

    const resources = await service.listResources(
      "SLACK",
      { query: "customer", cursor: undefined },
      actor,
    );

    expect(mockGetToken).toHaveBeenCalledWith({
      userId: "user_1",
      provider: "slack",
      requiredScopes: ["chat:write", "channels:read", "groups:read"],
    });
    expect(mockProviderListResources).toHaveBeenCalledWith({
      token: expect.objectContaining({ accessToken: "xoxb-token" }),
      query: "customer",
      cursor: undefined,
    });
    expect(resources.items[0]).toMatchObject({
      id: "C123",
      label: "customer-love",
      config: { channelId: "C123" },
    });
  });

  it("re-enables a disabled Clerk OAuth connection after token and scope proof", async () => {
    mockConnectionFindFirst.mockResolvedValue(
      makeConnection({ status: "DISABLED" }),
    );
    mockGetToken.mockResolvedValue({
      accessToken: "xoxb-token",
      scopes: ["chat:write"],
    });
    mockConnectionUpdate.mockImplementation(async ({ data }) =>
      makeConnection({ status: data.status }),
    );

    const enabled = await service.enableConnection(
      "project_1",
      "iconn_1",
      actor,
    );

    expect(mockGetToken).toHaveBeenCalledWith({
      userId: "user_1",
      provider: "slack",
      requiredScopes: ["chat:write"],
    });
    expect(enabled.status).toBe("ACTIVE");
    expect(mockAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "integration_connection.enabled",
        targetId: "iconn_1",
      }),
    });
  });

  it("revokes a connection instead of only disabling it", async () => {
    mockConnectionFindFirst.mockResolvedValue(makeConnection());
    mockConnectionUpdate.mockImplementation(async ({ data }) =>
      makeConnection({ status: data.status }),
    );

    const revoked = await service.revokeConnection(
      "project_1",
      "iconn_1",
      actor,
    );

    expect(revoked.status).toBe("REVOKED");
    expect(mockAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "integration_connection.revoked",
        targetId: "iconn_1",
      }),
    });
  });

  it("queues native exports through export delivery records", async () => {
    mockConnectionFindFirst.mockResolvedValue(makeConnection());
    mockDestinationFindMany.mockResolvedValue([]);
    mockDestinationCreate.mockResolvedValue(makeDestination());
    mockDeliveryCreate.mockImplementation(async ({ data }) =>
      makeDelivery({
        id: data.id,
        destinationId: data.destinationId,
        eventType: data.eventType,
        payload: data.payload,
      }),
    );

    const delivery = await service.createNativeExport(
      "project_1",
      "iconn_1",
      {
        eventType: "submission.moderated",
        payload: {
          title: "Great feedback",
          content: "Semblia helped us ship.",
          authorName: "Ava",
        },
      },
      actor,
    );

    expect(delivery.status).toBe(DeliveryStatus.PENDING);
    expect(mockDestinationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        provider: ExportDestinationProvider.SLACK,
        config: expect.objectContaining({ connectionId: "iconn_1" }),
      }),
      select: expect.any(Object),
    });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      "deliver",
      { deliveryId: expect.stringMatching(/^nexp_/) },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("uses connected-account tokens and provider adapters to complete deliveries", async () => {
    mockDeliveryFindFirst.mockResolvedValue(makeDelivery());
    mockConnectionFindFirst.mockResolvedValue(makeConnection());
    mockDeliveryUpdate
      .mockResolvedValueOnce(
        makeDelivery({ status: DeliveryStatus.DELIVERING, attempts: 1 }),
      )
      .mockImplementationOnce(async ({ data }) =>
        makeDelivery({
          status: data.status,
          payload: data.payload,
          completedAt: data.completedAt,
        }),
      );
    mockGetToken.mockResolvedValue({
      accessToken: "xoxb-token",
      scopes: ["chat:write"],
    });
    mockProviderDeliver.mockResolvedValue({
      externalId: "1710000000.0001",
      response: { ok: true, ts: "1710000000.0001" },
    });

    const completed = await service.processNativeExport("nexp_123");

    expect(mockGetToken).toHaveBeenCalledWith({
      userId: "user_1",
      provider: "slack",
      requiredScopes: ["chat:write"],
    });
    expect(mockProviderDeliver).toHaveBeenCalledWith({
      token: expect.objectContaining({ accessToken: "xoxb-token" }),
      connection: expect.objectContaining({
        id: "iconn_1",
        provider: IntegrationProvider.SLACK,
      }),
      delivery: expect.objectContaining({
        id: "nexp_123",
        payload: expect.objectContaining({ title: "Great feedback" }),
      }),
    });
    expect(completed.status).toBe(DeliveryStatus.SUCCEEDED);
    expect(completed.payload).toMatchObject({
      providerResult: { externalId: "1710000000.0001" },
    });
  });
});

describe("ClerkConnectedAccountTokenProvider", () => {
  it("throws a connect-required error when Clerk has no token", async () => {
    const provider = new ClerkConnectedAccountTokenProvider({
      getUserOauthAccessToken: vi.fn().mockResolvedValue(null),
    } as unknown as ClerkService);

    await expect(
      provider.getToken({
        userId: "user_1",
        provider: "slack",
        requiredScopes: ["chat:write"],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws a reconnect-required error when granted scopes are insufficient", async () => {
    const provider = new ClerkConnectedAccountTokenProvider({
      getUserOauthAccessToken: vi.fn().mockResolvedValue({
        accessToken: "oauth-token",
        scopes: ["channels:read"],
      }),
    } as unknown as ClerkService);

    await expect(
      provider.getToken({
        userId: "user_1",
        provider: "slack",
        requiredScopes: ["chat:write", "channels:read"],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("native provider adapters", () => {
  const delivery = {
    id: "nexp_123",
    projectId: "project_1",
    eventType: "submission.moderated",
    payload: {
      title: "Great feedback",
      content: "Semblia helped us ship.",
      authorName: "Ava",
    },
  };
  const token = { accessToken: "oauth-token", scopes: [] };

  it("maps Slack exports to chat.postMessage", async () => {
    const postJson = vi.fn().mockResolvedValue({
      status: 200,
      body: { ok: true, ts: "1710000000.0001" },
    });
    const provider = new SlackExportProvider({
      postJson,
    } as unknown as IntegrationHttpClient);

    await provider.deliver({
      token,
      connection: {
        id: "iconn_1",
        provider: IntegrationProvider.SLACK,
        config: { channelId: "C123" },
      },
      delivery,
    });

    expect(postJson).toHaveBeenCalledWith({
      url: "https://slack.com/api/chat.postMessage",
      token: "oauth-token",
      body: expect.objectContaining({
        channel: "C123",
        text: expect.stringContaining("Semblia helped us ship."),
      }),
    });
  });

  it("maps Slack resource discovery to conversations.list channel choices", async () => {
    const getJson = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        ok: true,
        channels: [
          { id: "C123", name: "customer-love", is_private: false },
          { id: "C999", name: "random", is_private: false },
        ],
        response_metadata: { next_cursor: "next-page" },
      },
    });
    const provider = new SlackExportProvider({
      getJson,
    } as unknown as IntegrationHttpClient);

    const resources = await provider.listResources({
      token,
      query: "customer",
      cursor: "page-1",
    });

    expect(getJson).toHaveBeenCalledWith({
      url: "https://slack.com/api/conversations.list",
      token: "oauth-token",
      params: {
        cursor: "page-1",
        exclude_archived: "true",
        limit: "100",
        types: "public_channel,private_channel",
      },
    });
    expect(resources).toEqual({
      provider: "SLACK",
      items: [
        {
          id: "C123",
          label: "customer-love",
          config: { channelId: "C123" },
          metadata: { isPrivate: false },
        },
      ],
      nextCursor: "next-page",
    });
  });

  it("maps Notion exports to page creation under a configured page", async () => {
    const postJson = vi.fn().mockResolvedValue({
      status: 200,
      body: { id: "page_1", url: "https://notion.so/page_1" },
    });
    const provider = new NotionExportProvider({
      postJson,
    } as unknown as IntegrationHttpClient);

    await provider.deliver({
      token,
      connection: {
        id: "iconn_1",
        provider: IntegrationProvider.NOTION,
        config: { parentPageId: "page_parent" },
      },
      delivery,
    });

    expect(postJson).toHaveBeenCalledWith({
      url: "https://api.notion.com/v1/pages",
      token: "oauth-token",
      headers: { "Notion-Version": "2022-06-28" },
      body: expect.objectContaining({
        parent: { page_id: "page_parent" },
      }),
    });
  });

  it("maps Linear exports to issueCreate", async () => {
    const postJson = vi.fn().mockResolvedValue({
      status: 200,
      body: {
        data: {
          issueCreate: {
            success: true,
            issue: { id: "issue_1", title: "Great feedback" },
          },
        },
      },
    });
    const provider = new LinearExportProvider({
      postJson,
    } as unknown as IntegrationHttpClient);

    await provider.deliver({
      token,
      connection: {
        id: "iconn_1",
        provider: IntegrationProvider.LINEAR,
        config: { teamId: "team_1" },
      },
      delivery,
    });

    expect(postJson).toHaveBeenCalledWith({
      url: "https://api.linear.app/graphql",
      token: "oauth-token",
      body: expect.objectContaining({
        variables: {
          input: expect.objectContaining({
            teamId: "team_1",
            title: "Great feedback",
          }),
        },
      }),
    });
  });

  it("maps GitHub exports to issue creation", async () => {
    const postJson = vi.fn().mockResolvedValue({
      status: 201,
      body: { id: 123, html_url: "https://github.com/semblia/web/issues/1" },
    });
    const provider = new GithubExportProvider({
      postJson,
    } as unknown as IntegrationHttpClient);

    await provider.deliver({
      token,
      connection: {
        id: "iconn_1",
        provider: IntegrationProvider.GITHUB,
        config: { owner: "semblia", repo: "web", labels: ["feedback"] },
      },
      delivery,
    });

    expect(postJson).toHaveBeenCalledWith({
      url: "https://api.github.com/repos/semblia/web/issues",
      token: "oauth-token",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      body: expect.objectContaining({
        title: "Great feedback",
        labels: ["feedback"],
      }),
    });
  });
});
