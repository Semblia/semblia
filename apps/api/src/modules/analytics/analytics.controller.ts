import {
  Controller,
  Body,
  Get,
  Inject,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle, Throttle, seconds } from "@nestjs/throttler";
import { Capability } from "../../common/authz/capabilities.js";
import { CapabilityGuard } from "../../common/authz/capability.guard.js";
import { RequireCapability } from "../../common/authz/require-capability.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { ZodValidationPipe } from "../../common/zod/zod-validation.pipe.js";
import {
  analyticsDashboardQuerySchema,
  analyticsSummaryQuerySchema,
  formViewEventBodySchema,
  hostedPageViewEventBodySchema,
  submissionImpressionEventBodySchema,
  widgetLoadEventBodySchema,
  type AnalyticsDashboardQueryDto,
  type AnalyticsSummaryQueryDto,
  type FormViewEventBodyDto,
  type HostedPageViewEventBodyDto,
  type SubmissionImpressionEventBodyDto,
  type WidgetLoadEventBodyDto,
} from "./analytics.dto.js";
import { AnalyticsService } from "./analytics.service.js";

type ProjectRequest = { projectAccess?: { projectId: string } };
type PublicAnalyticsRequest = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

@Controller("projects/:slug/analytics")
@UseGuards(CapabilityGuard)
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get("summary")
  @RequireCapability(Capability.VIEW_PROJECT)
  getSummary(
    @Query(new ZodValidationPipe(analyticsSummaryQuerySchema))
    query: AnalyticsSummaryQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.analyticsService.getSummary(this.getProjectId(request), query);
  }

  @Get("dashboard")
  @RequireCapability(Capability.VIEW_PROJECT)
  getDashboard(
    @Query(new ZodValidationPipe(analyticsDashboardQuerySchema))
    query: AnalyticsDashboardQueryDto,
    @Req() request: ProjectRequest,
  ) {
    return this.analyticsService.getDashboard(
      this.getProjectId(request),
      query,
    );
  }

  private getProjectId(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "AnalyticsController requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }
}

@Controller("analytics/events")
export class PublicAnalyticsEventsController {
  constructor(
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Public()
  @SkipThrottle()
  @Throttle({ "analytics-events": { limit: 240, ttl: seconds(60) } })
  @Post("form-view")
  recordFormView(
    @Body(new ZodValidationPipe(formViewEventBodySchema))
    body: FormViewEventBodyDto,
    @Req() request: PublicAnalyticsRequest,
  ) {
    return this.analyticsService.recordFormView(
      body,
      this.getEventContext(request),
    );
  }

  @Public()
  @SkipThrottle()
  @Throttle({ "analytics-events": { limit: 240, ttl: seconds(60) } })
  @Post("widget-load")
  recordWidgetLoad(
    @Body(new ZodValidationPipe(widgetLoadEventBodySchema))
    body: WidgetLoadEventBodyDto,
    @Req() request: PublicAnalyticsRequest,
  ) {
    return this.analyticsService.recordWidgetLoad(
      body,
      this.getEventContext(request),
    );
  }

  @Public()
  @SkipThrottle()
  @Throttle({ "analytics-events": { limit: 240, ttl: seconds(60) } })
  @Post("submission-impression")
  recordSubmissionImpression(
    @Body(new ZodValidationPipe(submissionImpressionEventBodySchema))
    body: SubmissionImpressionEventBodyDto,
    @Req() request: PublicAnalyticsRequest,
  ) {
    return this.analyticsService.recordSubmissionImpression(
      body,
      this.getEventContext(request),
    );
  }

  @Public()
  @SkipThrottle()
  @Throttle({ "analytics-events": { limit: 240, ttl: seconds(60) } })
  @Post("hosted-page-view")
  recordHostedPageView(
    @Body(new ZodValidationPipe(hostedPageViewEventBodySchema))
    body: HostedPageViewEventBodyDto,
    @Req() request: PublicAnalyticsRequest,
  ) {
    return this.analyticsService.recordHostedPageView(
      body,
      this.getEventContext(request),
    );
  }

  private getEventContext(request: PublicAnalyticsRequest) {
    return {
      ipAddress: this.getClientIp(request),
      userAgent: this.readHeader(request, "user-agent"),
    };
  }

  private getClientIp(request: PublicAnalyticsRequest) {
    const forwardedFor = this.readHeader(request, "x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0]?.trim() || null;
    }

    return request.ip ?? request.socket?.remoteAddress ?? null;
  }

  private readHeader(request: PublicAnalyticsRequest, name: string) {
    const raw =
      request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
    return Array.isArray(raw) ? raw[0] : (raw ?? null);
  }
}
