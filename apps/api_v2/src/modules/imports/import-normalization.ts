import { createHash } from "node:crypto";
import type { Prisma } from "@workspace/database/prisma";
import { canonicalizePersistedImportSourceUrl } from "./import-source-url.js";
export type ImportCandidate = {
  externalId: string;
  sourceUrl: string | null;
  sourceCreatedAt: string | null;
  text: string;
  ratingValue: number | null;
  ratingScale: number | null;
  authorName: string | null;
  authorRole: string | null;
  authorCompany: string | null;
  tags: string[];
};
export type NormalizedImportCandidate = Omit<
  ImportCandidate,
  "sourceCreatedAt"
> & { sourceCreatedAt: Date | null; tags: string[] };
const text = (value: string | null, limit: number) =>
  value?.trim().slice(0, limit) || null;
const MAX_EXTERNAL_ID_LENGTH = 512;
const MAX_IMPORT_TEXT_LENGTH = 10_000;
const MAX_TAG_COUNT = 20;
const MAX_TAG_LENGTH = 64;

export function normalizeSourceUrl(value: string | null, sourceKey?: string) {
  const trimmed = value?.trim() || null;
  if (!trimmed) return null;
  return canonicalizePersistedImportSourceUrl(trimmed, sourceKey);
}

export function normalizeImportCandidate(
  candidate: ImportCandidate,
  sourceKey?: string,
): NormalizedImportCandidate {
  const ratingScale =
    candidate.ratingScale === null
      ? null
      : Math.max(1, Math.min(10, Math.trunc(candidate.ratingScale)));
  const ratingValue =
    candidate.ratingValue === null
      ? null
      : Math.max(
          1,
          Math.min(ratingScale ?? 10, Math.trunc(candidate.ratingValue)),
        );
  const parsed = candidate.sourceCreatedAt
    ? new Date(candidate.sourceCreatedAt)
    : null;
  const sourceCreatedAt =
    parsed && !Number.isNaN(parsed.valueOf()) && parsed <= new Date()
      ? parsed
      : null;
  return {
    externalId: candidate.externalId.trim().slice(0, MAX_EXTERNAL_ID_LENGTH),
    sourceUrl: normalizeSourceUrl(candidate.sourceUrl, sourceKey),
    sourceCreatedAt,
    text: candidate.text.trim().slice(0, MAX_IMPORT_TEXT_LENGTH),
    ratingValue,
    ratingScale,
    authorName: text(candidate.authorName, 255),
    authorRole: text(candidate.authorRole, 255),
    authorCompany: text(candidate.authorCompany, 255),
    tags: [
      ...new Set(
        candidate.tags
          .map((tag) => tag.trim().slice(0, MAX_TAG_LENGTH))
          .filter(Boolean),
      ),
    ].slice(0, MAX_TAG_COUNT),
  };
}
export function candidateIdentityHash(
  sourceKey: string,
  candidate: Pick<NormalizedImportCandidate, "externalId">,
) {
  return createHash("sha256")
    .update(`${sourceKey}:${candidate.externalId}`)
    .digest("hex");
}
export function candidateToResponseData(
  projectId: string,
  sourceKey: string,
  jobId: string,
  candidate: NormalizedImportCandidate,
  rightsConfirmed: boolean,
): Prisma.FormResponseUncheckedCreateInput {
  const importedAt = new Date();
  const answers = [
    {
      fieldId: "import-primary-text",
      type: "longText",
      role: "primaryText",
      labelSnapshot: "Imported proof",
      value: candidate.text,
      private: false,
      publishable: true,
      usedInWidget: true,
    },
    ...(candidate.ratingValue === null
      ? []
      : [
          {
            fieldId: "import-rating",
            type: "rating",
            role: "rating",
            labelSnapshot: "Rating",
            value: candidate.ratingValue,
            private: false,
            publishable: true,
            usedInWidget: true,
          },
        ]),
  ];
  return {
    projectId,
    origin: "IMPORT",
    trustMode: "IMPORT",
    formId: null,
    versionId: null,
    version: null,
    answers: answers as Prisma.InputJsonValue,
    ratingValue: candidate.ratingValue,
    ratingScale: candidate.ratingScale,
    authorName: candidate.authorName,
    authorRole: candidate.authorRole,
    authorCompany: candidate.authorCompany,
    consent: {
      canPublishText: rightsConfirmed,
      canPublishName: rightsConfirmed,
      canPublishRole: rightsConfirmed,
      canPublishCompany: rightsConfirmed,
      canPublishAvatar: false,
      canEditForClarity: false,
    },
    sourceMetadata: {
      source: sourceKey,
      sourceUrl: candidate.sourceUrl,
      importJobId: jobId,
      sourceCreatedAt: candidate.sourceCreatedAt?.toISOString() ?? null,
      importedAt: importedAt.toISOString(),
      tags: candidate.tags,
    },
    reviewStatus: "PENDING",
    publishStatus: "PRIVATE",
    createdAt: candidate.sourceCreatedAt ?? importedAt,
  };
}
