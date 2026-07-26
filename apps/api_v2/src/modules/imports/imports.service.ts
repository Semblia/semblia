import {
  ConflictException,
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
import { ProjectAccessService } from "../../common/authz/project-access.service.js";
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
} from "./connected-import-providers.js";
import { OfficialUrlImportProviderRegistry } from "./providers/official-url-import-providers.js";
import {
  ImportCandidatePersistence,
  type PersistImportCandidateInput,
} from "./import-candidate-persistence.js";
import { ImportConnectionRuntime } from "./import-connection-runtime.js";
import { ImportProcessingRuntime } from "./import-processing-runtime.js";
import {
  boundedProviderConfig,
  boundedProviderResource,
  findProviderResource,
  isActiveImportConnectionJobRace,
  isImportConnectionRace,
  isMediaAssetReservationRace,
  manualIdentity,
  publicConnectionMode,
  publicImportPolicy,
  requireImportBytes,
  requireConnectedUser,
  sanitizeConfig,
} from "./import-service-support.js";
import {
  getImportSource,
  IMPORT_SOURCE_CATALOG,
  type ImportCatalogSource,
  type ImportMode,
} from "./import-source-catalog.js";
import type {
  CreateManualImportBodyDto,
  CreateImportConnectionBodyDto,
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
  retryFailedImportQueueJob,
} from "./import-queue-dispatcher.js";
import {
  previewSpreadsheet,
  rowsFromSpreadsheet,
} from "./spreadsheet-import.parser.js";
import { validatePublicImportUrl } from "./safe-public-import-fetch.js";

