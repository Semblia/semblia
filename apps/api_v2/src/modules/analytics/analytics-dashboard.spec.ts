import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  RequestMethod,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { V2AnalyticsDashboardDTO } from "@workspace/types";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { REQUIRED_CAPABILITIES_KEY } from "../../common/authz/require-capability.decorator.js";
import type { ProjectAccessService } from "../../common/authz/project-access.service.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { AnalyticsController } from "./analytics.controller.js";
import { analyticsDashboardQuerySchema } from "./analytics.dto.js";
import { AnalyticsService } from "./analytics.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";
const GUARDS_METADATA = "__guards__";
const now = new Date("2026-05-15T12:00:00.000Z");

function createExecutionContext(
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => "handler",
    getClass: () => "controller",
  } as unknown as ExecutionContext;
}

function createDashboardService() {
  const projectAnalyticsDailyFindMany = vi.fn();
  const formImpressionFindMany = vi.fn();
  const collectionFormSubmissionFindMany = vi.fn();
  const widgetAnalyticsFindMany = vi.fn();
  const widgetFindMany = vi.fn();
  const apiKeyFindMany = vi.fn();

  const prisma = {
    client: {
      projectAnalyticsDaily: { findMany: projectAnalyticsDailyFindMany },
      formImpression: { findMany: formImpressionFindMany },
      collectionFormSubmission: { findMany: collectionFormSubmissionFindMany },
      widgetAnalytics: { findMany: widgetAnalyticsFindMany },
      widget: { findMany: widgetFindMany },
      apiKey: { findMany: apiKeyFindMany },
    },
  } as unknown as PrismaService;

  return {
    service: new AnalyticsService(prisma),
    mocks: {
      projectAnalyticsDailyFindMany,
      formImpressionFindMany,
      collectionFormSubmissionFindMany,
      widgetAnalyticsFindMany,
      widgetFindMany,
      apiKeyFindMany,
    },
  };
}

function seedEmptyDashboardMocks(
  mocks: ReturnType<typeof createDashboardService>["mocks"],
) {
  mocks.projectAnalyticsDailyFindMany.mockResolvedValue([]);
  mocks.formImpressionFindMany.mockResolvedValue([]);
  mocks.collectionFormSubmissionFindMany.mockResolvedValue([]);
  mocks.widgetAnalyticsFindMany.mockResolvedValue([]);
  mocks.widgetFindMany.mockResolvedValue([]);
  mocks.apiKeyFindMany.mockResolvedValue([]);
}

