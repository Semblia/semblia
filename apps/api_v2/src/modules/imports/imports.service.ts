import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { InjectQueue } from "@nestjs/bullmq";
import { Prisma } from "@workspace/database/prisma";
import type { Queue } from "bullmq";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { paginate } from "../../common/utils/paginate.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { SubmissionModerationService } from "../submission-moderation/submission-moderation.service.js";
import { IMPORT_QUEUE } from "../queueing/queueing.constants.js";
import {
  candidateIdentityHash,
  candidateToResponseData,
  normalizeImportCandidate,
  type ImportCandidate,
} from "./import-normalization.js";
import {
  getImportSource,
  IMPORT_SOURCE_CATALOG,
} from "./import-source-catalog.js";
import type {
  CreateManualImportBodyDto,
  ImportJobsQueryDto,
} from "./imports.dto.js";
import { createManualImportBodySchema } from "./imports.dto.js";
import {
  enqueueImportJob,
  markImportDispatchPending,
} from "./import-queue-dispatcher.js";

export { IMPORT_QUEUE } from "../queueing/queueing.constants.js";
export type ImportJobQueuePayload = { jobId: string };
export const IMPORT_JOB_STALE_AFTER_MS = 60_000;
const JOB_SELECT = {
  id: true,
  projectId: true,
  mode: true,
  sourceKey: true,
  status: true,
  totalCount: true,
  importedCount: true,
  duplicateCount: true,
  skippedCount: true,
  failedCount: true,
  errorCode: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ImportJobSelect;
const WORKER_JOB_SELECT = {
  ...JOB_SELECT,
  config: true,
} satisfies Prisma.ImportJobSelect;

@Injectable()
export class ImportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(IMPORT_QUEUE)
    private readonly importQueue: Queue<ImportJobQueuePayload>,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Inject(SubmissionModerationService)
    private readonly moderation: SubmissionModerationService,
  ) {}
  catalog() {
    return IMPORT_SOURCE_CATALOG;
  }
  async createManualImport(
    projectId: string,
    body: CreateManualImportBodyDto,
    actor: ActorContext | null | undefined,
  ) {
    const input = createManualImportBodySchema.parse(body);
    const source = getImportSource(input.sourceKey);
    if (!source || !source.modes.includes("MANUAL"))
      throw new ConflictException(
        "Import source does not allow manual imports",
      );
    const job = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.importJob.create({
        data: {
          projectId,
          actorUserId: actor?.userId ?? null,
          mode: "MANUAL",
          sourceKey: source.key,
          config: sanitizeConfig({
            candidate: {
              externalId: manualIdentity(input),
              sourceUrl: input.sourceUrl ?? null,
              sourceCreatedAt: null,
              text: input.text,
              ratingValue: input.ratingValue ?? null,
              ratingScale: input.ratingScale ?? null,
              authorName: input.authorName ?? null,
              authorRole: input.authorRole ?? null,
              authorCompany: input.authorCompany ?? null,
              tags: [],
            },
            rightsConfirmed: input.rightsConfirmed,
          }),
        },
        select: JOB_SELECT,
      });
      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "import.job.created",
        targetType: "import_job",
        targetId: created.id,
        metadata: { mode: created.mode, sourceKey: created.sourceKey },
      });
      return created;
    });
    try {
      await enqueueImportJob(this.importQueue, job.id);
    } catch {
      await markImportDispatchPending(this.prisma, job.id).catch(
        () => undefined,
      );
    }
    return job;
  }
  async listJobs(projectId: string, query: ImportJobsQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [total, data] = await Promise.all([
      this.prisma.client.importJob.count({ where: { projectId } }),
      this.prisma.client.importJob.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: JOB_SELECT,
      }),
    ]);
    return paginate({
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
  async getJob(projectId: string, jobId: string) {
    const job = await this.prisma.client.importJob.findFirst({
      where: { id: jobId, projectId },
      select: {
        ...JOB_SELECT,
        items: {
          select: {
            id: true,
            rowIndex: true,
            result: true,
            sourceUrl: true,
            responseId: true,
            errorCode: true,
            errorMessage: true,
            createdAt: true,
          },
        },
      },
    });
    if (!job) throw new NotFoundException("Import job not found");
    return job;
  }
  async process(jobId: string) {
    const now = new Date();
    const claim = await this.prisma.client.importJob.updateMany({
      where: {
        id: jobId,
        OR: [
          { status: "QUEUED" },
          { status: "FAILED" },
          {
            status: "RUNNING",
            startedAt: {
              lt: new Date(now.valueOf() - IMPORT_JOB_STALE_AFTER_MS),
            },
          },
        ],
      },
      data: {
        status: "RUNNING",
        startedAt: now,
        errorCode: null,
        errorMessage: null,
        completedAt: null,
      },
    });
    if (!claim.count) {
      const current = await this.prisma.client.importJob.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      if (current?.status === "RUNNING")
        throw new Error("Import job is already running");
      return null;
    }
    const job = await this.prisma.client.importJob.findUniqueOrThrow({
      where: { id: jobId },
      select: WORKER_JOB_SELECT,
    });
    try {
      const config = job.config as {
        candidate?: ImportCandidate;
        rightsConfirmed?: boolean;
      } | null;
      if (!config?.candidate)
        throw new ConflictException("Import source is not implemented");
      const result = await this.persistCandidate(
        job.id,
        job.projectId,
        job.sourceKey,
        config.candidate,
        config.rightsConfirmed === true,
        0,
      );
      await this.prisma.client.importJob.update({
        where: { id: job.id },
        data: {
          status: result === "IMPORTED" ? "SUCCEEDED" : "PARTIAL",
          totalCount: 1,
          importedCount: result === "IMPORTED" ? 1 : 0,
          duplicateCount: result === "DUPLICATE" ? 1 : 0,
          skippedCount: 0,
          failedCount: 0,
          completedAt: new Date(),
        },
      });
    } catch {
      await this.prisma.client.importJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          totalCount: 1,
          importedCount: 0,
          duplicateCount: 0,
          skippedCount: 0,
          failedCount: 1,
          errorCode: "IMPORT_FAILED",
          errorMessage: "The import could not be completed.",
          completedAt: new Date(),
        },
      });
      throw new Error("Import failed");
    }
    return this.getJob(job.projectId, job.id);
  }
  async persistCandidate(
    jobId: string,
    projectId: string,
    sourceKey: string,
    candidateInput: ImportCandidate,
    rightsConfirmed: boolean,
    rowIndex: number,
  ) {
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= 2_000)
      throw new ConflictException("Import row index is invalid");
    const candidate = normalizeImportCandidate(candidateInput);
    if (!candidate.text || !candidate.externalId)
      throw new ConflictException("Import candidate is invalid");
    const existing = await this.prisma.client.importItem.findFirst({
      where: { jobId, rowIndex },
      select: { result: true, responseId: true },
    });
    if (existing) return this.existingItemResult(existing);
    const identityHash = candidateIdentityHash(sourceKey, candidate);
    let responseId: string | null = null;
    try {
      await this.prisma.client.$transaction(async (tx) => {
        const response = await tx.formResponse.create({
          data: candidateToResponseData(
            projectId,
            sourceKey,
            jobId,
            candidate,
            rightsConfirmed,
          ),
          select: { id: true },
        });
        responseId = response.id;
        await tx.responseImportIdentity.create({
          data: {
            projectId,
            sourceKey,
            externalIdHash: identityHash,
            responseId: response.id,
          },
        });
        await tx.importItem.create({
          data: {
            jobId,
            rowIndex,
            result: "IMPORTED",
            sourceUrl: candidate.sourceUrl,
            externalIdHash: identityHash,
            responseId: response.id,
          },
        });
      });
    } catch (error) {
      if (!isIdentityRace(error) && !isImportItemRace(error)) throw error;
      const concurrentItem = await this.prisma.client.importItem.findFirst({
        where: { jobId, rowIndex },
        select: { result: true, responseId: true },
      });
      if (concurrentItem) return this.existingItemResult(concurrentItem);
      if (!isIdentityRace(error)) throw error;
      try {
        await this.prisma.client.importItem.create({
          data: {
            jobId,
            rowIndex,
            result: "DUPLICATE",
            sourceUrl: candidate.sourceUrl,
            externalIdHash: identityHash,
          },
        });
      } catch (itemError) {
        if (!isImportItemRace(itemError)) throw itemError;
        const racedItem = await this.prisma.client.importItem.findFirst({
          where: { jobId, rowIndex },
          select: { result: true, responseId: true },
        });
        if (racedItem) return this.existingItemResult(racedItem);
        throw itemError;
      }
      return "DUPLICATE" as const;
    }
    await this.moderation.enqueueSubmission({ submissionId: responseId! });
    return "IMPORTED" as const;
  }
  private async existingItemResult(item: {
    result: "IMPORTED" | "DUPLICATE" | "SKIPPED" | "FAILED";
    responseId: string | null;
  }) {
    if (item.result === "IMPORTED") {
      if (!item.responseId)
        throw new ConflictException("Imported item is missing its response");
      await this.moderation.enqueueSubmission({
        submissionId: item.responseId,
      });
      return "IMPORTED" as const;
    }
    if (item.result === "DUPLICATE") return "DUPLICATE" as const;
    throw new ConflictException("Import item is not retryable");
  }
}
function manualIdentity(body: CreateManualImportBodyDto) {
  return createHash("sha256")
    .update(
      `${body.sourceUrl ?? "manual"}:${body.text.trim()}:${body.authorName ?? ""}`,
    )
    .digest("hex");
}
function sanitizeConfig(value: Record<string, unknown>) {
  return value as Prisma.InputJsonObject;
}
function isIdentityRace(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    hasUniqueTarget(
      error.meta?.target,
      ["projectId", "sourceKey", "externalIdHash"],
      "ResponseImportIdentity_projectId_sourceKey_externalIdHash_key",
    )
  );
}
function isImportItemRace(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    hasUniqueTarget(
      error.meta?.target,
      ["jobId", "rowIndex"],
      "ImportItem_jobId_rowIndex_key",
    )
  );
}
function hasUniqueTarget(
  target: unknown,
  fields: readonly string[],
  constraintName: string,
) {
  if (typeof target === "string") return target === constraintName;
  return (
    Array.isArray(target) &&
    (target.includes(constraintName) ||
      fields.every((field) => target.includes(field)))
  );
}
