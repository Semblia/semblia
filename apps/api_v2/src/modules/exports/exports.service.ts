import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import {
  DeliveryStatus,
  ExportDestinationProvider,
  ExportDestinationStatus,
  MediaAssetPurpose,
  MediaAssetStatus,
  MediaAssetVisibility,
  Prisma,
} from "@workspace/database/prisma";
import { ConfigService } from "@nestjs/config";
import type { Queue } from "bullmq";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { paginate } from "../../common/utils/paginate.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { OutboundWebhooksService } from "../outbound-webhooks/outbound-webhooks.service.js";
import { generateDeliveryId } from "../outbound-webhooks/outbound-webhooks.service.js";
import { S3Service } from "../storage/s3.service.js";
import type {
  CreateCsvExportBodyDto,
  ExportDeliveriesQueryDto,
} from "./exports.dto.js";

export const EXPORT_DELIVERY_QUEUE = "export-delivery";
const MAX_EXPORT_ATTEMPTS = 3;
const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

export type ExportDeliveryJob = {
  deliveryId: string;
};

const DESTINATION_SELECT = {
  id: true,
  projectId: true,
  provider: true,
  name: true,
  config: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExportDestinationSelect;

const DELIVERY_SELECT = {
  id: true,
  projectId: true,
  destinationId: true,
  ruleId: true,
  eventType: true,
  payload: true,
  status: true,
  attempts: true,
  nextAttemptAt: true,
  error: true,
  artifactAssetId: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExportDeliverySelect;

const DELIVERY_WITH_DESTINATION_SELECT = {
  ...DELIVERY_SELECT,
  destination: {
    select: DESTINATION_SELECT,
  },
} satisfies Prisma.ExportDeliverySelect;

type DeliveryRecord = Prisma.ExportDeliveryGetPayload<{
  select: typeof DELIVERY_SELECT;
}>;

type DeliveryWithDestinationRecord = Prisma.ExportDeliveryGetPayload<{
  select: typeof DELIVERY_WITH_DESTINATION_SELECT;
}>;

type CsvSubmissionRecord = {
  id: string;
  answers: Prisma.JsonValue;
  ratingValue: number | null;
  authorName: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  reviewStatus: string;
  publishStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ExportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(EXPORT_DELIVERY_QUEUE)
    private readonly exportQueue: Queue<ExportDeliveryJob>,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Inject(OutboundWebhooksService)
    private readonly outboundWebhooksService: OutboundWebhooksService,
    @Optional()
    @Inject(S3Service)
    private readonly s3Service?: S3Service,
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
  ) {}

  async createCsvExport(
    projectId: string,
    body: CreateCsvExportBodyDto,
    actor: ActorContext | null | undefined,
  ) {
    const delivery = await this.prisma.client.$transaction(async (tx) => {
      const destination = await this.getOrCreateCsvDestination(tx, projectId);
      const created = await tx.exportDelivery.create({
        data: {
          id: generateDeliveryId("expdel"),
          projectId,
          destinationId: destination.id,
          eventType: "export.csv_requested",
          payload: {
            format: "submission_csv",
            ...(body.filename ? { filename: body.filename } : {}),
          },
        },
        select: DELIVERY_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "export.csv_requested",
        targetType: "export_delivery",
        targetId: created.id,
        metadata: {
          destinationId: destination.id,
          filename: body.filename ?? null,
        },
      });

      return created;
    });

    await this.queueCsvExport(delivery.id);
    return this.toDeliveryDto(delivery);
  }

  async listDeliveries(projectId: string, query: ExportDeliveriesQueryDto) {
    const where: Prisma.ExportDeliveryWhereInput = { projectId };
    if (query.status !== "ALL") {
      where.status = query.status as DeliveryStatus;
    }

    const skip = (query.page - 1) * query.pageSize;
    const [total, deliveries] = await Promise.all([
      this.prisma.client.exportDelivery.count({ where }),
      this.prisma.client.exportDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: DELIVERY_SELECT,
      }),
    ]);

    return paginate({
      data: deliveries.map((delivery) => this.toDeliveryDto(delivery)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async getDelivery(projectId: string, deliveryId: string) {
    return this.toDeliveryDto(
      await this.getOwnedDeliveryOrThrow(projectId, deliveryId),
    );
  }

  async getCsvDownload(projectId: string, deliveryId: string) {
    const delivery = await this.getOwnedDeliveryOrThrow(projectId, deliveryId);
    if (
      delivery.status !== DeliveryStatus.SUCCEEDED ||
      !delivery.artifactAssetId
    ) {
      throw new ConflictException("CSV export is not ready to download");
    }

    if (!this.s3Service) {
      throw new ConflictException("S3 storage is not configured");
    }
    return this.s3Service.presignGet(
      (
        await this.prisma.client.mediaAsset.findUniqueOrThrow({
          where: { id: delivery.artifactAssetId },
          select: { storageKey: true },
        })
      ).storageKey,
      this.getTtl("S3_PRESIGN_GET_TTL_SECONDS", 300),
    );
  }

  async processCsvExport(deliveryId: string) {
    const delivery = await this.getDeliveryWithDestinationOrThrow(deliveryId);
    if (
      delivery.destination.provider !== ExportDestinationProvider.CSV ||
      delivery.destination.status !== ExportDestinationStatus.ACTIVE
    ) {
      throw new ConflictException("CSV export destination is not active");
    }

    const delivering = await this.prisma.client.exportDelivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.DELIVERING,
        attempts: { increment: 1 },
        error: null,
        nextAttemptAt: null,
      },
      select: DELIVERY_SELECT,
    });

    try {
      const submissions = await this.prisma.client.formResponse.findMany({
        where: {
          projectId: delivery.projectId,
          reviewStatus: "APPROVED",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          answers: true,
          ratingValue: true,
          authorName: true,
          authorRole: true,
          authorCompany: true,
          reviewStatus: true,
          publishStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const artifactContent = buildTestimonialsCsv(submissions);
      const completed = await this.prisma.client.$transaction(async (tx) => {
        const asset = await tx.mediaAsset.create({
          data: {
            bucket: this.requireS3().bucketName,
            storageKey: `private/projects/${delivery.projectId}/exports/${delivery.id}.csv`,
            contentType: CSV_CONTENT_TYPE,
            byteSize: Buffer.byteLength(artifactContent, "utf8"),
            purpose: MediaAssetPurpose.EXPORT_ARTIFACT,
            visibility: MediaAssetVisibility.PRIVATE,
            status: MediaAssetStatus.ACTIVE,
            projectId: delivery.projectId,
            createdByActorType: "system",
            createdByActorId: "exports",
            confirmedAt: new Date(),
          },
        });
        await this.requireS3().putObject(
          asset.storageKey,
          artifactContent,
          CSV_CONTENT_TYPE,
        );
        return tx.exportDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.SUCCEEDED,
            artifactAssetId: asset.id,
            completedAt: new Date(),
            error: null,
            nextAttemptAt: null,
            payload: {
              ...(delivery.payload as Record<string, unknown>),
              filename: getRequestedFilename(delivery.payload),
            } as Prisma.InputJsonObject,
          },
          select: DELIVERY_SELECT,
        });
      });

      await this.notificationsService?.createForProjectManagers(
        completed.projectId,
        {
          type: "EXPORT_DELIVERY_READY",
          title: "CSV export ready",
          message: "Your CSV export is ready to download.",
          link: "/projects",
          metadata: {
            projectId: completed.projectId,
            deliveryId: completed.id,
            destinationId: completed.destinationId,
            artifactAssetId: completed.artifactAssetId,
          },
        },
      );

      return this.toDeliveryDto(completed);
    } catch (error) {
      const failed = await this.markDeliveryFailed(
        delivery,
        delivering.attempts,
        getErrorMessage(error),
      );

      await this.outboundWebhooksService.enqueueEvent(delivery.projectId, {
        eventType: "export.delivery_failed",
        payload: {
          deliveryId: delivery.id,
          destinationId: delivery.destinationId,
          error: failed.error,
        },
      });

      await this.notificationsService?.createForProjectManagers(
        failed.projectId,
        {
          type: "EXPORT_DELIVERY_FAILED",
          title: "CSV export failed",
          message: "A CSV export could not be completed.",
          link: "/projects",
          metadata: {
            projectId: failed.projectId,
            deliveryId: failed.id,
            destinationId: failed.destinationId,
            error: failed.error,
          },
        },
      );

      throw error instanceof Error ? error : new Error("CSV export failed");
    }
  }

  private async getOrCreateCsvDestination(
    tx: Prisma.TransactionClient,
    projectId: string,
  ) {
    const existing = await tx.exportDestination.findFirst({
      where: {
        projectId,
        provider: ExportDestinationProvider.CSV,
        status: ExportDestinationStatus.ACTIVE,
      },
      select: DESTINATION_SELECT,
    });

    if (existing) {
      return existing;
    }

    return tx.exportDestination.create({
      data: {
        projectId,
        provider: ExportDestinationProvider.CSV,
        name: "CSV export",
        config: { format: "submission_csv" },
      },
      select: DESTINATION_SELECT,
    });
  }

  private queueCsvExport(deliveryId: string) {
    return this.exportQueue.add(
      "csv",
      { deliveryId },
      {
        attempts: MAX_EXPORT_ATTEMPTS,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `csv-export:${deliveryId}`,
      },
    );
  }

  private async markDeliveryFailed(
    delivery: DeliveryWithDestinationRecord,
    attempts: number,
    error: string,
  ) {
    return this.prisma.client.exportDelivery.update({
      where: { id: delivery.id },
      data: {
        status:
          attempts >= MAX_EXPORT_ATTEMPTS
            ? DeliveryStatus.EXHAUSTED
            : DeliveryStatus.FAILED,
        error,
        nextAttemptAt:
          attempts >= MAX_EXPORT_ATTEMPTS ? null : nextAttemptAt(attempts),
      },
      select: DELIVERY_SELECT,
    });
  }

  private async getOwnedDeliveryOrThrow(projectId: string, deliveryId: string) {
    const delivery = await this.prisma.client.exportDelivery.findFirst({
      where: { id: deliveryId, projectId },
      select: DELIVERY_SELECT,
    });

    if (!delivery) {
      throw new NotFoundException("Export delivery not found");
    }

    return delivery;
  }

  private async getDeliveryWithDestinationOrThrow(deliveryId: string) {
    const delivery = await this.prisma.client.exportDelivery.findFirst({
      where: { id: deliveryId },
      select: DELIVERY_WITH_DESTINATION_SELECT,
    });

    if (!delivery) {
      throw new NotFoundException("Export delivery not found");
    }

    return delivery;
  }

  private toDeliveryDto(delivery: DeliveryRecord) {
    return delivery;
  }

  private getTtl(name: string, fallback: number) {
    const raw = this.configService?.get<string | number>(name);
    const parsed = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private requireS3() {
    if (!this.s3Service) {
      throw new ConflictException("S3 storage is not configured");
    }
    return this.s3Service;
  }
}

export function buildTestimonialsCsv(submissions: CsvSubmissionRecord[]) {
  const headers = [
    "submission_id",
    "author_name",
    "author_role",
    "author_company",
    "content",
    "rating",
    "is_approved",
    "review_status",
    "publish_status",
    "source",
    "source_url",
    "created_at",
    "updated_at",
  ];

  const rows = submissions.map((submission) => {
    const answers = readStoredAnswers(submission.answers);
    return [
      submission.id,
      submission.authorName,
      submission.authorRole,
      submission.authorCompany,
      readRole(answers, "primaryText"),
      submission.ratingValue,
      submission.reviewStatus === "APPROVED",
      submission.reviewStatus,
      submission.publishStatus,
      null,
      null,
      submission.createdAt.toISOString(),
      submission.updatedAt.toISOString(),
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\n");
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type StoredAnswerLike = {
  role?: string;
  value?: unknown;
  private?: boolean;
  publishable?: boolean;
};

function readStoredAnswers(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? (value as StoredAnswerLike[]) : [];
}

function readRole(answers: StoredAnswerLike[], role: string) {
  const answer = answers.find(
    (item) => item.role === role && item.private !== true && item.publishable,
  );
  return readString(answer?.value);
}

function getRequestedFilename(payload: Prisma.JsonValue) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    typeof payload.filename === "string"
  ) {
    return payload.filename;
  }

  return `semblia-testimonials-${new Date().toISOString().slice(0, 10)}.csv`;
}

function nextAttemptAt(attempts: number) {
  return new Date(Date.now() + Math.min(30 * 2 ** attempts, 600) * 1000);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "CSV export failed";
}
