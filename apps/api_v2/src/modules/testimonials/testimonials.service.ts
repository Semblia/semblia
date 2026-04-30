import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ModerationStatus,
  Prisma,
  TestimonialType,
} from "@workspace/database/prisma";
import { paginate } from "../../common/utils/paginate.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import type {
  CreatePublicTestimonialBodyDto,
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
  authorAvatar: true,
  content: true,
  type: true,
  videoUrl: true,
  mediaUrl: true,
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
} satisfies Prisma.TestimonialSelect;

const PUBLIC_TESTIMONIAL_SELECT = {
  id: true,
  projectId: true,
  authorName: true,
  authorRole: true,
  authorCompany: true,
  authorAvatar: true,
  content: true,
  type: true,
  videoUrl: true,
  mediaUrl: true,
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

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger(TestimonialsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(PublicSubmitTrustService)
    private readonly publicSubmitTrustService: PublicSubmitTrustService,
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
    return this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      this.getProjectIdFromRequest(request),
    );
  }

  async approve(params: TestimonialParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );

    const updated = await this.prisma.client.testimonial.update({
      where: { id: testimonial.id },
      data: {
        moderationStatus: ModerationStatus.APPROVED,
        isApproved: true,
      },
      select: AUTHENTICATED_TESTIMONIAL_SELECT,
    });

    await this.bustPublicCache(params.slug);
    return this.toAuthenticatedDto(updated);
  }

  async reject(params: TestimonialParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );

    const updated = await this.prisma.client.testimonial.update({
      where: { id: testimonial.id },
      data: {
        moderationStatus: ModerationStatus.REJECTED,
        isApproved: false,
        isPublished: false,
      },
      select: AUTHENTICATED_TESTIMONIAL_SELECT,
    });

    await this.bustPublicCache(params.slug);
    return this.toAuthenticatedDto(updated);
  }

  async publish(
    params: TestimonialParamsDto,
    body: PublishTestimonialBodyDto,
    request: ProjectRequest,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const testimonial = await this.getOwnedTestimonialOrThrow(
      params.testimonialId,
      projectId,
    );

    const updated = await this.prisma.client.testimonial.update({
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

    await this.bustPublicCache(params.slug);
    return this.toAuthenticatedDto(updated);
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

    const created = await this.prisma.client.testimonial.create({
      data: {
        projectId: trust.projectId,
        authorName: body.authorName,
        authorEmail: body.authorEmail ?? null,
        authorRole: body.authorRole ?? null,
        authorCompany: body.authorCompany ?? null,
        authorAvatar: body.authorAvatar ?? null,
        content: body.content,
        type: body.type ?? TestimonialType.TEXT,
        videoUrl: body.videoUrl ?? null,
        mediaUrl: body.mediaUrl ?? null,
        source: body.source ?? null,
        sourceUrl: body.sourceUrl ?? null,
        rating: body.rating ?? null,
        isPublished: false,
        isApproved,
        isOAuthVerified: body.isOAuthVerified ?? false,
        oauthProvider: body.oauthProvider ?? null,
        moderationStatus,
        autoPublished,
        ipAddress: this.publicSubmitTrustService.getClientIp(request),
        userAgent: this.readHeader(request, "user-agent") ?? null,
      },
      select: AUTHENTICATED_TESTIMONIAL_SELECT,
    });

    const response = this.toAuthenticatedDto(created);

    if (idempotencyKey) {
      await this.prisma.client.publicSubmitIdempotency.update({
        where: {
          projectId_idempotencyKey: {
            projectId: trust.projectId,
            idempotencyKey,
          },
        },
        data: {
          responseStatusCode: 201,
          responseBody: response,
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

    return this.toAuthenticatedDto(testimonial);
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
          where: {
            projectId_idempotencyKey: {
              projectId,
              idempotencyKey,
            },
          },
        });

      if (!existing) {
        throw new InternalServerErrorException(
          "Public submit idempotency ledger is missing after collision",
        );
      }

      if (existing.payloadHash !== payloadHash) {
        throw new ConflictException(
          "Idempotency key reused with a different payload",
        );
      }

      return existing.responseBody;
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
    return {
      ...testimonial,
      tags: [],
    };
  }

  private toPublicDto(testimonial: PublicTestimonialRecord) {
    return {
      id: testimonial.id,
      projectId: testimonial.projectId,
      authorName: testimonial.authorName,
      authorRole: testimonial.authorRole,
      authorCompany: testimonial.authorCompany,
      authorAvatar: testimonial.authorAvatar,
      content: testimonial.content,
      type: testimonial.type,
      videoUrl: testimonial.videoUrl,
      mediaUrl: testimonial.mediaUrl,
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

  private isPrismaUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
