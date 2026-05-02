import { ConflictException } from "@nestjs/common";
import {
  CardStyle,
  LayoutType,
  StudioDraftResourceType,
  ThemeMode,
  WidgetContentMode,
  WidgetDensity,
  WidgetType,
} from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWidgetBodySchema } from "./widgets.dto.js";
import { WidgetsService } from "./widgets.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { RedisService } from "../redis/redis.service.js";
import type { StudioDraftsService } from "../studio-drafts/studio-drafts.service.js";

const mockWidgetFindMany = vi.fn();
const mockWidgetFindFirst = vi.fn();
const mockWidgetCreate = vi.fn();
const mockWidgetUpdate = vi.fn();
const mockWidgetDelete = vi.fn();
const mockWidgetAnalyticsGroupBy = vi.fn();
const mockTestimonialFindMany = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockGetStudioDraft = vi.fn();
const mockSaveStudioDraft = vi.fn();

const prismaMock = {
  client: {
    widget: {
      findMany: mockWidgetFindMany,
      findFirst: mockWidgetFindFirst,
      create: mockWidgetCreate,
      update: mockWidgetUpdate,
      delete: mockWidgetDelete,
    },
    widgetAnalytics: {
      groupBy: mockWidgetAnalyticsGroupBy,
    },
    testimonial: {
      findMany: mockTestimonialFindMany,
    },
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

function makeService() {
  return new WidgetsService(prismaMock, redisMock, studioDraftsServiceMock);
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

function makeTestimonial(overrides: Record<string, unknown> = {}) {
  return {
    id: "testimonial_1",
    authorName: "Ada",
    authorEmail: "ada@example.com",
    authorRole: "Founder",
    authorCompany: "Acme",
    authorAvatar: "https://example.com/avatar.png",
    content: "Loved it",
    type: "TEXT",
    videoUrl: null,
    mediaUrl: null,
    source: "manual",
    sourceUrl: null,
    rating: 5,
    isOAuthVerified: true,
    oauthProvider: "google",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("WidgetsService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedisGet.mockResolvedValue(null);
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
    expect(result).toEqual([
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
  });

  it("create generates a normalized safe wall slug and retries with a hex suffix on collision", async () => {
    mockWidgetCreate
      .mockRejectedValueOnce({ code: "P2002" })
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
  });

  it("create keeps generated retry slugs valid when truncating long titles", async () => {
    const longTitle = `${"a".repeat(58)}-${"b".repeat(20)}`;
    mockWidgetCreate
      .mockRejectedValueOnce({ code: "P2002" })
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
    mockWidgetCreate.mockRejectedValue({ code: "P2002" });

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
      draft: { layout: "grid" },
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
    mockTestimonialFindMany.mockResolvedValue([makeTestimonial()]);

    const service = makeService();
    const result = await service.getPublicEmbed({ widgetId: "widget_embed" });

    expect(result.testimonials[0]).not.toHaveProperty("authorEmail");
    expect(result.widget).not.toHaveProperty("projectId");
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

  it("getPublicWall returns a safe cached payload without authorEmail", async () => {
    mockWidgetFindFirst.mockResolvedValue(
      makeWidget({
        id: "widget_wall",
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: "proof-wall",
        wallTitle: "Proof Wall",
      }),
    );
    mockTestimonialFindMany.mockResolvedValue([makeTestimonial()]);

    const service = makeService();
    const result = await service.getPublicWall({ wallSlug: "proof-wall" });

    expect(result.testimonials[0]).not.toHaveProperty("authorEmail");
    expect(result.widget.wall).toEqual({
      slug: "proof-wall",
      title: "Proof Wall",
      subhead: "",
    });
    expect(mockRedisSet).toHaveBeenCalledWith(
      "v2:walls:public:proof-wall",
      JSON.stringify(result),
      "EX",
      60,
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
          wallSlug: "new-wall",
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
      "v2:walls:public:old-wall",
      "v2:walls:public:new-wall",
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
      "v2:walls:public:proof-wall",
    );
  });
});
