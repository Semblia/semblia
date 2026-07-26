import { ImportsService } from "./imports.service.js";
import { vi } from "vitest";

export function connection(overrides: Record<string, unknown> = {}) {
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

export function service(input: {
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

export function requireConnectedFence(input: {
  imports: ImportsService;
  record: ReturnType<typeof connection>;
  scheduled: boolean;
}) {
  const runtime = Reflect.get(input.imports, "connectionRuntime") as {
    requireConnectedConnectionFence(
      record: ReturnType<typeof connection>,
      scheduled: boolean,
    ): Promise<void>;
  };
  return runtime.requireConnectedConnectionFence(input.record, input.scheduled);
}

export function connectionCreationScenario() {
  const record = connection();
  const create = vi.fn().mockResolvedValue(record);
  const tx = { importConnection: { create } };
  const update = vi
    .fn()
    .mockResolvedValue(connection({ autoSyncEnabled: true }));
  const queue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };
  const listResources = vi.fn().mockResolvedValue({
    items: [
      { id: "video_1", label: "Launch video", config: { videoId: "video_1" } },
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
  return { create, imports, queue };
}

export function publicDisableScenario() {
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
  return { importJob, imports };
}

function officialCandidate() {
  return {
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
  };
}

export function officialProviderScenario() {
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
      config: { connectionSnapshotVersion: 1, cursor: null, rowOffset: 0 },
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
    formResponse: { create: vi.fn().mockResolvedValue({ id: "response_1" }) },
    responseImportIdentity: { create: vi.fn().mockResolvedValue(undefined) },
    importItem: { create: vi.fn().mockResolvedValue(undefined) },
    importJob,
    importConnection,
  };
  const fetchCandidates = vi
    .fn()
    .mockResolvedValue({ candidates: [officialCandidate()], nextCursor: null });
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
  return { fetchCandidates, importConnection, importJob, imports, moderation };
}

export const CONNECTED_CONTINUATION_PAGE_COUNT = 101;

export function connectedContinuationScenario() {
  const events: string[] = [];
  const job = continuationJob();
  const importConnection = {
    findFirst: vi.fn().mockResolvedValue(connection()),
    update: vi.fn().mockResolvedValue(undefined),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const importJob = {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: vi.fn().mockResolvedValue(job),
    update: vi.fn().mockResolvedValue(undefined),
    findFirst: vi.fn().mockResolvedValue({ ...job, items: [] }),
  };
  const fetchCandidates = vi.fn(
    async (_token: string, _config: unknown, cursor?: string) =>
      continuationPage(cursor, events),
  );
  const persistence = continuationPersistence(events);
  const writer = {
    formResponse: { create: persistence.formResponseCreate },
    importConnection,
    importItem: persistence.importItem,
    importJob,
    responseImportIdentity: persistence.responseImportIdentity,
  };
  const transaction = vi.fn(
    async (callback: (input: typeof writer) => Promise<unknown>) =>
      callback(writer),
  );
  const imports = service({
    prisma: {
      client: {
        importConnection,
        importItem: persistence.importItem,
        importJob,
        $transaction: transaction,
      },
    },
    provider: { fetchCandidates },
    moderation: persistence.moderation,
  });
  return { events, fetchCandidates, importJob, imports, persistence };
}

function continuationJob() {
  return {
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
}

function continuationPage(cursor: string | undefined, events: string[]) {
  const step = cursor ? Number(cursor.slice(5)) : 0;
  events.push(`fetch:${step}`);
  return {
    candidates: [
      {
        externalId: `youtube:${step}`,
        text: `Comment ${step}`,
        sourceUrl: null,
        sourceCreatedAt: null,
        ratingValue: null,
        ratingScale: null,
        authorName: null,
        authorRole: null,
        authorCompany: null,
        tags: [],
      },
    ],
    nextCursor:
      step < CONNECTED_CONTINUATION_PAGE_COUNT - 1 ? `page-${step + 1}` : null,
  };
}

function continuationPersistence(events: string[]) {
  let persistedCount = 0;
  const formResponseCreate = vi.fn(async () => {
    events.push(`persist:${persistedCount}`);
    persistedCount++;
    return { id: `response_${persistedCount}` };
  });
  return {
    formResponseCreate,
    importItem: {
      create: vi.fn().mockResolvedValue(undefined),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    moderation: { enqueueSubmission: vi.fn().mockResolvedValue(undefined) },
    responseImportIdentity: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  };
}

export function resumableMultiPageScenario() {
  const record = connection();
  const jobState = {
    id: "job_1",
    projectId: "project_1",
    sourceKey: "youtube",
    mode: "CONNECTED_API",
    status: "QUEUED",
    mediaAssetId: null,
    connectionId: "connection_1",
    config: { connectionSnapshotVersion: 1, cursor: null, rowOffset: 0 },
    importedCount: 0,
    duplicateCount: 0,
    failedCount: 0,
  };
  const importJob = {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: vi.fn(async () => ({ ...jobState })),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) =>
      Object.assign(jobState, data),
    ),
    findFirst: vi.fn().mockResolvedValue({ ...jobState, items: [] }),
  };
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
  let pageTwoAttempts = 0;
  const fetchCandidates = vi.fn(
    async (_token: string, _config: unknown, cursor?: string) => {
      if (!cursor) return { candidates: [candidateA], nextCursor: "page-two" };
      pageTwoAttempts++;
      if (pageTwoAttempts === 1) throw new Error("temporary provider fault");
      return { candidates: [candidateB], nextCursor: null };
    },
  );
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
  return { imports, jobState };
}

export function schedulerFencingScenario(
  connectionUpdate: Record<string, boolean>,
) {
  const events: string[] = [];
  const record = connection({ autoSyncEnabled: true });
  const tx = {
    importConnection: {
      update: vi.fn(async () => {
        events.push("database");
        return { ...record, ...connectionUpdate };
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
  return { events, imports };
}
