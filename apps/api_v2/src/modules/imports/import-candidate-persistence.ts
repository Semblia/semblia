import { ConflictException } from "@nestjs/common";
import { SubmissionModerationService } from "../submission-moderation/submission-moderation.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  candidateIdentityHash,
  candidateToResponseData,
  normalizeImportCandidate,
  type ImportCandidate,
} from "./import-normalization.js";
import { isIdentityRace, isImportItemRace } from "./import-service-support.js";

export class ImportRetryRequiredError extends Error {}

export type PersistImportCandidateInput = {
  jobId: string;
  projectId: string;
  sourceKey: string;
  candidate: ImportCandidate;
  rightsConfirmed: boolean;
  rowIndex: number;
};

export class ImportCandidatePersistence {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: SubmissionModerationService,
  ) {}

  async persist(input: PersistImportCandidateInput) {
    const candidate = validatedImportCandidate(input);
    const existing = await this.prisma.client.importItem.findFirst({
      where: { jobId: input.jobId, rowIndex: input.rowIndex },
      select: { result: true, responseId: true },
    });
    if (existing) return this.existingItemResult(existing);
    const identityHash = candidateIdentityHash(input.sourceKey, candidate);
    try {
      const responseId = await this.createImportedCandidate({
        input,
        candidate,
        identityHash,
      });
      await this.enqueueImportedResponse(responseId);
      return "IMPORTED" as const;
    } catch (error) {
      return this.resolvePersistenceRace({
        error,
        input,
        candidate,
        identityHash,
      });
    }
  }

  private async createImportedCandidate({
    input,
    candidate,
    identityHash,
  }: {
    input: PersistImportCandidateInput;
    candidate: ReturnType<typeof normalizeImportCandidate>;
    identityHash: string;
  }) {
    return this.prisma.client.$transaction(async (tx) => {
      const response = await tx.formResponse.create({
        data: candidateToResponseData({
          projectId: input.projectId,
          sourceKey: input.sourceKey,
          jobId: input.jobId,
          candidate,
          rightsConfirmed: input.rightsConfirmed,
        }),
        select: { id: true },
      });
      await tx.responseImportIdentity.create({
        data: {
          projectId: input.projectId,
          sourceKey: input.sourceKey,
          externalIdHash: identityHash,
          responseId: response.id,
        },
      });
      await tx.importItem.create({
        data: {
          jobId: input.jobId,
          rowIndex: input.rowIndex,
          result: "IMPORTED",
          sourceUrl: candidate.sourceUrl,
          externalIdHash: identityHash,
          responseId: response.id,
        },
      });
      return response.id;
    });
  }

  private async resolvePersistenceRace({
    error,
    input,
    candidate,
    identityHash,
  }: {
    error: unknown;
    input: PersistImportCandidateInput;
    candidate: ReturnType<typeof normalizeImportCandidate>;
    identityHash: string;
  }) {
    if (!isIdentityRace(error) && !isImportItemRace(error)) throw error;
    const concurrentItem = await this.findExistingItem(input);
    if (concurrentItem) return this.existingItemResult(concurrentItem);
    if (!isIdentityRace(error)) throw error;
    return this.recordDuplicateItem({ input, candidate, identityHash });
  }

  private async recordDuplicateItem({
    input,
    candidate,
    identityHash,
  }: {
    input: PersistImportCandidateInput;
    candidate: ReturnType<typeof normalizeImportCandidate>;
    identityHash: string;
  }) {
    try {
      await this.prisma.client.importItem.create({
        data: {
          jobId: input.jobId,
          rowIndex: input.rowIndex,
          result: "DUPLICATE",
          sourceUrl: candidate.sourceUrl,
          externalIdHash: identityHash,
        },
      });
      return "DUPLICATE" as const;
    } catch (error) {
      if (!isImportItemRace(error)) throw error;
      const racedItem = await this.findExistingItem(input);
      if (racedItem) return this.existingItemResult(racedItem);
      throw error;
    }
  }

  private findExistingItem(input: PersistImportCandidateInput) {
    return this.prisma.client.importItem.findFirst({
      where: { jobId: input.jobId, rowIndex: input.rowIndex },
      select: { result: true, responseId: true },
    });
  }

  private async existingItemResult(item: {
    result: "IMPORTED" | "DUPLICATE" | "SKIPPED" | "FAILED";
    responseId: string | null;
  }) {
    if (item.result === "IMPORTED") {
      if (!item.responseId)
        throw new ConflictException("Imported item is missing its response");
      await this.enqueueImportedResponse(item.responseId);
      return "IMPORTED" as const;
    }
    if (item.result === "DUPLICATE") return "DUPLICATE" as const;
    throw new ConflictException("Import item is not retryable");
  }

  private async enqueueImportedResponse(submissionId: string) {
    try {
      await this.moderation.enqueueSubmission({ submissionId });
    } catch {
      throw new ImportRetryRequiredError("Imported row requires retry");
    }
  }
}

function validatedImportCandidate(input: PersistImportCandidateInput) {
  if (!isValidRowIndex(input.rowIndex))
    throw new ConflictException("Import row index is invalid");
  const candidate = normalizeImportCandidate(input.candidate, input.sourceKey);
  if (!candidate.text || !candidate.externalId)
    throw new ConflictException("Import candidate is invalid");
  return candidate;
}

function isValidRowIndex(rowIndex: number) {
  return Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < 2_000;
}
