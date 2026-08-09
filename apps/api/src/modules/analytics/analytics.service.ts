import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@workspace/database/prisma";
import type {
  V2AnalyticsApiKeyUsageDTO,
  V2AnalyticsContentRowDTO,
  V2AnalyticsCountryEntryDTO,
  V2AnalyticsDailyPointDTO,
  V2AnalyticsDashboardDTO,
  V2AnalyticsDashboardTotalsDTO,
  V2AnalyticsDeviceSplitDTO,
  V2AnalyticsFunnelDTO,
  V2AnalyticsHeatmapCellDTO,
  V2AnalyticsPipelineDTO,
  V2AnalyticsRatingsDTO,
  V2AnalyticsSourceEntryDTO,
  V2AnalyticsWidgetEngagementDTO,
  V2ApiKeyType,
} from "@workspace/types";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  AnalyticsDashboardQueryDto,
  FormViewEventBodyDto,
  HostedPageViewEventBodyDto,
  SubmissionImpressionEventBodyDto,
  WidgetLoadEventBodyDto,
} from "./analytics.dto.js";

export type AnalyticsSummaryOptions = {
  days: number;
  now?: Date;
};

export type AnalyticsDashboardOptions = AnalyticsDashboardQueryDto & {
  now?: Date;
};

export type AnalyticsEventContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  now?: Date;
};

type DashboardRange = {
  days: number;
  since: Date;
  until: Date;
};

type DashboardDailyRow = {
  day: Date;
  formViews: number;
  formSubmissions: number;
  widgetLoads: number;
  submissionImpressions: number;
  hostedPageViews: number;
  apiRequests: number;
};

type DashboardFormImpressionRow = {
  timestamp: Date;
};

