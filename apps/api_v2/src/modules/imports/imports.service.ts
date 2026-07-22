import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
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
import { MediaService } from "../storage/media.service.js";
import { IMPORT_QUEUE } from "../queueing/queueing.constants.js";
import {
  CONNECTED_ACCOUNT_TOKEN_PROVIDER,
  type ConnectedAccountTokenProvider,
} from "../integrations/token-providers/connected-account-token-provider.js";
import {
  connectedImportPolicy,
  ConnectedImportProviderRegistry,
  type ConnectedImportSourceKey,
} from "./connected-import-providers.js";
import {
  ImportProviderError,
  type ImportProvider,
  type ImportProviderResource,
} from "./providers/official-import-providers.js";
import {
  candidateIdentityHash,
  candidateToResponseData,
  normalizeImportCandidate,
  type ImportCandidate,
} from "./import-normalization.js";
import {
  getImportSource,
  IMPORT_SOURCE_CATALOG,
  type ImportCatalogSource,
  type ImportMode,
} from "./import-source-catalog.js";
import type {
  CreateManualImportBodyDto,
  CreatePublicImportBodyDto,
  CreateSpreadsheetImportBodyDto,
  ImportJobsQueryDto,
} from "./imports.dto.js";
import { createPublicImportBodySchema } from "./imports.dto.js";
import { createSpreadsheetImportBodySchema } from "./imports.dto.js";
import { createManualImportBodySchema } from "./imports.dto.js";
import {
  enqueueImportJob,
  markImportDispatchPending,
} from "./import-queue-dispatcher.js";
import {
  previewSpreadsheet,
  rowsFromSpreadsheet,
  type SpreadsheetMapping,
} from "./spreadsheet-import.parser.js";
import { extractPublicProof } from "./public-proof-extractor.js";
import {
  fetchPublicImport,
  validatePublicImportUrl,
  type PublicImportHostPolicy,
} from "./safe-public-import-fetch.js";

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
  mediaAssetId: true,
  connectionId: true,
} satisfies Prisma.ImportJobSelect;
const CONNECTION_SELECT = {
  id: true,
  projectId: true,
  sourceKey: true,
  authStrategy: true,
  connectedByUserId: true,
  clerkProvider: true,
  externalAccountId: true,
  requestedScopes: true,
  config: true,
  enabled: true,
  autoSyncEnabled: true,
  cursor: true,
  lastSyncedAt: true,
  lastErrorCode: true,
  lastErrorMessage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ImportConnectionSelect;
const IMPORT_AUTO_SYNC_EVERY_MS = 21_600_000;
const IMPORT_CONNECTION_SCHEDULE_PREFIX = "connection:";
const MAX_RESOURCE_DISCOVERY_PAGES = 50;
const MAX_CONNECTED_IMPORT_ITEMS = 2_000;
const MAX_CONNECTED_IMPORT_PAGES = 100;
type ImportJobSummary = Prisma.ImportJobGetPayload<{
  select: typeof JOB_SELECT;
}>;

class ImportRetryRequiredError extends Error {}
export class ImportRetryAfterError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Import retry was delayed by the provider");
  }
}

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
    @Optional() @Inject(MediaService) private readonly media?: MediaService,
    @Optional()
    @Inject(CONNECTED_ACCOUNT_TOKEN_PROVIDER)
    private readonly connectedTokens?: ConnectedAccountTokenProvider,
    @Optional()
    @Inject(ConnectedImportProviderRegistry)
    private readonly connectedProviders?: ConnectedImportProviderRegistry,
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
  async previewSpreadsheet(
    projectId: string,
    assetId: string,
    sheetName?: string,
  ) {
    const source = await this.requireMedia().readImportSource(
      projectId,
      assetId,
    );
    return previewSpreadsheet(source.bytes, source.asset.storageKey, sheetName);
  }
  async createSpreadsheetImport(
    projectId: string,
    body: CreateSpreadsheetImportBodyDto,
    actor: ActorContext | null | undefined,
  ) {
    const input = createSpreadsheetImportBodySchema.parse(body);
    const source = await this.requireMedia().readImportSource(
      projectId,
      input.assetId,
    );
    // Validate the selected sheet and immutable mapping before reserving the asset.
    rowsFromSpreadsheet(source.bytes, source.asset.storageKey, input.mapping);
    let job: ImportJobSummary;
    try {
      job = await this.prisma.client.$transaction(async (tx) => {
        const created = await tx.importJob.create({
          data: {
            projectId,
            actorUserId: actor?.userId ?? null,
            mode: "SPREADSHEET",
            sourceKey: "spreadsheet",
            mediaAssetId: source.asset.id,
            config: sanitizeConfig({
              mapping: input.mapping,
              rightsConfirmed: true,
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
    } catch (error) {
      if (isMediaAssetReservationRace(error))
        throw new ConflictException("Import source is already reserved");
      throw error;
    }
    try {
      await enqueueImportJob(this.importQueue, job.id);
    } catch {
      await markImportDispatchPending(this.prisma, job.id).catch(
        () => undefined,
      );
    }
    return job;
  }
  async createPublicImport(
    projectId: string,
    body: CreatePublicImportBodyDto,
    mode: Extract<ImportMode, "PUBLIC_URL" | "MIGRATION">,
    actor: ActorContext | null | undefined,
  ) {
    const input = createPublicImportBodySchema.parse(body);
    const source = getImportSource(input.sourceKey);
    if (!source || !source.modes.includes(mode))
      throw new ConflictException(
        mode === "MIGRATION"
          ? "Import source does not allow wall migrations"
          : "Import source does not allow public URL imports",
      );
    let sourceUrl: string;
    try {
      sourceUrl = validatePublicImportUrl(
        input.sourceUrl,
        publicImportPolicy(source),
      ).toString();
    } catch {
      throw new ConflictException("Public import URL is not allowed");
    }
    const job = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.importJob.create({
        data: {
          projectId,
          actorUserId: actor?.userId ?? null,
          mode,
          sourceKey: source.key,
          config: sanitizeConfig({
            sourceUrl,
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
  async listConnections(projectId: string) {
    const connections = await this.prisma.client.importConnection.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: CONNECTION_SELECT,
    });
    return connections.map(publicConnection);
  }
  async listProviderResources(
    _projectId: string,
    sourceKey: string,
    query: { cursor?: string },
    actor: ActorContext | null | undefined,
  ) {
    const userId = requireConnectedUser(actor);
    const policy = connectedImportPolicy(sourceKey);
    const token = await this.requireConnectedTokens().getToken({
      userId,
      provider: policy.clerkProvider,
      requiredScopes: [...policy.requiredScopes],
      requireScopeEvidence: true,
    });
    const page = await this.requireConnectedProviders()
      .get(policy.sourceKey)
      .listResources(token.accessToken, query.cursor);
    return {
      items: page.items.map((resource) => {
        const bounded = boundedProviderResource(resource);
        return { id: bounded.id, label: bounded.label };
      }),
      nextCursor: page.nextCursor,
    };
  }
  async createConnection(
    projectId: string,
    input: {
      sourceKey: ConnectedImportSourceKey;
      resourceId: string;
      rightsConfirmed: true;
      autoSyncEnabled?: boolean;
    },
    actor: ActorContext | null | undefined,
  ) {
    const userId = requireConnectedUser(actor);
    const policy = connectedImportPolicy(input.sourceKey);
    const tokens = this.requireConnectedTokens();
    const token = await tokens.getToken({
      userId,
      provider: policy.clerkProvider,
      requiredScopes: [...policy.requiredScopes],
      requireScopeEvidence: true,
    });
    const resource = boundedProviderResource(
      await findProviderResource(
        this.requireConnectedProviders().get(policy.sourceKey),
        token.accessToken,
        input.resourceId,
      ),
    );
    const existing = await this.prisma.client.importConnection.findFirst({
      where: {
        projectId,
        sourceKey: policy.sourceKey,
        externalAccountId: resource.id,
      },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException("This import resource is already connected");
    let connection: Prisma.ImportConnectionGetPayload<{
      select: typeof CONNECTION_SELECT;
    }>;
    try {
      connection = await this.prisma.client.$transaction(async (tx) => {
        const created = await tx.importConnection.create({
          data: {
            projectId,
            sourceKey: policy.sourceKey,
            authStrategy: "CLERK_OAUTH",
            connectedByUserId: userId,
            clerkProvider: policy.clerkProvider,
            externalAccountId: resource.id,
            requestedScopes: [...policy.requiredScopes],
            config: sanitizeConfig({
              resourceId: resource.id,
              resourceLabel: resource.label,
              provider: boundedProviderConfig(resource.config),
              rightsConfirmed: input.rightsConfirmed,
            }),
            enabled: true,
            autoSyncEnabled: false,
          },
          select: CONNECTION_SELECT,
        });
        await this.actionAudit.recordWith(tx, {
          projectId,
          actor,
          action: "import.connection.created",
          targetType: "import_connection",
          targetId: created.id,
          metadata: { sourceKey: created.sourceKey },
        });
        return created;
      });
    } catch (error) {
      if (isImportConnectionRace(error))
        throw new ConflictException(
          "This import resource is already connected",
        );
      throw error;
    }
    if (input.autoSyncEnabled) {
      await this.upsertConnectionScheduler(connection.id);
      const updated = await this.prisma.client.importConnection.update({
        where: { id: connection.id },
        data: { autoSyncEnabled: true },
        select: CONNECTION_SELECT,
      });
      return publicConnection(updated);
    }
    return publicConnection(connection);
  }
  async updateConnection(
    projectId: string,
    connectionId: string,
    input: { autoSyncEnabled: boolean },
    actor: ActorContext | null | undefined,
  ) {
    const connection = await this.getConnection(projectId, connectionId);
    if (input.autoSyncEnabled && !connection.enabled)
      throw new ConflictException(
        "Enable the connection before enabling automatic sync",
      );
    if (input.autoSyncEnabled)
      await this.upsertConnectionScheduler(connection.id);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const result = await tx.importConnection.update({
        where: { id: connection.id },
        data: { autoSyncEnabled: input.autoSyncEnabled },
        select: CONNECTION_SELECT,
      });
      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "import.connection.updated",
        targetType: "import_connection",
        targetId: connection.id,
        metadata: { autoSyncEnabled: input.autoSyncEnabled },
      });
      return result;
    });
    if (!input.autoSyncEnabled)
      await this.removeConnectionScheduler(connection.id);
    return publicConnection(updated);
  }
  async syncConnection(
    projectId: string,
    connectionId: string,
    actor: ActorContext | null | undefined,
  ) {
    const connection = await this.getConnection(projectId, connectionId);
    if (!connection.enabled)
      throw new ConflictException("Import connection is disabled");
    const active = await this.prisma.client.importJob.findFirst({
      where: {
        connectionId: connection.id,
        status: { in: ["QUEUED", "RUNNING", "FAILED"] },
      },
      select: JOB_SELECT,
    });
    if (active) {
      if (active.status === "FAILED")
        await this.retryFailedImportQueueJob(active.id);
      return active;
    }
    const job = await this.createConnectedJob(connection, actor);
    try {
      await enqueueImportJob(this.importQueue, job.id);
    } catch {
      await markImportDispatchPending(this.prisma, job.id).catch(
        () => undefined,
      );
    }
    return job;
  }
  async enableConnection(
    projectId: string,
    connectionId: string,
    actor: ActorContext | null | undefined,
  ) {
    const connection = await this.getConnection(projectId, connectionId);
    if (connection.autoSyncEnabled)
      await this.upsertConnectionScheduler(connection.id);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const result = await tx.importConnection.update({
        where: { id: connection.id },
        data: { enabled: true },
        select: CONNECTION_SELECT,
      });
      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "import.connection.enabled",
        targetType: "import_connection",
        targetId: connection.id,
        metadata: { sourceKey: connection.sourceKey },
      });
      return result;
    });
    return publicConnection(updated);
  }
  async disableConnection(
    projectId: string,
    connectionId: string,
    actor: ActorContext | null | undefined,
  ) {
    const connection = await this.getConnection(projectId, connectionId);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const result = await tx.importConnection.update({
        where: { id: connection.id },
        data: { enabled: false },
        select: CONNECTION_SELECT,
      });
      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "import.connection.disabled",
        targetType: "import_connection",
        targetId: connection.id,
        metadata: { sourceKey: connection.sourceKey },
      });
      return result;
    });
    await this.removeConnectionScheduler(connection.id);
    return publicConnection(updated);
  }
  async deleteConnection(
    projectId: string,
    connectionId: string,
    actor: ActorContext | null | undefined,
  ) {
    const connection = await this.getConnection(projectId, connectionId);
    await this.prisma.client.$transaction(async (tx) => {
      await tx.importConnection.delete({ where: { id: connection.id } });
      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "import.connection.deleted",
        targetType: "import_connection",
        targetId: connection.id,
        metadata: { sourceKey: connection.sourceKey },
      });
    });
    await this.removeConnectionScheduler(connection.id);
    return { deleted: true };
  }
  async process(jobId: string): Promise<unknown> {
    if (jobId.startsWith(IMPORT_CONNECTION_SCHEDULE_PREFIX))
      return this.processScheduledConnection(
        jobId.slice(IMPORT_CONNECTION_SCHEDULE_PREFIX.length),
      );
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
        mapping?: SpreadsheetMapping;
        sourceUrl?: string;
        rightsConfirmed?: boolean;
      } | null;
      if (job.mode === "SPREADSHEET")
        return await this.processSpreadsheet(job, config);
      if (job.mode === "PUBLIC_URL" || job.mode === "MIGRATION")
        return await this.processPublicImport(job, config);
      if (job.mode === "CONNECTED_API")
        return await this.processConnectedImport(job);
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
    } catch (error) {
      await this.prisma.client.importJob.update({
        where: { id: job.id },
        data:
          job.mode === "CONNECTED_API"
            ? {
                status: "FAILED",
                errorCode: "IMPORT_FAILED",
                errorMessage: "The import could not be completed.",
                completedAt: new Date(),
              }
            : {
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
      if (
        job.mode === "CONNECTED_API" &&
        error instanceof ImportProviderError &&
        error.retryAfterMs
      )
        throw new ImportRetryAfterError(error.retryAfterMs);
      throw new Error("Import failed");
    }
    return this.getJob(job.projectId, job.id);
  }
  private async processSpreadsheet(
    job: {
      id: string;
      projectId: string;
      sourceKey: string;
      mediaAssetId: string | null;
    },
    config: { mapping?: SpreadsheetMapping; rightsConfirmed?: boolean } | null,
  ) {
    if (!job.mediaAssetId || !config?.mapping)
      throw new ConflictException(
        "Spreadsheet import configuration is invalid",
      );
    const source = await this.requireMedia().readImportSource(
      job.projectId,
      job.mediaAssetId,
    );
    const candidates = rowsFromSpreadsheet(
      source.bytes,
      source.asset.storageKey,
      config.mapping,
    );
    let imported = 0;
    let duplicate = 0;
    let failed = 0;
    for (const [rowIndex, candidate] of candidates.entries()) {
      try {
        const result = await this.persistCandidate(
          job.id,
          job.projectId,
          job.sourceKey,
          candidate,
          config.rightsConfirmed === true,
          rowIndex,
        );
        if (result === "IMPORTED") imported++;
        else duplicate++;
      } catch (error) {
        if (error instanceof ImportRetryRequiredError) throw error;
        await this.recordFailedItem(job, candidate, rowIndex);
        failed++;
      }
    }
    await this.prisma.client.importJob.update({
      where: { id: job.id },
      data: {
        status: failed ? "PARTIAL" : "SUCCEEDED",
        totalCount: candidates.length,
        importedCount: imported,
        duplicateCount: duplicate,
        skippedCount: 0,
        failedCount: failed,
        completedAt: new Date(),
      },
    });
    const result = await this.getJob(job.projectId, job.id);
    await this.requireMedia().cleanupImportSource(job.mediaAssetId);
    return result;
  }
  private async processPublicImport(
    job: {
      id: string;
      projectId: string;
      sourceKey: string;
      mode: string;
    },
    config: { sourceUrl?: string; rightsConfirmed?: boolean } | null,
  ) {
    const source = getImportSource(job.sourceKey);
    if (!source || !config?.sourceUrl)
      throw new ConflictException("Public import configuration is invalid");
    const fetched = await fetchPublicImport(
      config.sourceUrl,
      publicImportPolicy(source),
    );
    const candidates = extractPublicProof(
      fetched.body,
      { sourceKey: job.sourceKey, sourceUrl: fetched.url },
      fetched.contentType,
      job.mode === "MIGRATION" ? 2_000 : 20,
    );
    if (!candidates.length)
      throw new ConflictException(
        "No importable public proof was found at this URL",
      );
    let imported = 0;
    let duplicate = 0;
    let failed = 0;
    for (const [rowIndex, candidate] of candidates.entries()) {
      try {
        const result = await this.persistCandidate(
          job.id,
          job.projectId,
          job.sourceKey,
          candidate,
          config.rightsConfirmed === true,
          rowIndex,
        );
        if (result === "IMPORTED") imported++;
        else duplicate++;
      } catch (error) {
        if (error instanceof ImportRetryRequiredError) throw error;
        await this.recordFailedItem(job, candidate, rowIndex);
        failed++;
      }
    }
    await this.prisma.client.importJob.update({
      where: { id: job.id },
      data: {
        status: failed ? "PARTIAL" : "SUCCEEDED",
        totalCount: candidates.length,
        importedCount: imported,
        duplicateCount: duplicate,
        skippedCount: 0,
        failedCount: failed,
        completedAt: new Date(),
      },
    });
    return this.getJob(job.projectId, job.id);
  }
  private async processConnectedImport(job: {
    id: string;
    projectId: string;
    sourceKey: string;
    connectionId: string | null;
    config: Prisma.JsonValue | null;
    importedCount: number;
    duplicateCount: number;
    failedCount: number;
  }) {
    if (!job.connectionId)
      throw new ConflictException("Connected import is missing its connection");
    const connection = await this.getConnection(
      job.projectId,
      job.connectionId,
    );
    if (!connection.enabled)
      throw new ConflictException("Import connection is disabled");
    const policy = connectedImportPolicy(connection.sourceKey);
    if (!connection.connectedByUserId)
      throw new ConflictException("Import connection has no connected user");
    const config = connectedConnectionConfig(connection.config);
    const checkpoint = connectedJobCheckpoint(job.config, connection.cursor);
    try {
      const token = await this.requireConnectedTokens().getToken({
        userId: connection.connectedByUserId,
        provider: policy.clerkProvider,
        requiredScopes: [...policy.requiredScopes],
        requireScopeEvidence: true,
      });
      const provider = this.requireConnectedProviders().get(policy.sourceKey);
      let cursor = checkpoint.cursor ?? undefined;
      const seenCursors = new Set<string>();
      let imported = job.importedCount;
      let duplicate = job.duplicateCount;
      let failed = job.failedCount;
      let total = checkpoint.rowOffset;
      for (
        let pageIndex = 0;
        pageIndex < MAX_CONNECTED_IMPORT_PAGES;
        pageIndex++
      ) {
        if (cursor && seenCursors.has(cursor))
          throw new ImportProviderError(
            "PROVIDER_INVALID_RESPONSE",
            "Provider returned an invalid pagination cursor",
          );
        if (cursor) seenCursors.add(cursor);
        const pageCursor = cursor;
        const enabledFence =
          await this.prisma.client.importConnection.findFirst({
            where: {
              id: connection.id,
              projectId: job.projectId,
              enabled: true,
              ...(checkpoint.scheduled ? { autoSyncEnabled: true } : {}),
            },
            select: { id: true },
          });
        if (!enabledFence)
          throw new ConflictException("Import connection is disabled");
        const page = await provider.fetchCandidates(
          token.accessToken,
          config.provider,
          cursor,
        );
        const remaining = MAX_CONNECTED_IMPORT_ITEMS - total;
        const candidates = page.candidates.slice(0, remaining);
        for (const candidate of candidates) {
          const rowIndex = total++;
          try {
            const result = await this.persistCandidate(
              job.id,
              job.projectId,
              policy.sourceKey,
              candidate,
              config.rightsConfirmed,
              rowIndex,
            );
            if (result === "IMPORTED") imported++;
            else duplicate++;
          } catch (error) {
            if (error instanceof ImportRetryRequiredError) throw error;
            await this.recordFailedItem(job, candidate, rowIndex);
            failed++;
          }
        }
        const pageWasTruncated = candidates.length < page.candidates.length;
        cursor = pageWasTruncated ? pageCursor : (page.nextCursor ?? undefined);
        const terminalPage =
          pageWasTruncated ||
          !page.nextCursor ||
          total >= MAX_CONNECTED_IMPORT_ITEMS;
        if (!terminalPage)
          await this.prisma.client.importJob.update({
            where: { id: job.id },
            data: {
              config: sanitizeConfig({
                connectionSnapshotVersion: 1,
                cursor: cursor ?? null,
                rowOffset: total,
                scheduled: checkpoint.scheduled,
              }),
              totalCount: total,
              importedCount: imported,
              duplicateCount: duplicate,
              failedCount: failed,
            },
          });
        if (terminalPage) break;
        if (pageIndex === MAX_CONNECTED_IMPORT_PAGES - 1)
          throw new ImportProviderError(
            "PROVIDER_INVALID_RESPONSE",
            "Provider pagination exceeded the safe limit",
          );
      }
      const completedAt = new Date();
      await this.prisma.client.$transaction(async (tx) => {
        await tx.importJob.update({
          where: { id: job.id },
          data: {
            status: failed ? "PARTIAL" : "SUCCEEDED",
            config: sanitizeConfig({
              connectionSnapshotVersion: 1,
              cursor: cursor ?? null,
              rowOffset: total,
              scheduled: checkpoint.scheduled,
              terminal: true,
            }),
            totalCount: total,
            importedCount: imported,
            duplicateCount: duplicate,
            skippedCount: 0,
            failedCount: failed,
            completedAt,
          },
        });
        await tx.importConnection.update({
          where: { id: connection.id },
          data: {
            cursor: cursor ?? null,
            lastSyncedAt: completedAt,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });
      });
      return this.getJob(job.projectId, job.id);
    } catch (error) {
      const failure = connectedImportFailure(error);
      await this.prisma.client.importConnection.updateMany({
        where: { id: connection.id, projectId: job.projectId },
        data: {
          lastErrorCode: failure.code,
          lastErrorMessage: failure.message,
        },
      });
      throw error;
    }
  }
  private async recordFailedItem(
    job: { id: string; projectId: string; sourceKey: string },
    candidateInput: ImportCandidate,
    rowIndex: number,
  ) {
    let externalId = candidateInput.externalId.trim().slice(0, 512);
    let sourceUrl: string | null = null;
    try {
      const candidate = normalizeImportCandidate(candidateInput, job.sourceKey);
      externalId = candidate.externalId;
      sourceUrl = candidate.sourceUrl;
    } catch {
      // Invalid row data is represented by the bounded failure item only.
    }
    if (!externalId) externalId = `row-${rowIndex}`;
    const existing = await this.prisma.client.importItem.findFirst({
      where: { jobId: job.id, rowIndex },
      select: { result: true, responseId: true },
    });
    if (existing?.result === "IMPORTED")
      throw new ImportRetryRequiredError("Imported row requires retry");
    if (existing) return;
    try {
      await this.prisma.client.importItem.create({
        data: {
          jobId: job.id,
          rowIndex,
          result: "FAILED",
          sourceUrl,
          externalIdHash: candidateIdentityHash(job.sourceKey, {
            externalId,
          }),
          errorCode: "ROW_IMPORT_FAILED",
          errorMessage: "This row could not be imported.",
        },
      });
    } catch (error) {
      if (!isImportItemRace(error)) throw error;
      const raced = await this.prisma.client.importItem.findFirst({
        where: { jobId: job.id, rowIndex },
        select: { result: true, responseId: true },
      });
      if (raced?.result === "IMPORTED")
        throw new ImportRetryRequiredError("Imported row requires retry");
      if (!raced) throw error;
    }
  }
  private requireMedia() {
    if (!this.media)
      throw new ConflictException("Import media storage is unavailable");
    return this.media;
  }
  private requireConnectedTokens() {
    if (!this.connectedTokens)
      throw new ConflictException("Connected account access is unavailable");
    return this.connectedTokens;
  }
  private requireConnectedProviders() {
    if (!this.connectedProviders)
      throw new ConflictException("Connected import providers are unavailable");
    return this.connectedProviders;
  }
  private async getConnection(projectId: string, connectionId: string) {
    const connection = await this.prisma.client.importConnection.findFirst({
      where: { id: connectionId, projectId },
      select: CONNECTION_SELECT,
    });
    if (!connection) throw new NotFoundException("Import connection not found");
    return connection;
  }
  private async createConnectedJob(
    connection: Prisma.ImportConnectionGetPayload<{
      select: typeof CONNECTION_SELECT;
    }>,
    actor: ActorContext | null | undefined,
    scheduled = false,
  ) {
    return this.prisma.client.$transaction(async (tx) => {
      const job = await tx.importJob.create({
        data: {
          projectId: connection.projectId,
          actorUserId: actor?.userId ?? connection.connectedByUserId,
          mode: "CONNECTED_API",
          sourceKey: connection.sourceKey,
          connectionId: connection.id,
          config: sanitizeConfig({
            connectionSnapshotVersion: 1,
            cursor: connection.cursor,
            rowOffset: 0,
            scheduled,
          }),
        },
        select: JOB_SELECT,
      });
      await this.actionAudit.recordWith(tx, {
        projectId: connection.projectId,
        actor,
        action: "import.job.created",
        targetType: "import_job",
        targetId: job.id,
        metadata: { mode: job.mode, sourceKey: job.sourceKey },
      });
      return job;
    });
  }
  private async processScheduledConnection(
    connectionId: string,
  ): Promise<unknown> {
    const connection = await this.prisma.client.importConnection.findUnique({
      where: { id: connectionId },
      select: CONNECTION_SELECT,
    });
    if (!connection?.enabled || !connection.autoSyncEnabled) return null;
    const active = await this.prisma.client.importJob.findFirst({
      where: {
        connectionId,
        status: { in: ["QUEUED", "RUNNING", "FAILED"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    if (active) {
      if (active.status === "FAILED")
        await this.retryFailedImportQueueJob(active.id);
      return active;
    }
    const job = await this.createConnectedJob(connection, null, true);
    try {
      await enqueueImportJob(this.importQueue, job.id);
    } catch {
      await markImportDispatchPending(this.prisma, job.id).catch(
        () => undefined,
      );
    }
    return job;
  }
  private upsertConnectionScheduler(connectionId: string) {
    return this.importQueue.upsertJobScheduler(
      `import-${connectionId}`,
      { every: IMPORT_AUTO_SYNC_EVERY_MS },
      {
        name: "import-connected-sync",
        data: {
          jobId: `${IMPORT_CONNECTION_SCHEDULE_PREFIX}${connectionId}`,
        },
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    );
  }
  private removeConnectionScheduler(connectionId: string) {
    return this.importQueue.removeJobScheduler(`import-${connectionId}`);
  }
  private async retryFailedImportQueueJob(jobId: string) {
    const queued = await this.importQueue.getJob(`import-${jobId}`);
    if (!queued) {
      await enqueueImportJob(this.importQueue, jobId);
      return;
    }
    if ((await queued.getState()) === "failed") await queued.retry();
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
    const candidate = normalizeImportCandidate(candidateInput, sourceKey);
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
    try {
      await this.moderation.enqueueSubmission({ submissionId: responseId! });
    } catch {
      throw new ImportRetryRequiredError("Imported row requires retry");
    }
    return "IMPORTED" as const;
  }
  private async existingItemResult(item: {
    result: "IMPORTED" | "DUPLICATE" | "SKIPPED" | "FAILED";
    responseId: string | null;
  }) {
    if (item.result === "IMPORTED") {
      if (!item.responseId)
        throw new ConflictException("Imported item is missing its response");
      try {
        await this.moderation.enqueueSubmission({
          submissionId: item.responseId,
        });
      } catch {
        throw new ImportRetryRequiredError("Imported row requires retry");
      }
      return "IMPORTED" as const;
    }
    if (item.result === "DUPLICATE") return "DUPLICATE" as const;
    throw new ConflictException("Import item is not retryable");
  }
}
function publicImportPolicy(
  source: ImportCatalogSource,
): PublicImportHostPolicy {
  return {
    sourceKey: source.key,
    exactHosts: source.publicHosts,
    suffixHosts: [],
  };
}
function requireConnectedUser(actor: ActorContext | null | undefined) {
  if (actor?.actorType !== "user" || !actor.userId)
    throw new ForbiddenException(
      "Connected imports require an authenticated user account",
    );
  return actor.userId;
}
async function findProviderResource(
  provider: ImportProvider,
  token: string,
  resourceId: string,
) {
  let cursor: string | undefined;
  const seen = new Set<string>();
  for (
    let pageIndex = 0;
    pageIndex < MAX_RESOURCE_DISCOVERY_PAGES;
    pageIndex++
  ) {
    const page = await provider.listResources(token, cursor);
    const resource = page.items.find((item) => item.id === resourceId);
    if (resource) return resource;
    if (!page.nextCursor) break;
    if (seen.has(page.nextCursor))
      throw new ConflictException("Provider resource pagination is invalid");
    seen.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  throw new NotFoundException("Connected import resource not found");
}
function boundedProviderConfig(config: Record<string, string>) {
  const entries = Object.entries(config);
  if (
    entries.length > 20 ||
    entries.some(
      ([key, value]) =>
        !key.trim() ||
        key.length > 120 ||
        !value.trim() ||
        value.length > 2_048,
    )
  )
    throw new ConflictException("Provider resource configuration is invalid");
  return Object.fromEntries(entries);
}
function boundedProviderResource(resource: ImportProviderResource) {
  const id = resource.id.trim();
  const label = resource.label.trim();
  if (!id || id.length > 255 || !label || label.length > 255)
    throw new ImportProviderError(
      "PROVIDER_INVALID_RESPONSE",
      "Provider returned an invalid resource",
    );
  return {
    id,
    label,
    config: boundedProviderConfig(resource.config),
  };
}
function connectedConnectionConfig(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ConflictException("Import connection configuration is invalid");
  const config = value as Record<string, unknown>;
  const providerEntries =
    config.provider &&
    typeof config.provider === "object" &&
    !Array.isArray(config.provider)
      ? Object.entries(config.provider)
      : [];
  if (
    config.rightsConfirmed !== true ||
    !providerEntries.length ||
    providerEntries.some(([, entryValue]) => typeof entryValue !== "string")
  )
    throw new ConflictException("Import connection configuration is invalid");
  return {
    rightsConfirmed: true,
    provider: boundedProviderConfig(
      Object.fromEntries(providerEntries) as Record<string, string>,
    ),
  } as const;
}
function connectedJobCheckpoint(
  value: Prisma.JsonValue | null,
  fallbackCursor: string | null,
) {
  const config =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const cursor =
    typeof config.cursor === "string" && config.cursor.length <= 4_096
      ? config.cursor
      : config.cursor === null
        ? null
        : fallbackCursor;
  const rowOffset =
    typeof config.rowOffset === "number" &&
    Number.isSafeInteger(config.rowOffset) &&
    config.rowOffset >= 0 &&
    config.rowOffset < MAX_CONNECTED_IMPORT_ITEMS
      ? config.rowOffset
      : 0;
  return { cursor, rowOffset, scheduled: config.scheduled === true };
}
function publicConnection(
  connection: Prisma.ImportConnectionGetPayload<{
    select: typeof CONNECTION_SELECT;
  }>,
) {
  const config =
    connection.config &&
    typeof connection.config === "object" &&
    !Array.isArray(connection.config)
      ? (connection.config as Record<string, unknown>)
      : {};
  return {
    id: connection.id,
    projectId: connection.projectId,
    sourceKey: connection.sourceKey,
    authStrategy: connection.authStrategy,
    resourceId:
      typeof config.resourceId === "string" ? config.resourceId : null,
    resourceLabel:
      typeof config.resourceLabel === "string" ? config.resourceLabel : null,
    enabled: connection.enabled,
    autoSyncEnabled: connection.autoSyncEnabled,
    lastSyncedAt: connection.lastSyncedAt,
    lastErrorCode: connection.lastErrorCode,
    lastErrorMessage: connection.lastErrorMessage,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}
function connectedImportFailure(error: unknown) {
  if (error instanceof ImportProviderError)
    return {
      code: error.code,
      message:
        error.code === "PROVIDER_RATE_LIMITED"
          ? "The provider rate limit was reached. The sync will be retried."
          : error.code === "REAUTHORIZATION_REQUIRED"
            ? "Reconnect this provider to continue syncing."
            : "The provider could not complete this sync.",
    };
  if (error instanceof ForbiddenException)
    return {
      code: "REAUTHORIZATION_REQUIRED",
      message: "Reconnect this provider to continue syncing.",
    };
  return {
    code: "CONNECTED_IMPORT_FAILED",
    message: "The connected import could not be completed.",
  };
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
function isMediaAssetReservationRace(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    hasUniqueTarget(
      error.meta?.target,
      ["mediaAssetId"],
      "ImportJob_mediaAssetId_key",
    )
  );
}
function isImportConnectionRace(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    hasUniqueTarget(
      error.meta?.target,
      ["projectId", "sourceKey", "externalAccountId"],
      "ImportConnection_projectId_sourceKey_externalAccountId_key",
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
