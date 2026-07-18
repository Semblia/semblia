import { ConflictException, NotFoundException } from "@nestjs/common";
import {
  CardStyle,
  LayoutType,
  Prisma,
  ProjectVisibility,
  StudioDraftResourceType,
  ThemeMode,
  WidgetContentMode,
  WidgetDensity,
  WidgetType,
} from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWidgetBodySchema,
  publicWallQuerySchema,
} from "./widgets.dto.js";
import { buildPublicWallSeo, WidgetsService } from "./widgets.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { RedisService } from "../redis/redis.service.js";
import type { StudioDraftsService } from "../studio-drafts/studio-drafts.service.js";

const mockWidgetFindMany = vi.fn();
const mockWidgetFindFirst = vi.fn();
const mockWidgetCreate = vi.fn();
const mockWidgetUpdate = vi.fn();
const mockWidgetDelete = vi.fn();
const mockWidgetUpdateMany = vi.fn();
const mockWidgetFindUniqueOrThrow = vi.fn();
const mockWidgetFindUnique = vi.fn();
const mockQueryRaw = vi.fn();
const mockWidgetAnalyticsGroupBy = vi.fn();
const mockFormResponseFindMany = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockGetStudioDraft = vi.fn();
const mockSaveStudioDraft = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockPublicSurfaceHostFindFirst = vi.fn();
const mockTransaction = vi.fn();
const mockStudioDraftFindUnique = vi.fn();
const mockStudioDraftUpdateMany = vi.fn();
const mockResolveHost = vi.fn();
const mockHostingRecord = vi.fn();

const prismaMock = {
  client: {
    widget: {
      findMany: mockWidgetFindMany,
      findFirst: mockWidgetFindFirst,
      create: mockWidgetCreate,
      update: mockWidgetUpdate,
      delete: mockWidgetDelete,
      updateMany: mockWidgetUpdateMany,
      findUnique: mockWidgetFindUnique,
      findUniqueOrThrow: mockWidgetFindUniqueOrThrow,
    },
    widgetAnalytics: {
      groupBy: mockWidgetAnalyticsGroupBy,
    },
    formResponse: {
      findMany: mockFormResponseFindMany,
    },
    project: {
      findUnique: mockProjectFindUnique,
    },
    publicSurfaceHost: {
      findMany: mockPublicSurfaceHostFindFirst,
    },
    studioDraft: {
      findUnique: mockStudioDraftFindUnique,
      updateMany: mockStudioDraftUpdateMany,
    },
    $transaction: mockTransaction,
    $queryRaw: mockQueryRaw,
  },
} as unknown as PrismaService;

const redisMock = {
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
  },
} as unknown as RedisService;

const studioDraftsServiceMock = {
  getDraft: mockGetStudioDraft,
  saveDraft: mockSaveStudioDraft,
} as unknown as StudioDraftsService;

function makeService(primaryWallService?: ConstructorParameters<typeof WidgetsService>[6]) {
  return new WidgetsService(
    prismaMock,
    redisMock,
    studioDraftsServiceMock,
    { resolveHost: mockResolveHost } as never,
    { record: mockHostingRecord } as never,
    undefined,
    primaryWallService,
  );
}

function makeWidget(overrides: Record<string, unknown> = {}) {
  return {
    id: "widget_1",
    projectId: "project_1",
    name: "Proof Widget",
    kind: WidgetType.EMBED,
    layout: LayoutType.CAROUSEL,
    theme: ThemeMode.LIGHT,
    preset: "clean",
    accent: "#c4563a",
    text: "#111111",
    bg: "#ffffff",
    line: "#e5e7eb",
    surface: "#f7f7f8",
    radius: 12,
    fontFamily: '"Geist", system-ui, sans-serif',
    fontHead: '"Instrument Serif", serif',
    cardStyle: CardStyle.BORDERED,
    density: WidgetDensity.DEFAULT,
    showRating: true,
    showAvatar: true,
    showCompany: true,
    showDate: false,
    showSource: false,
    maxItems: 9,
    autoRotate: true,
    rotateInterval: 5000,
    showBranding: true,
    contentMode: WidgetContentMode.ALL,
    pickedIds: [],
    wallSlug: null,
    wallTitle: null,
    wallSubhead: null,
    isActive: true,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-02T00:00:00.000Z"),
    ...overrides,
  };
}

function makePublishedWall(overrides: Record<string, unknown> = {}) {
  const widget = makeWidget({
    kind: WidgetType.WALL_OF_LOVE,
    wallSlug: "proof",
    ...overrides,
  });
  const service = makeService() as unknown as {
    definitionFromWidget(widget: Record<string, unknown>): unknown;
    snapshotFromWidget(
      widget: Record<string, unknown>,
      definition: unknown,
    ): unknown;
  };
  return {
    ...widget,
    publishedSnapshot: service.snapshotFromWidget(
      widget,
      service.definitionFromWidget(widget),
    ),
  };
}

function makeFormResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "response_1",
    answers: [
      {
        fieldId: "content",
        type: "longText",
        role: "primaryText",
        labelSnapshot: "Testimonial",
        value: "Semblia helped us launch faster.",
        private: false,
        publishable: true,
        usedInWidget: true,
      },
    ],
    ratingValue: 5,
    authorName: "Ada Lovelace",
    authorRole: "Founder",
    authorCompany: "Acme",
    authorAvatarAssetId: null,
    consent: {
      canPublishText: true,
      canPublishName: true,
      canPublishRole: true,
      canPublishCompany: true,
      canPublishAvatar: false,
      canEditForClarity: false,
    },
    mediaAssets: [],
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
    ...overrides,
  };
}

function makePublicProject(overrides: Record<string, unknown> = {}) {
  return {
    name: "Northwind Studio",
    websiteUrl: "https://northwind.example",
    isActive: true,
    visibility: ProjectVisibility.PUBLIC,
    ...overrides,
  };
}

function mockAuthoritativeWall(
  project: Record<string, unknown> = makePublicProject(),
) {
  mockWidgetFindFirst.mockResolvedValue(
    makeWidget({
      id: "widget_wall",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "proof-wall",
      wallTitle: "Proof Wall",
      isPrimaryWall: true,
    }),
  );
  mockFormResponseFindMany.mockResolvedValue([makeFormResponse()]);
  mockProjectFindUnique.mockResolvedValue(project);
}

function makeCachedWallPayload({
  id,
  canonicalUrl,
}: {
  id: string;
  canonicalUrl: string;
}) {
  const wall = makeWidget({
    id,
    kind: WidgetType.WALL_OF_LOVE,
    wallSlug: "proof-wall",
    wallTitle: "Proof Wall",
    isPrimaryWall: true,
  });
  const service = makeService() as unknown as {
    toPublicWidget(widget: Record<string, unknown>): Record<string, unknown>;
  };
  return {
    widget: service.toPublicWidget(wall),
    project: {
      name: "Northwind Studio",
      websiteUrl: "https://northwind.example",
    },
    testimonials: [],
    seo: {
      indexable: false,
      canonicalUrl,
      reason: "NO_PUBLIC_TESTIMONIALS",
    },
  };
}