type DashboardSubmissionRow = {
  id: string;
  answers: Prisma.JsonValue;
  ratingValue: number | null;
  reviewStatus: string;
  sourceMetadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

type DashboardWidgetAnalyticsRow = {
  widgetId: string;
  loadTime: number;
  errorCode: string | null;
  device: string | null;
  country: string | null;
  timestamp: Date;
};

type DashboardSubmissionImpressionRow = {
  submissionId: string;
  widgetId: string;
  device: string | null;
  country: string | null;
  timestamp: Date;
};

type DashboardTestimonialRow = {
  id: string;
  authorName: string;
  authorCompany: string | null;
  content: string;
  rating: number | null;
  moderationStatus: string;
  autoPublished: boolean;
  oauthProvider: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DashboardWidgetRow = {
  id: string;
  name: string;
  kind: string;
  layout: string;
};

type DashboardApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  keyType: string;
  usageCount: number;
  usageLimit: number | null;
  rateLimit: number;
  lastUsedAt: Date | null;
  isActive: boolean;
};

type DashboardWindowData = {
  dailyRows: DashboardDailyRow[];
  formImpressions: DashboardFormImpressionRow[];
  submissions: DashboardSubmissionRow[];
  widgetAnalytics: DashboardWidgetAnalyticsRow[];
  submissionImpressions: DashboardSubmissionImpressionRow[];
  testimonials: DashboardTestimonialRow[];
};

type DashboardWindow = {
  range: V2AnalyticsDashboardDTO["range"];
  totals: V2AnalyticsDashboardTotalsDTO;
  daily: V2AnalyticsDailyPointDTO[];
  formImpressions: DashboardFormImpressionRow[];
  submissions: DashboardSubmissionRow[];
  widgetAnalytics: DashboardWidgetAnalyticsRow[];
  submissionImpressions: DashboardSubmissionImpressionRow[];
};

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSummary(projectId: string, options: AnalyticsSummaryOptions) {
    const now = options.now ?? new Date();
    const since = startOfUtcDay(now, options.days);

    const [dailyRows, formSubmissions, formViews, widgetLoads] =
      await Promise.all([
      this.prisma.client.projectAnalyticsDaily.findMany({
        where: {
          projectId,
          day: { gte: since },
        },
        orderBy: { day: "asc" },
        select: {
          day: true,
          formViews: true,
          formSubmissions: true,
          widgetLoads: true,
          submissionImpressions: true,
          hostedPageViews: true,
          apiRequests: true,
        },
      }),
      this.prisma.client.formResponse.count({
        where: { projectId, createdAt: { gte: since } },
      }),
      this.prisma.client.formView.count({
        where: { projectId, timestamp: { gte: since } },
      }),
      this.prisma.client.widgetAnalytics.count({
        where: { projectId, timestamp: { gte: since } },
      }),
    ]);

    const daily = dailyRows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      formViews: row.formViews,
      formSubmissions: row.formSubmissions,
      widgetLoads: row.widgetLoads,
      testimonialImpressions: row.submissionImpressions,
      hostedPageViews: row.hostedPageViews,
      apiRequests: row.apiRequests,
    }));
    const dailyTotals = daily.reduce(
      (totals, row) => ({
        hostedPageViews: totals.hostedPageViews + row.hostedPageViews,
        apiRequests: totals.apiRequests + row.apiRequests,
      }),
      { hostedPageViews: 0, apiRequests: 0 },
    );

    return {
      range: {
        days: options.days,
        since: since.toISOString(),
        until: now.toISOString(),
      },
      totals: {
        formViews,
        formSubmissions,
        widgetLoads,
        testimonialImpressions: daily.reduce(
          (total, row) => total + row.testimonialImpressions,
          0,
        ),
        hostedPageViews: dailyTotals.hostedPageViews,
        apiRequests: dailyTotals.apiRequests,
      },
      daily,
    };
  }

  async getDashboard(
    projectId: string,
    options: AnalyticsDashboardOptions,
  ): Promise<V2AnalyticsDashboardDTO> {
    const now = options.now ?? new Date();
    const currentRange = buildDashboardRange(now, options.days);
    const previousRange =
      options.compare === "none"
        ? null
        : buildPreviousDashboardRange(now, options.days);
    const querySince = previousRange?.since ?? currentRange.since;

    const [
      dailyRows,
      formImpressions,
      submissions,
      widgetAnalytics,
      widgets,
      apiKeys,
    ] = await Promise.all([
      this.prisma.client.projectAnalyticsDaily.findMany({
        where: {
          projectId,
          day: { gte: querySince, lte: currentRange.until },
        },
        orderBy: { day: "asc" },
        select: {
          day: true,
          formViews: true,
          formSubmissions: true,
          widgetLoads: true,
          submissionImpressions: true,
          hostedPageViews: true,
          apiRequests: true,
        },
      }),
      this.prisma.client.formView.findMany({
        where: {
          projectId,
          timestamp: { gte: querySince, lte: currentRange.until },
        },
        select: { timestamp: true },
      }),
      this.prisma.client.formResponse.findMany({
        where: {
          projectId,
          createdAt: { gte: querySince, lte: currentRange.until },
        },
        select: {
          id: true,
          answers: true,
          ratingValue: true,
          reviewStatus: true,
          sourceMetadata: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.client.widgetAnalytics.findMany({
        where: {
          projectId,
          timestamp: { gte: querySince, lte: currentRange.until },
        },
        select: {
          widgetId: true,
          loadTime: true,
          errorCode: true,
          device: true,
          country: true,
          timestamp: true,
        },
      }),
      this.prisma.client.widget.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          kind: true,
          layout: true,
        },
      }),
      this.prisma.client.apiKey.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          keyType: true,
          usageCount: true,
          usageLimit: true,
          rateLimit: true,
          lastUsedAt: true,
          isActive: true,
        },
      }),
    ]);

    const windowData: DashboardWindowData = {
      dailyRows,
      formImpressions,
      submissions,
      widgetAnalytics,
      submissionImpressions: [],
      testimonials: submissions.map(toDashboardTestimonialRow),
    };
    const testimonials = windowData.testimonials;
    const current = buildDashboardWindow(currentRange, windowData);
    const previous = previousRange
      ? buildDashboardWindow(previousRange, windowData)
      : null;
    const pipeline = buildPipeline(testimonials);

    return {
      range: current.range,
      totals: current.totals,
      daily: current.daily,
      previous: previous
        ? {
            range: previous.range,
            totals: previous.totals,
            daily: previous.daily,
          }
        : null,
      funnel: buildFunnel(current.totals, pipeline),
      pipeline,
      topSources: buildTopSources(testimonials),
      ratings: buildRatings(testimonials),
      widgetEngagement: buildWidgetEngagement(
        widgets,
        current.widgetAnalytics,
        current.submissionImpressions,
      ),
      topCountries: buildTopCountries(
        current.widgetAnalytics,
        current.submissionImpressions,
      ),
      deviceSplit: buildDeviceSplit(
        current.widgetAnalytics,
        current.submissionImpressions,
      ),
      contentPerformance: buildContentPerformance(
        testimonials,
        current.submissionImpressions,
      ),
      apiKeyUsage: buildApiKeyUsage(apiKeys),
      oauthVerifiedShare: percentage(
        testimonials.filter((testimonial) => testimonial.oauthProvider).length,
        testimonials.length,
      ),
      submissionsByDayHour: buildSubmissionHeatmap(current.submissions),
      alerts: [],
    };
  }

  async recordFormView(
    body: FormViewEventBodyDto,
    context: AnalyticsEventContext = {},
  ) {
    const project = await this.prisma.client.project.findUnique({
      where: { slug: body.projectSlug },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const form = body.formId
      ? await this.prisma.client.form.findFirst({
          where: { id: body.formId, projectId: project.id },
          select: { id: true, currentVersion: true },
        })
      : null;
    const version = form?.currentVersion
      ? await this.prisma.client.formVersion.findFirst({
          where: {
            formId: form.id,
            projectId: project.id,
            version: form.currentVersion,
          },
          select: { id: true },
        })
      : null;

    await this.prisma.client.$transaction([
      this.prisma.client.formView.create({
        data: {
          projectId: project.id,
          formId: form?.id ?? null,
          versionId: version?.id ?? null,
          surface: "runtime",
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          timestamp: context.now ?? new Date(),
        },
      }),
      this.incrementDailyMetric(project.id, "formViews", 1, context.now),
    ]);

    return this.eventAccepted("form_view");
  }

  async recordWidgetLoad(
    body: WidgetLoadEventBodyDto,
    context: AnalyticsEventContext = {},
  ) {
    const widget = await this.prisma.client.widget.findFirst({
      where: {
        id: body.widgetId,
        isActive: true,
      },
      select: {
        id: true,
        projectId: true,
        layout: true,
      },
    });
    if (!widget) {
      throw new NotFoundException("Widget not found");
    }

    await this.prisma.client.$transaction([
      this.prisma.client.widgetAnalytics.create({
        data: {
          widgetId: widget.id,
          projectId: widget.projectId,
          loadTime: body.loadTimeMs,
          layoutType: widget.layout,
          browser: body.browser ?? null,
          device: body.device ?? null,
          country: body.country ?? null,
          errorCode: body.errorCode ?? null,
          version: body.version,
          timestamp: context.now ?? new Date(),
        },
      }),
      this.incrementDailyMetric(
        widget.projectId,
        "widgetLoads",
        1,
        context.now,
      ),
    ]);

    return this.eventAccepted("widget_load");
  }

  async recordSubmissionImpression(
    body: SubmissionImpressionEventBodyDto,
    context: AnalyticsEventContext = {},
  ) {
    const response = await this.prisma.client.formResponse.findUnique({
      where: { id: body.submissionId },
      select: { id: true, projectId: true },
    });
    if (!response) {
      throw new NotFoundException("Response not found");
    }

    const widget = await this.prisma.client.widget.findFirst({
      where: {
        id: body.widgetId,
        projectId: response.projectId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!widget) {
      throw new NotFoundException("Widget not found");
    }

    await this.incrementDailyMetric(
      response.projectId,
      "submissionImpressions",
      1,
      context.now,
    );
    return this.eventAccepted("submission_impression");
  }

  async recordHostedPageView(
    body: HostedPageViewEventBodyDto,
    context: AnalyticsEventContext = {},
  ) {
    const project = body.hostname
      ? await this.findProjectByActivePublicHost(body.hostname)
      : await this.prisma.client.project.findUnique({
          where: { slug: body.projectSlug },
          select: { id: true },
        });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    await this.incrementDailyMetric(
      project.id,
      "hostedPageViews",
      1,
      context.now,
    );

    return this.eventAccepted("hosted_page_view");
  }

  private incrementDailyMetric(
    projectId: string,
    metric: keyof Pick<
      Prisma.ProjectAnalyticsDailyUncheckedCreateInput,
      | "formViews"
      | "formSubmissions"
      | "widgetLoads"
      | "submissionImpressions"
      | "hostedPageViews"
      | "apiRequests"
    >,
    increment: number,
    now = new Date(),
  ) {
    const day = startOfUtcDay(now, 1);

    return this.prisma.client.projectAnalyticsDaily.upsert({
      where: {
        projectId_day: {
          projectId,
          day,
        },
      },
      create: {
        projectId,
        day,
        [metric]: increment,
      },
      update: {
        [metric]: { increment },
      },
    });
  }

  private async findProjectByActivePublicHost(hostname: string) {
    const normalizedHostname = normalizeHostname(hostname);
    const host = await this.prisma.client.publicSurfaceHost.findFirst({
      where: {
        hostname: normalizedHostname,
        status: "ACTIVE",
      },
      select: {
        project: {
          select: { id: true },
        },
      },
    });

    return host?.project ?? null;
  }

  private eventAccepted(type: string) {
    return {
      accepted: true,
      type,
    };
  }
}

function toDashboardTestimonialRow(
  submission: DashboardSubmissionRow,
): DashboardTestimonialRow {
  const answers = readStoredAnswers(submission.answers);
  const sourceMetadata = readJsonObject(submission.sourceMetadata);
  const moderationStatus = submission.reviewStatus;

  return {
    id: submission.id,
    authorName: readRole(answers, "authorName") ?? "Anonymous",
    authorCompany: readRole(answers, "authorCompany"),
    content: readRole(answers, "primaryText") ?? "",
    rating: submission.ratingValue,
    moderationStatus,
    autoPublished: false,
    oauthProvider: readString(sourceMetadata.oauthProvider),
    source: readString(sourceMetadata.source),
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

function readJsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type StoredAnswerLike = {
  role?: string;
  value?: unknown;
  private?: boolean;
  publishable?: boolean;
};

function readStoredAnswers(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? (value as StoredAnswerLike[]) : [];
}

function readRole(answers: StoredAnswerLike[], role: string) {
  const answer = answers.find(
    (item) => item.role === role && item.private !== true && item.publishable,
  );
  return readString(answer?.value);
}

function buildDashboardWindow(
  range: DashboardRange,
  data: DashboardWindowData,
): DashboardWindow {
  const dailyRows = data.dailyRows.filter((row) => isInRange(row.day, range));
  const formImpressions = data.formImpressions.filter((row) =>
    isInRange(row.timestamp, range),
  );
  const submissions = data.submissions.filter((row) =>
    isInRange(row.createdAt, range),
  );
  const widgetAnalytics = data.widgetAnalytics.filter((row) =>
    isInRange(row.timestamp, range),
  );
  const submissionImpressions = data.submissionImpressions.filter((row) =>
    isInRange(row.timestamp, range),
  );
  const daily = buildDailyPoints(
    range,
    dailyRows,
    widgetAnalytics,
    data.testimonials,
  );
  return {
    range: {
      days: range.days,
      since: range.since.toISOString(),
      until: range.until.toISOString(),
    },
    totals: {
      formViews: formImpressions.length,
      formSubmissions: submissions.length,
      widgetLoads: widgetAnalytics.length,
      testimonialImpressions: dailyRows.reduce(
        (total, row) => total + row.submissionImpressions,
        0,
      ),
      hostedPageViews: dailyRows.reduce(
        (total, row) => total + row.hostedPageViews,
        0,
      ),
      apiRequests: dailyRows.reduce((total, row) => total + row.apiRequests, 0),
      approved: daily.reduce((total, point) => total + point.approved, 0),
      rejected: daily.reduce((total, point) => total + point.rejected, 0),
      flagged: daily.reduce((total, point) => total + point.flagged, 0),
    },
    daily,
    formImpressions,
    submissions,
    widgetAnalytics,
    submissionImpressions,
  };
}

function buildDailyPoints(
  range: DashboardRange,
  dailyRows: DashboardDailyRow[],
  widgetAnalytics: DashboardWidgetAnalyticsRow[],
  testimonials: DashboardTestimonialRow[],
): V2AnalyticsDailyPointDTO[] {
  const dailyByDay = new Map(
    dailyRows.map((row) => [dayKey(row.day), row] as const),
  );
  const widgetByDay = groupByDay(widgetAnalytics, (row) => row.timestamp);
  const moderationByDay = buildModerationByDay(testimonials, range);

  return dayAxis(range).map((day) => {
    const key = dayKey(day);
    const row = dailyByDay.get(key);
    const widgetRows = widgetByDay.get(key) ?? [];
    const moderation = moderationByDay.get(key) ?? {
      approved: 0,
      rejected: 0,
      flagged: 0,
    };

    return {
      day: key,
      formViews: row?.formViews ?? 0,
      formSubmissions: row?.formSubmissions ?? 0,
      approved: moderation.approved,
      rejected: moderation.rejected,
      flagged: moderation.flagged,
      widgetLoads: row?.widgetLoads ?? 0,
      testimonialImpressions: row?.submissionImpressions ?? 0,
      hostedPageViews: row?.hostedPageViews ?? 0,
      apiRequests: row?.apiRequests ?? 0,
      avgLoadMs: average(widgetRows.map((widgetRow) => widgetRow.loadTime)),
      errorCount: widgetRows.filter((widgetRow) => widgetRow.errorCode).length,
    };
  });
}

function buildModerationByDay(
  testimonials: DashboardTestimonialRow[],
  range: DashboardRange,
) {
  const counts = new Map<
    string,
    { approved: number; rejected: number; flagged: number }
  >();

  for (const testimonial of testimonials) {
    if (!isInRange(testimonial.updatedAt, range)) {
      continue;
    }

    const key = dayKey(testimonial.updatedAt);
    const current = counts.get(key) ?? {
      approved: 0,
      rejected: 0,
      flagged: 0,
    };

    if (testimonial.moderationStatus === "APPROVED") {
      current.approved += 1;
    } else if (testimonial.moderationStatus === "REJECTED") {
      current.rejected += 1;
    } else if (isFlaggedReviewStatus(testimonial.moderationStatus)) {
      current.flagged += 1;
    }

    counts.set(key, current);
  }

  return counts;
}

function buildFunnel(
  totals: V2AnalyticsDashboardTotalsDTO,
  pipeline: V2AnalyticsPipelineDTO,
): V2AnalyticsFunnelDTO {
  const submitted = Math.min(totals.formSubmissions, totals.formViews);
  const approved = Math.min(pipeline.approved, submitted);

  return {
    steps: [
      {
        key: "form_impressions",
        label: "Form impressions",
        value: totals.formViews,
      },
      { key: "submitted", label: "Submitted", value: submitted },
      { key: "approved", label: "Approved", value: approved },
    ],
  };
}

function buildPipeline(
  testimonials: DashboardTestimonialRow[],
): V2AnalyticsPipelineDTO {
  const pending = testimonials.filter(
    (testimonial) => testimonial.moderationStatus === "PENDING",
  ).length;
  const approved = testimonials.filter(
    (testimonial) => testimonial.moderationStatus === "APPROVED",
  ).length;
  const rejected = testimonials.filter(
    (testimonial) => testimonial.moderationStatus === "REJECTED",
  ).length;
  const flagged = testimonials.filter((testimonial) =>
    isFlaggedReviewStatus(testimonial.moderationStatus),
  ).length;
  const approvalHours = testimonials
    .filter((testimonial) => testimonial.moderationStatus === "APPROVED")
    .map(
      (testimonial) =>
        (testimonial.updatedAt.getTime() - testimonial.createdAt.getTime()) /
        (1000 * 60 * 60),
    )
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);

  return {
    pending,
    approved,
    rejected,
    flagged,
    autoResolved: testimonials.filter(
      (testimonial) => testimonial.autoPublished,
    ).length,
    totalWithAutoMod: testimonials.length,
    medianApprovalHours: median(approvalHours),
  };
}

function buildTopSources(
  testimonials: DashboardTestimonialRow[],
): V2AnalyticsSourceEntryDTO[] {
  const sources = new Map<
    string,
    { count: number; approved: number; oauthVerified: boolean }
  >();

  for (const testimonial of testimonials) {
    const source = testimonial.oauthProvider ?? testimonial.source ?? "manual";
    const current = sources.get(source) ?? {
      count: 0,
      approved: 0,
      oauthVerified: false,
    };
    current.count += 1;
    if (testimonial.moderationStatus === "APPROVED") {
      current.approved += 1;
    }
    current.oauthVerified =
      current.oauthVerified || Boolean(testimonial.oauthProvider);
    sources.set(source, current);
  }

  return Array.from(sources.entries())
    .map(([source, value]) => ({
      source,
      count: value.count,
      approvalRate: percentage(value.approved, value.count),
      oauthVerified: value.oauthVerified,
    }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

function buildRatings(
  testimonials: DashboardTestimonialRow[],
): V2AnalyticsRatingsDTO {
  const counts = new Map<1 | 2 | 3 | 4 | 5, number>();
  const ratings = testimonials
    .map((testimonial) => testimonial.rating)
    .filter((rating): rating is number => rating !== null);

  for (const rating of ratings) {
    const normalized = Math.min(5, Math.max(1, Math.round(rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return {
    distribution: Array.from(counts.entries())
      .map(([rating, count]) => ({ rating, count }))
      .sort((a, b) => a.rating - b.rating),
    average: ratings.length
      ? round(
          ratings.reduce((total, rating) => total + rating, 0) / ratings.length,
        )
      : 0,
    total: ratings.length,
  };
}

function buildWidgetEngagement(
  widgets: DashboardWidgetRow[],
  widgetAnalytics: DashboardWidgetAnalyticsRow[],
  submissionImpressions: DashboardSubmissionImpressionRow[],
): V2AnalyticsWidgetEngagementDTO[] {
  const widgetsById = new Map(widgets.map((widget) => [widget.id, widget]));
  const loadsByWidget = groupBy(widgetAnalytics, (row) => row.widgetId);
  const impressionsByWidget = countBy(
    submissionImpressions,
    (row) => row.widgetId,
  );
  const widgetIds = new Set([
    ...loadsByWidget.keys(),
    ...impressionsByWidget.keys(),
  ]);

  return Array.from(widgetIds)
    .map((widgetId) => {
      const loads = loadsByWidget.get(widgetId) ?? [];
      const widget = widgetsById.get(widgetId);
      return {
        widgetId,
        widgetName: widget?.name ?? "Unknown widget",
        widgetType: widget?.kind ?? "EMBED",
        layoutType: widget?.layout ?? "CAROUSEL",
        totalLoads: loads.length,
        avgLoadMs: average(loads.map((row) => row.loadTime)),
        errorCount: loads.filter((row) => row.errorCode).length,
        impressions: impressionsByWidget.get(widgetId) ?? 0,
        lastLoadAt:
          latestDate(loads.map((row) => row.timestamp))?.toISOString() ?? null,
      };
    })
    .sort(
      (a, b) =>
        b.totalLoads - a.totalLoads ||
        b.impressions - a.impressions ||
        a.widgetName.localeCompare(b.widgetName),
    );
}

function buildTopCountries(
  widgetAnalytics: DashboardWidgetAnalyticsRow[],
  submissionImpressions: DashboardSubmissionImpressionRow[],
): V2AnalyticsCountryEntryDTO[] {
  const countries = new Map<string, number>();
  for (const row of [...widgetAnalytics, ...submissionImpressions]) {
    const country = normalizeCountry(row.country);
    countries.set(country, (countries.get(country) ?? 0) + 1);
  }

  return Array.from(countries.entries())
    .map(([countryCode, impressions]) => ({ countryCode, impressions }))
    .sort(
      (a, b) =>
        b.impressions - a.impressions ||
        a.countryCode.localeCompare(b.countryCode),
    )
    .slice(0, 10);
}

function buildDeviceSplit(
  widgetAnalytics: DashboardWidgetAnalyticsRow[],
  submissionImpressions: DashboardSubmissionImpressionRow[],
): V2AnalyticsDeviceSplitDTO {
  const split: V2AnalyticsDeviceSplitDTO = {
    mobile: 0,
    tablet: 0,
    desktop: 0,
    unknown: 0,
  };

  for (const row of [...widgetAnalytics, ...submissionImpressions]) {
    split[normalizeDevice(row.device)] += 1;
  }

  return split;
}

function buildContentPerformance(
  testimonials: DashboardTestimonialRow[],
  submissionImpressions: DashboardSubmissionImpressionRow[],
): V2AnalyticsContentRowDTO[] {
  const impressionsBySubmission = countBy(
    submissionImpressions,
    (row) => row.submissionId,
  );

  const rows = testimonials
    .map((testimonial) => ({
      submissionId: testimonial.id,
      authorName: testimonial.authorName,
      authorCompany: testimonial.authorCompany,
      content: testimonial.content,
      impressions: impressionsBySubmission.get(testimonial.id) ?? 0,
      rating: testimonial.rating,
      moderationStatus: testimonial.moderationStatus,
      createdAt: testimonial.createdAt.toISOString(),
    }))
    .sort(
      (a, b) =>
        b.impressions - a.impressions ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

  return (
    testimonials.length < 10 ? rows : rows.filter((row) => row.impressions > 0)
  ).slice(0, 10);
}

function buildApiKeyUsage(
  apiKeys: DashboardApiKeyRow[],
): V2AnalyticsApiKeyUsageDTO[] {
  return apiKeys.map((key) => ({
    keyId: key.id,
    keyName: key.name,
    keyPrefix: key.keyPrefix,
    keyType: key.keyType as V2ApiKeyType,
    usageCount: key.usageCount,
    usageLimit: key.usageLimit,
    rateLimit: key.rateLimit,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    isActive: key.isActive,
    series: [],
  }));
}

function buildSubmissionHeatmap(
  submissions: DashboardSubmissionRow[],
): V2AnalyticsHeatmapCellDTO[] {
  const cells = new Map<string, V2AnalyticsHeatmapCellDTO>();

  for (const submission of submissions) {
    const day = submission.createdAt.getUTCDay();
    const hour = submission.createdAt.getUTCHours();
    const key = `${day}:${hour}`;
    const current = cells.get(key) ?? { day, hour, count: 0 };
    current.count += 1;
    cells.set(key, current);
  }

  return Array.from(cells.values()).sort(
    (a, b) => a.day - b.day || a.hour - b.hour,
  );
}

function isFlaggedReviewStatus(status: string) {
  return status === "FLAGGED" || status === "SPAM" || status === "ARCHIVED";
}

function startOfUtcDay(now: Date, days: number) {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);
  return since;
}

function buildDashboardRange(now: Date, days: number): DashboardRange {
  return {
    days,
    since: startOfUtcDay(now, days),
    until: now,
  };
}

function buildPreviousDashboardRange(now: Date, days: number): DashboardRange {
  const currentSince = startOfUtcDay(now, days);
  return {
    days,
    since: startOfUtcDay(now, days * 2),
    until: new Date(currentSince.getTime() - 1),
  };
}

function dayAxis(range: DashboardRange) {
  return Array.from({ length: range.days }, (_, index) => {
    const day = new Date(range.since);
    day.setUTCDate(day.getUTCDate() + index);
    return day;
  });
}

function isInRange(value: Date, range: DashboardRange) {
  const time = value.getTime();
  return time >= range.since.getTime() && time <= range.until.getTime();
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function groupByDay<T>(rows: T[], getDate: (row: T) => Date) {
  return groupBy(rows, (row) => dayKey(getDate(row)));
}

function groupBy<T, K>(rows: T[], getKey: (row: T) => K) {
  const grouped = new Map<K, T[]>();
  for (const row of rows) {
    const key = getKey(row);
    const values = grouped.get(key) ?? [];
    values.push(row);
    grouped.set(key, values);
  }
  return grouped;
}

function countBy<T, K>(rows: T[], getKey: (row: T) => K) {
  const counts = new Map<K, number>();
  for (const row of rows) {
    const key = getKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function latestDate(values: Date[]) {
  return values.reduce<Date | null>(
    (latest, value) => (!latest || value > latest ? value : latest),
    null,
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 1) {
    return round(values[middle] ?? 0);
  }

  return round(((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2);
}

function percentage(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return round((numerator / denominator) * 100);
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function normalizeCountry(country: string | null) {
  const normalized = country?.trim().toUpperCase();
  return normalized || "UNKNOWN";
}

function normalizeDevice(
  device: string | null,
): keyof V2AnalyticsDeviceSplitDTO {
  const normalized = device?.trim().toLowerCase();
  if (!normalized) {
    return "unknown";
  }
  if (["mobile", "phone", "ios", "android"].includes(normalized)) {
    return "mobile";
  }
  if (["tablet", "ipad"].includes(normalized)) {
    return "tablet";
  }
  if (["desktop", "web", "browser"].includes(normalized)) {
    return "desktop";
  }
  return "unknown";
}

function normalizeHostname(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\.$/, "");
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
      .hostname;
  } catch {
    return trimmed;
  }
}
