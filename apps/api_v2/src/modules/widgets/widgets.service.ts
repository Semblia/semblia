import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import {
  CardStyle,
  LayoutType,
  MediaAssetStatus,
  type MediaAsset,
  Prisma,
  StudioDraftResourceType,
  ThemeMode,
  WidgetContentMode,
  WidgetDensity,
  WidgetType,
} from "@workspace/database/prisma";
import {
  migrateWidgetDoc,
  projectFlatWidgetToV1,
  publishWidgetDefinition,
  widgetDefinitionDocSchema,
  widgetPublishedSnapshotSchema,
  composePublishedWidgetDoc,
  type WidgetDefinitionDoc,
  type WidgetKind,
  type WidgetPublishedSnapshot,
} from "@workspace/widgets-core/schema";
import {
  renderPublishedWidgetFragment,
  type WidgetRenderItem,
} from "@workspace/widgets-core/render";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { StudioDraftsService } from "../studio-drafts/studio-drafts.service.js";
import { MediaService } from "../storage/media.service.js";
import {
  isReservedWallSlugValue,
  normalizeWallSlugValue,
  type CreateWidgetBodyDto,
  type PublishWidgetDraftBodyDto,
  type ProjectWidgetsParamsDto,
  type PublicWidgetFragmentParamsDto,
  type StudioDraftBodyDto,
  type PublicWidgetParamsDto,
  type UpdateWidgetBodyDto,
  type WallSlugParamsDto,
  type WidgetParamsDto,
} from "./widgets.dto.js";