describe("WidgetsService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockWidgetFindMany.mockResolvedValue([]);
    mockStudioDraftUpdateMany.mockResolvedValue({ count: 1 });
    mockQueryRaw.mockResolvedValue([]);
    mockWidgetUpdateMany.mockResolvedValue({ count: 1 });
    mockPublicSurfaceHostFindFirst.mockResolvedValue([]);
    mockResolveHost.mockResolvedValue({
      requestedHostname: "alpha.walls.semblia.com",
      canonicalHostname: "alpha.walls.semblia.com",
      canonicalUrl: "https://alpha.walls.semblia.com",
      isCanonical: true,
      projectId: "project_1",
      feature: "WALL",
      resourceType: "PROJECT",
      resourceId: "project_1",
    });
    mockWidgetFindUniqueOrThrow.mockImplementation(async () => {
      const result =
        mockWidgetUpdate.mock.results.at(-1)?.value ??
        mockWidgetCreate.mock.results.at(-1)?.value;
      return result ? await result : makeWidget();
    });
    mockTransaction.mockImplementation(async (callback) =>
      callback(prismaMock.client),
    );
    mockGetStudioDraft.mockResolvedValue({
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: "widget_1",
      version: 1,
      publishedVersion: null,
      draft: { layout: "grid" },
      updatedByUserId: "user_1",
      updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    });
    mockSaveStudioDraft.mockResolvedValue({
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: "widget_1",
      version: 2,
      publishedVersion: null,
      draft: { layout: "grid" },
      updatedByUserId: "user_1",
      updatedAt: new Date("2026-05-02T00:01:00.000Z"),
    });
  });

  it("builds SEO only for public projects, published walls, and rendered testimonials", () => {
    const canonicalUrl = "https://alpha.walls.semblia.com/";
    expect(
      buildPublicWallSeo({
        canonicalUrl,
        projectPublic: false,
        wallPublished: true,
        hasPublicTestimonials: true,
      }).reason,
    ).toBe("PROJECT_NOT_PUBLIC");
    expect(
      buildPublicWallSeo({
        canonicalUrl,
        projectPublic: true,
        wallPublished: false,
        hasPublicTestimonials: true,
      }).reason,
    ).toBe("WALL_NOT_PUBLISHED");
    expect(
      buildPublicWallSeo({
        canonicalUrl,
        projectPublic: true,
        wallPublished: true,
        hasPublicTestimonials: false,
      }).reason,
    ).toBe("NO_PUBLIC_TESTIMONIALS");
    expect(
      buildPublicWallSeo({
        canonicalUrl,
        projectPublic: true,
        wallPublished: true,
        hasPublicTestimonials: true,
      }),
    ).toEqual({ canonicalUrl, indexable: true, reason: "INDEXABLE" });
  });

  it("list maps scalar widget rows to the v2 widget dto shape using request.projectAccess.projectId", async () => {
    mockWidgetFindMany.mockResolvedValue([makeWidget()]);
    mockWidgetAnalyticsGroupBy.mockResolvedValue([
      {
        widgetId: "widget_1",
        _count: { _all: 4 },
        _avg: { loadTime: 245 },
        _max: { timestamp: new Date("2026-04-04T00:00:00.000Z") },
      },
    ]);

    const service = makeService();
    const result = await service.list(
      { slug: "acme" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockWidgetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project_1" },
      }),
    );
    expect(result).toMatchObject([
      {
        id: "widget_1",
        projectId: "project_1",
        entry: {
          id: "widget_1",
          name: "Proof Widget",
          widgetType: "EMBED",
          layoutType: "CAROUSEL",
          themeMode: "LIGHT",
          preset: "clean",
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-02T00:00:00.000Z",
          totalLoads: 4,
          avgLoadMs: 245,
          lastLoadAt: "2026-04-04T00:00:00.000Z",
          isActive: true,
        },
        config: {
          name: "Proof Widget",
          widgetType: "EMBED",
          layoutType: "CAROUSEL",
          themeMode: "LIGHT",
          tokens: {
            preset: "clean",
            accentColor: "#c4563a",
            bgColor: "#ffffff",
            textColor: "#111111",
            borderRadius: 12,
            fontFamily: '"Geist", system-ui, sans-serif',
            cardStyle: "BORDERED",
            density: "DEFAULT",
          },
          visibility: {
            showRating: true,
            showAvatar: true,
            showCompany: true,
            showDate: false,
            showSource: false,
          },
          behavior: {
            maxItems: 9,
            autoRotate: true,
            rotateInterval: 5000,
            showBranding: true,
          },
          wall: null,
        },
      },
    ]);
    expect(result[0]?.config.definition).toMatchObject({
      schemaVersion: 1,
      kind: "embed",
      layout: { preset: "carousel" },
      theme: {
        appearance: "light",
        brandColor: "#c4563a",
      },
    });
    expect(result[0]?.config.publishedSnapshot).toMatchObject({
      version: "widgets-v1",
      derivedTheme: {
        appearance: "light",
      },
    });
  });

  it("duplicate creates an inactive copy with source config fields and stub metrics", async () => {
    const source = makeWidget({
      id: "widget_source",
      name: "Launch proof carousel",
      kind: WidgetType.EMBED,
      layout: LayoutType.GRID,
      theme: ThemeMode.DARK,
      preset: "bold",
      accent: "#ff3366",
      text: "#f8fafc",
      bg: "#020617",
      line: "#334155",
      surface: "#111827",
      radius: 20,
      fontFamily: '"Inter", sans-serif',
      fontHead: '"Fraunces", serif',
      cardStyle: CardStyle.ELEVATED,
      density: WidgetDensity.COZY,
      showRating: false,
      showAvatar: false,
      showCompany: true,
      showDate: true,
      showSource: true,
      maxItems: 12,
      autoRotate: false,
      rotateInterval: 8000,
      showBranding: false,
      contentMode: WidgetContentMode.HANDPICKED,
      pickedIds: ["testimonial_1", "testimonial_2"],
      isActive: true,
    });
    mockWidgetFindFirst.mockResolvedValue(source);
    mockWidgetCreate.mockResolvedValue(
      makeWidget({
        ...source,
        id: "widget_copy",
        name: "Launch proof carousel (copy)",
        isActive: false,
      }),
    );

    const service = makeService();
    const result = await service.duplicate(
      { slug: "acme", widgetId: "widget_source" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockWidgetFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "widget_source", projectId: "project_1" },
      }),
    );
    expect(mockWidgetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.stringMatching(/^c[a-z0-9]{8,}$/),
          projectId: "project_1",
          name: "Launch proof carousel (copy)",
          kind: WidgetType.EMBED,
          layout: LayoutType.GRID,
          theme: ThemeMode.DARK,
          preset: "bold",
          accent: "#ff3366",
          text: "#f8fafc",
          bg: "#020617",
          line: "#334155",
          surface: "#111827",
          radius: 20,
          fontFamily: '"Inter", sans-serif',
          fontHead: '"Fraunces", serif',
          cardStyle: CardStyle.ELEVATED,
          density: WidgetDensity.COZY,
          showRating: false,
          showAvatar: false,
          showCompany: true,
          showDate: true,
          showSource: true,
          maxItems: 12,
          autoRotate: false,
          rotateInterval: 8000,
          showBranding: false,
          contentMode: WidgetContentMode.HANDPICKED,
          pickedIds: ["testimonial_1", "testimonial_2"],
          wallSlug: null,
          wallTitle: null,
          wallSubhead: null,
          isActive: false,
          config: expect.objectContaining({
            schemaVersion: 1,
            kind: "embed",
            layout: { preset: "grid", variant: "classic" },
            theme: expect.objectContaining({
              appearance: "dark",
              brandColor: "#ff3366",
            }),
          }),
          publishedSnapshot: expect.objectContaining({
            version: "widgets-v1",
          }),
        }),
        select: expect.any(Object),
      }),
    );
    expect(mockSaveStudioDraft).not.toHaveBeenCalled();
    expect(mockWidgetAnalyticsGroupBy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "widget_copy",
      projectId: "project_1",
      entry: {
        id: "widget_copy",
        name: "Launch proof carousel (copy)",
        isActive: false,
        isPrimaryWall: false,
        totalLoads: 0,
        avgLoadMs: 0,
        lastLoadAt: null,
      },
    });
  });

  it("duplicate truncates the copy suffix to the widget name limit", async () => {
    const sourceName = "x".repeat(255);
    mockWidgetFindFirst.mockResolvedValue(makeWidget({ name: sourceName }));
    mockWidgetCreate.mockResolvedValue(
      makeWidget({
        id: "widget_copy",
        name: `${sourceName} (copy)`.slice(0, 255),
      }),
    );

    const service = makeService();
    await service.duplicate(
      { slug: "acme", widgetId: "widget_1" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockWidgetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: `${sourceName} (copy)`.slice(0, 255),
        }),
      }),
    );
  });

  it("duplicate throws 404 when the source widget is missing", async () => {
    mockWidgetFindFirst.mockResolvedValue(null);

    const service = makeService();

    await expect(
      service.duplicate(
        { slug: "acme", widgetId: "widget_missing" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(mockWidgetCreate).not.toHaveBeenCalled();
  });

  it("duplicate throws 404 without leaking widgets from a different project", async () => {
    mockWidgetFindFirst.mockResolvedValue(null);

    const service = makeService();

    await expect(
      service.duplicate(
        { slug: "acme", widgetId: "widget_other_project" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(mockWidgetFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "widget_other_project", projectId: "project_1" },
      }),
    );
    expect(mockWidgetCreate).not.toHaveBeenCalled();
  });

  it("duplicate clears wall slugs while carrying wall titles and subheads", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        name: "Proof wall",
        kind: WidgetType.WALL_OF_LOVE,
        layout: LayoutType.WALL,
        wallSlug: "proof-wall",
        wallTitle: "Proof Wall",
        wallSubhead: "What customers say",
      }),
    );
    mockWidgetCreate.mockResolvedValue(
      makeWidget({
        id: "widget_wall_copy",
        name: "Proof wall (copy)",
        kind: WidgetType.WALL_OF_LOVE,
        layout: LayoutType.WALL,
        wallSlug: null,
        wallTitle: "Proof Wall",
        wallSubhead: "What customers say",
        isActive: false,
      }),
    );

    const service = makeService();
    const result = await service.duplicate(
      { slug: "acme", widgetId: "widget_wall" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockWidgetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: WidgetType.WALL_OF_LOVE,
          wallSlug: null,
          wallTitle: "Proof Wall",
          wallSubhead: "What customers say",
        }),
      }),
    );
    expect(result.config.wall).toBeNull();
  });

  it("create generates a normalized safe wall slug and retries with a hex suffix on collision", async () => {
    mockWidgetCreate
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["wallSlug"] } })
      .mockResolvedValueOnce(
        makeWidget({
          id: "widget_wall",
          kind: WidgetType.WALL_OF_LOVE,
          wallSlug: "proof-wall-a1b2",
          wallTitle: "Proof Wall",
          wallSubhead: "What customers say",
        }),
      );

    const service = makeService();
    const result = await service.create(
      { slug: "acme" },
      createWidgetBodySchema.parse({
        kind: "wall",
        wallTitle: "Proof Wall",
        wallSubhead: "What customers say",
      }),
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockWidgetCreate).toHaveBeenCalledTimes(2);
    expect(mockWidgetCreate.mock.calls[0]?.[0]).toMatchObject({
      data: expect.objectContaining({ wallSlug: "proof-wall" }),
    });
    expect(mockWidgetCreate.mock.calls[1]?.[0]?.data?.wallSlug).toMatch(
      /^proof-wall-[a-f0-9]{4}$/,
    );
    expect(result.config.wall).toEqual({
      slug: "proof-wall-a1b2",
      title: "Proof Wall",
      subhead: "What customers say",
    });
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
  });

  it("does not retry a P2002 for an unrelated unique field", async () => {
    const uniqueFailure = { code: "P2002", meta: { target: ["projectId", "name"] } };
    mockWidgetCreate.mockRejectedValue(uniqueFailure);

    await expect(
      makeService().create(
        { slug: "acme" },
        createWidgetBodySchema.parse({ kind: "wall", wallTitle: "Proof wall" }),
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toBe(uniqueFailure);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it("promotes the first eligible created wall without letting a later wall steal the existing primary", async () => {
    const first = makeWidget({
      id: "wall_first",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "first",
      isPrimaryWall: false,
    });
    mockWidgetCreate.mockResolvedValue(first);
    mockWidgetFindMany
      .mockResolvedValueOnce([{ id: "wall_first", isPrimaryWall: false }])
      .mockResolvedValueOnce([]);

    await makeService().create(
      { slug: "acme" },
      createWidgetBodySchema.parse({ kind: "wall", wallTitle: "First" }),
      { projectAccess: { projectId: "project_1" } },
    );
    expect(mockWidgetUpdateMany).toHaveBeenCalledWith({
      where: { id: "wall_first", isPrimaryWall: { not: true } },
      data: { isPrimaryWall: true },
    });
    mockWidgetFindMany.mockReset();
    mockWidgetUpdateMany.mockReset();
    mockWidgetUpdateMany.mockResolvedValue({ count: 1 });

    mockWidgetCreate.mockResolvedValue(
      makeWidget({
        id: "wall_later",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "later",
      }),
    );
    mockWidgetFindMany
      .mockResolvedValueOnce([
        { id: "wall_first", isPrimaryWall: true },
        { id: "wall_later", isPrimaryWall: false },
      ])
      .mockResolvedValueOnce([{ id: "wall_first" }]);
    mockWidgetFindUniqueOrThrow.mockResolvedValue(
      makeWidget({ id: "wall_later", kind: WidgetType.WALL_OF_LOVE, wallSlug: "later" }),
    );

    await makeService().create(
      { slug: "acme" },
      createWidgetBodySchema.parse({ kind: "wall", wallTitle: "Later" }),
      { projectAccess: { projectId: "project_1" } },
    );
    expect(mockWidgetUpdateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "wall_later" }),
        data: { isPrimaryWall: true },
      }),
    );
  });

  it("locks before every create/update/delete/publish mutation and maintains the project primary", async () => {
    const calls: string[] = [];
    const primaryWallService = {
      lockProject: vi.fn(async () => calls.push("lock")),
      maintainPrimaryWall: vi.fn(async () => calls.push("maintain")),
    } as never;
    const wall = makeWidget({
      id: "wall_1",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "proof",
      isPrimaryWall: true,
    });
    mockWidgetCreate.mockImplementation(async () => {
      calls.push("create");
      return wall;
    });
    mockWidgetFindFirst.mockResolvedValue(wall);
    mockWidgetUpdate.mockImplementation(async () => {
      calls.push("update");
      return wall;
    });
    mockWidgetDelete.mockImplementation(async () => {
      calls.push("delete");
      return { id: "wall_1", projectId: "project_1" };
    });

    const service = makeService(primaryWallService);
    await service.create(
      { slug: "acme" },
      createWidgetBodySchema.parse({ kind: "wall", wallTitle: "Proof" }),
      { projectAccess: { projectId: "project_1" } },
    );
    expect(calls).toEqual(["lock", "create", "maintain"]);

    calls.length = 0;
    await service.update(
      { slug: "acme", widgetId: "wall_1" },
      { isActive: false },
      { projectAccess: { projectId: "project_1" } },
    );
    expect(calls).toEqual(["lock", "update", "maintain"]);

    calls.length = 0;
    await service.delete(
      { slug: "acme", widgetId: "wall_1" },
      { projectAccess: { projectId: "project_1" } },
    );
    expect(calls).toEqual(["lock", "delete", "maintain"]);

    const definitionService = makeService() as unknown as {
      definitionFromWidget(widget: ReturnType<typeof makeWidget>): unknown;
    };
    mockStudioDraftFindUnique.mockResolvedValue({
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: "wall_1",
      version: 1,
      draft: definitionService.definitionFromWidget(wall),
    });
    calls.length = 0;
    await service.publishDraft(
      { slug: "acme", widgetId: "wall_1" },
      { expectedVersion: 1 },
      { projectAccess: { projectId: "project_1" } },
    );
    expect(calls).toEqual(["lock", "update", "maintain"]);
  });

  it("re-reads the owned widget after the lock so a partial update cannot restore a stale wall lifecycle", async () => {
    const staleBeforeLock = makeWidget({
      id: "widget_1",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "stale-wall",
      isActive: true,
    });
    const authoritativeAfterLock = makeWidget({
      id: "widget_1",
      kind: WidgetType.EMBED,
      wallSlug: null,
      isActive: false,
      name: "Changed concurrently",
    });
    mockWidgetFindFirst
      .mockResolvedValueOnce(staleBeforeLock)
      .mockResolvedValueOnce(authoritativeAfterLock);
    mockWidgetUpdate.mockResolvedValue({
      ...authoritativeAfterLock,
      name: "Partial rename",
    });

    await makeService().update(
      { slug: "acme", widgetId: "widget_1" },
      { name: "Partial rename" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockWidgetFindFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "widget_1", projectId: "project_1" },
      }),
    );
    expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockWidgetFindFirst.mock.invocationCallOrder[1] ?? Number.POSITIVE_INFINITY,
    );
    expect(mockWidgetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: WidgetType.EMBED,
          wallSlug: null,
          name: "Partial rename",
        }),
      }),
    );
    expect(mockWidgetUpdate.mock.calls[0]?.[0]?.data).not.toHaveProperty(
      "isActive",
    );
  });

  it.each([
    [{ isActive: false }, { isActive: false }],
    [{ kind: "embed" as const }, { kind: WidgetType.EMBED, wallSlug: null }],
  ])(
    "persists primary-invalidating update %o before maintaining the successor",
    async (body, expectedData) => {
      const primary = makeWidget({
        id: "wall_primary",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "primary",
        isPrimaryWall: true,
      });
      mockWidgetFindFirst.mockResolvedValue(primary);
      mockWidgetUpdate.mockResolvedValue({ ...primary, ...expectedData });
      mockWidgetFindMany
        .mockResolvedValueOnce([{ id: "wall_successor", isPrimaryWall: false }])
        .mockResolvedValueOnce([{ id: "wall_primary" }]);

      await makeService().update(
        { slug: "acme", widgetId: "wall_primary" },
        body,
        { projectAccess: { projectId: "project_1" } },
      );

      expect(mockWidgetUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining(expectedData) }),
      );
      expect(mockWidgetUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: ["wall_primary"] } },
        data: { isPrimaryWall: false },
      });
      expect(mockWidgetUpdateMany).toHaveBeenCalledWith({
        where: { id: "wall_successor", isPrimaryWall: { not: true } },
        data: { isPrimaryWall: true },
      });
    },
  );

  it("deletes a primary wall before promoting the earliest remaining successor", async () => {
    const primary = makeWidget({
      id: "wall_primary",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "primary",
      isPrimaryWall: true,
    });
    mockWidgetFindFirst.mockResolvedValue(primary);
    mockWidgetDelete.mockResolvedValue({
      id: "wall_primary",
      projectId: "project_1",
    });
    mockWidgetFindMany
      .mockResolvedValueOnce([{ id: "wall_successor", isPrimaryWall: false }])
      .mockResolvedValueOnce([]);

    await expect(
      makeService().delete(
        { slug: "acme", widgetId: "wall_primary" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).resolves.toEqual({ id: "wall_primary", projectId: "project_1" });

    expect(mockWidgetDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "wall_primary" } }),
    );
    expect(mockWidgetUpdateMany).toHaveBeenCalledWith({
      where: { id: "wall_successor", isPrimaryWall: { not: true } },
      data: { isPrimaryWall: true },
    });
    expect(mockWidgetDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mockWidgetFindMany.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("selects an eligible project wall idempotently and rejects cross-project, ineligible, and stale-after-lock targets", async () => {
    const selected = makePublishedWall({ id: "wall_selected", isPrimaryWall: true });
    mockWidgetFindFirst.mockResolvedValue(selected);
    mockWidgetFindUnique.mockResolvedValue(selected);
    mockWidgetUpdate.mockResolvedValue(selected);

    const service = makeService();
    await expect(
      service.selectPrimaryWall(
        { slug: "acme", widgetId: "wall_selected" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).resolves.toMatchObject({ id: "wall_selected", entry: { isPrimaryWall: true } });
    await service.selectPrimaryWall(
      { slug: "acme", widgetId: "wall_selected" },
      { projectAccess: { projectId: "project_1" } },
    );
    expect(mockWidgetUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isPrimaryWall: false } }),
    );
    expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockWidgetUpdate.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );

    mockWidgetFindFirst.mockResolvedValue(null);
    await expect(
      service.selectPrimaryWall(
        { slug: "acme", widgetId: "other_project" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    mockWidgetFindFirst.mockResolvedValue(makeWidget({
      id: "wall_draft",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "draft",
      publishedSnapshot: null,
    }));
    await expect(
      service.selectPrimaryWall(
        { slug: "acme", widgetId: "wall_draft" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    mockWidgetFindFirst.mockResolvedValue(selected);
    mockWidgetFindUnique.mockResolvedValue({ ...selected, isActive: false });
    await expect(
      service.selectPrimaryWall(
        { slug: "acme", widgetId: "wall_selected" },
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("serializes host-issued primary and additional wall URLs only for the exact live default host tuple", async () => {
    const primary = makePublishedWall({
      id: "wall_primary",
      wallSlug: "primary",
      isPrimaryWall: true,
    });
    const additional = makePublishedWall({
      id: "wall_more",
      wallSlug: "more",
      isPrimaryWall: null,
    });
    const inactive = makePublishedWall({
      id: "wall_inactive",
      wallSlug: "inactive",
      isActive: false,
      isPrimaryWall: true,
    });
    mockWidgetFindMany.mockResolvedValue([primary, additional, inactive, makeWidget()]);
    mockWidgetAnalyticsGroupBy.mockResolvedValue([]);
    mockPublicSurfaceHostFindFirst.mockResolvedValue([
      { hostname: "acme.walls.semblia.com" },
    ]);

    const result = await makeService().list(
      { slug: "acme" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(result.map((widget) => widget.entry)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "wall_primary", isPrimaryWall: true, publicUrl: "https://acme.walls.semblia.com/" }),
        expect.objectContaining({ id: "wall_more", isPrimaryWall: false, publicUrl: "https://acme.walls.semblia.com/w/more" }),
        expect.objectContaining({ id: "wall_inactive", isPrimaryWall: true, publicUrl: null }),
        expect.objectContaining({ id: "widget_1", isPrimaryWall: false, publicUrl: null }),
      ]),
    );
    expect(mockPublicSurfaceHostFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          feature: "WALL",
          resourceType: "PROJECT",
          resourceId: "project_1",
          isDefault: true,
          status: "ACTIVE",
          verifiedAt: { not: null },
          retiredAt: null,
        }),
      }),
    );

    mockWidgetFindFirst.mockResolvedValue(primary);
    const detail = await makeService().getById(
      { slug: "acme", widgetId: "wall_primary" },
      { projectAccess: { projectId: "project_1" } },
    );
    expect(detail.entry.publicUrl).toBe("https://acme.walls.semblia.com/");

    mockPublicSurfaceHostFindFirst.mockResolvedValue([
      { hostname: "acme.walls.semblia.com" },
      { hostname: "alias.walls.semblia.com" },
    ]);
    const ambiguous = await makeService().getById(
      { slug: "acme", widgetId: "wall_primary" },
      { projectAccess: { projectId: "project_1" } },
    );
    expect(ambiguous.entry.publicUrl).toBeNull();

    mockPublicSurfaceHostFindFirst.mockResolvedValue([]);
    mockWidgetFindFirst.mockResolvedValue(primary);
    const unhosted = await makeService().getById(
      { slug: "acme", widgetId: "wall_primary" },
      { projectAccess: { projectId: "project_1" } },
    );
    expect(unhosted.entry.publicUrl).toBeNull();
  });

  it("create keeps generated retry slugs valid when truncating long titles", async () => {
    const longTitle = `${"a".repeat(58)}-${"b".repeat(20)}`;
    mockWidgetCreate
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["wallSlug"] } })
      .mockResolvedValueOnce(
        makeWidget({
          id: "widget_wall",
          kind: WidgetType.WALL_OF_LOVE,
          wallSlug: `${"a".repeat(58)}-a1b2`,
          wallTitle: longTitle,
        }),
      );

    const service = makeService();
    await service.create(
      { slug: "acme" },
      createWidgetBodySchema.parse({
        kind: "wall",
        wallTitle: longTitle,
      }),
      { projectAccess: { projectId: "project_1" } },
    );

    const retrySlug = mockWidgetCreate.mock.calls[1]?.[0]?.data?.wallSlug;
    expect(retrySlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(String(retrySlug).length).toBeLessThanOrEqual(64);
  });

  it("create avoids reserved words when generating wall slugs from titles", async () => {
    mockWidgetCreate.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "api-wall",
        wallTitle: "Api",
      }),
    );

    const service = makeService();
    await service.create(
      { slug: "acme" },
      createWidgetBodySchema.parse({
        kind: "wall",
        wallTitle: "Api",
      }),
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockWidgetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ wallSlug: "api-wall" }),
      }),
    );
  });

  it("create throws a friendly conflict for an explicit duplicate wall slug", async () => {
    mockWidgetCreate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["wallSlug"] },
    });

    const service = makeService();

    await expect(
      service.create(
        { slug: "acme" },
        createWidgetBodySchema.parse({ kind: "wall", wallSlug: "proof-wall" }),
        { projectAccess: { projectId: "project_1" } },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("getDraft verifies widget ownership before returning the shared server draft", async () => {
    mockWidgetFindFirst.mockResolvedValue(makeWidget());

    const service = makeService();
    const result = await service.getDraft(
      { slug: "acme", widgetId: "widget_1" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockWidgetFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "widget_1", projectId: "project_1" },
      }),
    );
    expect(mockGetStudioDraft).toHaveBeenCalledWith({
      projectId: "project_1",
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: "widget_1",
    });
    expect(result.version).toBe(1);
  });

  it("saveDraft verifies widget ownership and forwards optimistic concurrency details", async () => {
    mockWidgetFindFirst.mockResolvedValue(makeWidget());

    const service = makeService();
    const result = await service.saveDraft(
      { slug: "acme", widgetId: "widget_1" },
      { draft: { layout: "grid" }, expectedVersion: 1 },
      { projectAccess: { projectId: "project_1" } },
      "user_1",
    );

    expect(mockSaveStudioDraft).toHaveBeenCalledWith({
      projectId: "project_1",
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: "widget_1",
      draft: expect.objectContaining({
        schemaVersion: 1,
        kind: "embed",
        layout: { preset: "grid", variant: "classic" },
      }),
      expectedVersion: 1,
      updatedByUserId: "user_1",
    });
    expect(result.version).toBe(2);
  });

  it("getPublicEmbed returns a safe cached payload without authorEmail", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_embed",
        maxItems: 2,
      }),
    );
    mockFormResponseFindMany.mockResolvedValue([makeFormResponse()]);
    const service = makeService();
    const result = await service.getPublicEmbed({ widgetId: "widget_embed" });

    expect(result.testimonials).toEqual([
      expect.objectContaining({
        id: "response_1",
        authorName: "Ada Lovelace",
        content: "Semblia helped us launch faster.",
        rating: 5,
      }),
    ]);
    expect(result.widget).not.toHaveProperty("projectId");
    expect(JSON.stringify(result)).not.toMatch(
      /authorEmail|ipAddress|privateMetadata/i,
    );
    expect(result).toMatchObject({
      widget: {
        id: "widget_embed",
        widgetType: "EMBED",
      },
    });
    expect(mockRedisSet).toHaveBeenCalledWith(
      "v2:widgets:embed:widget_embed",
      JSON.stringify(result),
      "EX",
      60,
    );
  });

  it("getPublicEmbed nulls the rating when the rating field was marked private", async () => {
    mockWidgetFindFirst.mockResolvedValue(makeWidget({ id: "widget_embed" }));
    mockFormResponseFindMany.mockResolvedValue([
      makeFormResponse({
        answers: [
          {
            fieldId: "content",
            type: "longText",
            role: "primaryText",
            labelSnapshot: "Testimonial",
            value: "Semblia helped us launch faster.",
            private: false,
            publishable: true,
            usedInWidget: true,
          },
          {
            fieldId: "rating",
            type: "rating",
            role: "rating",
            labelSnapshot: "Rating",
            value: 5,
            private: true,
            publishable: false,
            usedInWidget: false,
          },
        ],
      }),
    ]);

    const service = makeService();
    const result = await service.getPublicEmbed({ widgetId: "widget_embed" });

    expect(result.testimonials[0]).toMatchObject({
      content: "Semblia helped us launch faster.",
      rating: null,
    });
  });

  it("getPublicEmbed anonymizes author fields marked private despite consent", async () => {
    mockWidgetFindFirst.mockResolvedValue(makeWidget({ id: "widget_embed" }));
    mockFormResponseFindMany.mockResolvedValue([
      makeFormResponse({
        answers: [
          {
            fieldId: "content",
            type: "longText",
            role: "primaryText",
            labelSnapshot: "Testimonial",
            value: "Semblia helped us launch faster.",
            private: false,
            publishable: true,
            usedInWidget: true,
          },
          {
            fieldId: "name",
            type: "name",
            role: "authorName",
            labelSnapshot: "Name",
            value: "Ada Lovelace",
            private: true,
            publishable: false,
            usedInWidget: false,
          },
        ],
      }),
    ]);

    const service = makeService();
    const result = await service.getPublicEmbed({ widgetId: "widget_embed" });

    expect(result.testimonials[0]).toMatchObject({
      authorName: "Anonymous",
      authorRole: "Founder", // sibling column with no private source stays
    });
  });

  it("getPublicEmbed quotes widget-eligible custom text when no primaryText exists", async () => {
    mockWidgetFindFirst.mockResolvedValue(makeWidget({ id: "widget_embed" }));
    mockFormResponseFindMany.mockResolvedValue([
      makeFormResponse({
        answers: [
          {
            fieldId: "story",
            type: "shortText",
            role: "custom",
            labelSnapshot: "Your story",
            value: "Custom quote.",
            private: false,
            publishable: true,
            usedInWidget: true,
          },
        ],
      }),
    ]);

    const service = makeService();
    const result = await service.getPublicEmbed({ widgetId: "widget_embed" });

    expect(result.testimonials[0]?.content).toBe("Custom quote.");
  });

  it("getPublicEmbed never quotes custom text that is not widget eligible", async () => {
    mockWidgetFindFirst.mockResolvedValue(makeWidget({ id: "widget_embed" }));
    mockFormResponseFindMany.mockResolvedValue([
      makeFormResponse({
        answers: [
          {
            fieldId: "note",
            type: "shortText",
            role: "custom",
            labelSnapshot: "Internal note",
            value: "Internal note.",
            private: false,
            publishable: true,
            usedInWidget: false,
          },
        ],
      }),
    ]);

    const service = makeService();
    const result = await service.getPublicEmbed({ widgetId: "widget_embed" });

    expect(result.testimonials[0]?.content).toBe("");
  });

  it("getPublicEmbed never resolves private upload answers into public video/media", async () => {
    mockWidgetFindFirst.mockResolvedValue(makeWidget({ id: "widget_embed" }));
    const uploadAnswer = (id: string, isPrivate: boolean) => ({
      fieldId: "video-upload",
      type: "fileUpload",
      role: "custom",
      labelSnapshot: "Video",
      value: id,
      private: isPrivate,
      publishable: !isPrivate,
      usedInWidget: false,
    });
    const asset = (id: string) => ({
      id,
      url: `https://cdn.example/${id}.mp4`,
    });
    mockFormResponseFindMany.mockResolvedValue([
      makeFormResponse({
        id: "response_private",
        answers: [makeFormResponse().answers[0], uploadAnswer("asset_1", true)],
        mediaAssets: [asset("asset_1")],
      }),
      makeFormResponse({
        id: "response_public",
        answers: [
          makeFormResponse().answers[0],
          uploadAnswer("asset_2", false),
        ],
        mediaAssets: [asset("asset_2")],
      }),
    ]);

    // The shared makeService omits mediaService, which would null every asset
    // and mask the gate — inject an echoing stub so only privacy decides.
    const service = new WidgetsService(
      prismaMock,
      redisMock,
      studioDraftsServiceMock,
      { resolveHost: mockResolveHost } as never,
      { record: mockHostingRecord } as never,
      { toDto: (a: unknown) => a ?? null } as never,
    );
    const result = await service.getPublicEmbed({ widgetId: "widget_embed" });

    expect(result.testimonials[0]?.video).toBeNull();
    expect(result.testimonials[1]?.video).toMatchObject({ id: "asset_2" });
  });

  it("getPublicEmbed keeps empty handpicked widgets empty", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_embed",
        contentMode: WidgetContentMode.HANDPICKED,
        pickedIds: [],
      }),
    );

    const service = makeService();
    const result = await service.getPublicEmbed({ widgetId: "widget_embed" });

    expect(result.testimonials).toEqual([]);
    expect(mockFormResponseFindMany).not.toHaveBeenCalled();
    expect(mockRedisSet).toHaveBeenCalledWith(
      "v2:widgets:embed:widget_embed",
      JSON.stringify(result),
      "EX",
      60,
    );
  });

  it("getPublicEmbedFragment renders SSR HTML and stable public cache validators", async () => {
    mockFormResponseFindMany.mockResolvedValue([]);
    mockWidgetFindFirst
      .mockResolvedValueOnce({ id: "widget_embed" })
      .mockResolvedValueOnce(
        makeWidget({
          id: "widget_embed",
          layout: LayoutType.GRID,
          maxItems: 2,
        }),
      );
    const service = makeService();
    const html = await service.getPublicEmbedFragment({
      slug: "acme",
      widgetId: "widget_embed",
    });

    expect(mockWidgetFindFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: "widget_embed",
          Project: { slug: "acme" },
        }),
        select: { id: true },
      }),
    );
    expect(html).toContain("sw-grid");
    expect(html).toContain("--semblia-widget-accent");
    expect(service.getPublicCacheControl()).toContain("max-age=60");
    expect(service.getPublicEtag(html, { weak: false })).toMatch(/^"[^"]+"$/);
    expect(service.getPublicEtag({ html })).toMatch(/^W\/"[^"]+"$/);
  });

  it("getPublicEmbedFragment rejects a mismatched project slug before reading the embed cache", async () => {
    mockWidgetFindFirst.mockResolvedValue(null);
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        widget: { id: "widget_embed" },
        testimonials: [],
      }),
    );

    const service = makeService();
    await expect(
      service.getPublicEmbedFragment({
        slug: "wrong-project",
        widgetId: "widget_embed",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mockRedisGet).not.toHaveBeenCalled();
  });

  it("getPublicWall returns a safe cached payload without authorEmail", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "proof-wall",
        wallTitle: "Proof Wall",
      }),
    );
    mockFormResponseFindMany.mockResolvedValue([makeFormResponse()]);
    mockProjectFindUnique.mockResolvedValue({
      name: "Northwind Studio",
      websiteUrl: "https://northwind.example",
      isActive: true,
    });
    const service = makeService();
    const result = await service.getPublicWall({ wallSlug: "proof-wall" });

    expect(result.project).toEqual({
      name: "Northwind Studio",
      websiteUrl: "https://northwind.example",
    });
    expect(result.testimonials).toEqual([
      expect.objectContaining({
        id: "response_1",
        authorCompany: "Acme",
      }),
    ]);
    expect(result.widget.wall).toEqual({
      slug: "proof-wall",
      title: "Proof Wall",
      subhead: "",
    });
    expect(mockRedisSet).toHaveBeenCalledWith(
      "v2:walls:legacy:proof-wall",
      JSON.stringify(result),
      "EX",
      60,
    );
  });

  it.each([
    {
      label: "active private",
      project: {
        name: "Northwind Studio",
        websiteUrl: null,
        isActive: true,
        visibility: ProjectVisibility.PRIVATE,
      },
      expected: { indexable: false, reason: "PROJECT_NOT_PUBLIC" },
    },
    {
      label: "active public",
      project: {
        name: "Northwind Studio",
        websiteUrl: null,
        isActive: true,
        visibility: ProjectVisibility.PUBLIC,
      },
      expected: { indexable: true, reason: "INDEXABLE" },
    },
  ])(
    "getPublicWall treats an $label project as $expected.reason for SEO",
    async ({ project, expected }) => {
      mockWidgetFindFirst.mockResolvedValue(
        makeWidget({
          id: "widget_wall",
          kind: WidgetType.WALL_OF_LOVE,
          wallSlug: "proof-wall",
          wallTitle: "Proof Wall",
        }),
      );
      mockFormResponseFindMany.mockResolvedValue([makeFormResponse()]);
      mockProjectFindUnique.mockResolvedValue(project);

      const result = await makeService().getPublicWall({
        wallSlug: "proof-wall",
      });

      expect(mockProjectFindUnique).toHaveBeenCalledWith({
        where: { id: "project_1" },
        select: {
          name: true,
          websiteUrl: true,
          isActive: true,
          visibility: true,
        },
      });
      expect(result.seo).toMatchObject(expected);
    },
  );

  it("rejects a missing project before reading testimonials or caching the wall", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "proof-wall",
      }),
    );
    mockProjectFindUnique.mockResolvedValue(null);

    await expect(
      makeService().getPublicWall({ wallSlug: "proof-wall" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockFormResponseFindMany).not.toHaveBeenCalled();
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("evicts a non-JSON hosted wall cache value and rebuilds from authoritative data", async () => {
    mockRedisGet.mockResolvedValue("{not-json");
    mockAuthoritativeWall();

    const result = await makeService().getPublicWall(
      { wallSlug: "proof-wall" },
      { hostname: "alpha.walls.semblia.com" },
    );

    expect(result.widget.id).toBe("widget_wall");
    expect(result.seo).toMatchObject({
      indexable: true,
      reason: "INDEXABLE",
    });
    expect(mockRedisDel).toHaveBeenCalledWith(
      "v2:walls:public:alpha.walls.semblia.com:project_1:proof-wall",
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      "v2:walls:public:alpha.walls.semblia.com:project_1:proof-wall",
      JSON.stringify(result),
      "EX",
      60,
    );
  });

  it.each([
    {
      label: "missing SEO after the project becomes private",
      cached: {
        widget: { id: "stale", wall: { slug: "proof-wall" } },
        project: null,
        testimonials: [],
      },
      project: makePublicProject({ visibility: ProjectVisibility.PRIVATE }),
    },
    {
      label: "non-array testimonials after the project becomes inactive",
      cached: {
        widget: { id: "stale", wall: { slug: "proof-wall" } },
        project: null,
        testimonials: { id: "not-an-array" },
        seo: {
          indexable: true,
          canonicalUrl: "https://alpha.walls.semblia.com/w/proof-wall",
          reason: "INDEXABLE",
        },
      },
      project: makePublicProject({ isActive: false }),
    },
  ])(
    "evicts a shape-invalid cache with $label and rebuilds safe SEO",
    async ({ cached, project }) => {
      mockRedisGet.mockResolvedValue(JSON.stringify(cached));
      mockAuthoritativeWall(project);

      const result = await makeService().getPublicWall(
        { wallSlug: "proof-wall" },
        { hostname: "alpha.walls.semblia.com" },
      );

      expect(result.widget.id).toBe("widget_wall");
      expect(result.testimonials).toEqual([
        expect.objectContaining({ id: "response_1" }),
      ]);
      expect(result.seo).toMatchObject({
        indexable: false,
        reason: "PROJECT_NOT_PUBLIC",
      });
      expect(mockRedisDel).toHaveBeenCalledWith(
        "v2:walls:public:alpha.walls.semblia.com:project_1:proof-wall",
      );
      expect(mockRedisSet).toHaveBeenCalledWith(
        "v2:walls:public:alpha.walls.semblia.com:project_1:proof-wall",
        JSON.stringify(result),
        "EX",
        60,
      );
    },
  );

  it("rebuilds a malformed cache even when exact-key eviction fails", async () => {
    mockRedisGet.mockResolvedValue("{not-json");
    mockRedisDel.mockRejectedValue(new Error("redis del unavailable"));
    mockAuthoritativeWall();

    const result = await makeService().getPublicWall(
      { wallSlug: "proof-wall" },
      { hostname: "alpha.walls.semblia.com" },
    );

    expect(result.widget.id).toBe("widget_wall");
    expect(result.seo.reason).toBe("INDEXABLE");
    expect(mockRedisDel).toHaveBeenCalledWith(
      "v2:walls:public:alpha.walls.semblia.com:project_1:proof-wall",
    );
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      label: "private",
      project: makePublicProject({ visibility: ProjectVisibility.PRIVATE }),
    },
    {
      label: "inactive",
      project: makePublicProject({ isActive: false }),
    },
  ])(
    "revalidates a warm hosted wall when its project becomes $label",
    async ({ project }) => {
      mockWidgetFindFirst.mockResolvedValue(
        makeWidget({
          id: "widget_wall",
          kind: WidgetType.WALL_OF_LOVE,
          wallSlug: "proof-wall",
          wallTitle: "Proof Wall",
        }),
      );
      mockFormResponseFindMany.mockResolvedValue([makeFormResponse()]);
      mockProjectFindUnique.mockResolvedValueOnce(makePublicProject());
      const service = makeService();

      const first = await service.getPublicWall(
        { wallSlug: "proof-wall" },
        { hostname: "alpha.walls.semblia.com" },
      );
      expect(first.seo).toMatchObject({
        indexable: true,
        reason: "INDEXABLE",
      });
      const widgetLookupCount = mockWidgetFindFirst.mock.calls.length;

      mockRedisGet.mockResolvedValueOnce(JSON.stringify(first));
      mockProjectFindUnique.mockResolvedValueOnce(project);
      const second = await service.getPublicWall(
        { wallSlug: "proof-wall" },
        { hostname: "alpha.walls.semblia.com" },
      );

      expect(second.seo).toEqual({
        ...first.seo,
        indexable: false,
        reason: "PROJECT_NOT_PUBLIC",
      });
      expect(mockProjectFindUnique).toHaveBeenNthCalledWith(2, {
        where: { id: "project_1" },
        select: { isActive: true, visibility: true },
      });
      expect(mockWidgetFindFirst).toHaveBeenCalledTimes(widgetLookupCount);
    },
  );

  it("rejects a warm hosted wall after its project is deleted", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "proof-wall",
      }),
    );
    mockFormResponseFindMany.mockResolvedValue([makeFormResponse()]);
    mockProjectFindUnique.mockResolvedValueOnce(makePublicProject());
    const service = makeService();
    const first = await service.getPublicWall(
      { wallSlug: "proof-wall" },
      { hostname: "alpha.walls.semblia.com" },
    );

    mockRedisGet.mockResolvedValueOnce(JSON.stringify(first));
    mockProjectFindUnique.mockResolvedValueOnce(null);

    await expect(
      service.getPublicWall(
        { wallSlug: "proof-wall" },
        { hostname: "alpha.walls.semblia.com" },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockFormResponseFindMany).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it("rejects a warm legacy wall after its owning project is deleted", async () => {
    const wall = makeWidget({
      id: "widget_wall",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "proof-wall",
    });
    mockWidgetFindFirst.mockResolvedValueOnce(wall);
    mockFormResponseFindMany.mockResolvedValue([makeFormResponse()]);
    mockProjectFindUnique.mockResolvedValueOnce(makePublicProject());
    const service = makeService();
    const first = await service.getPublicWall({ wallSlug: "proof-wall" });

    mockRedisGet.mockResolvedValueOnce(JSON.stringify(first));
    mockWidgetFindFirst.mockResolvedValueOnce({
      id: "widget_wall",
      projectId: "project_1",
    });
    mockProjectFindUnique.mockResolvedValueOnce(null);

    await expect(
      service.getPublicWall({ wallSlug: "proof-wall" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockWidgetFindFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          wallSlug: "proof-wall",
          isActive: true,
        }),
        select: { id: true, projectId: true },
      }),
    );
  });

  it("rebuilds a warm legacy cache when another project reuses the wall slug", async () => {
    const wallA = makeWidget({
      id: "wall_a",
      projectId: "project_a",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "proof-wall",
    });
    const wallB = makeWidget({
      id: "wall_b",
      projectId: "project_b",
      kind: WidgetType.WALL_OF_LOVE,
      wallSlug: "proof-wall",
    });
    mockWidgetFindFirst
      .mockResolvedValueOnce(wallA)
      .mockResolvedValueOnce({ id: "wall_b", projectId: "project_b" })
      .mockResolvedValueOnce(wallB);
    mockProjectFindUnique
      .mockResolvedValueOnce(makePublicProject({ name: "Project A" }))
      .mockResolvedValueOnce(makePublicProject({ name: "Project B" }));
    mockFormResponseFindMany
      .mockResolvedValueOnce([makeFormResponse({ id: "response_a" })])
      .mockResolvedValueOnce([makeFormResponse({ id: "response_b" })]);
    const service = makeService();
    const first = await service.getPublicWall({ wallSlug: "proof-wall" });
    expect(first.widget.id).toBe("wall_a");
    expect(first.testimonials[0]?.id).toBe("response_a");

    mockRedisGet.mockResolvedValueOnce(JSON.stringify(first));
    const second = await service.getPublicWall({ wallSlug: "proof-wall" });

    expect(second.widget.id).toBe("wall_b");
    expect(second.project?.name).toBe("Project B");
    expect(second.testimonials[0]?.id).toBe("response_b");
    expect(mockRedisDel).toHaveBeenCalledWith("v2:walls:legacy:proof-wall");
    expect(mockRedisSet).toHaveBeenLastCalledWith(
      "v2:walls:legacy:proof-wall",
      JSON.stringify(second),
      "EX",
      60,
    );
  });

  it("requires a host-bound cache key for a hosted wall read", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "proof-wall",
      }),
    );
    mockProjectFindUnique.mockResolvedValue({
      name: "Northwind Studio",
      websiteUrl: null,
      isActive: true,
    });
    mockFormResponseFindMany.mockResolvedValue([]);
    const service = makeService();

    await (service.getPublicWall as unknown as (
      params: { wallSlug: string },
      query: { hostname: string },
    ) => Promise<unknown>)(
      { wallSlug: "proof-wall" },
      { hostname: "alpha.walls.semblia.com" },
    );

    expect(mockRedisGet).toHaveBeenCalledWith(
      "v2:walls:public:alpha.walls.semblia.com:project_1:proof-wall",
    );
    expect(mockResolveHost).toHaveBeenCalledWith({
      hostname: "alpha.walls.semblia.com",
      feature: "WALL",
    });
    expect(mockWidgetFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          wallSlug: "proof-wall",
          isActive: true,
          AND: expect.any(Array),
        }),
      }),
    );
  });

  it("rejects a host requesting another project's wall and records only safe context", async () => {
    mockWidgetFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ projectId: "project_2" });
    const service = makeService();

    await expect(
      service.getPublicWall(
        { wallSlug: "proof-wall" },
        { hostname: "alpha.walls.semblia.com" },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mockHostingRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "public_host_cross_project_rejection",
        outcome: "rejected",
        hostname: "alpha.walls.semblia.com",
        projectId: "project_1",
        feature: "WALL",
      }),
    );
    expect(mockHostingRecord.mock.calls[0]?.[0]).not.toHaveProperty("wallSlug");
  });

  it("rejects unsupported FORM host resources before cache or widget reads", async () => {
    mockResolveHost.mockResolvedValue({
      requestedHostname: "alpha.walls.semblia.com",
      canonicalHostname: "alpha.walls.semblia.com",
      projectId: "project_1",
      feature: "WALL",
      resourceType: "FORM",
      resourceId: "form_1",
    });
    const service = makeService();
    await expect(
      service.getPublicWall(
        { wallSlug: "proof-wall" },
        { hostname: "alpha.walls.semblia.com" },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockRedisGet).not.toHaveBeenCalled();
    expect(mockWidgetFindFirst).not.toHaveBeenCalled();
  });

  it("scopes a hosted WIDGET resource exactly and keeps additional walls usable without a primary", async () => {
    mockResolveHost.mockResolvedValue({
      requestedHostname: "alpha.walls.semblia.com",
      canonicalHostname: "alpha.walls.semblia.com",
      canonicalUrl: "https://alpha.walls.semblia.com",
      projectId: "project_1",
      feature: "WALL",
      resourceType: "WIDGET",
      resourceId: "widget_7",
    });
    mockWidgetFindFirst
      .mockResolvedValueOnce(
        makeWidget({
          id: "widget_7",
          kind: WidgetType.WALL_OF_LOVE,
          wallSlug: "proof-wall",
          isPrimaryWall: false,
        }),
      )
      .mockResolvedValueOnce(null);
    mockProjectFindUnique.mockResolvedValue({
      name: "Acme",
      websiteUrl: null,
      isActive: true,
      visibility: ProjectVisibility.PUBLIC,
    });
    mockFormResponseFindMany.mockResolvedValue([]);
    const service = makeService();
    await expect(service.getPublicWall({ wallSlug: "proof-wall" }, { hostname: "alpha.walls.semblia.com" }))
      .resolves.toMatchObject({
        seo: {
          reason: "NO_PUBLIC_TESTIMONIALS",
          canonicalUrl: "https://alpha.walls.semblia.com/w/proof-wall",
        },
      });
    expect(mockWidgetFindFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project_1",
          id: "widget_7",
          AND: [
            { publishedSnapshot: { not: Prisma.DbNull } },
            { publishedSnapshot: { not: Prisma.JsonNull } },
          ],
        }),
      }),
    );
    expect(mockHostingRecord).toHaveBeenCalledWith(
      expect.objectContaining({ event: "public_wall_missing_primary" }),
    );
    expect(mockWidgetFindFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: expect.objectContaining({ wallSlug: { not: null } }) }),
    );
  });

  it("keeps the no-host wall lookup on a distinct legacy cache namespace", async () => {
    expect(publicWallQuerySchema.parse({})).toEqual({});
    expect(publicWallQuerySchema.parse({ hostname: " alpha.walls.semblia.com " }))
      .toEqual({ hostname: "alpha.walls.semblia.com" });
    const cached = makeCachedWallPayload({
      id: "legacy",
      canonicalUrl: "https://semblia.com/wall/proof-wall",
    });
    mockRedisGet.mockResolvedValue(JSON.stringify(cached));
    mockWidgetFindFirst.mockResolvedValue({
      id: "legacy",
      projectId: "project_1",
    });
    mockProjectFindUnique.mockResolvedValue(makePublicProject());
    const service = makeService();
    await expect(service.getPublicWall({ wallSlug: "proof-wall" })).resolves.toEqual(cached);
    expect(mockRedisGet).toHaveBeenCalledWith("v2:walls:legacy:proof-wall");
    expect(mockResolveHost).not.toHaveBeenCalled();
  });

  it("isolates warm cached payloads for alternating hostnames", async () => {
    const alpha = makeCachedWallPayload({
      id: "alpha",
      canonicalUrl: "https://alpha.walls.semblia.com/w/proof-wall",
    });
    const beta = makeCachedWallPayload({
      id: "beta",
      canonicalUrl: "https://beta.walls.semblia.com/w/proof-wall",
    });
    mockResolveHost
      .mockResolvedValueOnce({
        requestedHostname: "alpha.walls.semblia.com", canonicalHostname: "alpha.walls.semblia.com", projectId: "project_1", resourceType: "PROJECT", resourceId: "project_1",
      })
      .mockResolvedValueOnce({
        requestedHostname: "beta.walls.semblia.com", canonicalHostname: "beta.walls.semblia.com", projectId: "project_2", resourceType: "PROJECT", resourceId: "project_2",
      });
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(alpha)).mockResolvedValueOnce(JSON.stringify(beta));
    mockProjectFindUnique
      .mockResolvedValueOnce(makePublicProject())
      .mockResolvedValueOnce(makePublicProject());
    const service = makeService();
    await expect(service.getPublicWall({ wallSlug: "proof-wall" }, { hostname: "alpha.walls.semblia.com" })).resolves.toEqual(alpha);
    await expect(service.getPublicWall({ wallSlug: "proof-wall" }, { hostname: "beta.walls.semblia.com" })).resolves.toEqual(beta);
    expect(mockRedisGet).toHaveBeenNthCalledWith(1, "v2:walls:public:alpha.walls.semblia.com:project_1:proof-wall");
    expect(mockRedisGet).toHaveBeenNthCalledWith(2, "v2:walls:public:beta.walls.semblia.com:project_2:proof-wall");
  });

  it("clears legacy and every live alias key for old, new, and current wall slugs", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue([
      { hostname: "alpha.walls.semblia.com" },
      { hostname: "alias.walls.semblia.com" },
    ]);
    mockWidgetFindMany.mockResolvedValue([{ wallSlug: "current-primary" }]);
    const service = makeService() as unknown as {
      bustPublicCache(widgetId: string, projectId: string, ...slugs: string[]): Promise<void>;
    };
    await service.bustPublicCache("widget_1", "project_1", "old-wall", "new-wall");
    expect(mockRedisDel).toHaveBeenCalledWith(
      "v2:widgets:embed:widget_1",
      "v2:walls:legacy:old-wall",
      "v2:walls:public:alpha.walls.semblia.com:project_1:old-wall",
      "v2:walls:public:alias.walls.semblia.com:project_1:old-wall",
      "v2:walls:legacy:new-wall",
      "v2:walls:public:alpha.walls.semblia.com:project_1:new-wall",
      "v2:walls:public:alias.walls.semblia.com:project_1:new-wall",
      "v2:walls:legacy:current-primary",
      "v2:walls:public:alpha.walls.semblia.com:project_1:current-primary",
      "v2:walls:public:alias.walls.semblia.com:project_1:current-primary",
    );
  });

  it("update busts embed cache and both old and new wall cache keys", async () => {
    mockWidgetFindFirst
      .mockResolvedValueOnce(
        makeWidget({
          id: "widget_wall",
          kind: WidgetType.WALL_OF_LOVE,
          wallSlug: "old-wall",
        }),
      )
      .mockResolvedValueOnce(
        makeWidget({
          id: "widget_wall",
          kind: WidgetType.WALL_OF_LOVE,
          wallSlug: "old-wall",
        }),
      );
    mockWidgetUpdate.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "new-wall",
      }),
    );

    const service = makeService();
    await service.update(
      { slug: "acme", widgetId: "widget_wall" },
      { wallSlug: "new-wall" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockRedisDel).toHaveBeenCalledWith(
      "v2:widgets:embed:widget_wall",
      "v2:walls:legacy:old-wall",
      "v2:walls:legacy:new-wall",
    );
  });

  it("delete busts embed cache and the old wall cache key", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "proof-wall",
      }),
    );
    mockWidgetDelete.mockResolvedValue({
      id: "widget_wall",
      projectId: "project_1",
    });

    const service = makeService();
    await service.delete(
      { slug: "acme", widgetId: "widget_wall" },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockRedisDel).toHaveBeenCalledWith(
      "v2:widgets:embed:widget_wall",
      "v2:walls:legacy:proof-wall",
    );
  });
});
