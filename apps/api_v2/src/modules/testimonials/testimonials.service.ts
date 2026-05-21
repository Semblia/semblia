import {
  Inject,
  Injectable,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DisplayRevisionStatus,
  MediaAssetPurpose,
  MediaAssetStatus,
  ModerationStatus,
  Prisma,
  PublicSubmitSurface,
  TestimonialType,
} from "@workspace/database/prisma";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { paginate } from "../../common/utils/paginate.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { MediaService } from "../storage/media.service.js";
import { TestimonialPrivateMetadataService } from "./testimonial-private-metadata.service.js";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import {
  publicSubmitIdempotencyWhere,
  replayCompletedPublicSubmit,
} from "./public-submit-idempotency.js";
import type {
  CreateDisplaySuggestionBodyDto,
  CreatePublicTestimonialBodyDto,
  DisplayRevisionDecisionBodyDto,
  DisplayRevisionParamsDto,
  PublicProjectSlugParamsDto,
  PublicTestimonialsListQueryDto,
  PublishTestimonialBodyDto,
  TestimonialParamsDto,
  TestimonialsListQueryDto,
} from "./testimonials.dto.js";
import { hashIdempotencyPayload } from "./testimonials.dto.js";

const AUTHENTICATED_TESTIMONIAL_SELECT = {
  id: true,
  projectId: true,
  userId: true,
  authorName: true,
  authorEmail: true,
  authorRole: true,
  authorCompany: true,
  authorAvatarAssetId: true,
  authorAvatarAsset: true,
  content: true,
  type: true,
  videoAssetId: true,
  videoAsset: true,
  mediaAssetId: true,
  mediaAsset: true,
  source: true,
  sourceUrl: true,
  isPublished: true,
  rating: true,
  isApproved: true,
  isOAuthVerified: true,
  oauthProvider: true,
  moderationStatus: true,
  moderationScore: true,
  moderationFlags: true,
  autoPublished: true,
  createdAt: true,
  updatedAt: true,
  privateMetadata: {
    select: {
      authorEmailEncrypted: true,
    },
  },
  submission: {
    select: {
      id: true,
    },
  },
} satisfies Prisma.TestimonialSelect;

