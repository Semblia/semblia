import { RequestMethod } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import {
  AnalyticsController,
  PublicAnalyticsEventsController,
} from "./analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";

const mockAnalyticsFindMany = vi.fn();
const mockAnalyticsUpsert = vi.fn();
const mockSubmissionCount = vi.fn();
const mockSubmissionFindFirst = vi.fn();
const mockFormImpressionCount = vi.fn();
const mockFormImpressionCreate = vi.fn();
const mockWidgetAnalyticsCount = vi.fn();
const mockWidgetAnalyticsCreate = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockCollectionFormFindFirst = vi.fn();
const mockWidgetFindFirst = vi.fn();
const mockPublicSurfaceHostFindFirst = vi.fn();
const mockTransaction = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    projectAnalyticsDaily: {
      findMany: mockAnalyticsFindMany,
      upsert: mockAnalyticsUpsert,
    },
    project: {
      findUnique: mockProjectFindUnique,
    },
    collectionForm: {
      findFirst: mockCollectionFormFindFirst,
    },
    collectionFormSubmission: {
      count: mockSubmissionCount,
      findFirst: mockSubmissionFindFirst,
    },
    formImpression: {
      count: mockFormImpressionCount,
      create: mockFormImpressionCreate,
    },
    widgetAnalytics: {
      count: mockWidgetAnalyticsCount,
      create: mockWidgetAnalyticsCreate,
    },
    widget: {
      findFirst: mockWidgetFindFirst,
    },
    publicSurfaceHost: {
      findFirst: mockPublicSurfaceHostFindFirst,
    },
  },
} as unknown as PrismaService;

describe("AnalyticsController", () => {
  it("declares a project-scoped analytics summary route for agent reads", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AnalyticsController)).toBe(
      "projects/:slug/analytics",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, AnalyticsController)).toEqual([
      CapabilityGuard,
    ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        AnalyticsController.prototype.getSummary,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AnalyticsController.prototype.getSummary,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AnalyticsController.prototype.getSummary,
      ),
    ).toBe("summary");
  });
});

describe("PublicAnalyticsEventsController", () => {
  it("declares public analytics event capture routes", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, PublicAnalyticsEventsController),
    ).toBe("analytics/events");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        PublicAnalyticsEventsController.prototype.recordWidgetLoad,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicAnalyticsEventsController.prototype.recordWidgetLoad,
      ),
    ).toBe("widget-load");
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PublicAnalyticsEventsController.prototype.recordSubmissionImpression,
      ),
    ).toBe("submission-impression");
  });
});

