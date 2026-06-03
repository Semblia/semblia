import {
  Inject,
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  MediaAssetPurpose,
  MediaAssetStatus,
  ModerationStatus,
  Prisma,
  PublicSubmitSurface,
  PublicSubmitTrustMode,
} from "@workspace/database/prisma";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { paginate } from "../../common/utils/paginate.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { MediaService } from "../storage/media.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { SubmissionModerationService } from "../submission-moderation/submission-moderation.service.js";
import { SubmissionPrivateMetadataService } from "./submission-private-metadata.service.js";
import { PublicSubmitTrustService } from "./public-submit-trust.service.js";
import {
  publicSubmitIdempotencyWhere,
  replayCompletedPublicSubmit,
} from "./public-submit-idempotency.js";
import type {
  CreatePublicResponseBodyDto,
  CreateResponseAnnotationBodyDto,
  ModerateResponseBodyDto,
  PublicProjectSlugParamsDto,
  PublicResponsesListQueryDto,
  ResponseParamsDto,
  ResponsesListQueryDto,
} from "./responses.dto.js";
import { hashIdempotencyPayload } from "./responses.dto.js";

const DIRECT_SUBMISSION_FORM_SLUG = "direct-submissions";

const DIRECT_SUBMISSION_FORM_CONFIG: Prisma.InputJsonObject = {
  brandName: "Your brand",
  headline: "Share your experience",
  subhead: "A few words about working with us go a long way. Thank you.",
  logoUrl: null,
  questions: [
    {
      id: "content",
      type: "longtext",
      label: "Your feedback",
      placeholder: "Tell us what stood out",
      required: true,
    },
    {
      id: "authorName",
      type: "shorttext",
      label: "Your name",
      placeholder: "Jane Doe",
      required: true,
    },
    {
      id: "authorEmail",
      type: "email",
      label: "Email",
      placeholder: "jane@example.com",
      required: false,
    },
    {
      id: "rating",
      type: "stars",
      label: "Rating",
      required: false,
    },
  ],
  tokens: {
    fontHead: '"Inter", ui-sans-serif, system-ui, sans-serif',
    fontBody: '"Inter", ui-sans-serif, system-ui, sans-serif',
    fontMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
    sizeBase: 16,
    sizeHead: 30,
    trackingHead: 0,
    weightHead: 650,
    weightBody: 400,
    bg: "#f6f7f9",
    surface: "#ffffff",
    ink: "#15181d",
    inkSoft: "#5b6573",
    line: "#e3e7ec",
    accent: "#4f46e5",
    accentInk: "#ffffff",
    radius: 12,
    fieldShape: "rounded",
    density: "default",
    buttonStyle: "solid",
    shadow: "sm",
    texture: "none",
    dark: false,
  },
};

const FEEDBACK_SUBMISSION_SELECT = {
  id: true,
  projectId: true,
  formId: true,
  answers: true,
  ratingValue: true,
  ratingScale: true,
  moderationStatus: true,
  moderationReason: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  privateMetadata: {
    select: {
      authorEmailEncrypted: true,
    },
  },
  mediaAssets: true,
} satisfies Prisma.CollectionFormSubmissionSelect;

const RESPONSE_SELECT = {
  id: true,
  projectId: true,
  formId: true,
  trustMode: true,
  idempotencyKey: true,
  payloadHash: true,
  answers: true,
  ratingValue: true,
  ratingScale: true,
  moderationStatus: true,
  moderationReason: true,
  moderatedByActorType: true,
  moderatedByActorId: true,
  moderatedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  collectionForm: {
    select: {
      id: true,
      name: true,
    },
  },
  annotations: {
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      projectId: true,
      submissionId: true,
      actorType: true,
      actorId: true,
      note: true,
      labels: true,
      sentiment: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  moderationRuns: {
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      artifactType: true,
      provider: true,
      providerOperation: true,
      status: true,
      decision: true,
      score: true,
      flags: true,
      categories: true,
      errorCode: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
    },
  },
} satisfies Prisma.CollectionFormSubmissionSelect;

