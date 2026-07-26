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
    if (
      !Number.isInteger(input.rowIndex) ||
      input.rowIndex < 0 ||
      input.rowIndex >= 2_000
    )
      throw new ConflictException("Import row index is invalid");
    const candidate = normalizeImportCandidate(
      input.candidate,
      input.sourceKey,
    );
    if (!candidate.text || !candidate.externalId)
      throw new ConflictException("Import candidate is invalid");
    const existing = await this.prisma.client.importItem.findFirst({
      where: { jobId: input.jobId, rowIndex: input.rowIndex },
      select: { result: true, responseId: true },
    });
    if (existing) return this.existingItemResult(existing);
    const identityHash = candidateIdentityHash(input.sourceKey, candidate);
    let responseId: string | null = null;
    try {
      await this.prisma.client.$transaction(async (tx) => {
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
        responseId = response.id;
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
      });
    } catch (error) {
      if (!isIdentityRace(error) && !isImportItemRace(error)) throw error;
      const concurrentItem = await this.prisma.client.importItem.findFirst({
        where: { jobId: input.jobId, rowIndex: input.rowIndex },
        select: { result: true, responseId: true },
      });
      if (concurrentItem) return this.existingItemResult(concurrentItem);
      if (!isIdentityRace(error)) throw error;
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
      } catch (itemError) {
        if (!isImportItemRace(itemError)) throw itemError;
        const racedItem = await this.prisma.client.importItem.findFirst({
          where: { jobId: input.jobId, rowIndex: input.rowIndex },
          select: { result: true, responseId: true },
        });
        if (racedItem) return this.existingItemResult(racedItem);
        throw itemError;
      }
      return "DUPLICATE" as const;
    }
    await this.enqueueImportedResponse(responseId!);
    return "IMPORTED" as const;
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
