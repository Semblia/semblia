import { ConflictException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@workspace/database/prisma";
import type { ConnectedAccountTokenProvider } from "../integrations/token-providers/connected-account-token-provider.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { MediaService } from "../storage/media.service.js";
import {
  connectedImportPolicy,
  type ConnectedImportProviderRegistry,
} from "./connected-import-providers.js";
import { ImportRetryRequiredError } from "./import-candidate-persistence.js";
import type { ImportConnectionRuntimeRecord } from "./import-connection-runtime.js";
import {
  candidateIdentityHash,
  normalizeImportCandidate,
  type ImportCandidate,
} from "./import-normalization.js";
import {
  connectedConnectionConfig,
  connectedJobCheckpoint,
  isImportItemRace,
  publicConnectionConfig,
  publicImportPolicy,
  publicJobCheckpoint,
  requireImportBytes,
  sanitizeConfig,
} from "./import-service-support.js";
import {
  getImportSource,
  type ImportCatalogSource,
} from "./import-source-catalog.js";
import {
  ImportProviderError,
  type ImportProvider,
} from "./providers/official-import-providers.js";
import type { OfficialUrlImportProviderRegistry } from "./providers/official-url-import-providers.js";
import { extractPublicProof } from "./public-proof-extractor.js";
import { fetchPublicImport } from "./safe-public-import-fetch.js";
import {
  rowsFromSpreadsheet,
  type SpreadsheetMapping,
} from "./spreadsheet-import.parser.js";

export const IMPORT_JOB_STALE_AFTER_MS = 60_000;
const IMPORT_JOB_HEARTBEAT_EVERY_MS = 15_000;
const MAX_CONNECTED_IMPORT_ITEMS = 2_000;
const MAX_CONNECTED_IMPORT_PROVIDER_STEPS = 2_050;

const WORKER_JOB_SELECT = {
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
  config: true,
  mediaAssetId: true,
  connectionId: true,
} satisfies Prisma.ImportJobSelect;

type WorkerJob = Prisma.ImportJobGetPayload<{
  select: typeof WORKER_JOB_SELECT;
}>;
type WorkerConfig = {
  candidate?: ImportCandidate;
  mapping?: SpreadsheetMapping;
  sourceUrl?: string;
  rightsConfirmed?: boolean;
} | null;
type Connection = ImportConnectionRuntimeRecord & {
  sourceKey: string;
  config: Prisma.JsonValue | null;
  cursor: string | null;
  enabled: boolean;
};
type Progress = {
  cursor: string | undefined;
  heartbeatAt: number;
  imported: number;
  duplicate: number;
  failed: number;
  total: number;
};
type PublicImportInput = {
  source: ImportCatalogSource;
  connection: Connection | null;
  config: { sourceUrl: string; rightsConfirmed?: boolean };
};

class NoImportableProofException extends ConflictException {
  constructor() {
    super("No importable public proof was found at this URL");
  }
}

export class ImportRetryAfterError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Import retry was delayed by the provider");
  }
}

export type ImportProcessingRuntimeContext = {
  prisma: PrismaService;
  media?: MediaService;
  connectedTokens?: ConnectedAccountTokenProvider;
  connectedProviders?: ConnectedImportProviderRegistry;
  officialUrlProviders?: OfficialUrlImportProviderRegistry;
  requireConnectionFence(
    connection: Connection,
    scheduled: boolean,
  ): Promise<void>;
  requireConnectedConnectionFence(
    connection: Connection,
    scheduled: boolean,
  ): Promise<void>;
  getConnection(projectId: string, connectionId: string): Promise<Connection>;
  getJob(projectId: string, jobId: string): Promise<unknown>;
  persistCandidate(input: {
    jobId: string;
    projectId: string;
    sourceKey: string;
    candidate: ImportCandidate;
    rightsConfirmed: boolean;
    rowIndex: number;
  }): Promise<"IMPORTED" | "DUPLICATE">;
};

export class ImportProcessingRuntime {
  constructor(private readonly context: ImportProcessingRuntimeContext) {}

  async process(jobId: string): Promise<unknown> {
    const job = await this.claim(jobId);
    if (!job) return null;
    try {
      await this.processClaimedJob(job);
      return this.context.getJob(job.projectId, job.id);
    } catch (error) {
      await this.recordFailure(job, error);
      this.throwProcessError(error);
    }
  }

