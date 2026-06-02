import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ModerationStatus, Prisma } from "@workspace/database/prisma";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { paginate } from "../../common/utils/paginate.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CreateSubmissionAnnotationBodyDto,
  ModerateSubmissionBodyDto,
  SubmissionParamsDto,
  SubmissionsListQueryDto,
} from "./submissions.dto.js";

const SUBMISSION_SELECT = {
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

type SubmissionRecord = Prisma.CollectionFormSubmissionGetPayload<{
  select: typeof SUBMISSION_SELECT;
}>;

type AnnotationRecord = Prisma.CollectionFormSubmissionAnnotationGetPayload<{
  select: typeof ANNOTATION_SELECT;
}>;

@Injectable()
export class SubmissionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
  ) {}

  async list(query: SubmissionsListQueryDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const where: Prisma.CollectionFormSubmissionWhereInput = { projectId };
    if (query.status !== "ALL") {
      where.moderationStatus = query.status as ModerationStatus;
    }

    const skip = (query.page - 1) * query.pageSize;
    const [total, items] = await Promise.all([
      this.prisma.client.collectionFormSubmission.count({ where }),
      this.prisma.client.collectionFormSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: SUBMISSION_SELECT,
      }),
    ]);

    return paginate({
      data: items.map((item) => this.toSubmissionDto(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async getById(params: SubmissionParamsDto, request: ProjectRequest) {
    const submission = await this.getOwnedSubmissionOrThrow(
      params.submissionId,
      this.getProjectIdFromRequest(request),
    );

    return this.toSubmissionDto(submission);
  }

  async createAnnotation(
    params: SubmissionParamsDto,
    body: CreateSubmissionAnnotationBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const submission = await this.getOwnedSubmissionOrThrow(
      params.submissionId,
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
    params: SubmissionParamsDto,
    body: ModerateSubmissionBodyDto,
    request: ProjectRequest,
    actor: ActorContext | null,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const submission = await this.getOwnedSubmissionOrThrow(
      params.submissionId,
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
        select: SUBMISSION_SELECT,
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

      const link = `/projects/${params.slug}/submissions/${moderated.id}`;
      const notificationOptions = {
        excludeUserIds: actor?.userId ? [actor.userId] : [],
      };

      await this.notificationsService?.createForProjectReviewers(
        projectId,
        {
          type: "SUBMISSION_MODERATED",
          title: "Submission moderated",
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
            title: "Submission flagged",
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

    return this.toSubmissionDto(updated);
  }

  private async getOwnedSubmissionOrThrow(
    submissionId: string,
    projectId: string,
  ) {
    const submission =
      await this.prisma.client.collectionFormSubmission.findFirst({
        where: { id: submissionId, projectId },
        select: SUBMISSION_SELECT,
      });

    if (!submission) {
      throw new NotFoundException("Submission not found");
    }

    return submission;
  }

  private toSubmissionDto(submission: SubmissionRecord) {
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

  private toModerationRunDto(run: SubmissionRecord["moderationRuns"][number]) {
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

  private displayActorId(actor: ActorContext | null | undefined) {
    return actor?.credentialId ?? actor?.userId ?? null;
  }

  private getProjectIdFromRequest(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "SubmissionsService requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }
}
