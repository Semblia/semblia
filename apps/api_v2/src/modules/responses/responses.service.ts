import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  FormResponsePublishStatus,
  FormResponseReviewStatus,
  FormResponseTrustMode,
  FormStatus,
  FormVersionStatus,
  Prisma,
} from "@workspace/database/prisma";
import {
  normalizeSubmission,
  validateAnswers,
  type CompiledSnapshot,
  type StoredAnswer,
} from "@workspace/forms-core";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { paginate } from "../../common/utils/paginate.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { MediaService } from "../storage/media.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { SubmissionModerationService } from "../submission-moderation/submission-moderation.service.js";
import { SubmissionPrivateMetadataService } from "./submission-private-metadata.service.js";
import { PublicSubmitTrustService, type PublicSubmitTrustResult } from "./public-submit-trust.service.js";
import { FormsRuntimeTrustService } from "../public-surfaces/forms-runtime-trust.service.js";
import { PublicHostingObservabilityService } from "../public-surfaces/public-hosting-observability.service.js";
import { PublicSurfaceFeature } from "@workspace/database/prisma";
import { randomUUID } from "node:crypto";
import {
  formSubmitIdempotencyWhere,
  replayCompletedPublicSubmit,
} from "./public-submit-idempotency.js";
import type {
  CreateResponseAnnotationBodyDto,
  ResponseParamsDto,
  ResponsesListQueryDto,
  RuntimeFormSubmitBodyDto,
  RuntimeFormSubmitParamsDto,
  RuntimeFormSubmitQueryDto,
  RuntimeFormUploadBodyDto,
  RuntimeFormUploadParamsDto,
  RuntimeFormUploadQueryDto,
  UpdateResponsePublishBodyDto,
  UpdateResponseStatusBodyDto,
} from "./responses.dto.js";
import { hashIdempotencyPayload } from "./responses.dto.js";