const ANNOTATION_SELECT = {
  id: true,
  projectId: true,
  submissionId: true,
  actorType: true,
  actorId: true,
  note: true,
  labels: true,
  sentiment: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CollectionFormSubmissionAnnotationSelect;

type ProjectRequest = { projectAccess?: { projectId: string } };

type PublicSubmitRequest = {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

type FeedbackSubmissionRecord = Prisma.CollectionFormSubmissionGetPayload<{
  select: typeof FEEDBACK_SUBMISSION_SELECT;
}>;

type ResponseRecord = Prisma.CollectionFormSubmissionGetPayload<{
  select: typeof RESPONSE_SELECT;
}>;

type AnnotationRecord = Prisma.CollectionFormSubmissionAnnotationGetPayload<{
  select: typeof ANNOTATION_SELECT;
}>;

@Injectable()
export class ResponsesService {
  private readonly logger = new Logger(ResponsesService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(PublicSubmitTrustService)
    private readonly publicSubmitTrustService: PublicSubmitTrustService,
    @Inject(SubmissionPrivateMetadataService)
    private readonly privateMetadataService: SubmissionPrivateMetadataService,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Inject(MediaService)
    private readonly mediaService?: MediaService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
    @Optional()
    @Inject(SubmissionModerationService)
    private readonly submissionModerationService?: SubmissionModerationService,
  ) {}

  async list(query: ResponsesListQueryDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const where: Prisma.CollectionFormSubmissionWhereInput = { projectId };
    if (query.status !== "ALL") {
      where.moderationStatus = query.status as ModerationStatus;
    }

    if (query.search?.trim()) {
      const contains = query.search.trim();
      where.OR = [
        { answers: { path: ["authorName"], string_contains: contains } },
        { answers: { path: ["content"], string_contains: contains } },
        { answers: { path: ["authorRole"], string_contains: contains } },
        { answers: { path: ["authorCompany"], string_contains: contains } },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [total, items] = await Promise.all([
      this.prisma.client.collectionFormSubmission.count({ where }),
      this.prisma.client.collectionFormSubmission.findMany({
        where,
        orderBy: this.buildAuthenticatedOrderBy(query.sort),
        skip,
        take: query.pageSize,
        select: RESPONSE_SELECT,
      }),
    ]);

    return paginate({
      data: items.map((item) => this.toResponseDto(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  private buildAuthenticatedOrderBy(sort: ResponsesListQueryDto["sort"]) {
    switch (sort) {
      case "oldest":
        return {
          createdAt: "asc",
        } satisfies Prisma.CollectionFormSubmissionOrderByWithRelationInput;
      case "rating_desc":
        return [
          { ratingValue: "desc" },
          { createdAt: "desc" },
        ] satisfies Prisma.CollectionFormSubmissionOrderByWithRelationInput[];
      case "rating_asc":
        return [
          { ratingValue: "asc" },
          { createdAt: "desc" },
        ] satisfies Prisma.CollectionFormSubmissionOrderByWithRelationInput[];
      case "newest":
      default:
        return {
          createdAt: "desc",
        } satisfies Prisma.CollectionFormSubmissionOrderByWithRelationInput;
    }
  }

  async getById(params: ResponseParamsDto, request: ProjectRequest) {
    const submission = await this.getOwnedResponseOrThrow(
      params.responseId,
      this.getProjectIdFromRequest(request),
    );

    return this.toResponseDto(submission);
  }

  async createAnnotation(
    params: ResponseParamsDto,
    body: CreateResponseAnnotationBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const submission = await this.getOwnedResponseOrThrow(
      params.responseId,
      projectId,
    );
    const actorId = this.displayActorId(actor);

    const created = await this.prisma.client.$transaction(async (tx) => {
      const annotation = await tx.collectionFormSubmissionAnnotation.create({
        data: {
          projectId,
          submissionId: submission.id,
          actorType: actor?.actorType ?? "system",
          actorId,
          note: body.note ?? null,
          labels: body.labels ? [...new Set(body.labels)] : [],
          sentiment: body.sentiment ?? null,
          ...(body.metadata
            ? { metadata: body.metadata as Prisma.InputJsonObject }
            : {}),
        },
        select: ANNOTATION_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "submission.annotated",
        targetType: "collection_form_submission",
        targetId: submission.id,
        metadata: {
          annotationId: annotation.id,
          labels: annotation.labels,
          sentiment: annotation.sentiment,
        },
      });

      return annotation;
    });

    return this.toAnnotationDto(created);
  }

  async moderate(
    params: ResponseParamsDto,
    body: ModerateResponseBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const submission = await this.getOwnedResponseOrThrow(
      params.responseId,
      projectId,
    );
    const now = new Date();
    const status = body.status as ModerationStatus;
    const actorId = this.displayActorId(actor);

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const moderated = await tx.collectionFormSubmission.update({
        where: { id: submission.id },
        data: {
          moderationStatus: status,
          moderationReason: body.reason ?? null,
          moderatedByActorType: actor?.actorType ?? "system",
          moderatedByActorId: actorId,
          moderatedAt: now,
        },
        select: RESPONSE_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "submission.moderated",
        targetType: "collection_form_submission",
        targetId: submission.id,
        metadata: {
          status,
          reason: body.reason ?? null,
          ...(body.metadata ? { metadata: body.metadata } : {}),
        },
      });

      const link = `/projects/${params.slug}/responses/${moderated.id}`;
      const notificationOptions = {
        excludeUserIds: actor?.userId ? [actor.userId] : [],
      };

      await this.notificationsService?.createForProjectReviewers(
        projectId,
        {
          type: "SUBMISSION_MODERATED",
          title: "Response moderated",
          message: `${moderated.collectionForm.name} was marked ${status.toLowerCase()}.`,
          link,
          metadata: {
            projectId,
            projectSlug: params.slug,
            formId: moderated.formId,
            submissionId: moderated.id,
            status,
            reason: body.reason ?? null,
            actorType: actor?.actorType ?? "system",
            actorId,
          },
        },
        notificationOptions,
        tx,
      );

      if (status === ModerationStatus.FLAGGED) {
        await this.notificationsService?.createForProjectReviewers(
          projectId,
          {
            type: "SUBMISSION_FLAGGED",
            title: "Response flagged",
            message: `${moderated.collectionForm.name} has a flagged response.`,
            link,
            metadata: {
              projectId,
              projectSlug: params.slug,
              formId: moderated.formId,
              submissionId: moderated.id,
              reason: body.reason ?? null,
              actorType: actor?.actorType ?? "system",
              actorId,
            },
          },
          notificationOptions,
          tx,
        );
      }

      return moderated;
    });

    await this.bustPublicCache(params.slug);
    return this.toResponseDto(updated);
  }

  async createPublic(
    params: PublicProjectSlugParamsDto,
    body: CreatePublicResponseBodyDto,
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

    const submission = await this.prisma.client.$transaction(async (tx) => {
      const form = await this.ensureDirectResponseForm(tx, trust.projectId);

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
      const submission = await tx.collectionFormSubmission.create({
        data: {
          projectId: trust.projectId,
          formId: form.id,
          trustedOriginId: trust.trustedOriginId ?? null,
          signingSecretId: trust.signingSecretId ?? null,
          trustMode:
            trust.trust === "hmac"
              ? PublicSubmitTrustMode.HMAC
              : PublicSubmitTrustMode.ORIGIN,
          idempotencyKey: idempotencyKey ?? null,
          payloadHash,
          answers: this.toDirectSubmissionAnswers(body),
          ratingValue: body.rating ?? null,
          ratingScale: body.rating == null ? null : 5,
          moderationStatus,
          metadata: this.toDirectSubmissionMetadata(),
        },
      });

      await this.linkDirectResponseMediaToSubmission(tx, {
        projectId: trust.projectId,
        formId: form.id,
        submissionId: submission.id,
        principal: trust.principal,
        assetIds: [
          body.authorAvatarAssetId,
          body.videoAssetId,
          body.mediaAssetId,
        ],
      });

      const day = startOfUtcDay(new Date());
      await tx.projectAnalyticsDaily.upsert({
        where: {
          projectId_day: {
            projectId: trust.projectId,
            day,
          },
        },
        create: {
          projectId: trust.projectId,
          day,
          formSubmissions: 1,
        },
        update: {
          formSubmissions: { increment: 1 },
        },
      });

      await this.privateMetadataService.createForPublicSubmit(tx, {
        submissionId: submission.id,
        authorEmail: body.authorEmail,
        ipAddress: clientIp,
        userAgent,
        consentSnapshot: this.toPublicSubmitConsentSnapshot(body),
      });

      return {
        ...submission,
        projectId: trust.projectId,
        formId: form.id,
      };
    });

    const response = this.toDirectSubmissionDto({
      submission,
      body,
      moderationStatus,
      isApproved,
      autoPublished,
    });

    if (idempotencyKey) {
      await this.prisma.client.publicSubmitIdempotency.update({
        where: publicSubmitIdempotencyWhere(
          trust.projectId,
          PublicSubmitSurface.DIRECT_SUBMISSION,
          idempotencyKey,
        ),
        data: {
          submissionId: submission.id,
          responseStatusCode: 201,
          responseBody: response as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await this.submissionModerationService?.enqueueSubmission({
      submissionId: submission.id,
    });

    await this.notificationsService?.createForProjectReviewers(
      trust.projectId,
      {
        type: "SUBMISSION_CREATED",
        title: "New submission",
        message: `${body.authorName} submitted a response.`,
        link: `/projects/${params.slug}/responses/${submission.id}`,
        metadata: {
          projectId: trust.projectId,
          projectSlug: params.slug,
          submissionId: submission.id,
          moderationStatus,
        },
      },
    );
    return response;
  }

  async listPublic(
    params: PublicProjectSlugParamsDto,
    query: PublicResponsesListQueryDto,
  ) {
    const cacheKey = `v2:responses:public:${params.slug}:${query.page}:${query.pageSize}`;
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

    const where: Prisma.CollectionFormSubmissionWhereInput = {
      projectId: project.id,
      moderationStatus: ModerationStatus.APPROVED,
    };
    const skip = (query.page - 1) * query.pageSize;

    const [total, items] = await Promise.all([
      this.prisma.client.collectionFormSubmission.count({ where }),
      this.prisma.client.collectionFormSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: FEEDBACK_SUBMISSION_SELECT,
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

  private async getOwnedResponseOrThrow(responseId: string, projectId: string) {
    const submission =
      await this.prisma.client.collectionFormSubmission.findFirst({
        where: { id: responseId, projectId },
        select: RESPONSE_SELECT,
      });

    if (!submission) {
      throw new NotFoundException("Response not found");
    }

    return submission;
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
          surface: PublicSubmitSurface.DIRECT_SUBMISSION,
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
            PublicSubmitSurface.DIRECT_SUBMISSION,
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
          `v2:responses:public:${slug}:*`,
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
        `Failed to bust public response cache for slug ${slug}: ${String(error)}`,
      );
    }
  }

  private getProjectIdFromRequest(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "ResponsesService requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }

  private toResponseDto(submission: ResponseRecord) {
    return {
      ...submission,
      annotations: submission.annotations.map((annotation) =>
        this.toAnnotationDto(annotation),
      ),
      moderationRuns: submission.moderationRuns.map((run) =>
        this.toModerationRunDto(run),
      ),
    };
  }

  private toAnnotationDto(annotation: AnnotationRecord) {
    return annotation;
  }

  private toModerationRunDto(run: ResponseRecord["moderationRuns"][number]) {
    return {
      id: run.id,
      artifactType: run.artifactType,
      provider: run.provider,
      providerOperation: run.providerOperation,
      status: run.status,
      decision: run.decision,
      score: run.score,
      flags: this.toStringArray(run.flags),
      categories: this.toNumberRecord(run.categories),
      reason: run.errorMessage ?? run.errorCode ?? null,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    };
  }

  private toFeedbackDto(
    submission: FeedbackSubmissionRecord,
    options: { includeAuthorEmail: boolean },
  ) {
    const answers = this.readAnswers(submission.answers);
    const metadata = this.readAnswers(submission.metadata);
    const moderationScore = this.readNumber(metadata.qualityScore);
    const moderationFlags = this.readStringArray(metadata.qualityFlags);
    const status = submission.moderationStatus;
    const approved = status === ModerationStatus.APPROVED;

    const authorAvatarAsset = this.findSubmissionMediaAsset(
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
      projectId: submission.projectId,
      userId: null,
      formId: submission.formId,
      authorName: this.readString(answers.authorName) ?? "Anonymous",
      ...(options.includeAuthorEmail
        ? {
            authorEmail: this.privateMetadataService.decryptAuthorEmail(
              submission.privateMetadata,
            ),
          }
        : {}),
      authorRole: this.readString(answers.authorRole),
      authorCompany: this.readString(answers.authorCompany),
      authorAvatar: this.mediaDto(authorAvatarAsset),
      content: this.readString(answers.content) ?? "",
      type: this.readFeedbackType(answers.type),
      video: this.mediaDto(videoAsset),
      media: this.mediaDto(mediaAsset),
      source: this.readString(answers.source),
      sourceUrl: this.readString(answers.sourceUrl),
      isPublished: approved,
      rating: submission.ratingValue,
      isApproved: approved,
      isOAuthVerified: this.readBoolean(answers.isOAuthVerified),
      oauthProvider: this.readString(answers.oauthProvider),
      moderationStatus: status,
      moderationScore,
      moderationFlags,
      autoPublished: this.readBoolean(metadata.autoPublished) || approved,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      tags: [],
    };
  }

  private toDirectSubmissionDto(input: {
    submission: {
      id: string;
      projectId: string;
      formId: string;
      createdAt?: Date;
      updatedAt?: Date;
    };
    body: CreatePublicResponseBodyDto;
    moderationStatus: ModerationStatus;
    isApproved: boolean;
    autoPublished: boolean;
  }) {
    const createdAt = input.submission.createdAt ?? new Date();
    const updatedAt = input.submission.updatedAt ?? createdAt;

    return {
      id: input.submission.id,
      projectId: input.submission.projectId,
      formId: input.submission.formId,
      authorName: input.body.authorName,
      authorEmail: null,
      authorRole: input.body.authorRole ?? null,
      authorCompany: input.body.authorCompany ?? null,
      authorAvatar: null,
      content: input.body.content,
      type: input.body.type ?? "TEXT",
      video: null,
      media: null,
      source: input.body.source ?? null,
      sourceUrl: input.body.sourceUrl ?? null,
      isPublished: input.moderationStatus === ModerationStatus.APPROVED,
      rating: input.body.rating ?? null,
      isApproved: input.isApproved,
      isOAuthVerified: input.body.isOAuthVerified ?? false,
      oauthProvider: input.body.oauthProvider ?? null,
      moderationStatus: input.moderationStatus,
      moderationScore: null,
      moderationFlags: null,
      autoPublished: input.autoPublished,
      createdAt,
      updatedAt,
      tags: [],
    };
  }

  private mediaDto(asset: Parameters<MediaService["toDto"]>[0]) {
    return this.mediaService?.toDto(asset) ?? null;
  }

  private ensureDirectResponseForm(
    tx: Prisma.TransactionClient,
    projectId: string,
  ) {
    return tx.collectionForm.upsert({
      where: {
        projectId_slug: {
          projectId,
          slug: DIRECT_SUBMISSION_FORM_SLUG,
        },
      },
      create: {
        projectId,
        slug: DIRECT_SUBMISSION_FORM_SLUG,
        name: "Direct submissions",
        description: "Canonical backing form for direct public responses.",
        isActive: true,
        abWeight: 0,
        config: DIRECT_SUBMISSION_FORM_CONFIG,
      },
      update: {},
      select: { id: true },
    });
  }

  private toDirectSubmissionAnswers(body: CreatePublicResponseBodyDto) {
    const answers: Record<string, string | number | boolean> = {
      authorName: body.authorName,
      content: body.content,
    };

    this.setJsonString(answers, "authorRole", body.authorRole);
    this.setJsonString(answers, "authorCompany", body.authorCompany);
    this.setJsonString(answers, "source", body.source);
    this.setJsonString(answers, "sourceUrl", body.sourceUrl);
    this.setJsonString(
      answers,
      "authorAvatarAssetId",
      body.authorAvatarAssetId,
    );
    this.setJsonString(answers, "videoAssetId", body.videoAssetId);
    this.setJsonString(answers, "mediaAssetId", body.mediaAssetId);

    if (body.type) {
      answers.type = body.type;
    }
    if (body.rating != null) {
      answers.rating = body.rating;
    }
    if (body.isOAuthVerified != null) {
      answers.isOAuthVerified = body.isOAuthVerified;
    }
    this.setJsonString(answers, "oauthProvider", body.oauthProvider);

    return answers as Prisma.InputJsonObject;
  }

  private toDirectSubmissionMetadata() {
    return {
      publicSubmitSurface: PublicSubmitSurface.DIRECT_SUBMISSION,
      sourceKind: "direct_submission",
    } satisfies Prisma.InputJsonObject;
  }

  private async linkDirectResponseMediaToSubmission(
    tx: Prisma.TransactionClient,
    input: {
      projectId: string;
      formId: string;
      submissionId: string;
      principal: string;
      assetIds: Array<string | null | undefined>;
    },
  ) {
    const assetIds = Array.from(
      new Set(input.assetIds.filter((id): id is string => Boolean(id))),
    );
    if (assetIds.length === 0) return;

    const updated = await tx.mediaAsset.updateMany({
      where: {
        id: { in: assetIds },
        projectId: input.projectId,
        purpose: MediaAssetPurpose.SUBMISSION_ATTACHMENT,
        status: MediaAssetStatus.ACTIVE,
        createdByActorType: "public",
        createdByActorId: input.principal,
      },
      data: {
        formId: input.formId,
        submissionId: input.submissionId,
      },
    });

    if (updated.count !== assetIds.length) {
      throw new ForbiddenException("Invalid submission media asset");
    }
  }

  private findSubmissionMediaAsset(
    submission: FeedbackSubmissionRecord,
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

  private readNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  private readBoolean(value: unknown) {
    return value === true;
  }

  private readStringArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : null;
  }

  private toStringArray(value: Prisma.JsonValue | null) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }

  private toNumberRecord(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
  }

  private readFeedbackType(value: unknown) {
    return value === "VIDEO" || value === "AUDIO" ? value : "TEXT";
  }

  private setJsonString(
    target: Record<string, string | number | boolean>,
    key: string,
    value: string | null | undefined,
  ) {
    const trimmed = value?.trim();
    if (trimmed) {
      target[key] = trimmed;
    }
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
      MediaAssetPurpose.SUBMISSION_ATTACHMENT,
      input,
    );
    await this.assertPublicMediaAsset(
      input.videoAssetId,
      MediaAssetPurpose.SUBMISSION_ATTACHMENT,
      input,
    );
    await this.assertPublicMediaAsset(
      input.mediaAssetId,
      MediaAssetPurpose.SUBMISSION_ATTACHMENT,
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
      !(
        [
          MediaAssetStatus.PENDING,
          MediaAssetStatus.ACTIVE,
        ] as MediaAssetStatus[]
      ).includes(asset.status)
    ) {
      throw new ForbiddenException("Invalid submission media asset");
    }
  }

  private displayActorId(actor: ActorContext | null | undefined) {
    return actor?.credentialId ?? actor?.userId ?? null;
  }

  private toPublicDto(submission: FeedbackSubmissionRecord) {
    const dto = this.toFeedbackDto(submission, { includeAuthorEmail: false });
    const {
      authorEmail: _authorEmail,
      moderationFlags: _moderationFlags,
      moderationScore: _moderationScore,
      autoPublished: _autoPublished,
      isApproved: _isApproved,
      moderationStatus: _moderationStatus,
      tags: _tags,
      updatedAt: _updatedAt,
      formId: _formId,
      userId: _userId,
      ...safe
    } = dto;
    void _authorEmail;
    void _moderationFlags;
    void _moderationScore;
    void _autoPublished;
    void _isApproved;
    void _moderationStatus;
    void _tags;
    void _updatedAt;
    void _formId;
    void _userId;
    return safe;
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

  private toPublicSubmitConsentSnapshot(body: CreatePublicResponseBodyDto) {
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

function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