  private async processClaimedJob(job: WorkerJob) {
    const config = job.config as WorkerConfig;
    switch (job.mode) {
      case "SPREADSHEET":
        await this.processSpreadsheet(job, config);
        return;
      case "PUBLIC_URL":
      case "MIGRATION":
        await this.processPublicImport(job, config);
        return;
      case "CONNECTED_API":
        await this.processConnectedImport(job);
        return;
      default:
        await this.processManualImport(job, config);
    }
  }

  private throwProcessError(error: unknown): never {
    if (error instanceof ImportProviderError && error.retryAfterMs)
      throw new ImportRetryAfterError(error.retryAfterMs);
    throw new Error("Import failed");
  }

  async previewPublicConnection(
    source: ImportCatalogSource,
    sourceUrl: string,
    mode: "PUBLIC_URL" | "MIGRATION",
  ) {
    const provider = this.context.officialUrlProviders?.get(source.key);
    const candidates = provider
      ? await provider.fetchCandidates(sourceUrl, 1)
      : await this.extractGenericPublicCandidates(
          { sourceKey: source.key, mode },
          source,
          sourceUrl,
        );
    if (!candidates.slice(0, 1).length) throw new NoImportableProofException();
  }

  private async claim(jobId: string): Promise<WorkerJob | null> {
    const now = new Date();
    const claim = await this.context.prisma.client.importJob.updateMany({
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
      const current = await this.context.prisma.client.importJob.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      if (current?.status === "RUNNING")
        throw new Error("Import job is already running");
      return null;
    }
    return this.context.prisma.client.importJob.findUniqueOrThrow({
      where: { id: jobId },
      select: WORKER_JOB_SELECT,
    });
  }

  private async processManualImport(job: WorkerJob, config: WorkerConfig) {
    if (!config?.candidate)
      throw new ConflictException("Import source is not implemented");
    const result = await this.persist(
      job,
      config.candidate,
      config.rightsConfirmed === true,
      0,
    );
    await this.context.prisma.client.importJob.update({
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
  }

  private async processSpreadsheet(job: WorkerJob, config: WorkerConfig) {
    if (!job.mediaAssetId || !config?.mapping)
      throw new ConflictException(
        "Spreadsheet import configuration is invalid",
      );
    const source = await this.requireMedia().readImportSource({
      projectId: job.projectId,
      assetId: job.mediaAssetId,
    });
    const candidates = rowsFromSpreadsheet(
      requireImportBytes(source.bytes),
      source.asset.storageKey,
      config.mapping,
    );
    let heartbeatAt = Date.now();
    const progress = await this.persistCandidates(
      job,
      candidates,
      config.rightsConfirmed === true,
      {
        beforeEach: async () => {
          heartbeatAt = await this.touchHeartbeat(job.id, heartbeatAt);
        },
      },
    );
    await this.context.prisma.client.importJob.update({
      where: { id: job.id },
      data: this.completeCounts(candidates.length, progress),
    });
    const result = await this.context.getJob(job.projectId, job.id);
    await this.requireMedia().cleanupImportSource({
      assetId: job.mediaAssetId,
    });
    return result;
  }

  private async processPublicImport(job: WorkerJob, config: WorkerConfig) {
    const input = await this.publicImportInput(job, config);
    const checkpoint = publicJobCheckpoint(job.config);
    await this.requirePublicConnectionFence(
      input.connection,
      checkpoint.scheduled,
    );
    const candidates = await this.fetchPublicCandidates(job, input);
    let heartbeatAt = await this.touchHeartbeat(job.id, Date.now(), true);
    await this.requirePublicConnectionFence(
      input.connection,
      checkpoint.scheduled,
    );
    if (!candidates.length) throw new NoImportableProofException();
    const progress = await this.persistCandidates(
      job,
      candidates,
      input.config.rightsConfirmed === true,
      {
        beforeEach: async () => {
          heartbeatAt = await this.touchHeartbeat(job.id, heartbeatAt);
          await this.requirePublicConnectionFence(
            input.connection,
            checkpoint.scheduled,
          );
        },
      },
    );
    const completedAt = new Date();
    await this.context.prisma.client.importJob.update({
      where: { id: job.id },
      data: this.completeCounts(candidates.length, progress, completedAt),
    });
    await this.recordPublicConnectionSuccess(
      input.connection,
      job.projectId,
      completedAt,
    );
  }

  private async publicImportInput(
    job: WorkerJob,
    config: WorkerConfig,
  ): Promise<PublicImportInput> {
    const source = getImportSource(job.sourceKey);
    const connection = await this.findConnection(job);
    const publicConfig = connection
      ? publicConnectionConfig(connection.config)
      : config;
    if (!source || !publicConfig?.sourceUrl)
      throw new ConflictException("Public import configuration is invalid");
    return {
      source,
      connection,
      config: {
        sourceUrl: publicConfig.sourceUrl,
        rightsConfirmed: publicConfig.rightsConfirmed,
      },
    };
  }

  private findConnection(job: WorkerJob) {
    return job.connectionId
      ? this.context.getConnection(job.projectId, job.connectionId)
      : Promise.resolve(null);
  }

  private requirePublicConnectionFence(
    connection: Connection | null,
    scheduled: boolean,
  ) {
    return connection
      ? this.context.requireConnectionFence(connection, scheduled)
      : Promise.resolve();
  }

  private async fetchPublicCandidates(
    job: WorkerJob,
    input: PublicImportInput,
  ) {
    const provider = this.context.officialUrlProviders?.get(job.sourceKey);
    if (provider)
      return provider.fetchCandidates(
        input.config.sourceUrl,
        this.publicImportLimit(job),
      );
    return this.extractGenericPublicCandidates(
      job,
      input.source,
      input.config.sourceUrl,
    );
  }

  private publicImportLimit(job: WorkerJob) {
    return job.mode === "MIGRATION" ? 2_000 : 20;
  }

  private async recordPublicConnectionSuccess(
    connection: Connection | null,
    projectId: string,
    completedAt: Date,
  ) {
    if (!connection) return;
    await this.context.prisma.client.importConnection.updateMany({
      where: { id: connection.id, projectId, enabled: true },
      data: {
        lastSyncedAt: completedAt,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
  }

  private async processConnectedImport(job: WorkerJob) {
    const { connection, connectedByUserId, policy, config, checkpoint } =
      await this.connectedImportContext(job);
    try {
      await this.context.requireConnectedConnectionFence(
        connection,
        checkpoint.scheduled,
      );
      const token = await this.requireConnectedTokens().getToken({
        userId: connectedByUserId,
        provider: policy.clerkProvider,
        requiredScopes: [...policy.requiredScopes],
        requireScopeEvidence: true,
      });
      const progress = await this.runConnectedPages({
        job,
        connection,
        sourceKey: policy.sourceKey,
        config,
        checkpoint,
        provider: this.requireConnectedProviders().get(policy.sourceKey),
        accessToken: token.accessToken,
        heartbeatAt: Date.now(),
      });
      await this.context.requireConnectedConnectionFence(
        connection,
        checkpoint.scheduled,
      );
      const completedAt = new Date();
      await this.context.prisma.client.$transaction(async (tx) => {
        await tx.importJob.update({
          where: { id: job.id },
          data: {
            ...this.completeCounts(progress.total, progress, completedAt),
            config: sanitizeConfig({
              connectionSnapshotVersion: 1,
              cursor: progress.cursor ?? null,
              rowOffset: progress.total,
              scheduled: checkpoint.scheduled,
              terminal: true,
            }),
          },
        });
        await tx.importConnection.update({
          where: { id: connection.id },
          data: {
            cursor: progress.cursor ?? null,
            lastSyncedAt: completedAt,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });
      });
      return this.context.getJob(job.projectId, job.id);
    } catch (error) {
      const failure = connectedImportFailure(error);
      await this.context.prisma.client.importConnection.updateMany({
        where: { id: connection.id, projectId: job.projectId },
        data: {
          lastErrorCode: failure.code,
          lastErrorMessage: failure.message,
        },
      });
      throw error;
    }
  }

  private async connectedImportContext(job: WorkerJob) {
    if (!job.connectionId)
      throw new ConflictException("Connected import is missing its connection");
    const connection = await this.context.getConnection(
      job.projectId,
      job.connectionId,
    );
    if (!connection.enabled)
      throw new ConflictException("Import connection is disabled");
    const policy = connectedImportPolicy(connection.sourceKey);
    const connectedByUserId = connection.connectedByUserId;
    if (!connectedByUserId)
      throw new ConflictException("Import connection has no connected user");
    const config = connectedConnectionConfig(connection.config);
    const checkpoint = connectedJobCheckpoint(job.config, connection.cursor);
    return { connection, connectedByUserId, policy, config, checkpoint };
  }

  private async runConnectedPages(input: {
    job: WorkerJob;
    connection: Connection;
    sourceKey: string;
    config: ReturnType<typeof connectedConnectionConfig>;
    checkpoint: ReturnType<typeof connectedJobCheckpoint>;
    provider: ImportProvider;
    accessToken: string;
    heartbeatAt: number;
  }): Promise<Progress> {
    const state: Progress = {
      cursor: input.checkpoint.cursor ?? undefined,
      heartbeatAt: input.heartbeatAt,
      imported: input.job.importedCount,
      duplicate: input.job.duplicateCount,
      failed: input.job.failedCount,
      total: input.checkpoint.rowOffset,
    };
    const seenCursors = new Set<string>();
    for (
      let pageIndex = 0;
      pageIndex < MAX_CONNECTED_IMPORT_PROVIDER_STEPS;
      pageIndex++
    ) {
      const completed = await this.runConnectedPage(input, state, seenCursors);
      if (completed) return state;
      if (pageIndex === MAX_CONNECTED_IMPORT_PROVIDER_STEPS - 1)
        throw new ImportProviderError(
          "PROVIDER_INVALID_RESPONSE",
          "Provider pagination exceeded the safe limit",
        );
    }
    return state;
  }

  private async runConnectedPage(
    input: Parameters<ImportProcessingRuntime["runConnectedPages"]>[0],
    state: Progress,
    seenCursors: Set<string>,
  ) {
    this.assertNewCursor(state.cursor, seenCursors);
    const pageCursor = state.cursor;
    const page = await this.fetchConnectedPage(input, state);
    const candidates = page.candidates.slice(
      0,
      MAX_CONNECTED_IMPORT_ITEMS - state.total,
    );
    const counts = await this.persistConnectedCandidates(
      input,
      state,
      candidates,
    );
    this.addProgress(state, candidates.length, counts);
    const truncated = candidates.length < page.candidates.length;
    state.cursor = truncated ? pageCursor : (page.nextCursor ?? undefined);
    if (this.shouldStopConnectedImport(truncated, page.nextCursor, state.total))
      return true;
    await this.saveConnectedCheckpoint(input, state);
    return false;
  }

  private shouldStopConnectedImport(
    truncated: boolean,
    nextCursor: string | null | undefined,
    total: number,
  ) {
    if (truncated) return true;
    if (!nextCursor) return true;
    return total >= MAX_CONNECTED_IMPORT_ITEMS;
  }

  private assertNewCursor(
    cursor: string | undefined,
    seenCursors: Set<string>,
  ) {
    if (cursor && seenCursors.has(cursor))
      throw new ImportProviderError(
        "PROVIDER_INVALID_RESPONSE",
        "Provider returned an invalid pagination cursor",
      );
    if (cursor) seenCursors.add(cursor);
  }

  private async fetchConnectedPage(
    input: Parameters<ImportProcessingRuntime["runConnectedPages"]>[0],
    state: Progress,
  ) {
    await this.context.requireConnectedConnectionFence(
      input.connection,
      input.checkpoint.scheduled,
    );
    const page = await input.provider.fetchCandidates(
      input.accessToken,
      input.config.provider,
      state.cursor,
    );
    state.heartbeatAt = await this.touchHeartbeat(
      input.job.id,
      state.heartbeatAt,
    );
    await this.context.requireConnectedConnectionFence(
      input.connection,
      input.checkpoint.scheduled,
    );
    return page;
  }

  private persistConnectedCandidates(
    input: Parameters<ImportProcessingRuntime["runConnectedPages"]>[0],
    state: Progress,
    candidates: ImportCandidate[],
  ) {
    return this.persistCandidates(
      input.job,
      candidates,
      input.config.rightsConfirmed,
      {
        startingRow: state.total,
        beforeEach: async () => {
          await this.context.requireConnectedConnectionFence(
            input.connection,
            input.checkpoint.scheduled,
          );
          state.heartbeatAt = await this.touchHeartbeat(
            input.job.id,
            state.heartbeatAt,
          );
        },
      },
    );
  }

  private addProgress(
    state: Progress,
    total: number,
    counts: { imported: number; duplicate: number; failed: number },
  ) {
    state.total += total;
    state.imported += counts.imported;
    state.duplicate += counts.duplicate;
    state.failed += counts.failed;
  }

  private saveConnectedCheckpoint(
    input: Parameters<ImportProcessingRuntime["runConnectedPages"]>[0],
    state: Progress,
  ) {
    return this.context.prisma.client.importJob.update({
      where: { id: input.job.id },
      data: {
        config: sanitizeConfig({
          connectionSnapshotVersion: 1,
          cursor: state.cursor ?? null,
          rowOffset: state.total,
          scheduled: input.checkpoint.scheduled,
        }),
        totalCount: state.total,
        importedCount: state.imported,
        duplicateCount: state.duplicate,
        failedCount: state.failed,
      },
    });
  }

  private async persistCandidates(
    job: WorkerJob,
    candidates: ImportCandidate[],
    rightsConfirmed: boolean,
    options: { startingRow?: number; beforeEach?: () => Promise<void> } = {},
  ) {
    let imported = 0;
    let duplicate = 0;
    let failed = 0;
    for (const [offset, candidate] of candidates.entries()) {
      const rowIndex = (options.startingRow ?? 0) + offset;
      await options.beforeEach?.();
      try {
        const result = await this.persist(
          job,
          candidate,
          rightsConfirmed,
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
    return { imported, duplicate, failed };
  }

  private persist(
    job: WorkerJob,
    candidate: ImportCandidate,
    rightsConfirmed: boolean,
    rowIndex: number,
  ) {
    return this.context.persistCandidate({
      jobId: job.id,
      projectId: job.projectId,
      sourceKey: job.sourceKey,
      candidate,
      rightsConfirmed,
      rowIndex,
    });
  }

  private completeCounts(
    total: number,
    progress: { imported: number; duplicate: number; failed: number },
    completedAt = new Date(),
  ) {
    return {
      status: progress.failed ? ("PARTIAL" as const) : ("SUCCEEDED" as const),
      totalCount: total,
      importedCount: progress.imported,
      duplicateCount: progress.duplicate,
      skippedCount: 0,
      failedCount: progress.failed,
      completedAt,
    };
  }

  private async recordFailure(job: WorkerJob, error: unknown) {
    await this.context.prisma.client.importJob.update({
      where: { id: job.id },
      data: this.failureJobData(job, error),
    });
    await this.recordPublicConnectionFailure(job, error);
  }

  private failureJobData(job: WorkerJob, error: unknown) {
    if (job.mode === "CONNECTED_API") return this.connectedFailureJobData();
    return this.standardFailureJobData(error);
  }

  private connectedFailureJobData() {
    return {
      status: "FAILED" as const,
      errorCode: "IMPORT_FAILED",
      errorMessage: "The import could not be completed.",
      completedAt: new Date(),
    };
  }

  private standardFailureJobData(error: unknown) {
    const failure = publicImportFailure(error);
    return {
      status: "FAILED" as const,
      totalCount: 1,
      importedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      failedCount: 1,
      errorCode: failure.code,
      errorMessage: failure.message,
      completedAt: new Date(),
    };
  }

  private async recordPublicConnectionFailure(job: WorkerJob, error: unknown) {
    if (!this.isPublicConnectionJob(job)) return;
    await this.context.prisma.client.importConnection.updateMany({
      where: { id: job.connectionId!, projectId: job.projectId },
      data: publicConnectionFailure(error),
    });
  }

  private isPublicConnectionJob(job: WorkerJob) {
    return Boolean(job.connectionId) && this.isPublicMode(job.mode);
  }

  private isPublicMode(mode: WorkerJob["mode"]) {
    return mode === "PUBLIC_URL" || mode === "MIGRATION";
  }

  private async recordFailedItem(
    job: WorkerJob,
    candidateInput: ImportCandidate,
    rowIndex: number,
  ) {
    const identity = this.failureItemIdentity(
      candidateInput,
      job.sourceKey,
      rowIndex,
    );
    const existing = await this.context.prisma.client.importItem.findFirst({
      where: { jobId: job.id, rowIndex },
      select: { result: true, responseId: true },
    });
    this.throwIfImportedFailureItem(existing);
    if (existing) return;
    try {
      await this.createFailedItem(job, rowIndex, identity);
    } catch (error) {
      await this.handleFailedItemRace(job, rowIndex, error);
    }
  }

  private failureItemIdentity(
    candidateInput: ImportCandidate,
    sourceKey: string,
    rowIndex: number,
  ) {
    let externalId = candidateInput.externalId.trim().slice(0, 512);
    let sourceUrl: string | null = null;
    try {
      const candidate = normalizeImportCandidate(candidateInput, sourceKey);
      externalId = candidate.externalId;
      sourceUrl = candidate.sourceUrl;
    } catch {
      // Invalid row data is represented by the bounded failure item only.
    }
    return { externalId: externalId || `row-${rowIndex}`, sourceUrl };
  }

  private throwIfImportedFailureItem(item: { result: string } | null) {
    if (item?.result === "IMPORTED")
      throw new ImportRetryRequiredError("Imported row requires retry");
  }

  private createFailedItem(
    job: WorkerJob,
    rowIndex: number,
    identity: { externalId: string; sourceUrl: string | null },
  ) {
    return this.context.prisma.client.importItem.create({
      data: {
        jobId: job.id,
        rowIndex,
        result: "FAILED",
        sourceUrl: identity.sourceUrl,
        externalIdHash: candidateIdentityHash(job.sourceKey, {
          externalId: identity.externalId,
        }),
        errorCode: "ROW_IMPORT_FAILED",
        errorMessage: "This row could not be imported.",
      },
    });
  }

  private async handleFailedItemRace(
    job: WorkerJob,
    rowIndex: number,
    error: unknown,
  ) {
    if (!isImportItemRace(error)) throw error;
    const raced = await this.context.prisma.client.importItem.findFirst({
      where: { jobId: job.id, rowIndex },
      select: { result: true },
    });
    this.throwIfImportedFailureItem(raced);
    if (!raced) throw error;
  }

  private async extractGenericPublicCandidates(
    job: Pick<WorkerJob, "sourceKey" | "mode">,
    source: ImportCatalogSource,
    sourceUrl: string,
  ) {
    const fetched = await fetchPublicImport(
      sourceUrl,
      publicImportPolicy(source),
    );
    return extractPublicProof(
      fetched.body,
      { sourceKey: job.sourceKey, sourceUrl: fetched.url },
      fetched.contentType,
      job.mode === "MIGRATION" ? 2_000 : 20,
    );
  }

  private async touchHeartbeat(
    jobId: string,
    previousAt: number,
    force = false,
  ) {
    const now = Date.now();
    if (!force && now - previousAt < IMPORT_JOB_HEARTBEAT_EVERY_MS)
      return previousAt;
    const heartbeat = await this.context.prisma.client.importJob.updateMany({
      where: { id: jobId, status: "RUNNING" },
      data: { startedAt: new Date(now) },
    });
    if (!heartbeat.count)
      throw new ConflictException("Import job is no longer running");
    return now;
  }

  private requireMedia() {
    if (!this.context.media)
      throw new ConflictException("Import media storage is unavailable");
    return this.context.media;
  }
  private requireConnectedTokens() {
    if (!this.context.connectedTokens)
      throw new ConflictException("Connected account access is unavailable");
    return this.context.connectedTokens;
  }
  private requireConnectedProviders() {
    if (!this.context.connectedProviders)
      throw new ConflictException("Connected import providers are unavailable");
    return this.context.connectedProviders;
  }
}

function publicConnectionFailure(error: unknown) {
  if (error instanceof NoImportableProofException)
    return {
      lastErrorCode: "NO_IMPORTABLE_PROOF",
      lastErrorMessage: "No importable public proof was found at this URL.",
    };
  if (
    error instanceof ImportProviderError &&
    error.code === "PROVIDER_RATE_LIMITED"
  )
    return {
      lastErrorCode: error.code,
      lastErrorMessage:
        "The provider rate limit was reached. The sync will be retried.",
    };
  return {
    lastErrorCode: "PUBLIC_IMPORT_FAILED",
    lastErrorMessage: "The public import could not be completed.",
  };
}

function publicImportFailure(error: unknown) {
  if (
    error instanceof ImportProviderError &&
    error.code === "PROVIDER_SETUP_REQUIRED"
  )
    return {
      code: "PROVIDER_SETUP_REQUIRED",
      message: "This import source needs administrator setup.",
    };
  if (error instanceof NoImportableProofException)
    return {
      code: "NO_IMPORTABLE_PROOF",
      message: "No importable public proof was found at this URL.",
    };
  return {
    code: "IMPORT_FAILED",
    message: "The import could not be completed.",
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
      code: "CONNECTION_ACCESS_REVOKED",
      message: "The connected user no longer has project access.",
    };
  return {
    code: "CONNECTED_IMPORT_FAILED",
    message: "The connected import could not be completed.",
  };
}
