import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ModerationStatus, Prisma } from "@workspace/database/prisma";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { paginate } from "../../common/utils/paginate.js";
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
  testimonialId: true,
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
  testimonial: {
    select: {
      id: true,
      authorName: true,
      authorRole: true,
      authorCompany: true,
      content: true,
      rating: true,
      isPublished: true,
      moderationStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  annotations: {
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      projectId: true,
      submissionId: true,
      testimonialId: true,
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
} satisfies Prisma.CollectionFormSubmissionSelect;

const ANNOTATION_SELECT = {
  id: true,
  projectId: true,
  submissionId: true,
  testimonialId: true,
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
          testimonialId: submission.testimonialId,
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
          testimonialId: submission.testimonialId,
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

      if (submission.testimonialId) {
        await tx.testimonial.update({
          where: { id: submission.testimonialId },
          data: this.toTestimonialModerationData(status),
        });
      }

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "submission.moderated",
        targetType: "collection_form_submission",
        targetId: submission.id,
        metadata: {
          testimonialId: submission.testimonialId,
          status,
          reason: body.reason ?? null,
          ...(body.metadata ? { metadata: body.metadata } : {}),
        },
      });

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

  private toTestimonialModerationData(status: ModerationStatus) {
    if (status === ModerationStatus.APPROVED) {
      return {
        moderationStatus: status,
        isApproved: true,
      };
    }

    if (
      status === ModerationStatus.REJECTED ||
      status === ModerationStatus.FLAGGED
    ) {
      return {
        moderationStatus: status,
        isApproved: false,
        isPublished: false,
      };
    }

    return {
      moderationStatus: status,
      isApproved: false,
    };
  }

  private toSubmissionDto(submission: SubmissionRecord) {
    return {
      ...submission,
      annotations: submission.annotations.map((annotation) =>
        this.toAnnotationDto(annotation),
      ),
    };
  }

  private toAnnotationDto(annotation: AnnotationRecord) {
    return annotation;
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