const WIDGET_SELECT = {
  id: true,
  projectId: true,
  name: true,
  kind: true,
  layout: true,
  theme: true,
  preset: true,
  accent: true,
  text: true,
  bg: true,
  line: true,
  surface: true,
  radius: true,
  fontFamily: true,
  fontHead: true,
  cardStyle: true,
  density: true,
  showRating: true,
  showAvatar: true,
  showCompany: true,
  showDate: true,
  showSource: true,
  maxItems: true,
  autoRotate: true,
  rotateInterval: true,
  showBranding: true,
  contentMode: true,
  pickedIds: true,
  wallSlug: true,
  wallTitle: true,
  wallSubhead: true,
  config: true,
  publishedSnapshot: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WidgetSelect;

type WidgetRecord = Prisma.WidgetGetPayload<{
  select: typeof WIDGET_SELECT;
}>;

type PublicTestimonialRecord = {
  id: string;
  answers: Prisma.JsonValue;
  ratingValue: number | null;
  authorName: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  authorAvatarAssetId: string | null;
  consent: Prisma.JsonValue | null;
  mediaAssets: MediaAsset[];
  createdAt: Date;
};

type WidgetMetrics = {
  totalLoads: number;
  avgLoadMs: number;
  lastLoadAt: string | null;
};

type PublicWidgetPayload = ReturnType<WidgetsService["toPublicWidget"]>;
type PublicTestimonialPayload = ReturnType<
  WidgetsService["toPublicTestimonial"]
>;
type PublicWidgetResponse = {
  widget: PublicWidgetPayload;
  testimonials: PublicTestimonialPayload[];
};

type ProjectRequest = { projectAccess?: { projectId: string } };

const PUBLIC_WIDGET_CACHE_CONTROL =
  "public, max-age=60, stale-while-revalidate=300";

@Injectable()
export class WidgetsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(StudioDraftsService)
    private readonly studioDraftsService: StudioDraftsService,
    @Inject(MediaService)
    private readonly mediaService?: MediaService,
  ) {}

  async list(_params: ProjectWidgetsParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const widgets = await this.prisma.client.widget.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: WIDGET_SELECT,
    });

    const metricsByWidgetId = await this.getMetricsByWidgetIds(
      widgets.map((widget) => widget.id),
    );

    return widgets.map((widget) =>
      this.toWidgetDto(widget, metricsByWidgetId.get(widget.id)),
    );
  }

  async create(
    _params: ProjectWidgetsParamsDto,
    body: CreateWidgetBodyDto,
    request: ProjectRequest,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const created = await this.createOrUpdateWidgetWithSlugHandling({
      body,
      projectId,
      existing: null,
      write: (data) =>
        this.prisma.client.widget.create({
          data: data as Prisma.WidgetUncheckedCreateInput,
          select: WIDGET_SELECT,
        }),
    });

    await this.bustPublicCache(created.id, created.wallSlug);
    return this.toWidgetDto(created);
  }

  async getById(params: WidgetParamsDto, request: ProjectRequest) {
    const widget = await this.getOwnedWidgetOrThrow(
      params.widgetId,
      this.getProjectIdFromRequest(request),
    );
    const metrics = await this.getMetricsByWidgetIds([widget.id]);

    return this.toWidgetDto(widget, metrics.get(widget.id));
  }

  async update(
    params: WidgetParamsDto,
    body: UpdateWidgetBodyDto,
    request: ProjectRequest,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const existing = await this.getOwnedWidgetOrThrow(
      params.widgetId,
      projectId,
    );

    const updated = await this.createOrUpdateWidgetWithSlugHandling({
      body,
      projectId,
      existing,
      write: (data) =>
        this.prisma.client.widget.update({
          where: { id: existing.id },
          data: data as Prisma.WidgetUncheckedUpdateInput,
          select: WIDGET_SELECT,
        }),
    });

    await this.bustPublicCache(updated.id, existing.wallSlug, updated.wallSlug);
    return this.toWidgetDto(updated);
  }

  async duplicate(params: WidgetParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const source = await this.getOwnedWidgetOrThrow(params.widgetId, projectId);
    const sourceDefinition = this.definitionFromWidget(source);
    const copyDefinition = widgetDefinitionDocSchema.parse({
      ...sourceDefinition,
      wall:
        sourceDefinition.wall && sourceDefinition.kind === "wall"
          ? { ...sourceDefinition.wall, slug: "wall-of-love" }
          : sourceDefinition.wall,
    });
    const copySnapshot = publishWidgetDefinition(copyDefinition);

    const created = await this.prisma.client.widget.create({
      data: {
        id: this.createCuid(),
        projectId,
        name: this.toDuplicateWidgetName(source.name),
        kind: source.kind,
        layout: source.layout,
        theme: source.theme,
        preset: source.preset,
        accent: source.accent,
        text: source.text,
        bg: source.bg,
        line: source.line,
        surface: source.surface,
        radius: source.radius,
        fontFamily: source.fontFamily,
        fontHead: source.fontHead,
        cardStyle: source.cardStyle,
        density: source.density,
        showRating: source.showRating,
        showAvatar: source.showAvatar,
        showCompany: source.showCompany,
        showDate: source.showDate,
        showSource: source.showSource,
        maxItems: source.maxItems,
        autoRotate: source.autoRotate,
        rotateInterval: source.rotateInterval,
        showBranding: source.showBranding,
        contentMode: source.contentMode,
        pickedIds: source.pickedIds,
        config: this.toJsonInput(copyDefinition),
        publishedSnapshot: this.toJsonInput(copySnapshot),
        wallSlug: null,
        wallTitle: source.wallTitle,
        wallSubhead: source.wallSubhead,
        isActive: false,
      },
      select: WIDGET_SELECT,
    });

    return this.toWidgetDto(created);
  }

  async delete(params: WidgetParamsDto, request: ProjectRequest) {
    const widget = await this.getOwnedWidgetOrThrow(
      params.widgetId,
      this.getProjectIdFromRequest(request),
    );

    const deleted = await this.prisma.client.widget.delete({
      where: { id: widget.id },
      select: { id: true, projectId: true },
    });

    await this.bustPublicCache(widget.id, widget.wallSlug);
    return deleted;
  }

  async getDraft(params: WidgetParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const widget = await this.getOwnedWidgetOrThrow(params.widgetId, projectId);

    return this.studioDraftsService.getDraft({
      projectId,
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: widget.id,
    });
  }

  async saveDraft(
    params: WidgetParamsDto,
    body: StudioDraftBodyDto,
    request: ProjectRequest,
    updatedByUserId: string,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const widget = await this.getOwnedWidgetOrThrow(params.widgetId, projectId);
    const draft = migrateWidgetDoc(body.draft);

    return this.studioDraftsService.saveDraft({
      projectId,
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: widget.id,
      draft: draft as unknown as Record<string, unknown>,
      expectedVersion: body.expectedVersion,
      updatedByUserId,
    });
  }

  async publishDraft(
    params: WidgetParamsDto,
    body: PublishWidgetDraftBodyDto,
    request: ProjectRequest,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const widget = await this.getOwnedWidgetOrThrow(params.widgetId, projectId);
    const draft = await this.prisma.client.studioDraft.findUnique({
      where: {
        projectId_resourceType_resourceId: {
          projectId,
          resourceType: StudioDraftResourceType.WIDGET,
          resourceId: widget.id,
        },
      },
      select: { version: true, draft: true },
    });

    if (!draft || draft.version !== body.expectedVersion) {
      throw new ConflictException("Draft version is stale");
    }

    const definition = migrateWidgetDoc(draft.draft);
    const snapshot = publishWidgetDefinition(definition);
    const mirror = this.mirrorFieldsFromDefinition(definition, snapshot);

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const published = await tx.widget.update({
        where: { id: widget.id },
        data: {
          ...mirror,
          config: this.toJsonInput(definition),
          publishedSnapshot: this.toJsonInput(snapshot),
        },
        select: WIDGET_SELECT,
      });
      const marker = await tx.studioDraft.updateMany({
        where: {
          projectId,
          resourceType: StudioDraftResourceType.WIDGET,
          resourceId: widget.id,
          version: body.expectedVersion,
        },
        data: { publishedVersion: body.expectedVersion },
      });
      if (marker.count !== 1) {
        throw new ConflictException("Draft version is stale");
      }
      return published;
    });

    await this.bustPublicCache(updated.id, widget.wallSlug, updated.wallSlug);
    return this.toWidgetDto(updated);
  }

  async getPublicEmbed(
    params: PublicWidgetParamsDto,
  ): Promise<PublicWidgetResponse> {
    const cacheKey = this.getEmbedCacheKey(params.widgetId);
    const cached = await this.redisService.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as PublicWidgetResponse;
    }

    const widget = await this.prisma.client.widget.findFirst({
      where: {
        id: params.widgetId,
        kind: WidgetType.EMBED,
        isActive: true,
      },
      select: WIDGET_SELECT,
    });
    if (!widget) {
      throw new NotFoundException("Widget not found");
    }

    const response = {
      widget: this.toPublicWidget(widget),
      testimonials: await this.listPublicTestimonials(widget),
    };

    await this.redisService.redis.set(
      cacheKey,
      JSON.stringify(response),
      "EX",
      60,
    );
    return response;
  }

  async getPublicEmbedFragment(
    params: PublicWidgetFragmentParamsDto,
  ): Promise<string> {
    await this.assertPublicEmbedBelongsToProjectSlug(params);
    const response = await this.getPublicEmbed(params);
    const snapshot =
      response.widget.publishedSnapshot ??
      publishWidgetDefinition(response.widget.definition);
    const doc = composePublishedWidgetDoc(response.widget.definition, snapshot);
    return renderPublishedWidgetFragment(doc, {
      widgetId: response.widget.id,
      items: response.testimonials.map((item) =>
        this.toWidgetRenderItem(item),
      ),
    }).html;
  }

  getPublicCacheControl() {
    return PUBLIC_WIDGET_CACHE_CONTROL;
  }

  getPublicEtag(value: unknown, options: { weak?: boolean } = {}) {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    const digest = createHash("sha256").update(serialized).digest("base64url");
    const tag = `"${digest}"`;
    return options.weak === false ? tag : `W/${tag}`;
  }

  async getPublicWall(
    params: WallSlugParamsDto,
  ): Promise<PublicWidgetResponse> {
    const cacheKey = this.getWallCacheKey(params.wallSlug);
    const cached = await this.redisService.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as PublicWidgetResponse;
    }

    const widget = await this.prisma.client.widget.findFirst({
      where: {
        wallSlug: params.wallSlug,
        kind: WidgetType.WALL_OF_LOVE,
        isActive: true,
      },
      select: WIDGET_SELECT,
    });
    if (!widget) {
      throw new NotFoundException("Widget not found");
    }

    const response = {
      widget: this.toPublicWidget(widget),
      testimonials: await this.listPublicTestimonials(widget),
    };

    await this.redisService.redis.set(
      cacheKey,
      JSON.stringify(response),
      "EX",
      60,
    );
    return response;
  }

  private async getOwnedWidgetOrThrow(widgetId: string, projectId: string) {
    const widget = await this.prisma.client.widget.findFirst({
      where: { id: widgetId, projectId },
      select: WIDGET_SELECT,
    });

    if (!widget) {
      throw new NotFoundException("Widget not found");
    }

    return widget;
  }

  private getProjectIdFromRequest(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "WidgetsService requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }

  private async getMetricsByWidgetIds(widgetIds: string[]) {
    if (widgetIds.length === 0) {
      return new Map<string, WidgetMetrics>();
    }

    const rows = await this.prisma.client.widgetAnalytics.groupBy({
      by: ["widgetId"],
      where: { widgetId: { in: widgetIds } },
      _count: { _all: true },
      _avg: { loadTime: true },
      _max: { timestamp: true },
    });

    return new Map(
      rows.map((row) => [
        row.widgetId,
        {
          totalLoads: row._count._all,
          avgLoadMs: Math.round(row._avg.loadTime ?? 0),
          lastLoadAt: row._max.timestamp?.toISOString() ?? null,
        },
      ]),
    );
  }

  private toWidgetDto(widget: WidgetRecord, metrics?: WidgetMetrics) {
    const definition = this.definitionFromWidget(widget);
    const snapshot = this.snapshotFromWidget(widget, definition);
    return {
      id: widget.id,
      projectId: widget.projectId,
      entry: {
        id: widget.id,
        name: widget.name,
        widgetType: widget.kind,
        layoutType: widget.layout,
        themeMode: widget.theme,
        preset: widget.preset,
        createdAt: widget.createdAt.toISOString(),
        updatedAt: widget.updatedAt.toISOString(),
        totalLoads: metrics?.totalLoads ?? 0,
        avgLoadMs: metrics?.avgLoadMs ?? 0,
        lastLoadAt: metrics?.lastLoadAt ?? null,
        isActive: widget.isActive,
      },
      config: {
        name: widget.name,
        widgetType: widget.kind,
        layoutType: widget.layout,
        themeMode: widget.theme,
        tokens: {
          preset: widget.preset,
          accentColor: widget.accent,
          bgColor: widget.bg,
          textColor: widget.text,
          borderRadius: widget.radius,
          fontFamily: widget.fontFamily,
          cardStyle: widget.cardStyle,
          density: widget.density,
        },
        visibility: {
          showRating: widget.showRating,
          showAvatar: widget.showAvatar,
          showCompany: widget.showCompany,
          showDate: widget.showDate,
          showSource: widget.showSource,
        },
        behavior: {
          maxItems: widget.maxItems,
          autoRotate: widget.autoRotate,
          rotateInterval: widget.rotateInterval,
          showBranding: widget.showBranding,
        },
        wall: this.toWallConfig(widget),
        definition,
        publishedSnapshot: snapshot,
      },
    };
  }

  private toPublicWidget(widget: WidgetRecord) {
    const definition = this.definitionFromWidget(widget);
    const snapshot = this.snapshotFromWidget(widget, definition);
    return {
      id: widget.id,
      name: widget.name,
      widgetType: widget.kind,
      layoutType: widget.layout,
      themeMode: widget.theme,
      tokens: {
        preset: widget.preset,
        accent: widget.accent,
        text: widget.text,
        bg: widget.bg,
        line: widget.line,
        surface: widget.surface,
        radius: widget.radius,
        fontFamily: widget.fontFamily,
        fontHead: widget.fontHead,
        cardStyle: widget.cardStyle,
        density: widget.density,
      },
      visibility: {
        showRating: widget.showRating,
        showAvatar: widget.showAvatar,
        showCompany: widget.showCompany,
        showDate: widget.showDate,
        showSource: widget.showSource,
      },
      behavior: {
        maxItems: widget.maxItems,
        autoRotate: widget.autoRotate,
        rotateInterval: widget.rotateInterval,
        showBranding: widget.showBranding,
      },
      wall: this.toWallConfig(widget),
      definition,
      publishedSnapshot: snapshot,
    };
  }

  private toWallConfig(widget: WidgetRecord) {
    if (!widget.wallSlug) {
      return null;
    }

    return {
      slug: widget.wallSlug,
      title: widget.wallTitle ?? widget.name,
      subhead: widget.wallSubhead ?? "",
    };
  }

  private async listPublicTestimonials(widget: WidgetRecord) {
    const pickedIds = widget.pickedIds.filter(Boolean);
    if (
      widget.contentMode === WidgetContentMode.HANDPICKED &&
      pickedIds.length === 0
    ) {
      return [] as PublicTestimonialPayload[];
    }

    const rows = await this.prisma.client.formResponse.findMany({
      where: {
        projectId: widget.projectId,
        reviewStatus: "APPROVED",
        publishStatus: "PUBLISHED",
        ...(widget.contentMode === WidgetContentMode.HANDPICKED
          ? { id: { in: pickedIds } }
          : {}),
      },
      orderBy:
        widget.contentMode === WidgetContentMode.HANDPICKED
          ? { createdAt: "desc" }
          : { createdAt: "desc" },
      take: Math.max(widget.maxItems * 2, widget.maxItems),
      select: {
        id: true,
        answers: true,
        ratingValue: true,
        authorName: true,
        authorRole: true,
        authorCompany: true,
        authorAvatarAssetId: true,
        consent: true,
        createdAt: true,
        mediaAssets: {
          where: { status: MediaAssetStatus.ACTIVE },
        },
      },
    });

    const ordered =
      widget.contentMode === WidgetContentMode.HANDPICKED
        ? pickedIds
            .map((id) => rows.find((row) => row.id === id))
            .filter((row): row is PublicTestimonialRecord => Boolean(row))
        : rows;

    return ordered
      .filter((row) => this.hasPublicDisplayConsent(row))
      .slice(0, widget.maxItems)
      .map((row) => this.toPublicTestimonial(row));
  }

  private async assertPublicEmbedBelongsToProjectSlug(
    params: PublicWidgetFragmentParamsDto,
  ) {
    const widget = await this.prisma.client.widget.findFirst({
      where: {
        id: params.widgetId,
        kind: WidgetType.EMBED,
        isActive: true,
        Project: { slug: params.slug },
      },
      select: { id: true },
    });
    if (!widget) {
      throw new NotFoundException("Widget not found");
    }
  }

  private toPublicTestimonial(submission: PublicTestimonialRecord) {
    const answers = this.readAnswers(submission.answers);
    const authorAvatar = this.findSubmissionMediaAsset(
      submission,
      submission.authorAvatarAssetId,
    );
    const videoAsset = this.findSubmissionMediaAsset(
      submission,
      this.readAssetId(answers, "video"),
    );
    const mediaAsset = this.findSubmissionMediaAsset(
      submission,
      this.readAssetId(answers, "media"),
    );
    const consent = this.readConsent(submission.consent);

    return {
      id: submission.id,
      authorName:
        consent.canPublishName && submission.authorName
          ? submission.authorName
          : "Anonymous",
      authorRole:
        consent.canPublishRole && submission.authorRole
          ? submission.authorRole
          : null,
      authorCompany:
        consent.canPublishCompany && submission.authorCompany
          ? submission.authorCompany
          : null,
      authorAvatar: this.mediaService?.toDto(authorAvatar) ?? null,
      content: this.readRole(answers, "primaryText") ?? "",
      type: "TEXT",
      video: this.mediaService?.toDto(videoAsset) ?? null,
      media: this.mediaService?.toDto(mediaAsset) ?? null,
      source: null,
      sourceUrl: null,
      rating: submission.ratingValue,
      isOAuthVerified: false,
      oauthProvider: null,
      createdAt: submission.createdAt.toISOString(),
    };
  }

  private toWidgetRenderItem(item: PublicTestimonialPayload): WidgetRenderItem {
    return {
      id: item.id,
      authorName: item.authorName,
      authorRole: item.authorRole,
      authorCompany: item.authorCompany,
      authorAvatarUrl: item.authorAvatar?.url ?? null,
      content: item.content,
      rating: item.rating,
      source: item.source,
      sourceUrl: item.sourceUrl,
      createdAt: item.createdAt,
    };
  }

  private findSubmissionMediaAsset(
    submission: PublicTestimonialRecord,
    assetId: string | null,
  ) {
    if (!assetId) return null;
    return submission.mediaAssets.find((asset) => asset.id === assetId) ?? null;
  }

  private readAnswers(value: Prisma.JsonValue | null | undefined) {
    return Array.isArray(value)
      ? (value as Array<Record<string, unknown>>)
      : [];
  }

  private readString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private readBoolean(value: unknown) {
    return value === true;
  }

  private readConsent(value: Prisma.JsonValue | null | undefined) {
    const record =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return {
      canPublishText: record.canPublishText === true,
      canPublishName: record.canPublishName === true,
      canPublishCompany: record.canPublishCompany === true,
      canPublishRole: record.canPublishRole === true,
      canPublishAvatar: record.canPublishAvatar === true,
    };
  }

  private hasPublicDisplayConsent(submission: PublicTestimonialRecord) {
    const consent = this.readConsent(submission.consent);
    const answers = this.readAnswers(submission.answers);
    const needsText = answers.some(
      (answer) => answer.role === "primaryText" && answer.publishable === true,
    );
    return (
      (!needsText || consent.canPublishText) &&
      (!submission.authorName || consent.canPublishName) &&
      (!submission.authorRole || consent.canPublishRole) &&
      (!submission.authorCompany || consent.canPublishCompany) &&
      (!submission.authorAvatarAssetId || consent.canPublishAvatar)
    );
  }

  private readRole(answers: Array<Record<string, unknown>>, role: string) {
    const answer = answers.find(
      (item) =>
        item.role === role &&
        item.private !== true &&
        item.publishable === true,
    );
    return this.readString(answer?.value);
  }

  private readAssetId(answers: Array<Record<string, unknown>>, hint: string) {
    const answer = answers.find(
      (item) =>
        (item.type === "imageUpload" || item.type === "fileUpload") &&
        String(item.fieldId ?? "").toLowerCase().includes(hint),
    );
    if (typeof answer?.value === "string") return answer.value;
    if (Array.isArray(answer?.value)) {
      return answer.value.find((value): value is string => typeof value === "string") ?? null;
    }
    return null;
  }

  private readFeedbackType(value: unknown) {
    return value === "VIDEO" || value === "AUDIO" ? value : "TEXT";
  }

  private async createOrUpdateWidgetWithSlugHandling({
    body,
    projectId,
    existing,
    write,
  }: {
    body: CreateWidgetBodyDto | UpdateWidgetBodyDto;
    projectId: string;
    existing: WidgetRecord | null;
    write: (
      data:
        | Prisma.WidgetUncheckedCreateInput
        | Prisma.WidgetUncheckedUpdateInput,
    ) => Promise<WidgetRecord>;
  }) {
    const resolvedKind = this.resolveKind(this.requestedKind(body), existing?.kind);
    const requestedWallSlug = this.requestedWallSlug(body);
    const explicitWallSlug = requestedWallSlug !== undefined;
    const baseGeneratedWallSlug =
      resolvedKind === WidgetType.WALL_OF_LOVE
        ? this.buildGeneratedWallSlug(body, existing)
        : null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wallSlug = this.resolveWallSlug({
        resolvedKind,
        requestedWallSlug,
        generatedWallSlug: baseGeneratedWallSlug,
        existing,
        attempt,
      });

      try {
        return await write(
          this.buildWidgetWriteData({
            body,
            projectId,
            existing,
            resolvedKind,
            wallSlug,
          }),
        );
      } catch (error: unknown) {
        if (!this.isPrismaUniqueViolation(error)) {
          throw error;
        }

        if (explicitWallSlug || resolvedKind !== WidgetType.WALL_OF_LOVE) {
          throw new ConflictException("Widget wall slug already exists");
        }
      }
    }

    throw new ConflictException("Widget wall slug already exists");
  }

  private buildWidgetWriteData({
    body,
    projectId,
    existing,
    resolvedKind,
    wallSlug,
  }: {
    body: CreateWidgetBodyDto | UpdateWidgetBodyDto;
    projectId: string;
    existing: WidgetRecord | null;
    resolvedKind: WidgetType;
    wallSlug: string | null;
  }): Prisma.WidgetUncheckedCreateInput | Prisma.WidgetUncheckedUpdateInput {
    const definition = this.definitionForWrite({
      body,
      existing,
      resolvedKind,
      wallSlug,
    });
    const snapshot = publishWidgetDefinition(definition);
    const mirror = this.mirrorFieldsFromDefinition(definition, snapshot);
    const data:
      | Prisma.WidgetUncheckedCreateInput
      | Prisma.WidgetUncheckedUpdateInput = {
      ...(existing ? {} : { projectId }),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...mirror,
      config: this.toJsonInput(definition),
      publishedSnapshot: this.toJsonInput(snapshot),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    };

    return data;
  }

  private definitionForWrite({
    body,
    existing,
    resolvedKind,
    wallSlug,
  }: {
    body: CreateWidgetBodyDto | UpdateWidgetBodyDto;
    existing: WidgetRecord | null;
    resolvedKind: WidgetType;
    wallSlug: string | null;
  }): WidgetDefinitionDoc {
    const base =
      body.config !== undefined
        ? widgetDefinitionDocSchema.parse(body.config)
        : existing && !this.hasLegacyDefinitionPatch(body)
          ? this.definitionFromWidget(existing)
          : projectFlatWidgetToV1(
              this.legacyRawForWrite({ body, existing, resolvedKind, wallSlug }),
            );

    return this.normalizeDefinitionForWrite({
      definition: base,
      resolvedKind,
      wallSlug,
      body,
      existing,
    });
  }

  private normalizeDefinitionForWrite({
    definition,
    resolvedKind,
    wallSlug,
    body,
    existing,
  }: {
    definition: WidgetDefinitionDoc;
    resolvedKind: WidgetType;
    wallSlug: string | null;
    body: CreateWidgetBodyDto | UpdateWidgetBodyDto;
    existing: WidgetRecord | null;
  }): WidgetDefinitionDoc {
    const kind = this.widgetTypeToDocKind(resolvedKind);
    const needsWallConfig = kind === "wall" || definition.layout.preset === "wall";
    const existingDefinition = existing ? this.definitionFromWidget(existing) : null;
    const sourceWall = definition.wall ?? existingDefinition?.wall ?? null;
    const title =
      body.config?.wall?.title ??
      body.wallTitle ??
      sourceWall?.title ??
      existing?.wallTitle ??
      body.name ??
      existing?.name ??
      "Loved by customers";
    const subhead =
      body.config?.wall?.subhead ??
      body.wallSubhead ??
      sourceWall?.subhead ??
      existing?.wallSubhead ??
      "";
    const slug =
      kind === "wall"
        ? (wallSlug ?? sourceWall?.slug ?? existing?.wallSlug ?? "wall-of-love")
        : (sourceWall?.slug ?? "wall-of-love");

    return widgetDefinitionDocSchema.parse({
      ...definition,
      kind,
      wall: needsWallConfig
        ? {
            slug,
            title,
            subhead,
          }
        : null,
    });
  }

  private mirrorFieldsFromDefinition(
    definition: WidgetDefinitionDoc,
    snapshot: WidgetPublishedSnapshot,
  ): Prisma.WidgetUncheckedCreateInput | Prisma.WidgetUncheckedUpdateInput {
    const scheme =
      snapshot.derivedTheme.schemes.light ??
      snapshot.derivedTheme.schemes.dark;
    if (!scheme) {
      throw new InternalServerErrorException(
        "Widget theme snapshot did not include a renderable color scheme",
      );
    }

    return {
      kind: this.mapDocKind(definition.kind),
      layout: this.mapLayout(definition.layout.preset),
      theme: this.mapAppearance(definition.theme.appearance),
      preset: "parametric",
      accent: definition.theme.brandColor,
      text: scheme.text,
      bg: scheme.background,
      line: scheme.border,
      surface: scheme.surface,
      radius: Math.round(scheme.radius),
      fontFamily: scheme.fontFamily,
      fontHead: scheme.fontFamily,
      cardStyle: this.mapSurfaceStyle(definition.theme.surfaceStyle),
      density: this.mapBrandDensity(definition.theme.density),
      showRating: definition.display.showRating,
      showAvatar: definition.display.showAvatar,
      showCompany: definition.display.showCompany,
      showDate: definition.display.showDate,
      showSource: definition.display.showSource,
      maxItems: definition.content.maxItems,
      autoRotate: definition.behavior.autoRotate,
      rotateInterval: definition.behavior.rotateInterval,
      showBranding: definition.branding.watermark,
      contentMode: this.mapDocContentMode(definition.content.mode),
      pickedIds: definition.content.pickedIds,
      wallSlug:
        definition.kind === "wall" ? (definition.wall?.slug ?? null) : null,
      wallTitle:
        definition.kind === "wall" ? (definition.wall?.title ?? null) : null,
      wallSubhead:
        definition.kind === "wall" ? (definition.wall?.subhead ?? null) : null,
    };
  }

  private definitionFromWidget(widget: WidgetRecord): WidgetDefinitionDoc {
    const raw = "config" in widget ? widget.config : null;
    if (raw) {
      return migrateWidgetDoc(raw);
    }
    return projectFlatWidgetToV1(this.legacyRawFromWidget(widget));
  }

  private snapshotFromWidget(
    widget: WidgetRecord,
    definition: WidgetDefinitionDoc,
  ): WidgetPublishedSnapshot | null {
    const raw = "publishedSnapshot" in widget ? widget.publishedSnapshot : null;
    if (!raw) {
      return publishWidgetDefinition(definition);
    }
    return widgetPublishedSnapshotSchema.parse(raw);
  }

  private legacyRawFromWidget(widget: WidgetRecord) {
    return {
      kind: widget.kind,
      layout: widget.layout,
      theme: widget.theme,
      preset: widget.preset,
      accent: widget.accent,
      text: widget.text,
      bg: widget.bg,
      line: widget.line,
      surface: widget.surface,
      radius: widget.radius,
      fontFamily: widget.fontFamily,
      fontHead: widget.fontHead,
      cardStyle: widget.cardStyle,
      density: widget.density,
      showRating: widget.showRating,
      showAvatar: widget.showAvatar,
      showCompany: widget.showCompany,
      showDate: widget.showDate,
      showSource: widget.showSource,
      maxItems: widget.maxItems,
      autoRotate: widget.autoRotate,
      rotateInterval: widget.rotateInterval,
      showBranding: widget.showBranding,
      contentMode: widget.contentMode,
      pickedIds: widget.pickedIds,
      wallSlug: widget.wallSlug,
      wallTitle: widget.wallTitle,
      wallSubhead: widget.wallSubhead,
    };
  }

  private legacyRawForWrite({
    body,
    existing,
    resolvedKind,
    wallSlug,
  }: {
    body: CreateWidgetBodyDto | UpdateWidgetBodyDto;
    existing: WidgetRecord | null;
    resolvedKind: WidgetType;
    wallSlug: string | null;
  }) {
    const legacy: Record<string, unknown> = existing
      ? this.legacyRawFromWidget(existing)
      : {};
    return {
      ...legacy,
      kind: resolvedKind,
      layout: body.layout ?? legacy.layout,
      theme: body.theme ?? legacy.theme,
      preset: body.preset ?? legacy.preset,
      accent: body.accent ?? legacy.accent,
      text: body.text ?? legacy.text,
      bg: body.bg ?? legacy.bg,
      line: body.line ?? legacy.line,
      surface: body.surface ?? legacy.surface,
      radius: body.radius ?? legacy.radius,
      fontFamily: body.fontFamily ?? legacy.fontFamily,
      fontHead: body.fontHead ?? legacy.fontHead,
      cardStyle: body.cardStyle ?? legacy.cardStyle,
      density: body.density ?? legacy.density,
      showRating: body.showRating ?? legacy.showRating,
      showAvatar: body.showAvatar ?? legacy.showAvatar,
      showCompany: body.showCompany ?? legacy.showCompany,
      showDate: body.showDate ?? legacy.showDate,
      showSource: body.showSource ?? legacy.showSource,
      maxItems: body.maxItems ?? legacy.maxItems,
      autoRotate: body.autoRotate ?? legacy.autoRotate,
      rotateInterval: body.rotateInterval ?? legacy.rotateInterval,
      showBranding: body.showBranding ?? legacy.showBranding,
      contentMode: body.contentMode ?? legacy.contentMode,
      pickedIds: body.pickedIds ?? legacy.pickedIds,
      wallSlug,
      wallTitle: body.wallTitle ?? legacy.wallTitle,
      wallSubhead: body.wallSubhead ?? legacy.wallSubhead,
    };
  }

  private hasLegacyDefinitionPatch(
    body: CreateWidgetBodyDto | UpdateWidgetBodyDto,
  ) {
    return [
      "kind",
      "layout",
      "theme",
      "preset",
      "accent",
      "text",
      "bg",
      "line",
      "surface",
      "radius",
      "fontFamily",
      "fontHead",
      "cardStyle",
      "density",
      "showRating",
      "showAvatar",
      "showCompany",
      "showDate",
      "showSource",
      "maxItems",
      "autoRotate",
      "rotateInterval",
      "showBranding",
      "contentMode",
      "pickedIds",
      "wallSlug",
      "wallTitle",
      "wallSubhead",
    ].some((key) => key in body);
  }

  private requestedKind(body: CreateWidgetBodyDto | UpdateWidgetBodyDto) {
    return body.config?.kind ?? body.kind;
  }

  private requestedWallSlug(body: CreateWidgetBodyDto | UpdateWidgetBodyDto) {
    return body.wallSlug ?? body.config?.wall?.slug;
  }

  private widgetTypeToDocKind(kind: WidgetType): WidgetKind {
    return kind === WidgetType.WALL_OF_LOVE ? "wall" : "embed";
  }

  private mapDocKind(kind: WidgetKind) {
    return kind === "wall" ? WidgetType.WALL_OF_LOVE : WidgetType.EMBED;
  }

  private mapAppearance(appearance: WidgetDefinitionDoc["theme"]["appearance"]) {
    if (appearance === "dark") return ThemeMode.DARK;
    if (appearance === "system") return ThemeMode.AUTO;
    return ThemeMode.LIGHT;
  }

  private mapSurfaceStyle(
    surfaceStyle: WidgetDefinitionDoc["theme"]["surfaceStyle"],
  ) {
    if (surfaceStyle === "flat") return CardStyle.FLAT;
    if (surfaceStyle === "elevated") return CardStyle.ELEVATED;
    return CardStyle.BORDERED;
  }

  private mapBrandDensity(density: WidgetDefinitionDoc["theme"]["density"]) {
    if (density === "compact") return WidgetDensity.COMPACT;
    if (density === "spacious") return WidgetDensity.COZY;
    return WidgetDensity.DEFAULT;
  }

  private mapDocContentMode(mode: WidgetDefinitionDoc["content"]["mode"]) {
    return mode === "handpicked"
      ? WidgetContentMode.HANDPICKED
      : WidgetContentMode.ALL;
  }

  private resolveKind(
    kind: CreateWidgetBodyDto["kind"] | UpdateWidgetBodyDto["kind"],
    existingKind?: WidgetType,
  ) {
    if (kind === undefined) {
      return existingKind ?? WidgetType.EMBED;
    }

    return kind === "wall" ? WidgetType.WALL_OF_LOVE : WidgetType.EMBED;
  }

  private createCuid() {
    return `c${Date.now().toString(36)}${randomBytes(10).toString("hex")}`;
  }

  private toDuplicateWidgetName(name: string) {
    return `${name} (copy)`.slice(0, 255);
  }

  private buildGeneratedWallSlug(
    body: CreateWidgetBodyDto | UpdateWidgetBodyDto,
    existing: WidgetRecord | null,
  ) {
    let base = normalizeWallSlugValue(
      body.wallTitle ??
        body.name ??
        existing?.wallTitle ??
        existing?.name ??
        "wall",
    );

    if (base.length < 3) {
      base = "wall";
    }

    if (isReservedWallSlugValue(base)) {
      base = normalizeWallSlugValue(`${base}-wall`);
    }

    return base.length >= 3 ? base : "wall";
  }

  private resolveWallSlug({
    resolvedKind,
    requestedWallSlug,
    generatedWallSlug,
    existing,
    attempt,
  }: {
    resolvedKind: WidgetType;
    requestedWallSlug: string | undefined;
    generatedWallSlug: string | null;
    existing: WidgetRecord | null;
    attempt: number;
  }) {
    if (resolvedKind !== WidgetType.WALL_OF_LOVE) {
      return null;
    }

    if (requestedWallSlug) {
      return requestedWallSlug;
    }

    if (existing?.wallSlug) {
      return existing.wallSlug;
    }

    if (!generatedWallSlug) {
      return null;
    }

    if (attempt === 0) {
      return generatedWallSlug;
    }

    const suffix = randomBytes(2).toString("hex");
    const prefix = generatedWallSlug.slice(0, 59).replace(/-+$/g, "") || "wall";
    return `${prefix}-${suffix}`;
  }

  private mapLayout(
    layout: CreateWidgetBodyDto["layout"] | UpdateWidgetBodyDto["layout"],
  ) {
    const mapping = {
      carousel: LayoutType.CAROUSEL,
      grid: LayoutType.GRID,
      masonry: LayoutType.MASONRY,
      list: LayoutType.LIST,
      wall: LayoutType.WALL,
    } as const;

    return mapping[layout ?? "carousel"];
  }

  private mapTheme(
    theme: CreateWidgetBodyDto["theme"] | UpdateWidgetBodyDto["theme"],
  ) {
    const mapping = {
      light: ThemeMode.LIGHT,
      dark: ThemeMode.DARK,
      auto: ThemeMode.AUTO,
    } as const;

    return mapping[theme ?? "light"];
  }

  private mapCardStyle(
    cardStyle:
      | CreateWidgetBodyDto["cardStyle"]
      | UpdateWidgetBodyDto["cardStyle"],
  ) {
    const mapping = {
      shadow: CardStyle.SHADOW,
      bordered: CardStyle.BORDERED,
      flat: CardStyle.FLAT,
      elevated: CardStyle.ELEVATED,
    } as const;

    return mapping[cardStyle ?? "bordered"];
  }

  private mapDensity(
    density: CreateWidgetBodyDto["density"] | UpdateWidgetBodyDto["density"],
  ) {
    const mapping = {
      compact: WidgetDensity.COMPACT,
      default: WidgetDensity.DEFAULT,
      cozy: WidgetDensity.COZY,
    } as const;

    return mapping[density ?? "default"];
  }

  private mapContentMode(
    contentMode:
      | CreateWidgetBodyDto["contentMode"]
      | UpdateWidgetBodyDto["contentMode"],
  ) {
    return contentMode === "handpicked"
      ? WidgetContentMode.HANDPICKED
      : WidgetContentMode.ALL;
  }

  private getEmbedCacheKey(widgetId: string) {
    return `v2:widgets:embed:${widgetId}`;
  }

  private getWallCacheKey(wallSlug: string) {
    return `v2:walls:public:${wallSlug}`;
  }

  private async bustPublicCache(
    widgetId: string,
    ...wallSlugs: Array<string | null | undefined>
  ) {
    const keys = new Set<string>([this.getEmbedCacheKey(widgetId)]);
    for (const wallSlug of wallSlugs) {
      if (wallSlug) {
        keys.add(this.getWallCacheKey(wallSlug));
      }
    }

    await this.redisService.redis.del(...keys);
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private isPrismaUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
