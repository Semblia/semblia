import { describe, expect, it, vi } from "vitest";

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
  );
}

describe("import connections", () => {
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
});
