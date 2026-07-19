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
  ProjectVisibility,
  PublicSurfaceFeature,
  PublicSurfaceResourceType,
  StudioDraftResourceType,
  ThemeMode,
  WidgetContentMode,
  WidgetDensity,
  WidgetType,
} from "@workspace/database/prisma";
import type {
  V2PublicWallSeoDTO,
  V2PublicWallSeoReason,
} from "@workspace/types";
import {
  migrateWidgetDoc,
  normalizeWidgetAccents,
  projectFlatWidgetToV2,
  applyThemeTuning,
  publishWidgetDefinition,
  resolveWidgetTemplateManifest,
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
import { PublicHostingObservabilityService } from "../public-surfaces/public-hosting-observability.service.js";
import { PublicSurfacesService } from "../public-surfaces/public-surfaces.service.js";
import {
  isEligiblePrimaryWall,
  PrimaryWallService,
} from "./primary-wall.service.js";
import {
  isReservedWallSlugValue,
  normalizeWallSlugValue,
  type CreateWidgetBodyDto,
  type PublishWidgetDraftBodyDto,
  type ProjectWidgetsParamsDto,
  type PublicWidgetFragmentParamsDto,
  type StudioDraftBodyDto,
  type PublicWidgetParamsDto,
  type PublicWallQueryDto,
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
  isPrimaryWall: true,
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

/** Walls add the owning project's public identity for page metadata/JSON-LD. */
type PublicWallResponse = PublicWidgetResponse & {
  project: { name: string; websiteUrl: string | null } | null;
  seo: V2PublicWallSeoDTO;
};

const PUBLIC_WALL_SEO_REASONS = new Set<V2PublicWallSeoReason>([
  "INDEXABLE",
  "PROJECT_NOT_PUBLIC",
  "WALL_NOT_PUBLISHED",
  "NO_PUBLIC_TESTIMONIALS",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isPublicWallTestimonial(value: unknown) {
  if (!isRecord(value)) return false;
  const avatar = value.authorAvatar;
  return (
    typeof value.id === "string" &&
    typeof value.authorName === "string" &&
    isNullableString(value.authorRole) &&
    isNullableString(value.authorCompany) &&
    (avatar === null || (isRecord(avatar) && typeof avatar.url === "string")) &&
    typeof value.content === "string" &&
    (value.rating === null || typeof value.rating === "number") &&
    isNullableString(value.source) &&
    isNullableString(value.sourceUrl) &&
    typeof value.createdAt === "string"
  );
}

function isPublicWallCacheValue(
  value: unknown,
  wallSlug: string,
): value is PublicWallResponse {
  if (!isRecord(value)) return false;
  const widget = value.widget;
  const project = value.project;
  const seo = value.seo;
  if (!isRecord(widget) || !isRecord(widget.wall)) return false;
  if (!isRecord(widget.behavior) || !isRecord(seo)) return false;
  if (
    typeof widget.id !== "string" ||
    typeof widget.name !== "string" ||
    widget.wall.slug !== wallSlug ||
    typeof widget.wall.title !== "string" ||
    typeof widget.wall.subhead !== "string" ||
    typeof widget.behavior.showBranding !== "boolean" ||
    !widgetDefinitionDocSchema.safeParse(widget.definition).success ||
    !widgetPublishedSnapshotSchema.safeParse(widget.publishedSnapshot).success
  ) {
    return false;
  }
  if (
    project !== null &&
    (!isRecord(project) ||
      typeof project.name !== "string" ||
      !isNullableString(project.websiteUrl))
  ) {
    return false;
  }
  if (
    !Array.isArray(value.testimonials) ||
    !value.testimonials.every(isPublicWallTestimonial)
  ) {
    return false;
  }
  return (
    typeof seo.indexable === "boolean" &&
    typeof seo.canonicalUrl === "string" &&
    seo.canonicalUrl.startsWith("https://") &&
    typeof seo.reason === "string" &&
    PUBLIC_WALL_SEO_REASONS.has(seo.reason as V2PublicWallSeoReason)
  );
}

function parsePublicWallCacheValue(
  cached: string,
  wallSlug: string,
): PublicWallResponse | null {
  let value: unknown;
  try {
    value = JSON.parse(cached);
  } catch {
    return null;
  }
  return isPublicWallCacheValue(value, wallSlug) ? value : null;
}

type ProjectRequest = { projectAccess?: { projectId: string } };

const PUBLIC_WIDGET_CACHE_CONTROL =
  "public, max-age=60, stale-while-revalidate=300";

export function buildPublicWallSeo(input: {
  canonicalUrl: string;
  projectPublic: boolean;
  wallPublished: boolean;
  hasPublicTestimonials: boolean;
}): V2PublicWallSeoDTO {
  if (!input.projectPublic) {
    return {
      indexable: false,
      canonicalUrl: input.canonicalUrl,
      reason: "PROJECT_NOT_PUBLIC",
    };
  }
  if (!input.wallPublished) {
    return {
      indexable: false,
      canonicalUrl: input.canonicalUrl,
      reason: "WALL_NOT_PUBLISHED",
    };
  }
  if (!input.hasPublicTestimonials) {
    return {
      indexable: false,
      canonicalUrl: input.canonicalUrl,
      reason: "NO_PUBLIC_TESTIMONIALS",
    };
  }
  return { indexable: true, canonicalUrl: input.canonicalUrl, reason: "INDEXABLE" };
}

@Injectable()
export class WidgetsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(StudioDraftsService)
    private readonly studioDraftsService: StudioDraftsService,
    @Inject(PublicSurfacesService)
    private readonly publicSurfacesService: PublicSurfacesService,
    @Inject(PublicHostingObservabilityService)
    private readonly hostingObservability: PublicHostingObservabilityService,
    @Inject(MediaService)
    private readonly mediaService?: MediaService,
    @Inject(PrimaryWallService)
    private readonly primaryWallService: PrimaryWallService = new PrimaryWallService(),
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

    const wallHostname = await this.getDefaultWallHostname(projectId);
    return widgets.map((widget) =>
      this.toWidgetDto(
        widget,
        metricsByWidgetId.get(widget.id),
        this.getPublicWallUrl(widget, wallHostname),
      ),
    );
  }

  async create(
    _params: ProjectWidgetsParamsDto,
    body: CreateWidgetBodyDto,
    request: ProjectRequest,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const { widget: created } = await this.createOrUpdateWidgetWithSlugHandling({
      body,
      projectId,
      existing: null,
      write: (tx, data) =>
        tx.widget.create({
          data: data as Prisma.WidgetUncheckedCreateInput,
          select: WIDGET_SELECT,
        }),
    });

    await this.bustPublicCache(created.id, projectId, created.wallSlug);
    return this.toWidgetDto(
      created,
      undefined,
      this.getPublicWallUrl(
        created,
        await this.getDefaultWallHostname(projectId),
      ),
    );
  }

  async getById(params: WidgetParamsDto, request: ProjectRequest) {
    const widget = await this.getOwnedWidgetOrThrow(
      params.widgetId,
      this.getProjectIdFromRequest(request),
    );
    const metrics = await this.getMetricsByWidgetIds([widget.id]);

    return this.toWidgetDto(
      widget,
      metrics.get(widget.id),
      this.getPublicWallUrl(
        widget,
        await this.getDefaultWallHostname(widget.projectId),
      ),
    );
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

    const { widget: updated, previousWallSlug } =
      await this.createOrUpdateWidgetWithSlugHandling({
      body,
      projectId,
      existing,
      write: (tx, data) =>
        tx.widget.update({
          where: { id: existing.id },
          data: data as Prisma.WidgetUncheckedUpdateInput,
          select: WIDGET_SELECT,
        }),
    });

    await this.bustPublicCache(
      updated.id,
      projectId,
      previousWallSlug,
      updated.wallSlug,
    );
    return this.toWidgetDto(
      updated,
      undefined,
      this.getPublicWallUrl(
        updated,
        await this.getDefaultWallHostname(projectId),
      ),
    );
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

    const deleted = await this.prisma.client.$transaction(async (tx) => {
      await this.primaryWallService.lockProject(tx, widget.projectId);
      const authoritative = await tx.widget.findFirst({
        where: { id: widget.id, projectId: widget.projectId },
        select: WIDGET_SELECT,
      });
      if (!authoritative) throw new NotFoundException("Widget not found");
      const result = await tx.widget.delete({
        where: { id: authoritative.id },
        select: { id: true, projectId: true },
      });
      await this.primaryWallService.maintainPrimaryWall(tx, widget.projectId);
      return { result, previousWallSlug: authoritative.wallSlug };
    });

    await this.bustPublicCache(
      deleted.result.id,
      deleted.result.projectId,
      deleted.previousWallSlug,
    );
    return deleted.result;
  }

  async selectPrimaryWall(params: WidgetParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const widget = await this.getOwnedWidgetOrThrow(params.widgetId, projectId);
    if (!isEligiblePrimaryWall(widget)) {
      throw new ConflictException("Widget is not an eligible published wall");
    }

    const selected = await this.prisma.client.$transaction(async (tx) => {
      await this.primaryWallService.lockProject(tx, projectId);
      const current = await tx.widget.findUnique({
        where: { id: widget.id },
        select: WIDGET_SELECT,
      });
      if (
        !current ||
        current.projectId !== projectId ||
        !isEligiblePrimaryWall(current)
      ) {
        throw new NotFoundException("Widget not found");
      }
      await tx.widget.updateMany({
        where: {
          projectId,
          isPrimaryWall: true,
          id: { not: current.id },
        },
        data: { isPrimaryWall: false },
      });
      return tx.widget.update({
        where: { id: current.id },
        data: { isPrimaryWall: true },
        select: WIDGET_SELECT,
      });
    });
    await this.bustPublicCache(selected.id, projectId, selected.wallSlug);
    return this.toWidgetDto(
      selected,
      undefined,
      this.getPublicWallUrl(
        selected,
        await this.getDefaultWallHostname(projectId),
      ),
    );
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
      await this.primaryWallService.lockProject(tx, projectId);
      const authoritative = await tx.widget.findFirst({
        where: { id: widget.id, projectId },
        select: WIDGET_SELECT,
      });
      if (!authoritative) throw new NotFoundException("Widget not found");
      const published = await tx.widget.update({
        where: { id: authoritative.id },
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
      await this.primaryWallService.maintainPrimaryWall(tx, projectId);
      return {
        widget: await tx.widget.findUniqueOrThrow({
          where: { id: published.id },
          select: WIDGET_SELECT,
        }),
        previousWallSlug: authoritative.wallSlug,
      };
    });

    await this.bustPublicCache(
      updated.widget.id,
      projectId,
      updated.previousWallSlug,
      updated.widget.wallSlug,
    );
    return this.toWidgetDto(
      updated.widget,
      undefined,
      this.getPublicWallUrl(
        updated.widget,
        await this.getDefaultWallHostname(projectId),
      ),
    );
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
      items: response.testimonials.map((item) => this.toWidgetRenderItem(item)),
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
    query: PublicWallQueryDto = {},
  ): Promise<PublicWallResponse> {
    const resolved = query.hostname
      ? await this.publicSurfacesService.resolveHost({
          hostname: query.hostname,
          feature: PublicSurfaceFeature.WALL,
        })
      : null;
    if (
      resolved &&
      resolved.resourceType !== PublicSurfaceResourceType.PROJECT &&
      resolved.resourceType !== PublicSurfaceResourceType.WIDGET
    ) {
      throw new NotFoundException("Widget not found");
    }
    const cacheKey = resolved
      ? this.getWallCacheKey(
          resolved.requestedHostname,
          resolved.projectId,
          params.wallSlug,
        )
      : this.getLegacyWallCacheKey(params.wallSlug);
    const cached = await this.redisService.redis.get(cacheKey);
    const cachedResponse =
      cached === null
        ? null
        : parsePublicWallCacheValue(cached, params.wallSlug);
    if (cached !== null && !cachedResponse) {
      await this.evictInvalidWallCache(cacheKey);
    }
    let reusableCachedResponse = cachedResponse;
    let cachedProjectId = resolved?.projectId ?? null;
    if (reusableCachedResponse && !resolved) {
      const identity = await this.getLegacyWallIdentity(params.wallSlug);
      if (!identity) {
        throw new NotFoundException("Widget not found");
      }
      if (identity.id !== reusableCachedResponse.widget.id) {
        await this.evictInvalidWallCache(cacheKey);
        reusableCachedResponse = null;
      } else {
        cachedProjectId = identity.projectId;
      }
    }
    if (reusableCachedResponse) {
      if (!cachedProjectId) {
        throw new NotFoundException("Widget not found");
      }
      const project = await this.prisma.client.project.findUnique({
        where: { id: cachedProjectId },
        select: { isActive: true, visibility: true },
      });
      if (!project) {
        throw new NotFoundException("Widget not found");
      }
      if (
        project.isActive !== true ||
        project.visibility !== ProjectVisibility.PUBLIC
      ) {
        return {
          ...reusableCachedResponse,
          seo: buildPublicWallSeo({
            canonicalUrl: reusableCachedResponse.seo.canonicalUrl,
            projectPublic: false,
            wallPublished: true,
            hasPublicTestimonials:
              reusableCachedResponse.testimonials.length > 0,
          }),
        };
      }
      return reusableCachedResponse;
    }

    const widget = await this.prisma.client.widget.findFirst({
      where: {
        wallSlug: params.wallSlug,
        kind: WidgetType.WALL_OF_LOVE,
        isActive: true,
        AND: [
          { publishedSnapshot: { not: Prisma.DbNull } },
          { publishedSnapshot: { not: Prisma.JsonNull } },
        ],
        ...(resolved
          ? {
              projectId: resolved.projectId,
              ...(resolved.resourceType === PublicSurfaceResourceType.WIDGET
                ? { id: resolved.resourceId }
                : {}),
            }
          : {}),
      },
      select: WIDGET_SELECT,
    });
    if (!widget) {
      if (resolved) {
        const other = await this.prisma.client.widget.findFirst({
          where: {
            wallSlug: params.wallSlug,
            kind: WidgetType.WALL_OF_LOVE,
            isActive: true,
            AND: [
              { publishedSnapshot: { not: Prisma.DbNull } },
              { publishedSnapshot: { not: Prisma.JsonNull } },
            ],
          },
          select: { projectId: true },
        });
        if (other && other.projectId !== resolved.projectId) {
          this.hostingObservability.record({
            event: "public_host_cross_project_rejection",
            outcome: "rejected",
            reason: "resource_owner_mismatch",
            hostname: resolved.requestedHostname,
            projectId: resolved.projectId,
            feature: PublicSurfaceFeature.WALL,
          });
        }
      }
      throw new NotFoundException("Widget not found");
    }

    if (resolved && widget.isPrimaryWall !== true) {
      const primary = await this.prisma.client.widget.findFirst({
        where: {
          projectId: resolved.projectId,
          kind: WidgetType.WALL_OF_LOVE,
          isActive: true,
          isPrimaryWall: true,
          wallSlug: { not: null },
          AND: [
            { publishedSnapshot: { not: Prisma.DbNull } },
            { publishedSnapshot: { not: Prisma.JsonNull } },
          ],
        },
        select: { id: true },
      });
      if (!primary) {
        this.hostingObservability.record({
          event: "public_wall_missing_primary",
          outcome: "miss",
          reason: "no_primary_wall",
          hostname: resolved.canonicalHostname,
          projectId: resolved.projectId,
          feature: PublicSurfaceFeature.WALL,
        });
      }
    }

    const project = await this.prisma.client.project.findUnique({
      where: { id: widget.projectId },
      select: {
        name: true,
        websiteUrl: true,
        isActive: true,
        visibility: true,
      },
    });
    if (!project) {
      throw new NotFoundException("Widget not found");
    }
    const testimonials = await this.listPublicTestimonials(widget);
    const defaultHostname = resolved?.canonicalHostname ??
      (await this.getDefaultWallHostname(widget.projectId));
    const canonicalUrl = this.getPublicWallUrl(widget, defaultHostname) ??
      `https://semblia.com/wall/${widget.wallSlug}`;
    const seo = buildPublicWallSeo({
      canonicalUrl,
      projectPublic:
        project.isActive === true &&
        project.visibility === ProjectVisibility.PUBLIC,
      wallPublished: true,
      hasPublicTestimonials: testimonials.length > 0,
    });

    const response: PublicWallResponse = {
      widget: this.toPublicWidget(widget),
      project: { name: project.name, websiteUrl: project.websiteUrl ?? null },
      testimonials,
      seo,
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

  private toWidgetDto(
    widget: WidgetRecord,
    metrics?: WidgetMetrics,
    publicUrl: string | null = null,
  ) {
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
        isPrimaryWall: widget.isPrimaryWall === true,
        publicUrl,
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
    // The submit normalizer projects role values into columns regardless of
    // the field's privacy flag (internal surfaces need them), so the public
    // boundary must re-check privacy before exposing any projected column.
    const privateRoles = new Set(
      answers
        .filter((item) => item.private === true)
        .map((item) => String(item.role)),
    );
    const ratingIsPrivate = answers.some(
      (item) => item.type === "rating" && item.private === true,
    );

    return {
      id: submission.id,
      authorName:
        consent.canPublishName &&
        submission.authorName &&
        !privateRoles.has("authorName")
          ? submission.authorName
          : "Anonymous",
      authorRole:
        consent.canPublishRole &&
        submission.authorRole &&
        !privateRoles.has("authorRole")
          ? submission.authorRole
          : null,
      authorCompany:
        consent.canPublishCompany &&
        submission.authorCompany &&
        !privateRoles.has("authorCompany")
          ? submission.authorCompany
          : null,
      authorAvatar: privateRoles.has("authorAvatar")
        ? null
        : (this.mediaService?.toDto(authorAvatar) ?? null),
      content:
        this.readRole(answers, "primaryText") ??
        this.readWidgetEligibleText(answers) ??
        "",
      type: "TEXT",
      video: this.mediaService?.toDto(videoAsset) ?? null,
      media: this.mediaService?.toDto(mediaAsset) ?? null,
      source: null,
      sourceUrl: null,
      rating: ratingIsPrivate ? null : submission.ratingValue,
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
      (answer) =>
        answer.publishable === true &&
        (answer.role === "primaryText" ||
          // Widget-eligible custom text can surface as content too.
          (answer.usedInWidget === true &&
            (answer.type === "shortText" || answer.type === "longText"))),
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

  /**
   * Custom text fields toggled "Widget eligible" in the studio keep their
   * `custom` role, so `readRole("primaryText")` never sees them. Honor the
   * studio's promise that they may be quoted by falling back to the first
   * widget-eligible publishable text answer.
   */
  private readWidgetEligibleText(answers: Array<Record<string, unknown>>) {
    const answer = answers.find(
      (item) =>
        item.usedInWidget === true &&
        item.private !== true &&
        item.publishable === true &&
        (item.type === "shortText" || item.type === "longText"),
    );
    return this.readString(answer?.value);
  }

  /** Only used by the public serve path, so private uploads never resolve. */
  private readAssetId(answers: Array<Record<string, unknown>>, hint: string) {
    const answer = answers.find(
      (item) =>
        (item.type === "imageUpload" || item.type === "fileUpload") &&
        item.private !== true &&
        String(item.fieldId ?? "")
          .toLowerCase()
          .includes(hint),
    );
    if (typeof answer?.value === "string") return answer.value;
    if (Array.isArray(answer?.value)) {
      return (
        answer.value.find(
          (value): value is string => typeof value === "string",
        ) ?? null
      );
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
      tx: Prisma.TransactionClient,
      data:
        | Prisma.WidgetUncheckedCreateInput
        | Prisma.WidgetUncheckedUpdateInput,
    ) => Promise<WidgetRecord>;
  }) {
    const requestedWallSlug = this.requestedWallSlug(body);
    const explicitWallSlug = requestedWallSlug !== undefined;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      let resolvedKind: WidgetType | null = null;

      try {
        return await this.prisma.client.$transaction(async (tx) => {
          await this.primaryWallService.lockProject(tx, projectId);
          const authoritativeExisting = existing
            ? await tx.widget.findFirst({
                where: { id: existing.id, projectId },
                select: WIDGET_SELECT,
              })
            : null;
          if (existing && !authoritativeExisting) {
            throw new NotFoundException("Widget not found");
          }
          resolvedKind = this.resolveKind(
            this.requestedKind(body),
            authoritativeExisting?.kind,
          );
          const wallSlug = this.resolveWallSlug({
            resolvedKind,
            requestedWallSlug,
            generatedWallSlug:
              resolvedKind === WidgetType.WALL_OF_LOVE
                ? this.buildGeneratedWallSlug(body, authoritativeExisting)
                : null,
            existing: authoritativeExisting,
            attempt,
          });
          const result = await write(
            tx,
            this.buildWidgetWriteData({
              body,
              projectId,
              existing: authoritativeExisting,
              resolvedKind,
              wallSlug,
            }),
          );
          await this.primaryWallService.maintainPrimaryWall(tx, projectId);
          return {
            widget: await tx.widget.findUniqueOrThrow({
              where: { id: result.id },
              select: WIDGET_SELECT,
            }),
            previousWallSlug: authoritativeExisting?.wallSlug ?? null,
          };
        });
      } catch (error: unknown) {
        if (!this.isWallSlugUniqueViolation(error)) {
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
          : projectFlatWidgetToV2(
              this.legacyRawForWrite({
                body,
                existing,
                resolvedKind,
                wallSlug,
              }),
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
    const needsWallConfig = kind === "wall";
    const existingDefinition = existing
      ? this.definitionFromWidget(existing)
      : null;
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
      snapshot.derivedTheme.schemes.light ?? snapshot.derivedTheme.schemes.dark;
    if (!scheme) {
      throw new InternalServerErrorException(
        "Widget theme snapshot did not include a renderable color scheme",
      );
    }

    const manifest = resolveWidgetTemplateManifest(definition.templateId);
    const recipe = applyThemeTuning(
      manifest.themeInputs(
        definition.brand.color,
        definition.brand.appearance,
        normalizeWidgetAccents(manifest, definition.accents),
      ),
      definition.tuning,
    );

    return {
      kind: this.mapDocKind(definition.kind),
      layout: this.mapTemplateToLayout(manifest.id),
      theme: this.mapAppearance(definition.brand.appearance),
      preset: "parametric",
      accent: definition.brand.color,
      text: scheme.text,
      bg: scheme.background,
      line: scheme.border,
      surface: scheme.surface,
      radius: Math.round(scheme.radius),
      fontFamily: scheme.fontFamily,
      fontHead: scheme.fontFamily,
      cardStyle: this.mapSurfaceStyle(recipe.surfaceStyle),
      density: this.mapBrandDensity(recipe.density),
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
    return projectFlatWidgetToV2(this.legacyRawFromWidget(widget));
  }

  private snapshotFromWidget(
    widget: WidgetRecord,
    definition: WidgetDefinitionDoc,
  ): WidgetPublishedSnapshot | null {
    const raw = "publishedSnapshot" in widget ? widget.publishedSnapshot : null;
    if (!raw) {
      return publishWidgetDefinition(definition);
    }
    // Stored snapshots outlive contract versions (a v1-era snapshot fails the
    // widgets-v2 literal). The definition always migrates forward, so an
    // unparseable snapshot falls forward to a fresh publish instead of a 500.
    const parsed = widgetPublishedSnapshotSchema.safeParse(raw);
    return parsed.success ? parsed.data : publishWidgetDefinition(definition);
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

  private mapAppearance(appearance: "light" | "dark" | "system") {
    if (appearance === "dark") return ThemeMode.DARK;
    if (appearance === "system") return ThemeMode.AUTO;
    return ThemeMode.LIGHT;
  }

  private mapSurfaceStyle(surfaceStyle: "flat" | "bordered" | "elevated") {
    if (surfaceStyle === "flat") return CardStyle.FLAT;
    if (surfaceStyle === "elevated") return CardStyle.ELEVATED;
    return CardStyle.BORDERED;
  }

  private mapBrandDensity(density: "compact" | "cozy" | "spacious") {
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

  /** DB `LayoutType` is a query mirror; templates map onto their nearest shape. */
  private mapTemplateToLayout(templateId: string) {
    const mapping: Record<string, LayoutType> = {
      marquee: LayoutType.CAROUSEL,
      gallery: LayoutType.GRID,
      mosaic: LayoutType.MASONRY,
      column: LayoutType.LIST,
      editorial: LayoutType.WALL,
    };
    return mapping[templateId] ?? LayoutType.CAROUSEL;
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

  private getWallCacheKey(hostname: string, projectId: string, wallSlug: string) {
    return `v2:walls:public:${hostname}:${projectId}:${wallSlug}`;
  }

  private getLegacyWallCacheKey(wallSlug: string) {
    return `v2:walls:legacy:${wallSlug}`;
  }

  private async evictInvalidWallCache(cacheKey: string) {
    try {
      await this.redisService.redis.del(cacheKey);
    } catch {
      // Cache recovery is best effort; the authoritative read must still run.
    }
  }

  private async getLegacyWallIdentity(wallSlug: string) {
    const widget = await this.prisma.client.widget.findFirst({
      where: {
        wallSlug,
        kind: WidgetType.WALL_OF_LOVE,
        isActive: true,
        AND: [
          { publishedSnapshot: { not: Prisma.DbNull } },
          { publishedSnapshot: { not: Prisma.JsonNull } },
        ],
      },
      select: { id: true, projectId: true },
    });
    return widget;
  }

  private async bustPublicCache(
    widgetId: string,
    projectId: string,
    ...wallSlugs: Array<string | null | undefined>
  ) {
    const keys = new Set<string>([this.getEmbedCacheKey(widgetId)]);
    const currentWalls =
      (await this.prisma.client.widget.findMany({
      where: {
        projectId,
        kind: WidgetType.WALL_OF_LOVE,
        wallSlug: { not: null },
      },
        select: { wallSlug: true },
      })) ?? [];
    const hosts = await this.prisma.client.publicSurfaceHost.findMany({
      where: {
        projectId,
        feature: PublicSurfaceFeature.WALL,
        status: "ACTIVE",
        verifiedAt: { not: null },
        retiredAt: null,
      },
      select: { hostname: true },
    });
    const allWallSlugs = new Set<string>([
      ...wallSlugs.filter((wallSlug): wallSlug is string => Boolean(wallSlug)),
      ...currentWalls.flatMap((wall) => (wall.wallSlug ? [wall.wallSlug] : [])),
    ]);
    for (const wallSlug of allWallSlugs) {
      if (wallSlug) {
        keys.add(this.getLegacyWallCacheKey(wallSlug));
        for (const host of hosts) {
          keys.add(this.getWallCacheKey(host.hostname, projectId, wallSlug));
        }
      }
    }

    await this.redisService.redis.del(...keys);
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private async getDefaultWallHostname(
    projectId: string,
  ): Promise<string | null> {
    const hosts = await this.prisma.client.publicSurfaceHost.findMany({
      where: {
        projectId,
        feature: "WALL",
        resourceType: "PROJECT",
        resourceId: projectId,
        isDefault: true,
        status: "ACTIVE",
        verifiedAt: { not: null },
        retiredAt: null,
      },
      select: { hostname: true },
    });
    return hosts.length === 1 ? (hosts[0]?.hostname ?? null) : null;
  }

  private getPublicWallUrl(
    widget: WidgetRecord,
    hostname: string | null,
  ): string | null {
    if (!hostname || !isEligiblePrimaryWall(widget)) return null;
    const origin = `https://${hostname}`;
    return widget.isPrimaryWall === true
      ? `${origin}/`
      : `${origin}/w/${widget.wallSlug}`;
  }

  private isWallSlugUniqueViolation(
    error: unknown,
  ): error is { code: string; meta?: { target?: unknown } } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002" &&
      "meta" in error &&
      typeof error.meta === "object" &&
      error.meta !== null &&
      "target" in error.meta &&
      this.isWallSlugTarget(error.meta.target)
    );
  }

  private isWallSlugTarget(target: unknown): boolean {
    if (Array.isArray(target)) {
      return target.some((entry) => this.isWallSlugTarget(entry));
    }
    return typeof target === "string" && /wall[_\s-]?slug/i.test(target);
  }
}
