import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@workspace/database/prisma";

import type { ClerkService } from "../clerk/clerk.service.js";
import { ClerkConnectedAccountTokenProvider } from "../integrations/token-providers/clerk-connected-account-token-provider.js";
import { ImportsService } from "./imports.service.js";

const actor = {
  actorType: "user" as const,
  userId: "user_1",
  clerkOrgPermissions: [],
  scopes: [],
};

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: "connection_1",
    projectId: "project_1",
    sourceKey: "youtube",
    authStrategy: "CLERK_OAUTH",
    connectedByUserId: "user_1",
    clerkProvider: "google",
    externalAccountId: "video_1",
    publicUrl: null,
    requestedScopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    config: {
      resourceId: "video_1",
      resourceLabel: "Launch video",
      provider: { videoId: "video_1" },
      rightsConfirmed: true,
    },
    enabled: true,
    autoSyncEnabled: false,
    cursor: null,
    lastSyncedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: new Date("2026-07-22T00:00:00.000Z"),
    updatedAt: new Date("2026-07-22T00:00:00.000Z"),
    project: { slug: "project-one", organization: null },
    ...overrides,
  };
}

function service(input: {
  prisma: Record<string, unknown>;
  queue?: Record<string, unknown>;
  provider: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  audit?: Record<string, unknown>;
  moderation?: Record<string, unknown>;
  officialUrlProvider?: Record<string, unknown>;
  projectAccess?: Record<string, unknown>;
}) {
  return new ImportsService(
    input.prisma as never,
    (input.queue ?? {}) as never,
    (input.audit ?? { recordWith: vi.fn() }) as never,
    (input.moderation ?? {}) as never,
    undefined,
    (input.tokens ?? {
      getToken: vi.fn().mockResolvedValue({
        accessToken: "secret-token",
        scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
      }),
    }) as never,
    { get: vi.fn().mockReturnValue(input.provider) } as never,
    (input.officialUrlProvider ?? { get: vi.fn() }) as never,
    (input.projectAccess ?? {
      resolveBySlug: vi.fn().mockResolvedValue({
        capabilities: new Set(["OPERATE_PROJECT"]),
      }),
    }) as never,
  );
}

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
      imports.listProviderResources("project_1", "youtube", {}, actor),
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
    const record = connection();
    const create = vi.fn().mockResolvedValue(record);
    const tx = { importConnection: { create } };
    const update = vi
      .fn()
      .mockResolvedValue(connection({ autoSyncEnabled: true }));
    const queue = {
      upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
    };
    const listResources = vi.fn().mockResolvedValue({
      items: [
        {
          id: "video_1",
          label: "Launch video",
          config: { videoId: "video_1" },
        },
      ],
      nextCursor: null,
    });
    const imports = service({
      prisma: {
        client: {
          importConnection: {
            findFirst: vi.fn().mockResolvedValue(null),
            update,
          },
          $transaction: vi.fn(
            async (callback: (writer: typeof tx) => Promise<unknown>) =>
              callback(tx),
          ),
        },
      },
      queue,
      provider: { listResources },
    });

    const result = await imports.createConnection(
      "project_1",
      {
        sourceKey: "youtube",
        resourceId: "video_1",
        rightsConfirmed: true,
        autoSyncEnabled: true,
      },
      actor,
    );

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
    const result = await imports.createConnection(
      "project_1",
      {
        sourceKey: "wordpress",
        sourceUrl: "https://wordpress.com/reviews",
        mode: "PUBLIC_URL",
        rightsConfirmed: true,
      },
      actor,
    );
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

  it("does not persist a public connection when its bounded preview fails", async () => {
    const create = vi.fn();
    const imports = service({
      prisma: {
        client: {
          importConnection: { findFirst: vi.fn() },
          $transaction: vi.fn(),
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
      imports.createConnection(
        "project_1",
        {
          sourceKey: "wordpress",
          sourceUrl: "https://wordpress.com/reviews",
          mode: "PUBLIC_URL",
          rightsConfirmed: true,
        },
        actor,
      ),
    ).rejects.toThrow("No importable public proof");
    expect(create).not.toHaveBeenCalled();
  });

  it("stops a public connection before the next durable row after disable", async () => {
    const record = connection({
      sourceKey: "wordpress",
      authStrategy: "PUBLIC_URL",
      connectedByUserId: null,
      clerkProvider: null,
      publicUrl: "https://wordpress.com/reviews",
      config: {
        sourceUrl: "https://wordpress.com/reviews",
        mode: "PUBLIC_URL",
        rightsConfirmed: true,
      },
    });
    const findConnection = vi
      .fn()
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce(null);
    const importJob = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "job_public",
        projectId: "project_1",
        sourceKey: "wordpress",
        mode: "PUBLIC_URL",
        mediaAssetId: null,
        connectionId: "connection_1",
        config: { scheduled: true },
        importedCount: 0,
        duplicateCount: 0,
        failedCount: 0,
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const candidate = {
      externalId: "wordpress:1",
      sourceUrl: "https://wordpress.com/reviews",
      sourceCreatedAt: null,
      text: "Public proof",
      ratingValue: null,
      ratingScale: null,
      authorName: null,
      authorRole: null,
      authorCompany: null,
      tags: [],
    };
    const imports = service({
      prisma: {
        client: {
          importConnection: {
            findFirst: findConnection,
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          importJob,
        },
      },
      provider: {},
      officialUrlProvider: {
        get: vi.fn().mockReturnValue({
          fetchCandidates: vi
            .fn()
            .mockResolvedValue([candidate, { ...candidate, externalId: "2" }]),
        }),
      },
    });
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
    const importConnection = {
      findFirst: vi.fn().mockResolvedValue(connection()),
      update: vi.fn().mockResolvedValue(undefined),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const importJob = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "job_1",
        projectId: "project_1",
        sourceKey: "youtube",
        mode: "CONNECTED_API",
        mediaAssetId: null,
        connectionId: "connection_1",
        config: {
          connectionSnapshotVersion: 1,
          cursor: null,
          rowOffset: 0,
        },
        importedCount: 0,
        duplicateCount: 0,
        failedCount: 0,
      }),
      update: vi.fn().mockResolvedValue(undefined),
      findFirst: vi.fn().mockResolvedValue({
        id: "job_1",
        projectId: "project_1",
        sourceKey: "youtube",
        mode: "CONNECTED_API",
        status: "SUCCEEDED",
        items: [],
      }),
    };
    const tx = {
      formResponse: {
        create: vi.fn().mockResolvedValue({ id: "response_1" }),
      },
      responseImportIdentity: { create: vi.fn().mockResolvedValue(undefined) },
      importItem: { create: vi.fn().mockResolvedValue(undefined) },
      importJob,
      importConnection,
    };
    const fetchCandidates = vi.fn().mockResolvedValue({
      candidates: [
        {
          externalId: "youtube:comment_1",
          sourceUrl: "https://www.youtube.com/watch?v=video_1",
          sourceCreatedAt: "2026-07-20T00:00:00.000Z",
          text: "This walkthrough solved our onboarding problem.",
          ratingValue: null,
          ratingScale: null,
          authorName: "Ada",
          authorRole: null,
          authorCompany: null,
          tags: [],
        },
      ],
      nextCursor: null,
    });
    const moderation = { enqueueSubmission: vi.fn().mockResolvedValue(null) };
    const imports = service({
      prisma: {
        client: {
          importConnection,
          importJob,
          importItem: { findFirst: vi.fn().mockResolvedValue(null) },
          $transaction: vi.fn(
            async (callback: (writer: typeof tx) => Promise<unknown>) =>
              callback(tx),
          ),
        },
      },
      provider: { fetchCandidates },
      moderation,
    });

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
    const importConnection = {
      findFirst: vi.fn().mockResolvedValue(connection()),
      update: vi.fn().mockResolvedValue(undefined),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const job = {
      id: "job_101",
      projectId: "project_1",
      sourceKey: "youtube",
      mode: "CONNECTED_API",
      mediaAssetId: null,
      connectionId: "connection_1",
      config: { connectionSnapshotVersion: 1, cursor: null, rowOffset: 0 },
      importedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
    };
    const importJob = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(job),
      update: vi.fn().mockResolvedValue(undefined),
      findFirst: vi.fn().mockResolvedValue({ ...job, items: [] }),
    };
    const fetchCandidates = vi.fn(async (_token, _config, cursor?: string) => {
      const step = cursor ? Number(cursor.slice(5)) : 0;
      return {
        candidates: [{ externalId: `youtube:${step}` }],
        nextCursor: step < 100 ? `page-${step + 1}` : null,
      };
    });
    const imports = service({
      prisma: {
        client: {
          importConnection,
          importJob,
          $transaction: vi.fn(
            async (
              callback: (writer: {
                importConnection: typeof importConnection;
                importJob: typeof importJob;
              }) => Promise<unknown>,
            ) => callback({ importConnection, importJob }),
          ),
        },
      },
      provider: { fetchCandidates },
    });
    const persist = vi
      .spyOn(imports, "persistCandidate")
      .mockResolvedValue("IMPORTED");

    await imports.process("job_101");

    expect(fetchCandidates).toHaveBeenCalledTimes(101);
    expect(persist).toHaveBeenCalledTimes(101);
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

  it("fences the durable connection before removing its scheduler", async () => {
    const events: string[] = [];
    const record = connection({ autoSyncEnabled: true });
    const tx = {
      importConnection: {
        update: vi.fn(async () => {
          events.push("database");
          return { ...record, enabled: false };
        }),
      },
    };
    const imports = service({
      prisma: {
        client: {
          importConnection: { findFirst: vi.fn().mockResolvedValue(record) },
          $transaction: vi.fn(
            async (callback: (writer: typeof tx) => Promise<unknown>) =>
              callback(tx),
          ),
        },
      },
      queue: {
        removeJobScheduler: vi.fn(async () => {
          events.push("scheduler");
          return true;
        }),
      },
      provider: {},
    });

    await imports.disableConnection("project_1", "connection_1", actor);

    expect(events).toEqual(["database", "scheduler"]);
  });

  it("fences automatic sync before removing its scheduler", async () => {
    const events: string[] = [];
    const record = connection({ autoSyncEnabled: true });
    const tx = {
      importConnection: {
        update: vi.fn(async () => {
          events.push("database");
          return { ...record, autoSyncEnabled: false };
        }),
      },
    };
    const imports = service({
      prisma: {
        client: {
          importConnection: { findFirst: vi.fn().mockResolvedValue(record) },
          $transaction: vi.fn(
            async (callback: (writer: typeof tx) => Promise<unknown>) =>
              callback(tx),
          ),
        },
      },
      queue: {
        removeJobScheduler: vi.fn(async () => {
          events.push("scheduler");
          return true;
        }),
      },
      provider: {},
    });

    await imports.updateConnection(
      "project_1",
      "connection_1",
      { autoSyncEnabled: false },
      actor,
    );

    expect(events).toEqual(["database", "scheduler"]);
  });

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
      imports.syncConnection("project_1", "connection_1", actor),
    ).resolves.toBe(active);

    expect(getState).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });

  it("reuses the durable winner when manual and scheduled sync creation race", async () => {
    const race = new Prisma.PrismaClientKnownRequestError("active job", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: "ImportJob_one_active_connection_job_key" },
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
      imports.syncConnection("project_1", "connection_1", actor),
    ).resolves.toEqual(active);
    expect(add).toHaveBeenCalledWith(
      "import",
      { jobId: "job_winner" },
      expect.objectContaining({ jobId: "import-job_winner" }),
    );
  });

  it("resumes a failed multi-page job from its durable row checkpoint", async () => {
    const record = connection();
    const jobState = {
      id: "job_1",
      projectId: "project_1",
      sourceKey: "youtube",
      mode: "CONNECTED_API",
      status: "QUEUED",
      mediaAssetId: null,
      connectionId: "connection_1",
      config: {
        connectionSnapshotVersion: 1,
        cursor: null,
        rowOffset: 0,
      },
      importedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
    };
    const importJob = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn(async () => ({ ...jobState })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(jobState, data);
        return jobState;
      }),
      findFirst: vi.fn().mockResolvedValue({ ...jobState, items: [] }),
    };
    let pageTwoAttempts = 0;
    const candidateA = {
      externalId: "youtube:a",
      sourceUrl: "https://www.youtube.com/watch?v=video_1",
      sourceCreatedAt: null,
      text: "First page proof",
      ratingValue: null,
      ratingScale: null,
      authorName: null,
      authorRole: null,
      authorCompany: null,
      tags: [],
    };
    const candidateB = { ...candidateA, externalId: "youtube:b", text: "B" };
    const fetchCandidates = vi.fn(async (_token, _config, cursor) => {
      if (!cursor) return { candidates: [candidateA], nextCursor: "page-two" };
      pageTwoAttempts++;
      if (pageTwoAttempts === 1) throw new Error("temporary provider fault");
      return { candidates: [candidateB], nextCursor: null };
    });
    const imports = service({
      prisma: {
        client: {
          importConnection: {
            findFirst: vi.fn().mockResolvedValue(record),
            update: vi.fn().mockResolvedValue(undefined),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          importJob,
          $transaction: vi.fn(
            async (
              callback: (writer: {
                importJob: typeof importJob;
                importConnection: { update: ReturnType<typeof vi.fn> };
              }) => Promise<unknown>,
            ) =>
              callback({
                importJob,
                importConnection: {
                  update: vi.fn().mockResolvedValue(undefined),
                },
              }),
          ),
        },
      },
      provider: { fetchCandidates },
    });
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
      persist.mock.calls.map((call) => [call[3].externalId, call[5]]),
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
    const requireFence = Reflect.get(
      imports,
      "requireConnectedConnectionFence",
    ) as (input: typeof record, scheduled: boolean) => Promise<void>;

    await expect(requireFence.call(imports, record, true)).resolves.toBe(
      undefined,
    );
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
    const requireFence = Reflect.get(
      imports,
      "requireConnectedConnectionFence",
    ) as (input: typeof record, scheduled: boolean) => Promise<void>;

    await expect(requireFence.call(imports, record, true)).rejects.toThrow(
      "Clerk unavailable",
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not disable an OAuth connection for a transient access lookup failure", async () => {
    const getToken = vi.fn();
    const updateConnection = vi.fn();
    const removeJobScheduler = vi.fn();
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