const DISPLAY_REVISION_SELECT = {
  id: true,
  testimonialId: true,
  projectId: true,
  suggestedByActorType: true,
  suggestedByActorId: true,
  status: true,
  headline: true,
  displayText: true,
  reason: true,
  approvedByUserId: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TestimonialDisplayRevisionSelect;

const PUBLIC_TESTIMONIAL_SELECT = {
  id: true,
  projectId: true,
  authorName: true,
  authorRole: true,
  authorCompany: true,
  authorAvatarAssetId: true,
  authorAvatarAsset: true,
  content: true,
  type: true,
  videoAssetId: true,
  videoAsset: true,
  mediaAssetId: true,
  mediaAsset: true,
  source: true,
  sourceUrl: true,
  rating: true,
  isPublished: true,
  isOAuthVerified: true,
  oauthProvider: true,
  createdAt: true,
} satisfies Prisma.TestimonialSelect;

type ProjectRequest = { projectAccess?: { projectId: string } };

type PublicSubmitRequest = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

type AuthenticatedTestimonialRecord = Prisma.TestimonialGetPayload<{
  select: typeof AUTHENTICATED_TESTIMONIAL_SELECT;
}>;

type PublicTestimonialRecord = Prisma.TestimonialGetPayload<{
  select: typeof PUBLIC_TESTIMONIAL_SELECT;
}>;

type DisplayRevisionRecord = Prisma.TestimonialDisplayRevisionGetPayload<{
  select: typeof DISPLAY_REVISION_SELECT;
}>;

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger(TestimonialsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(PublicSubmitTrustService)
    private readonly publicSubmitTrustService: PublicSubmitTrustService,
    @Inject(TestimonialPrivateMetadataService)
    private readonly privateMetadataService: TestimonialPrivateMetadataService,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Inject(MediaService)
    private readonly mediaService?: MediaService,
  ) {}

  async list(query: TestimonialsListQueryDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const where = this.buildAuthenticatedWhere(projectId, query);
    const skip = (query.page - 1) * query.pageSize;

    const [total, items] = await Promise.all([
      this.prisma.client.testimonial.count({ where }),
      this.prisma.client.testimonial.findMany({
        where,
        orderBy: this.buildAuthenticatedOrderBy(query.sort),
        skip,
        take: query.pageSize,
        select: AUTHENTICATED_TESTIMONIAL_SELECT,
      }),
    ]);

    return paginate({
      data: items.map((item) => this.toAuthenticatedDto(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async getById(params: TestimonialParamsDto, request: ProjectRequest) {
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      this.getProjectIdFromRequest(request),
    );

    return this.toAuthenticatedDto(testimonial);
  }

  async approve(
    params: TestimonialParamsDto,
    request: ProjectRequest,
    actor: ActorContext | null = null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const approved = await tx.testimonial.update({
        where: { id: testimonial.id },
        data: {
          moderationStatus: ModerationStatus.APPROVED,
          isApproved: true,
        },
        select: AUTHENTICATED_TESTIMONIAL_SELECT,
      });

      if (testimonial.submission?.id) {
        await tx.collectionFormSubmission.update({
          where: { id: testimonial.submission.id },
          data: {
            moderationStatus: ModerationStatus.APPROVED,
            moderationReason: null,
            moderatedByActorType: actor?.actorType ?? "system",
            moderatedByActorId: this.displayActorId(actor),
            moderatedAt: new Date(),
          },
        });
      }

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "testimonial.approved",
        targetType: "testimonial",
        targetId: testimonial.id,
      });

      return approved;
    });

    await this.bustPublicCache(params.slug);
    return this.toAuthenticatedDto(updated);
  }

  async reject(
    params: TestimonialParamsDto,
    request: ProjectRequest,
    actor: ActorContext | null = null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const rejected = await tx.testimonial.update({
        where: { id: testimonial.id },
        data: {
          moderationStatus: ModerationStatus.REJECTED,
          isApproved: false,
          isPublished: false,
        },
        select: AUTHENTICATED_TESTIMONIAL_SELECT,
      });

      if (testimonial.submission?.id) {
        await tx.collectionFormSubmission.update({
          where: { id: testimonial.submission.id },
          data: {
            moderationStatus: ModerationStatus.REJECTED,
            moderatedByActorType: actor?.actorType ?? "system",
            moderatedByActorId: this.displayActorId(actor),
            moderatedAt: new Date(),
          },
        });
      }

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "testimonial.rejected",
        targetType: "testimonial",
        targetId: testimonial.id,
      });

      return rejected;
    });

    await this.bustPublicCache(params.slug);
    return this.toAuthenticatedDto(updated);
  }

  async publish(
    params: TestimonialParamsDto,
    body: PublishTestimonialBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null = null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const published = await tx.testimonial.update({
        where: { id: testimonial.id },
        data: body.published
          ? {
              isPublished: true,
              moderationStatus: ModerationStatus.APPROVED,
              isApproved: true,
            }
          : {
              isPublished: false,
            },
        select: AUTHENTICATED_TESTIMONIAL_SELECT,
      });

      if (body.published && testimonial.submission?.id) {
        await tx.collectionFormSubmission.update({
          where: { id: testimonial.submission.id },
          data: {
            moderationStatus: ModerationStatus.APPROVED,
            moderationReason: null,
            moderatedByActorType: actor?.actorType ?? "system",
            moderatedByActorId: this.displayActorId(actor),
            moderatedAt: new Date(),
          },
        });
      }

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: body.published
          ? "testimonial.published"
          : "testimonial.unpublished",
        targetType: "testimonial",
        targetId: testimonial.id,
      });

      return published;
    });

    await this.bustPublicCache(params.slug);
    return this.toAuthenticatedDto(updated);
  }

  async createDisplaySuggestion(
    params: TestimonialParamsDto,
    body: CreateDisplaySuggestionBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );

    const created = await this.prisma.client.$transaction(async (tx) => {
      const revision = await tx.testimonialDisplayRevision.create({
        data: {
          projectId,
          testimonialId: testimonial.id,
          suggestedByActorType: actor?.actorType ?? "system",
          suggestedByActorId: this.displayActorId(actor),
          headline: body.headline ?? null,
          displayText: body.displayText,
          reason: body.reason ?? null,
        },
        select: DISPLAY_REVISION_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "testimonial.display_suggested",
        targetType: "testimonial_display_revision",
        targetId: revision.id,
        metadata: {
          testimonialId: testimonial.id,
        },
      });

      return revision;
    });

    return this.toDisplayRevisionDto(created);
  }

  async approveDisplaySuggestion(
    params: DisplayRevisionParamsDto,
    body: DisplayRevisionDecisionBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    if (actor?.actorType !== "user" || !actor.userId) {
      throw new ForbiddenException(
        "Only a user session can approve display suggestions",
      );
    }

    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );
    const revision = await this.getOwnedDisplayRevisionOrThrow(
      params.revisionId,
      testimonial.id,
      projectId,
    );
    this.assertSuggestedRevision(revision);

    const approved = await this.prisma.client.$transaction(async (tx) => {
      const updatedRevision = await tx.testimonialDisplayRevision.update({
        where: { id: revision.id },
        data: {
          status: DisplayRevisionStatus.APPROVED,
          approvedByUserId: actor.userId,
          approvedAt: new Date(),
          reason: body.reason ?? revision.reason,
        },
        select: DISPLAY_REVISION_SELECT,
      });

      await tx.testimonial.update({
        where: { id: testimonial.id },
        data: {
          content: revision.displayText,
        },
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "testimonial.display_approved",
        targetType: "testimonial_display_revision",
        targetId: revision.id,
        metadata: {
          testimonialId: testimonial.id,
        },
      });

      return updatedRevision;
    });

    await this.bustPublicCache(params.slug);
    return this.toDisplayRevisionDto(approved);
  }

  async rejectDisplaySuggestion(
    params: DisplayRevisionParamsDto,
    body: DisplayRevisionDecisionBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );
    const revision = await this.getOwnedDisplayRevisionOrThrow(
      params.revisionId,
      testimonial.id,
      projectId,
    );
    this.assertSuggestedRevision(revision);

    const rejected = await this.prisma.client.$transaction(async (tx) => {
      const updatedRevision = await tx.testimonialDisplayRevision.update({
        where: { id: revision.id },
        data: {
          status: DisplayRevisionStatus.REJECTED,
          reason: body.reason ?? revision.reason,
        },
        select: DISPLAY_REVISION_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "testimonial.display_rejected",
        targetType: "testimonial_display_revision",
        targetId: revision.id,
        metadata: {
          testimonialId: testimonial.id,
        },
      });

      return updatedRevision;
    });

    return this.toDisplayRevisionDto(rejected);
  }

  async createPublic(
    params: PublicProjectSlugParamsDto,
    body: CreatePublicTestimonialBodyDto,
    request: PublicSubmitRequest,
  ) {
    const trust = await this.publicSubmitTrustService.evaluate(
      request,
      params.slug,
    );
    const project = await this.prisma.client.project.findUnique({
      where: { id: trust.projectId },
      select: {
        id: true,
        autoModeration: true,
        autoApproveVerified: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const idempotencyKey = this.readHeader(request, "idempotency-key");
    const rawBody = request.rawBody;
    const payloadHash = hashIdempotencyPayload(rawBody);

    if (idempotencyKey) {
      const replay = await this.tryReplayIdempotentSubmit(
        trust.projectId,
        idempotencyKey,
        payloadHash,
      );
      if (replay) {
        return replay;
      }
    }

    let moderationStatus: ModerationStatus = ModerationStatus.PENDING;
    let isApproved = false;
    let autoPublished = false;

    if (project.autoModeration) {
      if (trust.trust === "hmac") {
        moderationStatus = ModerationStatus.APPROVED;
        isApproved = true;
        autoPublished = true;
      } else if (
        trust.trust === "origin" &&
        project.autoApproveVerified &&
        body.isOAuthVerified === true
      ) {
        moderationStatus = ModerationStatus.APPROVED;
        isApproved = true;
        autoPublished = true;
      }
    }

    const clientIp = this.publicSubmitTrustService.getClientIp(request);
    const userAgent = this.readHeader(request, "user-agent") ?? null;
    await this.assertPublicMediaAssets({
      projectId: trust.projectId,
      principal: trust.principal,
      authorAvatarAssetId: body.authorAvatarAssetId,
      videoAssetId: body.videoAssetId,
      mediaAssetId: body.mediaAssetId,
    });

    const created = await this.prisma.client.$transaction(async (tx) => {
      await this.mediaService?.activatePublicSubmitAssets({
        tx,
        projectId: trust.projectId,
        principal: trust.principal,
        assetIds: [
          body.authorAvatarAssetId,
          body.videoAssetId,
          body.mediaAssetId,
        ],
      });
      const testimonial = await tx.testimonial.create({
        data: {
          projectId: trust.projectId,
          authorName: body.authorName,
          authorEmail: null,
          authorRole: body.authorRole ?? null,
          authorCompany: body.authorCompany ?? null,
          authorAvatarAssetId: body.authorAvatarAssetId ?? null,
          content: body.content,
          type: body.type ?? TestimonialType.TEXT,
          videoAssetId: body.videoAssetId ?? null,
          mediaAssetId: body.mediaAssetId ?? null,
          source: body.source ?? null,
          sourceUrl: body.sourceUrl ?? null,
          rating: body.rating ?? null,
          isPublished: false,
          isApproved,
          isOAuthVerified: body.isOAuthVerified ?? false,
          oauthProvider: body.oauthProvider ?? null,
          moderationStatus,
          autoPublished,
          ipAddress: null,
          userAgent: null,
        },
        select: AUTHENTICATED_TESTIMONIAL_SELECT,
      });

      await this.privateMetadataService.createForPublicSubmit(tx, {
        testimonialId: testimonial.id,
        authorEmail: body.authorEmail,
        ipAddress: clientIp,
        userAgent,
        consentSnapshot: this.toPublicSubmitConsentSnapshot(body),
      });

      return testimonial;
    });

    const response = this.toPublicSubmitDto(created);

    if (idempotencyKey) {
      await this.prisma.client.publicSubmitIdempotency.update({
        where: publicSubmitIdempotencyWhere(
          trust.projectId,
          PublicSubmitSurface.TESTIMONIALS,
          idempotencyKey,
        ),
        data: {
          responseStatusCode: 201,
          responseBody: response as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return response;
  }

  async listPublic(
    params: PublicProjectSlugParamsDto,
    query: PublicTestimonialsListQueryDto,
  ) {
    const cacheKey = `v2:testimonials:public:${params.slug}:${query.page}:${query.pageSize}`;
    const cached = await this.redisService.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ReturnType<typeof paginate>;
    }

    const project = await this.prisma.client.project.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const where: Prisma.TestimonialWhereInput = {
      projectId: project.id,
      moderationStatus: ModerationStatus.APPROVED,
      isApproved: true,
      isPublished: true,
    };
    const skip = (query.page - 1) * query.pageSize;

    const [total, items] = await Promise.all([
      this.prisma.client.testimonial.count({ where }),
      this.prisma.client.testimonial.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: PUBLIC_TESTIMONIAL_SELECT,
      }),
    ]);

    const response = paginate({
      data: items.map((item) => this.toPublicDto(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });

    await this.redisService.redis.set(
      cacheKey,
      JSON.stringify(response),
      "EX",
      60,
    );
    return response;
  }

  private async getOwnedTestimonialOrThrow(
    testimonialId: string,
    projectId: string,
  ) {
    const testimonial = await this.prisma.client.testimonial.findFirst({
      where: { id: testimonialId, projectId },
      select: AUTHENTICATED_TESTIMONIAL_SELECT,
    });

    if (!testimonial) {
      throw new NotFoundException("Testimonial not found");
    }

    return testimonial;
  }

  private async getOwnedDisplayRevisionOrThrow(
    revisionId: string,
    testimonialId: string,
    projectId: string,
  ) {
    const revision =
      await this.prisma.client.testimonialDisplayRevision.findFirst({
        where: {
          id: revisionId,
          testimonialId,
          projectId,
        },
        select: DISPLAY_REVISION_SELECT,
      });

    if (!revision) {
      throw new NotFoundException("Display suggestion not found");
    }

    return revision;
  }

  private buildAuthenticatedWhere(
    projectId: string,
    query: TestimonialsListQueryDto,
  ): Prisma.TestimonialWhereInput {
    const where: Prisma.TestimonialWhereInput = { projectId };

    if (query.status !== "ALL") {
      where.moderationStatus = query.status;
    }

    if (query.type !== "ALL") {
      where.type = query.type;
    }

    if (query.search?.trim()) {
      const contains = query.search.trim();
      where.OR = [
        { authorName: { contains, mode: "insensitive" } },
        { content: { contains, mode: "insensitive" } },
        { authorRole: { contains, mode: "insensitive" } },
        { authorCompany: { contains, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private buildAuthenticatedOrderBy(sort: TestimonialsListQueryDto["sort"]) {
    switch (sort) {
      case "oldest":
        return {
          createdAt: "asc",
        } satisfies Prisma.TestimonialOrderByWithRelationInput;
      case "rating_desc":
        return [
          { rating: "desc" },
          { createdAt: "desc" },
        ] satisfies Prisma.TestimonialOrderByWithRelationInput[];
      case "rating_asc":
        return [
          { rating: "asc" },
          { createdAt: "desc" },
        ] satisfies Prisma.TestimonialOrderByWithRelationInput[];
      case "newest":
      default:
        return {
          createdAt: "desc",
        } satisfies Prisma.TestimonialOrderByWithRelationInput;
    }
  }

  private async tryReplayIdempotentSubmit(
    projectId: string,
    idempotencyKey: string,
    payloadHash: string,
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      await this.prisma.client.publicSubmitIdempotency.create({
        data: {
          projectId,
          surface: PublicSubmitSurface.TESTIMONIALS,
          idempotencyKey,
          payloadHash,
          responseStatusCode: 201,
          responseBody: {},
          expiresAt,
        },
      });
      return null;
    } catch (error: unknown) {
      if (!this.isPrismaUniqueViolation(error)) {
        throw error;
      }

      const existing =
        await this.prisma.client.publicSubmitIdempotency.findUnique({
          where: publicSubmitIdempotencyWhere(
            projectId,
            PublicSubmitSurface.TESTIMONIALS,
            idempotencyKey,
          ),
        });

      if (!existing) {
        throw new InternalServerErrorException(
          "Public submit idempotency ledger is missing after collision",
        );
      }

      return replayCompletedPublicSubmit(existing, payloadHash);
    }
  }

  private async bustPublicCache(slug: string) {
    let cursor = "0";

    try {
      do {
        const [nextCursor, keys] = await this.redisService.redis.scan(
          cursor,
          "MATCH",
          `v2:testimonials:public:${slug}:*`,
          "COUNT",
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redisService.redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      this.logger.warn(
        `Failed to bust public testimonial cache for slug ${slug}: ${String(error)}`,
      );
    }
  }

  private getProjectIdFromRequest(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "TestimonialsService requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }

  private toAuthenticatedDto(testimonial: AuthenticatedTestimonialRecord) {
    const {
      privateMetadata,
      submission: _submission,
      authorAvatarAsset,
      videoAsset,
      mediaAsset,
      ...dto
    } = testimonial;
    void _submission;

    return {
      ...dto,
      authorAvatar: this.mediaDto(authorAvatarAsset),
      video: this.mediaDto(videoAsset),
      media: this.mediaDto(mediaAsset),
      authorEmail:
        dto.authorEmail ??
        this.privateMetadataService.decryptAuthorEmail(privateMetadata),
      tags: [],
    };
  }

  private toPublicSubmitDto(testimonial: AuthenticatedTestimonialRecord) {
    const {
      authorEmail: _authorEmail,
      privateMetadata: _metadata,
      submission: _submission,
      authorAvatarAsset,
      videoAsset,
      mediaAsset,
      ...safe
    } = testimonial;
    void _authorEmail;
    void _metadata;
    void _submission;

    return {
      ...safe,
      authorAvatar: this.mediaDto(authorAvatarAsset),
      video: this.mediaDto(videoAsset),
      media: this.mediaDto(mediaAsset),
      tags: [],
    };
  }

  private toDisplayRevisionDto(revision: DisplayRevisionRecord) {
    return revision;
  }

  private mediaDto(asset: Parameters<MediaService["toDto"]>[0]) {
    return this.mediaService?.toDto(asset) ?? null;
  }

  private async assertPublicMediaAssets(input: {
    projectId: string;
    principal: string;
    authorAvatarAssetId?: string | null;
    videoAssetId?: string | null;
    mediaAssetId?: string | null;
  }) {
    await this.assertPublicMediaAsset(
      input.authorAvatarAssetId,
      MediaAssetPurpose.TESTIMONIAL_AUTHOR_AVATAR,
      input,
    );
    await this.assertPublicMediaAsset(
      input.videoAssetId,
      MediaAssetPurpose.TESTIMONIAL_VIDEO,
      input,
    );
    await this.assertPublicMediaAsset(
      input.mediaAssetId,
      MediaAssetPurpose.TESTIMONIAL_MEDIA,
      input,
    );
  }

  private async assertPublicMediaAsset(
    assetId: string | null | undefined,
    purpose: MediaAssetPurpose,
    input: { projectId: string; principal: string },
  ) {
    if (!assetId) return;
    const asset = await this.prisma.client.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (
      !asset ||
      asset.projectId !== input.projectId ||
      asset.purpose !== purpose ||
      asset.createdByActorType !== "public" ||
      asset.createdByActorId !== input.principal ||
      Date.now() - asset.createdAt.getTime() > 30 * 60 * 1000 ||
      !([MediaAssetStatus.PENDING, MediaAssetStatus.ACTIVE] as MediaAssetStatus[]).includes(
        asset.status,
      )
    ) {
      throw new ForbiddenException("Invalid testimonial media asset");
    }
  }

  private assertSuggestedRevision(revision: DisplayRevisionRecord) {
    if (revision.status !== DisplayRevisionStatus.SUGGESTED) {
      throw new ConflictException(
        "Display suggestion has already been decided",
      );
    }
  }

  private displayActorId(actor: ActorContext | null | undefined) {
    return actor?.credentialId ?? actor?.userId ?? null;
  }

  private toPublicDto(testimonial: PublicTestimonialRecord) {
    return {
      id: testimonial.id,
      projectId: testimonial.projectId,
      authorName: testimonial.authorName,
      authorRole: testimonial.authorRole,
      authorCompany: testimonial.authorCompany,
      authorAvatar: this.mediaDto(testimonial.authorAvatarAsset),
      content: testimonial.content,
      type: testimonial.type,
      video: this.mediaDto(testimonial.videoAsset),
      media: this.mediaDto(testimonial.mediaAsset),
      source: testimonial.source,
      sourceUrl: testimonial.sourceUrl,
      rating: testimonial.rating,
      isPublished: testimonial.isPublished,
      isOAuthVerified: testimonial.isOAuthVerified,
      oauthProvider: testimonial.oauthProvider,
      createdAt: testimonial.createdAt,
    };
  }

  private readHeader(
    request: PublicSubmitRequest,
    name: string,
  ): string | undefined {
    const value = request.headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private toPublicSubmitConsentSnapshot(body: CreatePublicTestimonialBodyDto) {
    return {
      isOAuthVerified: body.isOAuthVerified ?? false,
      oauthProvider: body.oauthProvider ?? null,
    };
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