describe("Analytics dashboard route contract", () => {
  it("declares GET /projects/:slug/analytics/dashboard with project view capability", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AnalyticsController)).toBe(
      "projects/:slug/analytics",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, AnalyticsController)).toEqual([
      CapabilityGuard,
    ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        AnalyticsController.prototype.getDashboard,
      ),
    ).toEqual([Capability.VIEW_PROJECT]);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AnalyticsController.prototype.getDashboard,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AnalyticsController.prototype.getDashboard,
      ),
    ).toBe("dashboard");
  });

  it("rejects project actors without the view capability", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Capability.VIEW_PROJECT]),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn().mockResolvedValue({
        project: {
          id: "project_1",
          slug: "acme",
          userId: "owner_1",
          organizationId: null,
        },
        role: "AGENT_KEY",
        capabilities: new Set(),
      }),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);

    await expect(
      guard.canActivate(
        createExecutionContext({
          params: { slug: "acme" },
          actor: {
            actorType: "agent_key",
            credentialId: "key_1",
            projectId: "project_1",
            scopes: [],
            clerkOrgPermissions: [],
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns the existing project-access 404 when the slug cannot be resolved", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Capability.VIEW_PROJECT]),
    } as unknown as Reflector;
    const projectAccessService = {
      resolveBySlug: vi.fn().mockRejectedValue(new NotFoundException()),
    } as unknown as ProjectAccessService;
    const guard = new CapabilityGuard(reflector, projectAccessService);

    await expect(
      guard.canActivate(
        createExecutionContext({
          params: { slug: "missing" },
          user: { id: "user_1" },
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("analyticsDashboardQuerySchema", () => {
  it("defaults to the previous-period comparison and a 30 day window", () => {
    expect(analyticsDashboardQuerySchema.parse({})).toEqual({
      days: 30,
      compare: "prev",
    });
  });

  it("rejects days outside the supported range", () => {
    const pipe = new ZodValidationPipe(analyticsDashboardQuerySchema);

    expect(() => pipe.transform({ days: 0 })).toThrow(BadRequestException);
    expect(() => pipe.transform({ days: 400 })).toThrow(BadRequestException);
  });
});

describe("AnalyticsService.getDashboard", () => {
  it("returns a zero-filled, PII-free dashboard for an empty project", async () => {
    const { service, mocks } = createDashboardService();
    seedEmptyDashboardMocks(mocks);

    const result = await service.getDashboard("project_1", {
      days: 2,
      compare: "prev",
      now,
    });

    expectTypeOf(result).toEqualTypeOf<V2AnalyticsDashboardDTO>();
    expect(result.range).toEqual({
      days: 2,
      since: "2026-05-14T00:00:00.000Z",
      until: now.toISOString(),
    });
    expect(result.totals).toEqual({
      formViews: 0,
      formSubmissions: 0,
      widgetLoads: 0,
      testimonialImpressions: 0,
      hostedPageViews: 0,
      apiRequests: 0,
      approved: 0,
      rejected: 0,
      flagged: 0,
    });
    expect(result.daily).toEqual([
      zeroDailyPoint("2026-05-14"),
      zeroDailyPoint("2026-05-15"),
    ]);
    expect(result.previous?.daily).toEqual([
      zeroDailyPoint("2026-05-12"),
      zeroDailyPoint("2026-05-13"),
    ]);
    expect(result.funnel.steps.map((step) => step.value)).toEqual([0, 0, 0]);
    expect(result.pipeline).toEqual({
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0,
      autoResolved: 0,
      totalWithAutoMod: 0,
      medianApprovalHours: null,
    });
    expect(result.topSources).toEqual([]);
    expect(result.ratings).toEqual({
      distribution: [],
      average: 0,
      total: 0,
    });
    expect(result.widgetEngagement).toEqual([]);
    expect(result.topCountries).toEqual([]);
    expect(result.deviceSplit).toEqual({
      mobile: 0,
      tablet: 0,
      desktop: 0,
      unknown: 0,
    });
    expect(result.contentPerformance).toEqual([]);
    expect(result.apiKeyUsage).toEqual([]);
    expect(result.oauthVerifiedShare).toBe(0);
    expect(result.submissionsByDayHour).toEqual([]);
    expect(result.alerts).toEqual([]);
    expect(
      /ipAddress|userAgent|authorEmail|privateMetadata|email/i.test(
        JSON.stringify(result),
      ),
    ).toBe(false);
  });

  it("builds the dashboard from seeded analytics without leaking private fields", async () => {
    const { service, mocks } = createDashboardService();
    seedDashboardMocks(mocks);

    const result = await service.getDashboard("project_1", {
      days: 3,
      compare: "prev",
      now,
    });

    expect(result.daily.map((point) => point.day)).toEqual([
      "2026-05-13",
      "2026-05-14",
      "2026-05-15",
    ]);
    expect(result.daily.at(1)).toMatchObject({
      formViews: 0,
      formSubmissions: 0,
      approved: 1,
      widgetLoads: 0,
      avgLoadMs: 0,
      errorCount: 0,
    });
    expect(result.daily.at(0)).toMatchObject({
      avgLoadMs: 200,
      errorCount: 1,
    });
    const funnelValues = result.funnel.steps.map((step) => step.value);
    expect(
      funnelValues.every(
        (value, index) =>
          index === 0 || value <= (funnelValues[index - 1] ?? 0),
      ),
    ).toBe(true);
    expect(
      result.pipeline.pending +
        result.pipeline.approved +
        result.pipeline.rejected +
        result.pipeline.flagged,
    ).toBe(12);
    expect(result.pipeline.totalWithAutoMod).toBe(12);
    expect(result.ratings.distribution).toEqual(
      expect.arrayContaining([
        { rating: 2, count: 1 },
        { rating: 5, count: 2 },
      ]),
    );
    expect(result.topSources.map((entry) => entry.count)).toEqual(
      [...result.topSources.map((entry) => entry.count)].sort((a, b) => b - a),
    );
    expect(result.topCountries).toEqual([
      { countryCode: "US", impressions: 2 },
      { countryCode: "UNKNOWN", impressions: 1 },
    ]);
    expect(isSortedDescending(result.topCountries, "impressions")).toBe(true);
    expect(result.contentPerformance).toEqual([]);
    expect(result.deviceSplit).toEqual({
      mobile: 1,
      tablet: 1,
      desktop: 1,
      unknown: 0,
    });
    expect(result.apiKeyUsage).toEqual([
      expect.objectContaining({
        keyId: "key_1",
        keyName: "Production",
        keyPrefix: "tresta_sk_live",
        keyType: "SECRET",
        series: [],
      }),
    ]);
    expect(result.submissionsByDayHour).toEqual(
      expect.arrayContaining([{ day: 3, hour: 3, count: 2 }]),
    );
    expect(result.previous).toBeTruthy();
    expect(result.alerts).toEqual([]);

    const submissionSelect =
      mocks.collectionFormSubmissionFindMany.mock.calls[0]?.[0]?.select ?? {};
    expect(Object.hasOwn(submissionSelect, "answers")).toBe(true);
    expect(Object.hasOwn(submissionSelect, "authorEmail")).toBe(false);
    expect(Object.hasOwn(submissionSelect, "ipAddress")).toBe(false);
    expect(Object.hasOwn(submissionSelect, "userAgent")).toBe(false);
    expect(Object.hasOwn(submissionSelect, "privateMetadata")).toBe(false);
    expect(mocks.formImpressionFindMany.mock.calls[0]?.[0]?.select).toEqual({
      timestamp: true,
    });
    expect(
      /should-not-leak|203\.0\.113|PrivateBrowser|keyHash|authorEmail|ipAddress|userAgent/i.test(
        JSON.stringify(result),
      ),
    ).toBe(false);
  });

  it("omits the previous window when compare is none", async () => {
    const { service, mocks } = createDashboardService();
    seedEmptyDashboardMocks(mocks);

    await expect(
      service.getDashboard("project_1", {
        days: 1,
        compare: "none",
        now,
      }),
    ).resolves.toMatchObject({ previous: null });
  });
});

function zeroDailyPoint(day: string) {
  return {
    day,
    formViews: 0,
    formSubmissions: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    widgetLoads: 0,
    testimonialImpressions: 0,
    hostedPageViews: 0,
    apiRequests: 0,
    avgLoadMs: 0,
    errorCount: 0,
  };
}

function seedDashboardMocks(
  mocks: ReturnType<typeof createDashboardService>["mocks"],
) {
  const submissions = Array.from({ length: 12 }, (_, index) => ({
    id: `submission_${index + 1}`,
    answers: {
      authorName: `Author ${index + 1}`,
      authorCompany: index % 2 === 0 ? "Acme" : null,
      content: `Content ${index + 1}`,
      oauthProvider: index === 0 ? "google" : index === 3 ? "github" : null,
      source: index === 1 ? "twitter" : null,
    },
    ratingValue: index === 0 ? 5 : index === 1 ? 4.6 : index === 2 ? 2 : null,
    moderationStatus:
      index === 0 || index === 1
        ? "APPROVED"
        : index === 2
          ? "REJECTED"
          : index === 3
            ? "FLAGGED"
            : "PENDING",
    metadata: { autoPublished: index === 0 },
    createdAt: new Date(
      index === 4
        ? "2026-05-13T03:00:00.000Z"
        : index === 5
          ? "2026-05-13T03:30:00.000Z"
          : `2026-05-${String(index + 1).padStart(2, "0")}T01:00:00.000Z`,
    ),
    updatedAt:
      index === 0
        ? new Date("2026-05-13T10:00:00.000Z")
        : index === 1
          ? new Date("2026-05-14T10:00:00.000Z")
          : index === 2
            ? new Date("2026-05-15T10:00:00.000Z")
            : index === 3
              ? new Date("2026-05-15T11:00:00.000Z")
              : new Date("2026-05-11T10:00:00.000Z"),
  }));

  mocks.projectAnalyticsDailyFindMany.mockResolvedValue([
    {
      day: new Date("2026-05-10T00:00:00.000Z"),
      formViews: 1,
      formSubmissions: 1,
      widgetLoads: 1,
      submissionImpressions: 1,
      hostedPageViews: 1,
      apiRequests: 1,
    },
    {
      day: new Date("2026-05-13T00:00:00.000Z"),
      formViews: 3,
      formSubmissions: 2,
      widgetLoads: 2,
      submissionImpressions: 4,
      hostedPageViews: 1,
      apiRequests: 9,
    },
    {
      day: new Date("2026-05-15T00:00:00.000Z"),
      formViews: 4,
      formSubmissions: 1,
      widgetLoads: 1,
      submissionImpressions: 5,
      hostedPageViews: 3,
      apiRequests: 1,
    },
  ]);
  mocks.formImpressionFindMany.mockResolvedValue([
    { timestamp: new Date("2026-05-10T08:00:00.000Z"), ipAddress: "old" },
    ...Array.from({ length: 5 }, (_, index) => ({
      timestamp: new Date(`2026-05-13T0${index}:00:00.000Z`),
      ipAddress: "203.0.113.55",
      userAgent: "PrivateBrowser/2.0",
    })),
  ]);
  mocks.collectionFormSubmissionFindMany.mockResolvedValue(submissions);
  mocks.widgetAnalyticsFindMany.mockResolvedValue([
    {
      widgetId: "widget_1",
      timestamp: new Date("2026-05-13T05:00:00.000Z"),
      loadTime: 100,
      errorCode: null,
      device: "desktop",
      country: "US",
    },
    {
      widgetId: "widget_1",
      timestamp: new Date("2026-05-13T06:00:00.000Z"),
      loadTime: 300,
      errorCode: "E_LOAD",
      device: "mobile",
      country: "US",
    },
    {
      widgetId: "widget_2",
      timestamp: new Date("2026-05-15T06:00:00.000Z"),
      loadTime: 500,
      errorCode: null,
      device: "tablet",
      country: null,
    },
  ]);
  mocks.widgetFindMany.mockResolvedValue([
    {
      id: "widget_1",
      name: "Homepage wall",
      kind: "WALL_OF_LOVE",
      layout: "GRID",
    },
    {
      id: "widget_2",
      name: "Landing embed",
      kind: "EMBED",
      layout: "CAROUSEL",
    },
  ]);
  mocks.apiKeyFindMany.mockResolvedValue([
    {
      id: "key_1",
      name: "Production",
      keyPrefix: "tresta_sk_live",
      keyType: "SECRET",
      usageCount: 42,
      usageLimit: 1000,
      rateLimit: 60,
      lastUsedAt: new Date("2026-05-14T09:00:00.000Z"),
      isActive: true,
      keyHash: "should-not-leak",
    },
  ]);
}

function isSortedDescending<T extends Record<K, number>, K extends string>(
  rows: T[],
  key: K,
) {
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index]![key] > rows[index - 1]![key]) {
      return false;
    }
  }

  return true;
}
