import type {
  FormModerationArtifactType,
  FormModerationDecision,
  FormResponseReviewStatus,
} from "@workspace/database/prisma";

export type ModerationProvider =
  | "aws-comprehend"
  | "aws-rekognition"
  | "aws-transcribe"
  | "local";

export type ModerationInput = {
  artifactType: FormModerationArtifactType;
  provider: ModerationProvider;
  score: number;
  flags: string[];
  categories: Record<string, number>;
  existingStatus: FormResponseReviewStatus;
  verifiedTrust: boolean;
  autoApproveVerified: boolean;
};

export type ModerationPolicyResult = {
  decision: FormModerationDecision;
  reviewStatus: FormResponseReviewStatus;
  reason: string;
  score: number;
  flags: string[];
};

export type ModerationProviderResult = {
  provider: ModerationProvider;
  providerOperation: string;
  score: number;
  flags: string[];
  categories: Record<string, number>;
  rawResult: Record<string, unknown>;
  estimatedCostMicros?: number;
  providerJobId?: string | null;
};

export type ModerationArtifact = {
  artifactType: FormModerationArtifactType;
  artifactHash: string;
  text?: string;
  s3Bucket?: string;
  s3Key?: string;
  s3Version?: string | null;
  contentType?: string;
  byteSize?: number | null;
  mediaAssetId?: string | null;
};