describe("AnalyticsService", () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (operations: Array<unknown>) =>
      Promise.all(operations),
    );
    service = new AnalyticsService(prismaMock);
  });

  it("summarizes existing daily rows and live event tables for a project", async () => {
    mockAnalyticsFindMany.mockResolvedValue([
      {
        day: new Date("2026-05-09T00:00:00.000Z"),
        formViews: 3,
        formSubmissions: 2,
        widgetLoads: 5,
        submissionImpressions: 7,
        hostedPageViews: 11,
        apiRequests: 13,
      },
    ]);
    mockSubmissionCount.mockResolvedValueOnce(4);
    mockFormImpressionCount.mockResolvedValue(6);
    mockWidgetAnalyticsCount.mockResolvedValue(8);

    const result = await service.getSummary("project_1", {
      days: 7,
      now: new Date("2026-05-10T12:00:00.000Z"),
    });

    expect(mockAnalyticsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "project_1",
          day: { gte: new Date("2026-05-04T00:00:00.000Z") },
        },
        orderBy: { day: "asc" },
      }),
    );
    expect(result.totals).toEqual({
      formViews: 6,
      formSubmissions: 4,
      widgetLoads: 8,
      testimonialImpressions: 7,
      hostedPageViews: 11,
      apiRequests: 13,
    });
    expect(result.daily[0]).toMatchObject({
      day: "2026-05-09",
      hostedPageViews: 11,
      apiRequests: 13,
    });
  });

  it("records public form views and increments the daily rollup", async () => {
    mockProjectFindUnique.mockResolvedValue({ id: "project_1" });
    mockCollectionFormFindFirst.mockResolvedValue({ id: "form_1" });
    mockFormImpressionCreate.mockReturnValue({ id: "impression_1" });
    mockAnalyticsUpsert.mockReturnValue({ id: "daily_1" });

    await expect(
      service.recordFormView(
        { projectSlug: "acme", formId: "form_1" },
        {
          ipAddress: "203.0.113.1",
          userAgent: "Browser",
          now: new Date("2026-05-10T12:00:00.000Z"),
        },
      ),
    ).resolves.toEqual({ accepted: true, type: "form_view" });

    expect(mockFormImpressionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        formId: "form_1",
        ipAddress: "203.0.113.1",
        userAgent: "Browser",
      }),
    });
    expect(mockAnalyticsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_day: {
            projectId: "project_1",
            day: new Date("2026-05-10T00:00:00.000Z"),
          },
        },
        update: { formViews: { increment: 1 } },
      }),
    );
  });

  it("records public widget load events against the widget project", async () => {
    mockWidgetFindFirst.mockResolvedValue({
      id: "widget_1",
      projectId: "project_1",
      layout: "GRID",
    });
    mockWidgetAnalyticsCreate.mockReturnValue({ id: "widget_event_1" });
    mockAnalyticsUpsert.mockReturnValue({ id: "daily_1" });

    await expect(
      service.recordWidgetLoad(
        {
          widgetId: "widget_1",
          loadTimeMs: 123,
          browser: "Chrome",
          device: "desktop",
          version: "web_v2",
        },
        { now: new Date("2026-05-10T12:00:00.000Z") },
      ),
    ).resolves.toEqual({ accepted: true, type: "widget_load" });

    expect(mockWidgetAnalyticsCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        widgetId: "widget_1",
        projectId: "project_1",
        loadTime: 123,
        layoutType: "GRID",
      }),
    });
    expect(mockAnalyticsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { widgetLoads: { increment: 1 } },
      }),
    );
  });

  it("records public submission impressions against approved submissions", async () => {
    mockSubmissionFindFirst.mockResolvedValue({
      id: "submission_1",
      projectId: "project_1",
    });
    mockWidgetFindFirst.mockResolvedValue({ id: "widget_1" });
    mockAnalyticsUpsert.mockReturnValue({ id: "daily_1" });

    await expect(
      service.recordSubmissionImpression(
        { submissionId: "submission_1", widgetId: "widget_1" },
        { now: new Date("2026-05-10T12:00:00.000Z") },
      ),
    ).resolves.toEqual({ accepted: true, type: "submission_impression" });

    expect(mockSubmissionFindFirst).toHaveBeenCalledWith({
      where: {
        id: "submission_1",
        moderationStatus: "APPROVED",
      },
      select: {
        id: true,
        projectId: true,
      },
    });
    expect(mockAnalyticsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { submissionImpressions: { increment: 1 } },
      }),
    );
  });

  it("records hosted page views from active public hostnames", async () => {
    mockPublicSurfaceHostFindFirst.mockResolvedValue({
      project: { id: "project_1" },
    });
    mockAnalyticsUpsert.mockReturnValue({ id: "daily_1" });

    await expect(
      service.recordHostedPageView(
        { hostname: "HTTPS://Acme.Testimonials.Semblia.Com/path" },
        { now: new Date("2026-05-10T12:00:00.000Z") },
      ),
    ).resolves.toEqual({ accepted: true, type: "hosted_page_view" });

    expect(mockPublicSurfaceHostFindFirst).toHaveBeenCalledWith({
      where: {
        hostname: "acme.testimonials.semblia.com",
        status: "ACTIVE",
      },
      select: {
        project: {
          select: { id: true },
        },
      },
    });
    expect(mockAnalyticsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { hostedPageViews: { increment: 1 } },
      }),
    );
  });
});
