import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import {
  CardStyle,
  LayoutType,
  ModerationStatus,
  Prisma,
  StudioDraftResourceType,
  ThemeMode,
  WidgetContentMode,
  WidgetDensity,
  WidgetType,
} from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { StudioDraftsService } from "../studio-drafts/studio-drafts.service.js";
import { MediaService } from "../storage/media.service.js";
import {
  isReservedWallSlugValue,
  normalizeWallSlugValue,
  type CreateWidgetBodyDto,
  type ProjectWidgetsParamsDto,
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
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WidgetSelect;

const PUBLIC_SUBMISSION_SELECT = {
  id: true,
  answers: true,
  ratingValue: true,
  moderationStatus: true,
  mediaAssets: true,
  createdAt: true,
} satisfies Prisma.CollectionFormSubmissionSelect;

type WidgetRecord = Prisma.WidgetGetPayload<{
  select: typeof WIDGET_SELECT;
}>;

type PublicTestimonialRecord = Prisma.CollectionFormSubmissionGetPayload<{
  select: typeof PUBLIC_SUBMISSION_SELECT;
}>;

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

    return this.studioDraftsService.saveDraft({
      projectId,
      resourceType: StudioDraftResourceType.WIDGET,
      resourceId: widget.id,
      draft: body.draft,
      expectedVersion: body.expectedVersion,
      updatedByUserId,
    });
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
      },
    };
  }

  private toPublicWidget(widget: WidgetRecord) {
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
    const baseWhere = {
      projectId: widget.projectId,
      moderationStatus: ModerationStatus.APPROVED,
    } satisfies Prisma.CollectionFormSubmissionWhereInput;

    if (
      widget.contentMode === WidgetContentMode.HANDPICKED &&
      widget.pickedIds.length > 0
    ) {
      const picked = await this.prisma.client.collectionFormSubmission.findMany(
        {
        where: {
          ...baseWhere,
          id: { in: widget.pickedIds },
        },
          select: PUBLIC_SUBMISSION_SELECT,
        },
      );

      const byId = new Map(picked.map((item) => [item.id, item]));
      return widget.pickedIds
        .map((id) => byId.get(id))
        .filter((item): item is PublicTestimonialRecord => Boolean(item))
        .slice(0, widget.maxItems)
        .map((item) => this.toPublicTestimonial(item));
    }

    const testimonials =
      await this.prisma.client.collectionFormSubmission.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: widget.maxItems,
      select: PUBLIC_SUBMISSION_SELECT,
    });

    return testimonials.map((item) => this.toPublicTestimonial(item));
  }

  private toPublicTestimonial(submission: PublicTestimonialRecord) {
    const answers = this.readAnswers(submission.answers);
    const authorAvatar = this.findSubmissionMediaAsset(
      submission,
      this.readString(answers.authorAvatarAssetId),
    );
    const videoAsset = this.findSubmissionMediaAsset(
      submission,
      this.readString(answers.videoAssetId),
    );
    const mediaAsset = this.findSubmissionMediaAsset(
      submission,
      this.readString(answers.mediaAssetId),
    );

    return {
      id: submission.id,
      authorName: this.readString(answers.authorName) ?? "Anonymous",
      authorRole: this.readString(answers.authorRole),
      authorCompany: this.readString(answers.authorCompany),
      authorAvatar: this.mediaService?.toDto(authorAvatar) ?? null,
      content: this.readString(answers.content) ?? "",
      type: this.readFeedbackType(answers.type),
      video: this.mediaService?.toDto(videoAsset) ?? null,
      media: this.mediaService?.toDto(mediaAsset) ?? null,
      source: this.readString(answers.source),
      sourceUrl: this.readString(answers.sourceUrl),
      rating: submission.ratingValue,
      isOAuthVerified: this.readBoolean(answers.isOAuthVerified),
      oauthProvider: this.readString(answers.oauthProvider),
      createdAt: submission.createdAt.toISOString(),
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
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private readString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private readBoolean(value: unknown) {
    return value === true;
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
    const resolvedKind = this.resolveKind(body.kind, existing?.kind);
    const explicitWallSlug = body.wallSlug !== undefined;
    const baseGeneratedWallSlug =
      resolvedKind === WidgetType.WALL_OF_LOVE
        ? this.buildGeneratedWallSlug(body, existing)
        : null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wallSlug = this.resolveWallSlug({
        resolvedKind,
        requestedWallSlug: body.wallSlug,
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
    const data:
      | Prisma.WidgetUncheckedCreateInput
      | Prisma.WidgetUncheckedUpdateInput = {
      ...(existing ? {} : { projectId }),
      ...(body.name !== undefined ? { name: body.name } : {}),
      kind: resolvedKind,
      ...(body.layout !== undefined
        ? { layout: this.mapLayout(body.layout) }
        : {}),
      ...(body.theme !== undefined ? { theme: this.mapTheme(body.theme) } : {}),
      ...(body.preset !== undefined ? { preset: body.preset } : {}),
      ...(body.accent !== undefined ? { accent: body.accent } : {}),
      ...(body.text !== undefined ? { text: body.text } : {}),
      ...(body.bg !== undefined ? { bg: body.bg } : {}),
      ...(body.line !== undefined ? { line: body.line } : {}),
      ...(body.surface !== undefined ? { surface: body.surface } : {}),
      ...(body.radius !== undefined ? { radius: body.radius } : {}),
      ...(body.fontFamily !== undefined ? { fontFamily: body.fontFamily } : {}),
      ...(body.fontHead !== undefined ? { fontHead: body.fontHead } : {}),
      ...(body.cardStyle !== undefined
        ? { cardStyle: this.mapCardStyle(body.cardStyle) }
        : {}),
      ...(body.density !== undefined
        ? { density: this.mapDensity(body.density) }
        : {}),
      ...(body.showRating !== undefined ? { showRating: body.showRating } : {}),
      ...(body.showAvatar !== undefined ? { showAvatar: body.showAvatar } : {}),
      ...(body.showCompany !== undefined
        ? { showCompany: body.showCompany }
        : {}),
      ...(body.showDate !== undefined ? { showDate: body.showDate } : {}),
      ...(body.showSource !== undefined ? { showSource: body.showSource } : {}),
      ...(body.maxItems !== undefined ? { maxItems: body.maxItems } : {}),
      ...(body.autoRotate !== undefined ? { autoRotate: body.autoRotate } : {}),
      ...(body.rotateInterval !== undefined
        ? { rotateInterval: body.rotateInterval }
        : {}),
      ...(body.showBranding !== undefined
        ? { showBranding: body.showBranding }
        : {}),
      ...(body.contentMode !== undefined
        ? { contentMode: this.mapContentMode(body.contentMode) }
        : {}),
      ...(body.pickedIds !== undefined ? { pickedIds: body.pickedIds } : {}),
      wallSlug,
      wallTitle:
        resolvedKind === WidgetType.WALL_OF_LOVE
          ? (body.wallTitle ?? existing?.wallTitle ?? null)
          : null,
      wallSubhead:
        resolvedKind === WidgetType.WALL_OF_LOVE
          ? (body.wallSubhead ?? existing?.wallSubhead ?? null)
          : null,
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    };

    return data;
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

  private isPrismaUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
