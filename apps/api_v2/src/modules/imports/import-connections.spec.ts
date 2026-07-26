import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@workspace/database/prisma";

import type { ClerkService } from "../clerk/clerk.service.js";
import { ClerkConnectedAccountTokenProvider } from "../integrations/token-providers/clerk-connected-account-token-provider.js";
import {
  CONNECTED_CONTINUATION_PAGE_COUNT,
  connectedContinuationScenario,
  connection,
  connectionCreationScenario,
  officialProviderScenario,
  publicDisableScenario,
  requireConnectedFence,
  resumableMultiPageScenario,
  schedulerFencingScenario,
  service,
} from "./import-connections.spec-support.js";

const actor = {
  actorType: "user" as const,
  userId: "user_1",
  clerkOrgPermissions: [],
  scopes: [],
};

describe("import connections", () => {
  it("uses Clerk's organization membership result for durable sync authorization", async () => {
    const getOrganizationMembershipList = vi.fn().mockResolvedValue({
      data: [{ publicUserData: { userId: "user_1" } }],
      totalCount: 1,
    });
    const provider = new ClerkConnectedAccountTokenProvider({
      getClient: vi.fn().mockReturnValue({
        organizations: { getOrganizationMembershipList },
      }),
    } as unknown as ClerkService);

    await expect(
      provider.hasOrganizationMembership({
        userId: "user_1",
        organizationId: "org_1",
      }),
    ).resolves.toBe(true);
    expect(getOrganizationMembershipList).toHaveBeenCalledWith({
      organizationId: "org_1",
      userId: ["user_1"],
      limit: 1,
      offset: 0,
    });
  });

  it("uses Clerk tokens for resource discovery without returning provider config", async () => {
    const getToken = vi.fn().mockResolvedValue({
      accessToken: "secret-token",
      scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    });
    const listResources = vi.fn().mockResolvedValue({
      items: [
        {
          id: "video_1",
          label: "Launch video",
          config: { videoId: "video_1", privateHint: "not-for-client" },
        },
      ],
      nextCursor: "next-page",
    });
    const imports = service({
      prisma: { client: {} },
      provider: { listResources },
      tokens: { getToken },
    });

    await expect(
      imports.listProviderResources({
        projectId: "project_1",
        sourceKey: "youtube",
        query: {},
        actor,
      }),
    ).resolves.toEqual({
      items: [{ id: "video_1", label: "Launch video" }],
      nextCursor: "next-page",
    });
    expect(getToken).toHaveBeenCalledWith({
      userId: "user_1",
      provider: "google",
      requiredScopes: ["https://www.googleapis.com/auth/youtube.readonly"],
      requireScopeEvidence: true,
    });
    expect(listResources).toHaveBeenCalledWith("secret-token", undefined);
  });

  it("re-discovers the selected resource and schedules only an opaque connection identity", async () => {
    const { create, imports, queue } = connectionCreationScenario();

    const result = await imports.createConnection({
      projectId: "project_1",
      input: {
        sourceKey: "youtube",
        resourceId: "video_1",
        rightsConfirmed: true,
        autoSyncEnabled: true,
      },
      actor,
    });

    expect(JSON.stringify(create.mock.calls)).not.toContain("secret-token");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          connectedByUserId: "user_1",
          clerkProvider: "google",
          externalAccountId: "video_1",
          config: {
            resourceId: "video_1",
            resourceLabel: "Launch video",
            provider: { videoId: "video_1" },
            rightsConfirmed: true,
          },
          autoSyncEnabled: false,
        }),
      }),
    );
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      "import-connection_1",
      { every: 21_600_000 },
      expect.objectContaining({
        name: "import-connected-sync",
        data: { jobId: "connection:connection_1" },
      }),
    );
    expect(result).toMatchObject({
      id: "connection_1",
      resourceId: "video_1",
      resourceLabel: "Launch video",
      autoSyncEnabled: true,
    });
    expect(result).not.toHaveProperty("config");
    expect(result).not.toHaveProperty("requestedScopes");
  });

  it("previews a public URL before persisting a durable public connection", async () => {
    const create = vi.fn().mockResolvedValue(
      connection({
        sourceKey: "wordpress",
        authStrategy: "PUBLIC_URL",
        connectedByUserId: null,
        clerkProvider: null,
        externalAccountId: "hash",
        publicUrl: "https://wordpress.com/reviews",
        requestedScopes: [],
        config: {
          sourceUrl: "https://wordpress.com/reviews",
          mode: "PUBLIC_URL",
          rightsConfirmed: true,
          resourceLabel: "wordpress.com",
        },
      }),
    );
    const provider = {
      fetchCandidates: vi.fn().mockResolvedValue([{ externalId: "review_1" }]),
    };
    const imports = service({
      prisma: {
        client: {
          importConnection: { findFirst: vi.fn().mockResolvedValue(null) },
          $transaction: vi.fn(
            async (
              callback: (writer: {
                importConnection: { create: typeof create };
              }) => Promise<unknown>,
            ) => callback({ importConnection: { create } }),
          ),
        },
      },
      provider: {},
      officialUrlProvider: { get: vi.fn().mockReturnValue(provider) },
    });
    const result = await imports.createConnection({
      projectId: "project_1",
      input: {
        sourceKey: "wordpress",
        sourceUrl: "https://wordpress.com/reviews",
        mode: "PUBLIC_URL",
        rightsConfirmed: true,
      },
      actor,
    });
    expect(provider.fetchCandidates).toHaveBeenCalledWith(
      "https://wordpress.com/reviews",
      1,
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authStrategy: "PUBLIC_URL",
          externalAccountId: expect.stringMatching(/^[a-f0-9]{64}$/),
          publicUrl: "https://wordpress.com/reviews",
          config: expect.objectContaining({
            sourceUrl: "https://wordpress.com/reviews",
            mode: "PUBLIC_URL",
          }),
        }),
      }),
    );
    expect(result).toMatchObject({
      publicUrl: "https://wordpress.com/reviews",
      resourceId: null,
    });
  });

  it("maps an invalid public connection URL to the safe conflict", async () => {
    const imports = service({
      prisma: { client: {} },
      provider: {},
    });

    await expect(
      imports.createConnection({
        projectId: "project_1",
        input: {
          sourceKey: "wordpress",
          sourceUrl: "https://example.com/reviews",
          mode: "PUBLIC_URL",
          rightsConfirmed: true,
        },
        actor,
      }),
    ).rejects.toThrow("Public import URL is not allowed");
  });

  it.each([
    [
      "legacy external-account fields",
      ["projectId", "sourceKey", "externalAccountId"],
    ],
    [
      "public URL constraint name",
      ["ImportConnection_public_url_identity_key"],
    ],
  ])(
    "maps a %s uniqueness race to a safe public connection conflict",
    async (_shape, target) => {
      const race = new Prisma.PrismaClientKnownRequestError("connection race", {
        code: "P2002",
        clientVersion: "test",
        meta: { target },
      });
      const imports = service({
        prisma: {
          client: {
            importConnection: { findFirst: vi.fn().mockResolvedValue(null) },
            $transaction: vi.fn().mockRejectedValue(race),
          },
        },
        provider: {},
        officialUrlProvider: {
          get: vi.fn().mockReturnValue({
            fetchCandidates: vi.fn().mockResolvedValue([{ id: "1" }]),
          }),
        },
      });

      await expect(
        imports.createConnection({
          projectId: "project_1",
          input: {
            sourceKey: "wordpress",
            sourceUrl: "https://wordpress.com/reviews",
            mode: "PUBLIC_URL",
            rightsConfirmed: true,
          },
          actor,
        }),
      ).rejects.toThrow("This public URL is already connected");
    },
  );

  it("does not persist a public connection when its bounded preview fails", async () => {
    const create = vi.fn();
    const tx = { importConnection: { create } };
    const transaction = vi.fn(
      async (callback: (writer: typeof tx) => Promise<unknown>) => callback(tx),
    );
    const imports = service({
      prisma: {
        client: {
          importConnection: { findFirst: vi.fn() },
          $transaction: transaction,
        },
      },
      provider: {},
      officialUrlProvider: {
        get: vi
          .fn()
          .mockReturnValue({ fetchCandidates: vi.fn().mockResolvedValue([]) }),
      },
    });
    await expect(
      imports.createConnection({
        projectId: "project_1",
        input: {
          sourceKey: "wordpress",
          sourceUrl: "https://wordpress.com/reviews",
          mode: "PUBLIC_URL",
          rightsConfirmed: true,
        },
        actor,
      }),
    ).rejects.toThrow("No importable public proof");
    expect(transaction).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("stops a public connection before the next durable row after disable", async () => {
    const { importJob, imports } = publicDisableScenario();
    const persist = vi
      .spyOn(imports, "persistCandidate")
      .mockResolvedValue("IMPORTED");

    await expect(imports.process("job_public")).rejects.toThrow(
      "Import failed",
    );
    expect(persist).toHaveBeenCalledOnce();
    expect(importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("processes official provider candidates and advances the durable cursor", async () => {
    const {
      fetchCandidates,
      importConnection,
      importJob,
      imports,
      moderation,
    } = officialProviderScenario();

    await imports.process("job_1");

    expect(fetchCandidates).toHaveBeenCalledWith(
      "secret-token",
      { videoId: "video_1" },
      undefined,
    );
    expect(importJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "SUCCEEDED",
        totalCount: 1,
        importedCount: 1,
      }),
    });
    expect(importConnection.update).toHaveBeenLastCalledWith({
      where: { id: "connection_1" },
      data: expect.objectContaining({
        cursor: null,
        lastSyncedAt: expect.any(Date),
        lastErrorCode: null,
      }),
    });
    expect(moderation.enqueueSubmission).toHaveBeenCalledWith({
      submissionId: "response_1",
    });
  });

  it("completes 101 one-candidate connected-provider continuation steps", async () => {
    const { events, fetchCandidates, importJob, imports, persistence } =
      connectedContinuationScenario();

    await imports.process("job_101");

    expect(fetchCandidates).toHaveBeenCalledTimes(
      CONNECTED_CONTINUATION_PAGE_COUNT,
    );
    expect(persistence.formResponseCreate).toHaveBeenCalledTimes(
      CONNECTED_CONTINUATION_PAGE_COUNT,
    );
    expect(persistence.responseImportIdentity.create).toHaveBeenCalledTimes(
      CONNECTED_CONTINUATION_PAGE_COUNT,
    );
    expect(persistence.importItem.create).toHaveBeenCalledTimes(
      CONNECTED_CONTINUATION_PAGE_COUNT,
    );
    expect(events).toEqual(
      Array.from({ length: CONNECTED_CONTINUATION_PAGE_COUNT }, (_, step) => [
        `fetch:${step}`,
        `persist:${step}`,
      ]).flat(),
    );
    expect(importJob.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUCCEEDED",
          totalCount: 101,
          importedCount: 101,
        }),
      }),
    );
  });

  it.each([
    ["durable connection", { enabled: false }, "connection"],
    ["automatic sync", { autoSyncEnabled: false }, "automatic"],
  ] as const)(
    "fences %s before removing its scheduler",
    async (_label, connectionUpdate, operation) => {
      const { events, imports } = schedulerFencingScenario(connectionUpdate);

      if (operation === "connection")
        await imports.changeConnectionState({
          projectId: "project_1",
          connectionId: "connection_1",
          actor,
          operation: "DISABLE",
        });
      else
        await imports.updateConnection({
          projectId: "project_1",
          connectionId: "connection_1",
          input: { autoSyncEnabled: false },
          actor,
        });

      expect(events).toEqual(["database", "scheduler"]);
    },
  );

  it("keeps a delayed failed sync as the active durable job", async () => {
    const retry = vi.fn();
    const getState = vi.fn().mockResolvedValue("delayed");
    const active = {
      id: "job_failed",
      projectId: "project_1",
      sourceKey: "youtube",
      mode: "CONNECTED_API",
      status: "FAILED",
      items: [],
    };
    const imports = service({
      prisma: {
        client: {
          importConnection: {
            findFirst: vi.fn().mockResolvedValue(connection()),
          },
          importJob: { findFirst: vi.fn().mockResolvedValue(active) },
        },
      },
      queue: {
        getJob: vi.fn().mockResolvedValue({ getState, retry }),
      },
      provider: {},
    });

    await expect(
      imports.syncConnection({
        projectId: "project_1",
        connectionId: "connection_1",
        actor,
      }),
    ).resolves.toBe(active);

    expect(getState).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });

  it("reuses the durable winner when manual and scheduled sync creation race", async () => {
    const race = new Prisma.PrismaClientKnownRequestError("active job", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["ImportJob_one_active_connection_job_key"] },
    });
    const active = {
      id: "job_winner",
      projectId: "project_1",
      mode: "CONNECTED_API",
      sourceKey: "youtube",
      status: "QUEUED",
      totalCount: 0,
      importedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errorCode: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date("2026-07-22T00:00:00.000Z"),
      updatedAt: new Date("2026-07-22T00:00:00.000Z"),
    };
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(active);
    const add = vi.fn().mockResolvedValue({ id: "import-job_winner" });
    const imports = service({
      prisma: {
        client: {
          importConnection: {
            findFirst: vi.fn().mockResolvedValue(connection()),
          },
          importJob: { findFirst },
          $transaction: vi.fn().mockRejectedValue(race),
        },
      },
      queue: { add },
      provider: {},
    });

    await expect(
      imports.syncConnection({
        projectId: "project_1",
        connectionId: "connection_1",
        actor,
      }),
    ).resolves.toEqual(active);
    expect(add).toHaveBeenCalledWith(
      "import",
      { jobId: "job_winner" },
      expect.objectContaining({ jobId: "import-job_winner" }),
    );
  });

  it("resumes a failed multi-page job from its durable row checkpoint", async () => {
    const { imports, jobState } = resumableMultiPageScenario();
    const persist = vi
      .spyOn(imports, "persistCandidate")
      .mockResolvedValue("IMPORTED");

    await expect(imports.process("job_1")).rejects.toThrow("Import failed");
    expect(jobState.config).toMatchObject({
      cursor: "page-two",
      rowOffset: 1,
    });
    expect(jobState.importedCount).toBe(1);

    await imports.process("job_1");

    expect(
      persist.mock.calls.map(([input]) => [
        input.candidate.externalId,
        input.rowIndex,
      ]),
    ).toEqual([
      ["youtube:a", 0],
      ["youtube:b", 1],
    ]);
  });

  it("preserves a provider delay for a scheduler-originated sync", async () => {
    const retry = vi.fn();
    const getState = vi.fn().mockResolvedValue("delayed");
    const active = { id: "job_failed", status: "FAILED" };
    const imports = service({
      prisma: {
        client: {
          importConnection: {
            findUnique: vi
              .fn()
              .mockResolvedValue(connection({ autoSyncEnabled: true })),
          },
          importJob: {
            findFirst: vi.fn().mockResolvedValue(active),
          },
        },
      },
      queue: {
        getJob: vi.fn().mockResolvedValue({ getState, retry }),
      },
      provider: {},
    });

    await expect(imports.process("connection:connection_1")).resolves.toBe(
      active,
    );
    expect(getState).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });

  it("disables a scheduled OAuth connection whose connected user lost import access before token retrieval", async () => {
    const record = connection({ autoSyncEnabled: true });
    const getToken = vi.fn();
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const imports = service({
      prisma: {
        client: {
          importJob: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: "job_1",
              projectId: "project_1",
              sourceKey: "youtube",
              mode: "CONNECTED_API",
              connectionId: "connection_1",
              config: { scheduled: true },
              importedCount: 0,
              duplicateCount: 0,
              failedCount: 0,
            }),
            update: vi.fn(),
          },
          importConnection: {
            findFirst: vi.fn().mockResolvedValue(record),
            updateMany,
          },
        },
      },
      queue: { removeJobScheduler: vi.fn().mockResolvedValue(undefined) },
      provider: { fetchCandidates: vi.fn() },
      tokens: { getToken },
      projectAccess: {
        resolveBySlug: vi
          .fn()
          .mockRejectedValue(new ForbiddenException("removed")),
      },
    });
    const persist = vi
      .spyOn(imports, "persistCandidate")
      .mockResolvedValue("IMPORTED");

    await expect(imports.process("job_1")).rejects.toThrow("Import failed");

    expect(getToken).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "connection_1", projectId: "project_1" },
        data: { enabled: false, autoSyncEnabled: false },
      }),
    );
  });

  it("keeps an organization member's scheduled OAuth connection enabled", async () => {
    const record = connection({
      autoSyncEnabled: true,
      project: {
        slug: "project-one",
        organization: { clerkOrgId: "org_1" },
      },
    });
    const hasOrganizationMembership = vi.fn().mockResolvedValue(true);
    const updateMany = vi.fn();
    const imports = service({
      prisma: {
        client: {
          importConnection: {
            findFirst: vi.fn().mockResolvedValue({ id: record.id }),
            updateMany,
          },
        },
      },
      provider: {},
      tokens: { getToken: vi.fn(), hasOrganizationMembership },
      projectAccess: {
        resolveBySlug: vi
          .fn()
          .mockRejectedValue(new ForbiddenException("not a direct member")),
      },
    });
    await expect(
      requireConnectedFence({ imports, record, scheduled: true }),
    ).resolves.toBe(undefined);
    expect(hasOrganizationMembership).toHaveBeenCalledWith({
      userId: "user_1",
      organizationId: "org_1",
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not disable an OAuth connection when Clerk membership lookup fails", async () => {
    const record = connection({
      autoSyncEnabled: true,
      project: {
        slug: "project-one",
        organization: { clerkOrgId: "org_1" },
      },
    });
    const updateMany = vi.fn();
    const imports = service({
      prisma: {
        client: {
          importConnection: {
            findFirst: vi.fn().mockResolvedValue({ id: record.id }),
            updateMany,
          },
        },
      },
      provider: {},
      tokens: {
        getToken: vi.fn(),
        hasOrganizationMembership: vi
          .fn()
          .mockRejectedValue(new Error("Clerk unavailable")),
      },
      projectAccess: {
        resolveBySlug: vi
          .fn()
          .mockRejectedValue(new ForbiddenException("not a direct member")),
      },
    });
    await expect(
      requireConnectedFence({ imports, record, scheduled: true }),
    ).rejects.toThrow("Clerk unavailable");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not disable an OAuth connection for a transient access lookup failure", async () => {
    const getToken = vi.fn();
    const updateConnection = vi.fn();
    const removeJobScheduler = vi.fn();
    const transaction = vi.fn();
    const imports = service({
      prisma: {
        client: {
          $transaction: transaction,
          importJob: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: "job_1",
              projectId: "project_1",
              sourceKey: "youtube",
              mode: "CONNECTED_API",
              connectionId: "connection_1",
              config: { scheduled: true },
              importedCount: 0,
              duplicateCount: 0,
              failedCount: 0,
            }),
            update: vi.fn(),
          },
          importConnection: {
            findFirst: vi
              .fn()
              .mockResolvedValue(connection({ autoSyncEnabled: true })),
            updateMany: updateConnection,
          },
        },
      },
      queue: { removeJobScheduler },
      provider: { fetchCandidates: vi.fn() },
      tokens: { getToken },
      projectAccess: {
        resolveBySlug: vi.fn().mockRejectedValue(new Error("database down")),
      },
    });

    await expect(imports.process("job_1")).rejects.toThrow("Import failed");

    expect(getToken).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(updateConnection).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          autoSyncEnabled: false,
        }),
      }),
    );
    expect(removeJobScheduler).not.toHaveBeenCalled();
  });

  it("rechecks OAuth import access after each provider page before durable writes", async () => {
    const record = connection();
    const getToken = vi.fn().mockResolvedValue({ accessToken: "secret-token" });
    const imports = service({
      prisma: {
        client: {
          importJob: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: "job_1",
              projectId: "project_1",
              sourceKey: "youtube",
              mode: "CONNECTED_API",
              connectionId: "connection_1",
              config: {},
              importedCount: 0,
              duplicateCount: 0,
              failedCount: 0,
            }),
            update: vi.fn(),
          },
          importConnection: {
            findFirst: vi.fn().mockResolvedValue(record),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      },
      queue: { removeJobScheduler: vi.fn().mockResolvedValue(undefined) },
      provider: {
        fetchCandidates: vi.fn().mockResolvedValue({
          candidates: [{ externalId: "youtube:1", text: "Proof", tags: [] }],
          nextCursor: null,
        }),
      },
      tokens: { getToken },
      projectAccess: {
        resolveBySlug: vi
          .fn()
          .mockResolvedValueOnce({ capabilities: new Set(["OPERATE_PROJECT"]) })
          .mockResolvedValueOnce({ capabilities: new Set(["OPERATE_PROJECT"]) })
          .mockResolvedValueOnce({ capabilities: new Set(["OPERATE_PROJECT"]) })
          .mockRejectedValueOnce(new ForbiddenException("removed")),
      },
    });
    const persist = vi
      .spyOn(imports, "persistCandidate")
      .mockResolvedValue("IMPORTED");

    await expect(imports.process("job_1")).rejects.toThrow("Import failed");

    expect(getToken).toHaveBeenCalledOnce();
    expect(persist).not.toHaveBeenCalled();
  });
});