export { IMPORT_QUEUE } from "../queueing/queueing.constants.js";
export type ImportJobQueuePayload = { jobId: string };
export {
  IMPORT_JOB_STALE_AFTER_MS,
  ImportRetryAfterError,
} from "./import-processing-runtime.js";
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
const CONNECTION_SELECT = {
  id: true,
  projectId: true,
  sourceKey: true,
  authStrategy: true,
  connectedByUserId: true,
  clerkProvider: true,
  externalAccountId: true,
  publicUrl: true,
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
  project: {
    select: {
      slug: true,
      organization: { select: { clerkOrgId: true } },
    },
  },
} satisfies Prisma.ImportConnectionSelect;
const IMPORT_AUTO_SYNC_EVERY_MS = 21_600_000;
const IMPORT_CONNECTION_SCHEDULE_PREFIX = "connection:";
type ImportJobSummary = Prisma.ImportJobGetPayload<{
  select: typeof JOB_SELECT;
}>;
type ImportActor = ActorContext | null | undefined;
type ConnectionActionInput = {
  projectId: string;
  connectionId: string;
  actor: ImportActor;
};
@Injectable()
export class ImportsService {
  private readonly candidatePersistence: ImportCandidatePersistence;
  private readonly connectionRuntime: ImportConnectionRuntime;
  private readonly processingRuntime: ImportProcessingRuntime;

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
    @Optional()
    @Inject(OfficialUrlImportProviderRegistry)
    private readonly officialUrlProviders?: OfficialUrlImportProviderRegistry,
    @Optional()
    @Inject(ProjectAccessService)
    private readonly projectAccess?: ProjectAccessService,
  ) {
    this.candidatePersistence = new ImportCandidatePersistence(
      this.prisma,
      this.moderation,
    );
    this.connectionRuntime = new ImportConnectionRuntime({
      prisma: this.prisma,
      importQueue: this.importQueue,
      connectedTokens: this.connectedTokens,
      projectAccess: this.projectAccess,
    });
    this.processingRuntime = new ImportProcessingRuntime({
      prisma: this.prisma,
      media: this.media,
      connectedTokens: this.connectedTokens,
      connectedProviders: this.connectedProviders,
      officialUrlProviders: this.officialUrlProviders,
      requireConnectionFence: (connection, scheduled) =>
        this.connectionRuntime.requireConnectionFence(connection, scheduled),
      requireConnectedConnectionFence: (connection, scheduled) =>
        this.connectionRuntime.requireConnectedConnectionFence(
          connection,
          scheduled,
        ),
      getConnection: (projectId, connectionId) =>
        this.getConnection({ projectId, connectionId }),
      getJob: (projectId, jobId) => this.getJob({ projectId, jobId }),
      persistCandidate: (input) => this.persistCandidate(input),
    });
  }
  catalog() {
    return IMPORT_SOURCE_CATALOG.map((source) =>
      this.publicAutomationAvailable(source) &&
      source.reasonCode === "SERVER_PROVIDER_CREDENTIAL_REQUIRED"
        ? {
            ...source,
            availability: "AVAILABLE" as const,
            reasonCode: null,
            reason: null,
          }
        : source,
    );
  }
  async createManualImport(request: {
    projectId: string;
    body: CreateManualImportBodyDto;
    actor: ImportActor;
  }) {
    const { projectId, body, actor } = request;
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
  async previewSpreadsheet(request: {
    projectId: string;
    assetId: string;
    sheetName?: string;
  }) {
    const { projectId, assetId, sheetName } = request;
    const source = await this.requireMedia().readImportSource({
      projectId,
      assetId,
    });
    return previewSpreadsheet(
      requireImportBytes(source.bytes),
      source.asset.storageKey,
      sheetName,
    );
  }
  async createSpreadsheetImport(request: {
    projectId: string;
    body: CreateSpreadsheetImportBodyDto;
    actor: ImportActor;
  }) {
    const { projectId, body, actor } = request;
    const input = createSpreadsheetImportBodySchema.parse(body);
    const importSource = getImportSource(input.sourceKey);
    if (!importSource || !importSource.modes.includes("SPREADSHEET"))
      throw new ConflictException(
        "Import source does not allow spreadsheet imports",
      );
    const source = await this.requireMedia().readImportSource({
      projectId,
      assetId: input.assetId,
    });
    // Validate the selected sheet and immutable mapping before reserving the asset.
    rowsFromSpreadsheet(
      requireImportBytes(source.bytes),
      source.asset.storageKey,
      input.mapping,
    );
    let job: ImportJobSummary;
    try {
      job = await this.createAuditedImportJob({
        projectId,
        actor,
        mode: "SPREADSHEET",
        sourceKey: importSource.key,
        mediaAssetId: source.asset.id,
        config: sanitizeConfig({
          mapping: input.mapping,
          rightsConfirmed: true,
        }),
      });
    } catch (error) {
      if (isMediaAssetReservationRace(error))
        throw new ConflictException("Import source is already reserved");
      throw error;
    }
    await this.dispatchImportJob({ jobId: job.id });
    return job;
  }
  async createPublicImport(request: {
    projectId: string;
    body: CreatePublicImportBodyDto;
    mode: Extract<ImportMode, "PUBLIC_URL" | "MIGRATION">;
    actor: ImportActor;
  }) {
    const { projectId, body, mode, actor } = request;
    const input = createPublicImportBodySchema.parse(body);
    const source = getImportSource(input.sourceKey);
    if (!source || !source.modes.includes(mode))
      throw new ConflictException(
        mode === "MIGRATION"
          ? "Import source does not allow wall migrations"
          : "Import source does not allow public URL imports",
      );
    if (!this.publicAutomationAvailable(source))
      throw new ConflictException("This public source is not available");
    let sourceUrl: string;
    try {
      sourceUrl = validatePublicImportUrl(
        input.sourceUrl,
        publicImportPolicy(source),
      ).toString();
    } catch {
      throw new ConflictException("Public import URL is not allowed");
    }
    const job = await this.createAuditedImportJob({
      projectId,
      actor,
      mode,
      sourceKey: source.key,
      config: sanitizeConfig({
        sourceUrl,
        rightsConfirmed: input.rightsConfirmed,
      }),
    });
    await this.dispatchImportJob({ jobId: job.id });
    return job;
  }
  async listJobs(request: { projectId: string; query: ImportJobsQueryDto }) {
    const { projectId, query } = request;
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
  async getJob(request: { projectId: string; jobId: string }) {
    const { projectId, jobId } = request;
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
  async listConnections(request: { projectId: string }) {
    const { projectId } = request;
    const connections = await this.prisma.client.importConnection.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: CONNECTION_SELECT,
    });
    return connections.map(publicConnection);
  }
  async listProviderResources(request: {
    projectId: string;
    sourceKey: string;
    query: { cursor?: string };
    actor: ImportActor;
  }) {
    const { sourceKey, query, actor } = request;
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
  async createConnection(request: {
    projectId: string;
    input: CreateImportConnectionBodyDto;
    actor: ImportActor;
  }) {
    const { projectId, input, actor } = request;
    if ("mode" in input)
      return this.createPublicConnection({ projectId, input, actor });
    return this.createConnectedConnection({ projectId, input, actor });
  }
  private async createConnectedConnection(request: {
    projectId: string;
    input: Exclude<
      CreateImportConnectionBodyDto,
      { mode: "PUBLIC_URL" | "MIGRATION" }
    >;
    actor: ImportActor;
  }) {
    const { projectId, input, actor } = request;
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
      await this.upsertConnectionScheduler({ connectionId: connection.id });
      const updated = await this.prisma.client.importConnection.update({
        where: { id: connection.id },
        data: { autoSyncEnabled: true },
        select: CONNECTION_SELECT,
      });
      return publicConnection(updated);
    }
    return publicConnection(connection);
  }
  private async createPublicConnection(request: {
    projectId: string;
    input: Extract<
      CreateImportConnectionBodyDto,
      { mode: "PUBLIC_URL" | "MIGRATION" }
    >;
    actor: ImportActor;
  }) {
    const { projectId, input, actor } = request;
    const source = getImportSource(input.sourceKey);
    if (!source || !source.modes.includes(input.mode))
      throw new ConflictException(
        "This source does not support that import mode",
      );
    if (!this.publicAutomationAvailable(source))
      throw new ConflictException("This public source is not available");
    const sourceUrl = validatePublicImportUrl(
      input.sourceUrl,
      publicImportPolicy(source),
    ).toString();
    await this.previewPublicConnection({
      source,
      sourceUrl,
      mode: input.mode,
    });
    const externalAccountId = createHash("sha256")
      .update(`${input.mode}:${sourceUrl}`)
      .digest("hex");
    const existing = await this.prisma.client.importConnection.findFirst({
      where: { projectId, sourceKey: source.key, externalAccountId },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException("This public URL is already connected");
    let connection: Prisma.ImportConnectionGetPayload<{
      select: typeof CONNECTION_SELECT;
    }>;
    try {
      connection = await this.prisma.client.$transaction(async (tx) => {
        const created = await tx.importConnection.create({
          data: {
            projectId,
            sourceKey: source.key,
            authStrategy: "PUBLIC_URL",
            externalAccountId,
            publicUrl: sourceUrl,
            requestedScopes: [],
            enabled: true,
            autoSyncEnabled: false,
            config: sanitizeConfig({
              sourceUrl,
              mode: input.mode,
              rightsConfirmed: true,
              resourceLabel: new URL(sourceUrl).hostname,
            }),
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
        throw new ConflictException("This public URL is already connected");
      throw error;
    }
    if (!input.autoSyncEnabled) return publicConnection(connection);
    await this.upsertConnectionScheduler({ connectionId: connection.id });
    return publicConnection(
      await this.prisma.client.importConnection.update({
        where: { id: connection.id },
        data: { autoSyncEnabled: true },
        select: CONNECTION_SELECT,
      }),
    );
  }
  async updateConnection(
    request: ConnectionActionInput & {
      input: { autoSyncEnabled: boolean };
    },
  ) {
    const { projectId, connectionId, input, actor } = request;
    const connection = await this.getConnection({ projectId, connectionId });
    if (input.autoSyncEnabled && !connection.enabled)
      throw new ConflictException(
        "Enable the connection before enabling automatic sync",
      );
    if (input.autoSyncEnabled)
      await this.upsertConnectionScheduler({ connectionId: connection.id });
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
      await this.removeConnectionScheduler({ connectionId: connection.id });
    return publicConnection(updated);
  }
  async syncConnection(request: ConnectionActionInput) {
    const { projectId, connectionId, actor } = request;
    const connection = await this.getConnection({ projectId, connectionId });
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
        await this.retryFailedImportQueueJob({ jobId: active.id });
      return active;
    }
    const job = await this.createConnectionJob({ connection, actor });
    try {
      await enqueueImportJob(this.importQueue, job.id);
    } catch {
      await markImportDispatchPending(this.prisma, job.id).catch(
        () => undefined,
      );
    }
    return job;
  }
  async changeConnectionState(
    request: ConnectionActionInput & {
      operation: "ENABLE" | "DISABLE" | "DELETE";
    },
  ) {
    const { projectId, connectionId, actor, operation } = request;
    const connection = await this.getConnection({ projectId, connectionId });
    if (operation === "ENABLE" && connection.autoSyncEnabled)
      await this.upsertConnectionScheduler({ connectionId: connection.id });
    if (operation === "DELETE") {
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
      await this.removeConnectionScheduler({ connectionId: connection.id });
      return { deleted: true };
    }
    const enabled = operation === "ENABLE";
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const result = await tx.importConnection.update({
        where: { id: connection.id },
        data: { enabled },
        select: CONNECTION_SELECT,
      });
      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: enabled
          ? "import.connection.enabled"
          : "import.connection.disabled",
        targetType: "import_connection",
        targetId: connection.id,
        metadata: { sourceKey: connection.sourceKey },
      });
      return result;
    });
    if (!enabled)
      await this.removeConnectionScheduler({ connectionId: connection.id });
    return publicConnection(updated);
  }
  async process(jobId: string): Promise<unknown> {
    if (jobId.startsWith(IMPORT_CONNECTION_SCHEDULE_PREFIX))
      return this.processScheduledConnection({
        connectionId: jobId.slice(IMPORT_CONNECTION_SCHEDULE_PREFIX.length),
      });
    return this.processingRuntime.process(jobId);
  }
  private async previewPublicConnection(request: {
    source: ImportCatalogSource;
    sourceUrl: string;
    mode: "PUBLIC_URL" | "MIGRATION";
  }) {
    const { source, sourceUrl, mode } = request;
    return this.processingRuntime.previewPublicConnection(
      source,
      sourceUrl,
      mode,
    );
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
  private publicAutomationAvailable(source: ImportCatalogSource) {
    return (
      source.availability === "AVAILABLE" ||
      (source.reasonCode === "SERVER_PROVIDER_CREDENTIAL_REQUIRED" &&
        this.officialUrlProviders?.isConfigured?.(source.key) === true)
    );
  }
  private async getConnection(request: {
    projectId: string;
    connectionId: string;
  }) {
    const { projectId, connectionId } = request;
    const connection = await this.prisma.client.importConnection.findFirst({
      where: { id: connectionId, projectId },
      select: CONNECTION_SELECT,
    });
    if (!connection) throw new NotFoundException("Import connection not found");
    return connection;
  }
  private async createAuditedImportJob(input: {
    projectId: string;
    actor: ActorContext | null | undefined;
    mode: Prisma.ImportJobCreateInput["mode"];
    sourceKey: string;
    config: Prisma.InputJsonObject;
    mediaAssetId?: string;
  }): Promise<ImportJobSummary> {
    return this.prisma.client.$transaction(async (tx) => {
      const created = await tx.importJob.create({
        data: {
          projectId: input.projectId,
          actorUserId: input.actor?.userId ?? null,
          mode: input.mode,
          sourceKey: input.sourceKey,
          mediaAssetId: input.mediaAssetId,
          config: input.config,
        },
        select: JOB_SELECT,
      });
      await this.actionAudit.recordWith(tx, {
        projectId: input.projectId,
        actor: input.actor,
        action: "import.job.created",
        targetType: "import_job",
        targetId: created.id,
        metadata: { mode: created.mode, sourceKey: created.sourceKey },
      });
      return created;
    });
  }
  private async dispatchImportJob(request: { jobId: string }) {
    const { jobId } = request;
    try {
      await enqueueImportJob(this.importQueue, jobId);
    } catch {
      await markImportDispatchPending(this.prisma, jobId).catch(
        () => undefined,
      );
    }
  }
  private async createConnectionJob(request: {
    connection: Prisma.ImportConnectionGetPayload<{
      select: typeof CONNECTION_SELECT;
    }>;
    actor: ImportActor;
    scheduled?: boolean;
  }) {
    const { connection, actor, scheduled = false } = request;
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const job = await tx.importJob.create({
          data: {
            projectId: connection.projectId,
            actorUserId: actor?.userId ?? connection.connectedByUserId,
            mode:
              connection.authStrategy === "CLERK_OAUTH"
                ? "CONNECTED_API"
                : publicConnectionMode(connection.config),
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
    } catch (error) {
      if (!isActiveImportConnectionJobRace(error)) throw error;
      const existing = await this.prisma.client.importJob.findFirst({
        where: {
          connectionId: connection.id,
          status: { in: ["QUEUED", "RUNNING", "FAILED"] },
        },
        orderBy: { createdAt: "desc" },
        select: JOB_SELECT,
      });
      if (existing) return existing;
      throw error;
    }
  }
  private async processScheduledConnection(request: {
    connectionId: string;
  }): Promise<unknown> {
    const { connectionId } = request;
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
        await this.retryFailedImportQueueJob({ jobId: active.id });
      return active;
    }
    const job = await this.createConnectionJob({
      connection,
      actor: null,
      scheduled: true,
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
  private upsertConnectionScheduler(request: { connectionId: string }) {
    const { connectionId } = request;
    return this.connectionRuntime.upsertScheduler(
      connectionId,
      IMPORT_AUTO_SYNC_EVERY_MS,
    );
  }
  private removeConnectionScheduler(request: { connectionId: string }) {
    const { connectionId } = request;
    return this.connectionRuntime.removeScheduler(connectionId);
  }
  private async retryFailedImportQueueJob(request: { jobId: string }) {
    const { jobId } = request;
    await retryFailedImportQueueJob(this.importQueue, jobId);
  }
  async persistCandidate(input: PersistImportCandidateInput) {
    return this.candidatePersistence.persist(input);
  }
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
    publicUrl:
      connection.authStrategy === "PUBLIC_URL"
        ? (connection.publicUrl ??
          (typeof config.sourceUrl === "string" ? config.sourceUrl : null))
        : null,
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