const RESPONSE_SELECT = {
  id: true,
  projectId: true,
  formId: true,
  versionId: true,
  version: true,
  trustMode: true,
  answers: true,
  ratingValue: true,
  ratingScale: true,
  authorName: true,
  authorRole: true,
  authorCompany: true,
  authorAvatarAssetId: true,
  consent: true,
  reviewStatus: true,
  publishStatus: true,
  moderationReason: true,
  moderatedByActorType: true,
  moderatedByActorId: true,
  moderatedAt: true,
  sourceMetadata: true,
  createdAt: true,
  updatedAt: true,
  form: {
    select: {
      id: true,
      name: true,
      slug: true,
      intent: true,
    },
  },
  annotations: {
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      projectId: true,
      responseId: true,
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
} satisfies Prisma.FormResponseSelect;

const ANNOTATION_SELECT = {
  id: true,
  projectId: true,
  responseId: true,
  actorType: true,
  actorId: true,
  note: true,
  labels: true,
  sentiment: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FormResponseAnnotationSelect;

type ProjectRequest = { projectAccess?: { projectId: string } };

type PublicSubmitRequest = {
  method: string;
  originalUrl: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};
type RuntimeTrustResult = { projectId: string; hostname?: string; requestId?: string; trust?: PublicSubmitTrustResult };

type ResponseRecord = Prisma.FormResponseGetPayload<{
  select: typeof RESPONSE_SELECT;
}>;

type AnnotationRecord = Prisma.FormResponseAnnotationGetPayload<{
  select: typeof ANNOTATION_SELECT;
}>;

type RuntimeFormRecord = {
  id: string;
  projectId: string;
  slug: string | null;
  currentVersion: number | null;
  project: {
    id: string;
    slug: string;
    allowedOrigins: string[];
    autoModeration: boolean;
    autoApproveVerified: boolean;
  };
};

@Injectable()
export class ResponsesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(PublicSubmitTrustService)
    private readonly publicSubmitTrustService: PublicSubmitTrustService,
    @Inject(SubmissionPrivateMetadataService)
    private readonly privateMetadataService: SubmissionPrivateMetadataService,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Inject(FormsRuntimeTrustService)
    private readonly formsRuntimeTrustService: FormsRuntimeTrustService,
    @Inject(PublicHostingObservabilityService)
    private readonly hostingObservability: PublicHostingObservabilityService,
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
    const where: Prisma.FormResponseWhereInput = { projectId };
    if (query.reviewStatus !== "ALL") {
      where.reviewStatus = query.reviewStatus as FormResponseReviewStatus;
    }
    if (query.publishStatus !== "ALL") {
      where.publishStatus = query.publishStatus as FormResponsePublishStatus;
    }

    if (query.search?.trim()) {
      const contains = query.search.trim();
      where.OR = [
        { authorName: { contains, mode: "insensitive" } },
        { authorRole: { contains, mode: "insensitive" } },
        { authorCompany: { contains, mode: "insensitive" } },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [total, items] = await Promise.all([
      this.prisma.client.formResponse.count({ where }),
      this.prisma.client.formResponse.findMany({
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

  async getById(params: ResponseParamsDto, request: ProjectRequest) {
    const response = await this.getOwnedResponseOrThrow(
      params.responseId,
      this.getProjectIdFromRequest(request),
    );

    return this.toResponseDto(response);
  }

  async updateStatus(
    params: ResponseParamsDto,
    body: UpdateResponseStatusBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const response = await this.getOwnedResponseOrThrow(
      params.responseId,
      projectId,
    );
    const now = new Date();
    const status = body.status as FormResponseReviewStatus;
    const actorId = this.displayActorId(actor);

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const reviewed = await tx.formResponse.update({
        where: { id: response.id },
        data: {
          reviewStatus: status,
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
        action: "response.review_status_updated",
        targetType: "form_response",
        targetId: response.id,
        metadata: {
          status,
          reason: body.reason ?? null,
          ...(body.metadata ? { metadata: body.metadata } : {}),
        },
      });

      return reviewed;
    });

    await this.bustWidgetCaches(projectId);
    return this.toResponseDto(updated);
  }

  async updatePublish(
    params: ResponseParamsDto,
    body: UpdateResponsePublishBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const response = await this.getOwnedResponseOrThrow(
      params.responseId,
      projectId,
    );
    const status = body.status as FormResponsePublishStatus;

    if (
      status === FormResponsePublishStatus.PUBLISHED ||
      status === FormResponsePublishStatus.PUBLISHABLE
    ) {
      this.assertConsentAllowsPublish(response);
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const published = await tx.formResponse.update({
        where: { id: response.id },
        data: { publishStatus: status },
        select: RESPONSE_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "response.publish_status_updated",
        targetType: "form_response",
        targetId: response.id,
        metadata: {
          status,
          ...(body.metadata ? { metadata: body.metadata } : {}),
        },
      });

      return published;
    });

    await this.bustWidgetCaches(projectId);
    return this.toResponseDto(updated);
  }

  async delete(
    params: ResponseParamsDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const response = await this.getOwnedResponseOrThrow(
      params.responseId,
      projectId,
    );

    await this.prisma.client.$transaction(async (tx) => {
      await tx.formResponse.delete({
        where: { id: response.id },
        select: { id: true },
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "response.deleted",
        targetType: "form_response",
        targetId: response.id,
        metadata: null,
      });
    });

    await this.bustWidgetCaches(projectId);
    return { id: response.id, projectId };
  }

  async createAnnotation(
    params: ResponseParamsDto,
    body: CreateResponseAnnotationBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const response = await this.getOwnedResponseOrThrow(
      params.responseId,
      projectId,
    );
    const actorId = this.displayActorId(actor);

    const created = await this.prisma.client.$transaction(async (tx) => {
      const annotation = await tx.formResponseAnnotation.create({
        data: {
          projectId,
          responseId: response.id,
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
        action: "response.annotated",
        targetType: "form_response",
        targetId: response.id,
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

  async submitRuntimeForm(
    params: RuntimeFormSubmitParamsDto,
    query: RuntimeFormSubmitQueryDto,
    body: RuntimeFormSubmitBodyDto,
    request: PublicSubmitRequest,
  ) {
    const runtime = await this.resolveRuntimeTrust(request, query.projectId, "SUBMISSION");
    const { form, version, snapshot } = await this.resolveRuntimeForm(params.slug, runtime.projectId, runtime);
    const trust = runtime.trust ?? await this.publicSubmitTrustService.evaluate(request, form.project, snapshot.security.allowedOrigins);
    const payloadHash = hashIdempotencyPayload(request.rawBody, body);
    const idempotencyKey = this.readHeader(request, "idempotency-key");

    if (idempotencyKey) {
      const replay = await this.tryReplayIdempotentSubmit({
        projectId: form.projectId,
        formId: form.id,
        idempotencyKey,
        payloadHash,
      });
      if (replay) return replay;
    }

    this.assertRuntimeAntiAbuse(snapshot, body);
    const validation = validateAnswers(snapshot, body.answers);
    if (!validation.ok) {
      throw new BadRequestException({
        message: "Submission answers are invalid",
        errors: validation.errors,
      });
    }

    const normalized = normalizeSubmission(
      snapshot,
      body.answers,
      body.consent,
    );
    const clientIp = this.publicSubmitTrustService.getClientIp(request);
    const userAgent = this.readHeader(request, "user-agent") ?? null;
    const authorEmail = this.extractPrivateAuthorEmail(normalized.answers);
    const assetIds = this.collectUploadAssetIds(normalized.answers);

    const created = await this.prisma.client.$transaction(async (tx) => {
      const response = await tx.formResponse.create({
        data: {
          projectId: form.projectId,
          formId: form.id,
          versionId: version.id,
          version: version.version,
          trustedOriginId: trust.trustedOriginId ?? null,
          signingSecretId: trust.signingSecretId ?? null,
          trustMode:
            trust.trust === "hmac"
              ? FormResponseTrustMode.HMAC
              : FormResponseTrustMode.ORIGIN,
          idempotencyKey: idempotencyKey ?? null,
          payloadHash,
          answers: normalized.answers as unknown as Prisma.InputJsonValue,
          ratingValue: normalized.rating.value,
          ratingScale: normalized.rating.scale,
          authorName: normalized.author.name,
          authorRole: normalized.author.role,
          authorCompany: normalized.author.company,
          authorAvatarAssetId: normalized.author.avatarAssetId,
          consent: normalized.consent as unknown as Prisma.InputJsonValue,
          reviewStatus: FormResponseReviewStatus.PENDING,
          publishStatus: FormResponsePublishStatus.PRIVATE,
          sourceMetadata: this.toSourceMetadata({
            snapshotId: version.id,
            body,
            clientIp,
            userAgent,
          }),
        },
        select: RESPONSE_SELECT,
      });

      await this.mediaService?.activatePublicSubmitAssets({
        tx,
        projectId: form.projectId,
        formId: form.id,
        responseId: response.id,
        principal: trust.principal,
        assetIds,
      });

      await this.privateMetadataService.createForPublicSubmit(tx, {
        responseId: response.id,
        authorEmail,
        ipAddress: clientIp,
        userAgent,
        consentSnapshot: normalized.consent,
      });

      await tx.projectAnalyticsDaily.upsert({
        where: {
          projectId_day: {
            projectId: form.projectId,
            day: startOfUtcDay(new Date()),
          },
        },
        create: {
          projectId: form.projectId,
          day: startOfUtcDay(new Date()),
          formSubmissions: 1,
        },
        update: {
          formSubmissions: { increment: 1 },
        },
      });

      return response;
    });

    const responseBody = this.toRuntimeSubmitDto(created);

    if (idempotencyKey) {
      await this.prisma.client.formSubmitIdempotency.update({
        where: formSubmitIdempotencyWhere(
          form.projectId,
          form.id,
          idempotencyKey,
        ),
        data: {
          responseId: created.id,
          responseStatusCode: 201,
          responseBody: responseBody as Prisma.InputJsonValue,
        },
      });
    }

    await this.submissionModerationService?.enqueueSubmission({
      submissionId: created.id,
    });

    await this.notificationsService?.createForProjectReviewers(
      form.projectId,
      {
        type: "SUBMISSION_CREATED",
        title: "New response",
        message: `${created.form.name} received a new response.`,
        link: `/projects/${form.project.slug}/responses/${created.id}`,
        metadata: {
          projectId: form.projectId,
          projectSlug: form.project.slug,
          formId: form.id,
          responseId: created.id,
          reviewStatus: created.reviewStatus,
        },
      },
    );

    return responseBody;
  }

  async presignRuntimeUpload(
    params: RuntimeFormUploadParamsDto,
    query: RuntimeFormUploadQueryDto,
    body: RuntimeFormUploadBodyDto,
    request: PublicSubmitRequest,
  ) {
    const runtime = await this.resolveRuntimeTrust(request, query.projectId, "UPLOAD_PRESIGN");
    const { form, snapshot } = await this.resolveRuntimeForm(params.slug, runtime.projectId, runtime);
    if (!snapshot.settings.uploadsAllowed) {
      throw new ForbiddenException("Uploads are disabled for this form");
    }

    const trust = runtime.trust ?? await this.publicSubmitTrustService.evaluate(request, form.project, snapshot.security.allowedOrigins);

    if (!this.mediaService) {
      throw new InternalServerErrorException("Media service is not available");
    }

    return this.mediaService.createPublicFormUploadIntent({
      projectId: form.projectId,
      formId: form.id,
      principal: trust.principal,
      contentType: body.contentType,
      byteSize: body.byteSize,
      checksumSha256: body.checksumSha256,
    });
  }

  private buildAuthenticatedOrderBy(sort: ResponsesListQueryDto["sort"]) {
    switch (sort) {
      case "oldest":
        return { createdAt: "asc" } satisfies Prisma.FormResponseOrderByWithRelationInput;
      case "rating_desc":
        return [
          { ratingValue: "desc" },
          { createdAt: "desc" },
        ] satisfies Prisma.FormResponseOrderByWithRelationInput[];
      case "rating_asc":
        return [
          { ratingValue: "asc" },
          { createdAt: "desc" },
        ] satisfies Prisma.FormResponseOrderByWithRelationInput[];
      case "newest":
      default:
        return { createdAt: "desc" } satisfies Prisma.FormResponseOrderByWithRelationInput;
    }
  }

  private async getOwnedResponseOrThrow(responseId: string, projectId: string) {
    const response = await this.prisma.client.formResponse.findFirst({
      where: { id: responseId, projectId },
      select: RESPONSE_SELECT,
    });

    if (!response) {
      throw new NotFoundException("Response not found");
    }

    return response;
  }

  private async resolveRuntimeTrust(request: PublicSubmitRequest, legacyProjectId: string | undefined, operation: "SUBMISSION" | "UPLOAD_PRESIGN"): Promise<RuntimeTrustResult> {
    if (!FormsRuntimeTrustService.hasRuntimeHeaders(request)) {
      if (!legacyProjectId) throw new BadRequestException("projectId is required");
      return { projectId: legacyProjectId };
    }
    const resolved = await this.formsRuntimeTrustService.verifyAndResolve(request, { operation, legacyProjectId });
    return { projectId: resolved.projectId, hostname: resolved.canonicalHostname, requestId: this.safeRequestId(request), trust: { projectId: resolved.projectId, trust: "hmac" as const, principal: resolved.principal, rateLimitTracker: `${resolved.projectId}:hmac:${resolved.principal}` } satisfies PublicSubmitTrustResult };
  }

  private safeRequestId(request: PublicSubmitRequest) {
    const id = this.readHeader(request, "x-request-id");
    return id && /^[A-Za-z0-9._:-]{1,128}$/.test(id) ? id : randomUUID();
  }

  private async resolveRuntimeForm(slug: string, projectId: string, runtime?: { hostname?: string; requestId?: string }) {
    const form = (await this.prisma.client.form.findFirst({
      where: {
        projectId,
        slug,
        status: FormStatus.PUBLISHED,
        open: true,
        currentVersion: { not: null },
      },
      select: {
        id: true,
        projectId: true,
        slug: true,
        currentVersion: true,
        project: {
          select: {
            id: true,
            slug: true,
            allowedOrigins: true,
            autoModeration: true,
            autoApproveVerified: true,
          },
        },
      },
    })) as RuntimeFormRecord | null;

    if (!form?.currentVersion) {
      if (runtime?.hostname) {
        const other = await this.prisma.client.form.findFirst({ where: { slug, projectId: { not: projectId }, status: FormStatus.PUBLISHED, open: true, currentVersion: { not: null } }, select: { id: true } });
        if (other) this.hostingObservability.record({ event: "public_host_cross_project_rejection", outcome: "rejected", reason: "resource_owner_mismatch", hostname: runtime.hostname, projectId, feature: PublicSurfaceFeature.COLLECTION, requestId: runtime.requestId });
      }
      throw new NotFoundException("Form not found");
    }

    const version = await this.prisma.client.formVersion.findFirst({
      where: {
        formId: form.id,
        projectId,
        version: form.currentVersion,
        status: FormVersionStatus.PUBLISHED,
      },
      select: {
        id: true,
        version: true,
        snapshot: true,
      },
    });

    if (!version) {
      throw new NotFoundException("Form version not found");
    }

    return {
      form,
      version,
      snapshot: version.snapshot as unknown as CompiledSnapshot,
    };
  }

  private async tryReplayIdempotentSubmit(input: {
    projectId: string;
    formId: string;
    idempotencyKey: string;
    payloadHash: string;
  }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      await this.prisma.client.formSubmitIdempotency.create({
        data: {
          projectId: input.projectId,
          formId: input.formId,
          idempotencyKey: input.idempotencyKey,
          payloadHash: input.payloadHash,
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

      const existing = await this.prisma.client.formSubmitIdempotency.findUnique({
        where: formSubmitIdempotencyWhere(
          input.projectId,
          input.formId,
          input.idempotencyKey,
        ),
      });

      if (!existing) {
        throw new InternalServerErrorException(
          "Public submit idempotency ledger is missing after collision",
        );
      }

      return replayCompletedPublicSubmit(existing, input.payloadHash);
    }
  }

  private assertRuntimeAntiAbuse(
    snapshot: CompiledSnapshot,
    body: RuntimeFormSubmitBodyDto,
  ) {
    const serverSettings = snapshot.serverSettings;
    if (serverSettings.honeypot && body.honeypot?.trim()) {
      throw new ForbiddenException("Submission rejected");
    }
    if (
      typeof body.elapsedMs === "number" &&
      body.elapsedMs < serverSettings.minCompletionMs
    ) {
      throw new ForbiddenException("Submission completed too quickly");
    }

    const haystack = this.collectStrings(body.answers).join("\n").toLowerCase();
    const blocked = serverSettings.blockedWords
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean)
      .find((word) => haystack.includes(word));
    if (blocked) {
      throw new ForbiddenException("Submission contains blocked content");
    }
  }

  private assertConsentAllowsPublish(response: ResponseRecord) {
    if (this.isPubliclyDisplayable(response)) return;
    throw new ConflictException(
      "Response cannot be published without the required consent",
    );
  }

  private isPubliclyDisplayable(response: ResponseRecord) {
    const consent = this.readConsent(response.consent);
    const answers = this.readStoredAnswers(response.answers);
    const needsText = answers.some(
      (answer) => answer.role === "primaryText" && answer.publishable,
    );
    const hasName = Boolean(response.authorName);
    const hasCompany = Boolean(response.authorCompany);
    const hasRole = Boolean(response.authorRole);
    const hasAvatar = Boolean(response.authorAvatarAssetId);

    return (
      (!needsText || consent.canPublishText) &&
      (!hasName || consent.canPublishName) &&
      (!hasCompany || consent.canPublishCompany) &&
      (!hasRole || consent.canPublishRole) &&
      (!hasAvatar || consent.canPublishAvatar)
    );
  }

  private toResponseDto(response: ResponseRecord) {
    const consent = this.readConsent(response.consent);
    return {
      id: response.id,
      projectId: response.projectId,
      formId: response.formId,
      versionId: response.versionId,
      version: response.version,
      trustMode: response.trustMode,
      answers: this.toSafeAnswers(response.answers),
      ratingValue: response.ratingValue,
      ratingScale: response.ratingScale,
      authorName: consent.canPublishName ? response.authorName : null,
      authorRole: consent.canPublishRole ? response.authorRole : null,
      authorCompany: consent.canPublishCompany ? response.authorCompany : null,
      authorAvatarAssetId: consent.canPublishAvatar
        ? response.authorAvatarAssetId
        : null,
      consent,
      reviewStatus: response.reviewStatus,
      publishStatus: response.publishStatus,
      moderationReason: response.moderationReason,
      moderatedByActorType: response.moderatedByActorType,
      moderatedByActorId: response.moderatedByActorId,
      moderatedAt: response.moderatedAt?.toISOString() ?? null,
      sourceMetadata: this.toSafeSourceMetadata(response.sourceMetadata),
      createdAt: response.createdAt.toISOString(),
      updatedAt: response.updatedAt.toISOString(),
      form: response.form,
      annotations: response.annotations.map((annotation) =>
        this.toAnnotationDto(annotation),
      ),
      moderationRuns: response.moderationRuns.map((run) =>
        this.toModerationRunDto(run),
      ),
    };
  }

  private toRuntimeSubmitDto(response: ResponseRecord) {
    return {
      id: response.id,
      projectId: response.projectId,
      formId: response.formId,
      versionId: response.versionId,
      version: response.version,
      reviewStatus: response.reviewStatus,
      publishStatus: response.publishStatus,
      createdAt: response.createdAt.toISOString(),
    };
  }

  private toAnnotationDto(annotation: AnnotationRecord) {
    return {
      ...annotation,
      createdAt: annotation.createdAt.toISOString(),
      updatedAt: annotation.updatedAt.toISOString(),
    };
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

  private toSafeAnswers(value: Prisma.JsonValue) {
    return this.readStoredAnswers(value)
      .filter((answer) => !answer.private)
      .map((answer) => ({
        fieldId: answer.fieldId,
        type: answer.type,
        role: answer.role,
        labelSnapshot: answer.labelSnapshot,
        value: answer.value,
        publishable: answer.publishable,
        usedInWidget: answer.usedInWidget,
      }));
  }

  private readStoredAnswers(value: Prisma.JsonValue): StoredAnswer[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return false;
      }
      const answer = item as Partial<StoredAnswer>;
      return (
        typeof answer.fieldId === "string" &&
        typeof answer.type === "string" &&
        typeof answer.role === "string"
      );
    }) as unknown as StoredAnswer[];
  }

  private readConsent(value: Prisma.JsonValue | null) {
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
      canEditForClarity: record.canEditForClarity === true,
    };
  }

  private toSafeSourceMetadata(value: Prisma.JsonValue | null) {
    const metadata = this.readJsonObject(value);
    const safe: Record<string, unknown> = {};
    for (const key of [
      "source",
      "referrer",
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "externalId",
      "snapshotId",
    ]) {
      if (metadata[key] !== undefined) safe[key] = metadata[key];
    }
    return safe;
  }

  private toSourceMetadata(input: {
    snapshotId: string;
    body: RuntimeFormSubmitBodyDto;
    clientIp: string;
    userAgent: string | null;
  }): Prisma.InputJsonObject {
    const raw = this.readJsonObject(input.body.sourceMetadata);
    return {
      source: this.readString(raw.source) ?? "runtime_form",
      referrer: this.readString(raw.referrer),
      utmSource: this.readString(raw.utmSource),
      utmMedium: this.readString(raw.utmMedium),
      utmCampaign: this.readString(raw.utmCampaign),
      externalId: this.readString(raw.externalId),
      snapshotId: input.snapshotId,
      ipHash: this.privateMetadataService.hashIdentifier(input.clientIp),
      userAgentHash: input.userAgent
        ? this.privateMetadataService.hashIdentifier(input.userAgent)
        : null,
    };
  }

  private extractPrivateAuthorEmail(answers: StoredAnswer[]) {
    for (const answer of answers) {
      if (
        (answer.role === "authorEmail" || answer.type === "email") &&
        typeof answer.value === "string"
      ) {
        const email = answer.value.trim();
        if (email) return email;
      }
    }
    return null;
  }

  private collectUploadAssetIds(answers: StoredAnswer[]) {
    return [
      ...new Set(
        answers.flatMap((answer) => {
          if (
            !["imageUpload", "fileUpload"].includes(answer.type) &&
            answer.role !== "authorAvatar"
          ) {
            return [];
          }
          if (typeof answer.value === "string") return [answer.value];
          if (Array.isArray(answer.value)) {
            return answer.value.filter(
              (value): value is string => typeof value === "string",
            );
          }
          return [];
        }),
      ),
    ];
  }

  private async bustWidgetCaches(projectId: string) {
    const widgets = await this.prisma.client.widget.findMany({
      where: { projectId },
      select: { id: true, wallSlug: true },
    });
    const keys = new Set<string>();
    for (const widget of widgets) {
      keys.add(`v2:widgets:embed:${widget.id}`);
      if (widget.wallSlug) keys.add(`v2:walls:public:${widget.wallSlug}`);
    }
    if (keys.size > 0) {
      await this.redisService.redis.del(...keys);
    }
  }

  private collectStrings(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.collectStrings(item));
    }
    if (typeof value !== "object" || value === null) return [];
    return Object.values(value).flatMap((item) => this.collectStrings(item));
  }

  private readJsonObject(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private readString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
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

  private getProjectIdFromRequest(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "ResponsesService requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }

  private displayActorId(actor: ActorContext | null | undefined) {
    return actor?.credentialId ?? actor?.userId ?? null;
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

function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
