import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ModerationStatus,
  Prisma,
  PublicSubmitSurface,
  PublicSubmitTrustMode,
  StudioDraftResourceType,
  TestimonialType,
} from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { StudioDraftsService } from "../studio-drafts/studio-drafts.service.js";
import { TestimonialPrivateMetadataService } from "../testimonials/testimonial-private-metadata.service.js";
import { PublicSubmitTrustService } from "../testimonials/public-submit-trust.service.js";
import {
  publicSubmitIdempotencyWhere,
  replayCompletedPublicSubmit,
} from "../testimonials/public-submit-idempotency.js";
import { hashIdempotencyPayload } from "../testimonials/testimonials.dto.js";
import type {
  CreateFormBodyDto,
  CreateFormSubmissionBodyDto,
  FormParamsDto,
  ProjectFormsParamsDto,
  StudioDraftBodyDto,
  UpdateFormBodyDto,
} from "./forms.dto.js";

const FORM_SELECT = {
  id: true,
  projectId: true,
  name: true,
  description: true,
  isActive: true,
  abWeight: true,
  config: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CollectionFormSelect;

const TESTIMONIAL_SELECT = {
  id: true,
  projectId: true,
  userId: true,
  formId: true,
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

type ProjectRequest = { projectAccess?: { projectId: string } };

type PublicSubmitRequest = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

type FormRecord = Prisma.CollectionFormGetPayload<{
  select: typeof FORM_SELECT;
}>;

type PublicFormDto = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  abWeight: number;
  config: Prisma.JsonValue;
  createdAt: Date;
};

type PublicFormsResponse = {
  data: PublicFormDto[];
};

type TestimonialRecord = Prisma.TestimonialGetPayload<{
  select: typeof TESTIMONIAL_SELECT;
}>;

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(PublicSubmitTrustService)
    private readonly publicSubmitTrustService: PublicSubmitTrustService,
    @Inject(TestimonialPrivateMetadataService)
    private readonly privateMetadataService: TestimonialPrivateMetadataService,
    @Inject(StudioDraftsService)
    private readonly studioDraftsService: StudioDraftsService,
  ) {}

  async list(params: ProjectFormsParamsDto, request: ProjectRequest) {
    void params;

    const items = await this.prisma.client.collectionForm.findMany({
      where: { projectId: this.getProjectIdFromRequest(request) },
      orderBy: { createdAt: "asc" },
      select: FORM_SELECT,
    });

    return items.map((item) => this.toAuthenticatedFormDto(item));
  }

  async create(
    params: ProjectFormsParamsDto,
    body: CreateFormBodyDto,
    request: ProjectRequest,
  ) {
    const created = await this.prisma.client.collectionForm.create({
      data: {
        projectId: this.getProjectIdFromRequest(request),
        name: body.name,
        description: body.description,
        isActive: body.isActive,
        abWeight: body.abWeight,
        config: this.toJsonObjectInput(body.config),
      },
      select: FORM_SELECT,
    });

    await this.bustPublicFormsCache(params.slug);
    return this.toAuthenticatedFormDto(created);
  }

  async getById(params: FormParamsDto, request: ProjectRequest) {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );

    return this.toAuthenticatedFormDto(form);
  }

  async update(
    params: FormParamsDto,
    body: UpdateFormBodyDto,
    request: ProjectRequest,
  ) {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );

    const updated = await this.prisma.client.collectionForm.update({
      where: { id: form.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.abWeight !== undefined ? { abWeight: body.abWeight } : {}),
        ...(body.config !== undefined
          ? { config: this.toJsonObjectInput(body.config) }
          : {}),
      },
      select: FORM_SELECT,
    });

    await this.bustPublicFormsCache(params.slug);
    return this.toAuthenticatedFormDto(updated);
  }

  async duplicate(params: FormParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const source = await this.getOwnedFormOrThrow(params.formId, projectId);

    const created = await this.prisma.client.collectionForm.create({
      data: {
        projectId,
        name: this.toDuplicateFormName(source.name),
        description: source.description,
        isActive: false,
        abWeight: 0,
        config: this.toJsonValueInput(source.config),
      },
      select: FORM_SELECT,
    });

    await this.bustPublicFormsCache(params.slug);
    return this.toAuthenticatedFormDto(created);
  }

  async delete(params: FormParamsDto, request: ProjectRequest) {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );

    const deleted = await this.prisma.client.collectionForm.delete({
      where: { id: form.id },
      select: {
        id: true,
        projectId: true,
      },
    });

    await this.bustPublicFormsCache(params.slug);
    return deleted;
  }

  async getDraft(params: FormParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const form = await this.getOwnedFormOrThrow(params.formId, projectId);

    return this.studioDraftsService.getDraft({
      projectId,
      resourceType: StudioDraftResourceType.FORM,
      resourceId: form.id,
    });
  }

  async saveDraft(
    params: FormParamsDto,
    body: StudioDraftBodyDto,
    request: ProjectRequest,
    updatedByUserId: string,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const form = await this.getOwnedFormOrThrow(params.formId, projectId);

    return this.studioDraftsService.saveDraft({
      projectId,
      resourceType: StudioDraftResourceType.FORM,
      resourceId: form.id,
      draft: body.draft,
      expectedVersion: body.expectedVersion,
      updatedByUserId,
    });
  }

  async listPublic(params: ProjectFormsParamsDto) {
    const cacheKey = this.getPublicFormsCacheKey(params.slug);
    const cached = await this.redisService.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as PublicFormsResponse;
    }

    const project = await this.prisma.client.project.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const forms = await this.prisma.client.collectionForm.findMany({
      where: { projectId: project.id, isActive: true },
      orderBy: { createdAt: "asc" },
      select: FORM_SELECT,
    });

    const response: PublicFormsResponse = {
      data: forms.map((form) => this.toPublicFormDto(form)),
    };

    await this.redisService.redis.set(
      cacheKey,
      JSON.stringify(response),
      "EX",
      60,
    );
    return response;
  }

  async submitPublic(
    params: FormParamsDto,
    body: CreateFormSubmissionBodyDto,
    request: PublicSubmitRequest,
  ) {
    const trust = await this.publicSubmitTrustService.evaluate(
      request,
      params.slug,
    );

    const form = await this.prisma.client.collectionForm.findFirst({
      where: {
        id: params.formId,
        projectId: trust.projectId,
        isActive: true,
      },
      select: FORM_SELECT,
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    const idempotencyKey = this.readHeader(request, "idempotency-key");
    const payloadHash = hashIdempotencyPayload(request.rawBody);

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

    const { testimonial: created, submission } =
      await this.prisma.client.$transaction(async (tx) => {
        const testimonial = await tx.testimonial.create({
          data: {
            projectId: trust.projectId,
            formId: form.id,
            authorName: body.authorName,
            authorEmail: null,
            authorRole: body.authorRole ?? null,
            authorCompany: body.authorCompany ?? null,
            authorAvatar: body.authorAvatar ?? null,
            content: body.content,
            type: body.type ?? TestimonialType.TEXT,
            videoUrl: body.videoUrl ?? null,
            mediaUrl: body.mediaUrl ?? null,
            source: body.source ?? null,
            sourceUrl: body.sourceUrl ?? null,
            rating: this.toProjectedTestimonialRating(body.rating),
            isPublished: false,
            isApproved,
            isOAuthVerified: body.isOAuthVerified ?? false,
            oauthProvider: body.oauthProvider ?? null,
            moderationStatus,
            autoPublished,
            ipAddress: null,
            userAgent: null,
          },
          select: TESTIMONIAL_SELECT,
        });

        const submission = await tx.collectionFormSubmission.create({
          data: {
            projectId: trust.projectId,
            formId: form.id,
            testimonialId: testimonial.id,
            trustedOriginId: trust.trustedOriginId ?? null,
            signingSecretId: trust.signingSecretId ?? null,
            trustMode:
              trust.trust === "hmac"
                ? PublicSubmitTrustMode.HMAC
                : PublicSubmitTrustMode.ORIGIN,
            idempotencyKey: idempotencyKey ?? null,
            payloadHash,
            answers: this.toJsonObjectInput(body.answers ?? {}),
            ratingValue: body.rating ?? null,
            ratingScale: this.toSubmissionRatingScale(body.rating),
            moderationStatus,
          },
        });

        await this.privateMetadataService.createForPublicSubmit(tx, {
          testimonialId: testimonial.id,
          submissionId: submission.id,
          authorEmail: body.authorEmail,
          ipAddress: clientIp,
          userAgent,
          consentSnapshot: this.toPublicSubmitConsentSnapshot(body),
        });

        return { testimonial, submission };
      });

    const response = this.toTestimonialDto(created);

    if (idempotencyKey) {
      await this.prisma.client.publicSubmitIdempotency.update({
        where: publicSubmitIdempotencyWhere(
          trust.projectId,
          PublicSubmitSurface.FORM,
          idempotencyKey,
        ),
        data: {
          submissionId: submission.id,
          responseStatusCode: 201,
          responseBody: response,
        },
      });
    }

    await this.bustPublicTestimonialsCache(params.slug);
    return response;
  }

  private async getOwnedFormOrThrow(formId: string, projectId: string) {
    const form = await this.prisma.client.collectionForm.findFirst({
      where: { id: formId, projectId },
      select: FORM_SELECT,
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    return form;
  }

  private getProjectIdFromRequest(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "FormsService requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }

  private toAuthenticatedFormDto(form: FormRecord) {
    return {
      ...form,
      // The web client expects analytics fields, but real aggregation lands later.
      submissions: 0,
      views: 0,
      responseRate: 0,
      avgRating: 0,
      lastSubmissionAt: null,
    };
  }

  private toPublicFormDto(form: FormRecord): PublicFormDto {
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      isActive: form.isActive,
      abWeight: form.abWeight,
      config: form.config,
      createdAt: form.createdAt,
    };
  }

  private toTestimonialDto(testimonial: TestimonialRecord) {
    const { authorEmail: _authorEmail, ...safeTestimonial } = testimonial;
    void _authorEmail;

    return {
      ...safeTestimonial,
      tags: [],
    };
  }

  private toJsonObjectInput(value: Record<string, unknown>) {
    return value as Prisma.InputJsonObject;
  }

  private toJsonValueInput(value: Prisma.JsonValue) {
    return value as Prisma.InputJsonValue;
  }

  private toDuplicateFormName(name: string) {
    return `${name} (copy)`.slice(0, 255);
  }

  private toProjectedTestimonialRating(
    rating: CreateFormSubmissionBodyDto["rating"],
  ) {
    if (rating === null || rating === undefined) {
      return null;
    }

    return rating <= 5 ? rating : null;
  }

  private toSubmissionRatingScale(
    rating: CreateFormSubmissionBodyDto["rating"],
  ) {
    if (rating === null || rating === undefined) {
      return null;
    }

    return rating > 5 ? 10 : 5;
  }

  private toPublicSubmitConsentSnapshot(body: CreateFormSubmissionBodyDto) {
    return {
      isOAuthVerified: body.isOAuthVerified ?? false,
      oauthProvider: body.oauthProvider ?? null,
    };
  }

  private readHeader(request: PublicSubmitRequest, name: string) {
    const value = request.headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private async tryReplayIdempotentSubmit(
    projectId: string,
    idempotencyKey: string,
    payloadHash: string,
  ) {
    try {
      await this.prisma.client.publicSubmitIdempotency.create({
        data: {
          projectId,
          surface: PublicSubmitSurface.FORM,
          idempotencyKey,
          payloadHash,
          responseStatusCode: 201,
          responseBody: {},
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
            PublicSubmitSurface.FORM,
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

  private async bustPublicFormsCache(slug: string) {
    await this.redisService.redis.del(this.getPublicFormsCacheKey(slug));
  }

  private getPublicFormsCacheKey(slug: string) {
    return `v2:forms:public:${slug}`;
  }

  private async bustPublicTestimonialsCache(slug: string) {
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

  private isPrismaUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
