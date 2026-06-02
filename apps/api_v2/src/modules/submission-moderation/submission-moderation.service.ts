import { createHash } from "node:crypto";
import { InjectQueue } from "@nestjs/bullmq";
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MediaAssetStatus,
  ModerationStatus,
  Prisma,
  SubmissionModerationArtifactType,
  SubmissionModerationRunStatus,
  type CollectionFormSubmission,
  type MediaAsset,
  type SubmissionModerationRun,
} from "@workspace/database/prisma";
import type { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service.js";
import { SUBMISSION_MODERATION_QUEUE } from "../queueing/queueing.constants.js";
import {
  MODERATION_OPERATION_DETECT_MODERATION_LABELS,
  MODERATION_OPERATION_DETECT_TOXIC_CONTENT,
  MODERATION_OPERATION_NOOP,
  MODERATION_OPERATION_START_CONTENT_MODERATION,
  MODERATION_OPERATION_START_TRANSCRIPTION_JOB,
  MODERATION_PROVIDER_AWS_COMPREHEND,
  MODERATION_PROVIDER_AWS_REKOGNITION,
  MODERATION_PROVIDER_AWS_TRANSCRIBE,
  MODERATION_PROVIDER_LOCAL,
} from "./submission-moderation.constants.js";
import { resolveModerationDecision } from "./submission-moderation.policy.js";
import type {
  ModerationProvider,
  ModerationProviderResult,
} from "./submission-moderation.types.js";
import { AwsComprehendModerationClient } from "./providers/aws-comprehend-moderation.client.js";
import { AwsRekognitionModerationClient } from "./providers/aws-rekognition-moderation.client.js";
import { AwsTranscribeModerationClient } from "./providers/aws-transcribe-moderation.client.js";
import { NoopModerationClient } from "./providers/noop-moderation.client.js";

export type SubmissionModerationJob = {
  runId: string;
};

type SubmissionForModeration = CollectionFormSubmission & {
  project: {
    autoModeration: boolean;
    autoApproveVerified: boolean;
  };
  mediaAssets: Pick<
    MediaAsset,
    "id" | "bucket" | "storageKey" | "contentType" | "byteSize" | "status"
  >[];
};

@Injectable()
export class SubmissionModerationService {
  private readonly logger = new Logger(SubmissionModerationService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectQueue(SUBMISSION_MODERATION_QUEUE)
    private readonly moderationQueue: Queue<SubmissionModerationJob>,
    @Inject(AwsComprehendModerationClient)
    private readonly comprehendClient: AwsComprehendModerationClient,
    @Inject(AwsRekognitionModerationClient)
    private readonly rekognitionClient: AwsRekognitionModerationClient,
    @Inject(AwsTranscribeModerationClient)
    private readonly transcribeClient: AwsTranscribeModerationClient,
    @Inject(NoopModerationClient)
    private readonly noopClient: NoopModerationClient,
  ) {}

  async enqueueSubmission(input: { submissionId: string }) {
    const submission = await this.loadSubmission(input.submissionId);
    if (!submission.project.autoModeration) return [];

    const runs: SubmissionModerationRun[] = [];
    const text = this.extractSubmissionText(submission);

    if (text) {
      runs.push(
        await this.createRunAndEnqueue({
          submission,
          artifactType: SubmissionModerationArtifactType.TEXT,
          artifactHash: this.hashArtifact(text),
          provider: this.awsEnabled
            ? MODERATION_PROVIDER_AWS_COMPREHEND
            : MODERATION_PROVIDER_LOCAL,
          providerOperation: this.awsEnabled
            ? MODERATION_OPERATION_DETECT_TOXIC_CONTENT
            : MODERATION_OPERATION_NOOP,
        }),
      );
    }

    for (const asset of submission.mediaAssets) {
      const artifact = this.artifactForAsset(asset);
      if (!artifact) continue;
      runs.push(
        await this.createRunAndEnqueue({
          submission,
          mediaAssetId: asset.id,
          artifactType: artifact.artifactType,
          artifactHash: this.hashArtifact(
            `${asset.id}:${asset.storageKey}:${asset.contentType}`,
          ),
          provider: this.awsEnabled
            ? artifact.provider
            : MODERATION_PROVIDER_LOCAL,
          providerOperation: this.awsEnabled
            ? artifact.providerOperation
            : MODERATION_OPERATION_NOOP,
        }),
      );
    }

    return runs;
  }

  async processRun(runId: string) {
    const run = await this.prisma.client.submissionModerationRun.findUnique({
      where: { id: runId },
      include: {
        submission: {
          include: {
            project: {
              select: {
                autoApproveVerified: true,
              },
            },
          },
        },
        mediaAsset: true,
      },
    });

    if (!run) throw new NotFoundException("Moderation run not found");
    if (run.status === SubmissionModerationRunStatus.SUPPRESSED) return run;

    await this.prisma.client.submissionModerationRun.update({
      where: { id: run.id },
      data: {
        status: SubmissionModerationRunStatus.RUNNING,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    try {
      const result = await this.executeProvider(run);

      if (
        run.artifactType === SubmissionModerationArtifactType.AUDIO ||
        run.artifactType === SubmissionModerationArtifactType.VIDEO
      ) {
        return this.prisma.client.submissionModerationRun.update({
          where: { id: run.id },
          data: {
            status: SubmissionModerationRunStatus.ENQUEUED,
            providerJobId: result.providerJobId ?? null,
            rawResult: this.toJson(result.rawResult),
          },
        });
      }

      const policy = resolveModerationDecision({
        artifactType: run.artifactType,
        provider: result.provider,
        score: result.score,
        flags: result.flags,
        categories: result.categories,
        existingStatus: run.submission.moderationStatus,
        verifiedTrust: this.isOAuthVerifiedSubmission(run.submission),
        autoApproveVerified: run.submission.project.autoApproveVerified,
      });
      const completedAt = new Date();

      const updatedRun = await this.prisma.client.submissionModerationRun.update({
        where: { id: run.id },
        data: {
          status: SubmissionModerationRunStatus.SUCCEEDED,
          decision: policy.decision,
          score: policy.score,
          flags: policy.flags,
          categories: this.toJson(result.categories),
          rawResult: this.toJson(result.rawResult),
          estimatedCostMicros: result.estimatedCostMicros ?? null,
          completedAt,
        },
      });

      if (this.canProviderUpdateSubmission(run.submission)) {
        await this.reconcileSubmissionStatus(run, policy, completedAt);
      }

      return updatedRun;
    } catch (error: unknown) {
      await this.prisma.client.submissionModerationRun.update({
        where: { id: run.id },
        data: {
          status: SubmissionModerationRunStatus.FAILED,
          errorCode: this.errorCode(error),
          errorMessage: this.errorMessage(error),
          nextAttemptAt: this.isRetryableProviderError(error)
            ? this.nextAttemptAt()
            : null,
        },
      });

      if (this.isRetryableProviderError(error)) throw error;
      this.logger.warn(
        `Submission moderation run ${run.id} failed: ${this.errorMessage(error)}`,
      );
      return this.prisma.client.submissionModerationRun.findUniqueOrThrow({
        where: { id: run.id },
      });
    }
  }

  private async createRunAndEnqueue(input: {
    submission: SubmissionForModeration;
    artifactType: SubmissionModerationArtifactType;
    artifactHash: string;
    provider: ModerationProvider;
    providerOperation: string;
    mediaAssetId?: string;
  }) {
    if (this.budgetDisabled(input.provider)) {
      return this.createSuppressedRun(input);
    }

    const data = {
      projectId: input.submission.projectId,
      submissionId: input.submission.id,
      mediaAssetId: input.mediaAssetId ?? null,
      artifactType: input.artifactType,
      artifactHash: input.artifactHash,
      provider: input.provider,
      providerOperation: input.providerOperation,
      status: SubmissionModerationRunStatus.ENQUEUED,
    } satisfies Prisma.SubmissionModerationRunUncheckedCreateInput;

    try {
      const run = await this.prisma.client.submissionModerationRun.create({
        data,
      });
      await this.moderationQueue.add(
        SUBMISSION_MODERATION_QUEUE,
        { runId: run.id },
        {
          jobId: `submission-moderation:${run.id}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
        },
      );
      return run;
    } catch (error: unknown) {
      if (!this.isUniqueConstraint(error)) throw error;
      return this.prisma.client.submissionModerationRun.findFirstOrThrow({
        where: {
          submissionId: input.submission.id,
          artifactType: input.artifactType,
          artifactHash: input.artifactHash,
          provider: input.provider,
          providerOperation: input.providerOperation,
        },
      });
    }
  }

  private createSuppressedRun(input: {
    submission: SubmissionForModeration;
    artifactType: SubmissionModerationArtifactType;
    artifactHash: string;
    provider: ModerationProvider;
    providerOperation: string;
    mediaAssetId?: string;
  }) {
    return this.prisma.client.submissionModerationRun.create({
      data: {
        projectId: input.submission.projectId,
        submissionId: input.submission.id,
        mediaAssetId: input.mediaAssetId ?? null,
        artifactType: input.artifactType,
        artifactHash: input.artifactHash,
        provider: input.provider,
        providerOperation: input.providerOperation,
        status: SubmissionModerationRunStatus.SUPPRESSED,
        errorCode: "BUDGET_SUPPRESSED",
        errorMessage: "Moderation provider budget gate suppressed this run.",
      },
    });
  }

  private executeProvider(
    run: SubmissionModerationRun & {
      submission: CollectionFormSubmission;
      mediaAsset: MediaAsset | null;
    },
  ): Promise<ModerationProviderResult> {
    if (run.provider === MODERATION_PROVIDER_LOCAL) {
      return this.noopClient.moderate();
    }

    if (
      run.artifactType === SubmissionModerationArtifactType.TEXT ||
      run.artifactType === SubmissionModerationArtifactType.TRANSCRIPT
    ) {
      const text = this.extractTextFromSubmissionRecord(run.submission);
      if (!text) throw new Error("No text available for moderation run");
      return this.comprehendClient.moderateText(text);
    }

    if (!run.mediaAsset) {
      throw new Error("No media asset available for moderation run");
    }

    const ref = {
      bucket: run.mediaAsset.bucket,
      key: run.mediaAsset.storageKey,
    };

    if (run.artifactType === SubmissionModerationArtifactType.IMAGE) {
      return this.rekognitionClient.moderateImage(ref);
    }

    if (run.artifactType === SubmissionModerationArtifactType.AUDIO) {
      return this.transcribeClient
        .startTranscription({
          jobName: `tresta-${run.id}`,
          mediaUri: `s3://${run.mediaAsset.bucket}/${run.mediaAsset.storageKey}`,
        })
        .then((result) => ({
          provider: MODERATION_PROVIDER_AWS_TRANSCRIBE,
          providerOperation: MODERATION_OPERATION_START_TRANSCRIPTION_JOB,
          providerJobId: result.providerJobId,
          score: 0,
          flags: [],
          categories: {},
          rawResult: { providerJobId: result.providerJobId },
        }));
    }

    if (run.artifactType === SubmissionModerationArtifactType.VIDEO) {
      return this.rekognitionClient
        .startVideoModeration({
          ...ref,
          clientRequestToken: run.id,
          jobTag: `submission-${run.submissionId}`,
        })
        .then((result) => ({
          provider: MODERATION_PROVIDER_AWS_REKOGNITION,
          providerOperation: MODERATION_OPERATION_START_CONTENT_MODERATION,
          providerJobId: result.providerJobId,
          score: 0,
          flags: [],
          categories: {},
          rawResult: { providerJobId: result.providerJobId },
        }));
    }

    throw new Error(`Unsupported moderation artifact type: ${run.artifactType}`);
  }

  private async reconcileSubmissionStatus(
    run: SubmissionModerationRun & {
      submission: CollectionFormSubmission;
    },
    policy: {
      moderationStatus: ModerationStatus;
      reason: string;
      score: number;
      flags: string[];
    },
    completedAt: Date,
  ) {
    await this.prisma.client.collectionFormSubmission.update({
        where: { id: run.submissionId },
        data: {
          moderationStatus: policy.moderationStatus,
          moderationReason: policy.reason,
          ...(policy.moderationStatus === ModerationStatus.APPROVED
            ? { moderatedAt: completedAt }
            : {}),
        },
      });
  }

  private async loadSubmission(submissionId: string) {
    const submission =
      await this.prisma.client.collectionFormSubmission.findUnique({
        where: { id: submissionId },
        include: {
          project: {
            select: {
              autoModeration: true,
              autoApproveVerified: true,
            },
          },
          mediaAssets: {
            where: { status: MediaAssetStatus.ACTIVE },
            select: {
              id: true,
              bucket: true,
              storageKey: true,
              contentType: true,
              byteSize: true,
              status: true,
            },
          },
        },
      });

    if (!submission) throw new NotFoundException("Submission not found");
    return submission as SubmissionForModeration;
  }

  private extractSubmissionText(submission: SubmissionForModeration) {
    return this.extractTextFromSubmissionRecord(submission);
  }

  private extractTextFromSubmissionRecord(
    submission: Pick<CollectionFormSubmission, "answers">,
  ) {
    const values = [...this.collectStrings(submission.answers)];
    const text = [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .join("\n")
      .trim();
    return text || null;
  }

  private isOAuthVerifiedSubmission(
    submission: Pick<CollectionFormSubmission, "answers">,
  ) {
    const answers = submission.answers;
    return (
      answers !== null &&
      typeof answers === "object" &&
      !Array.isArray(answers) &&
      (answers as Record<string, unknown>).isOAuthVerified === true
    );
  }

  private collectStrings(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap((item) => this.collectStrings(item));
    if (typeof value !== "object" || value === null) return [];
    return Object.values(value).flatMap((item) => this.collectStrings(item));
  }

  private artifactForAsset(asset: Pick<MediaAsset, "contentType">):
    | {
        artifactType: SubmissionModerationArtifactType;
        provider: ModerationProvider;
        providerOperation: string;
      }
    | null {
    if (asset.contentType.startsWith("image/")) {
      return {
        artifactType: SubmissionModerationArtifactType.IMAGE,
        provider: MODERATION_PROVIDER_AWS_REKOGNITION,
        providerOperation: MODERATION_OPERATION_DETECT_MODERATION_LABELS,
      };
    }
    if (asset.contentType.startsWith("audio/")) {
      return {
        artifactType: SubmissionModerationArtifactType.AUDIO,
        provider: MODERATION_PROVIDER_AWS_TRANSCRIBE,
        providerOperation: MODERATION_OPERATION_START_TRANSCRIPTION_JOB,
      };
    }
    if (asset.contentType.startsWith("video/")) {
      return {
        artifactType: SubmissionModerationArtifactType.VIDEO,
        provider: MODERATION_PROVIDER_AWS_REKOGNITION,
        providerOperation: MODERATION_OPERATION_START_CONTENT_MODERATION,
      };
    }
    return null;
  }

  private get awsEnabled() {
    return this.configService.get<boolean>("MODERATION_AWS_ENABLED") ?? false;
  }

  private budgetDisabled(provider: ModerationProvider) {
    if (provider === MODERATION_PROVIDER_LOCAL) return false;
    return (
      (this.configService.get<number>("MODERATION_AWS_DAILY_BUDGET_CENTS") ??
        500) === 0 ||
      (this.configService.get<number>("MODERATION_AWS_MONTHLY_BUDGET_CENTS") ??
        5000) === 0
    );
  }

  private canProviderUpdateSubmission(
    submission: Pick<
      CollectionFormSubmission,
      "moderatedAt" | "moderatedByActorType" | "moderationStatus"
    >,
  ) {
    if (submission.moderatedAt || submission.moderatedByActorType) return false;
    return submission.moderationStatus !== ModerationStatus.REJECTED;
  }

  private hashArtifact(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private toJson(value: unknown) {
    return value as Prisma.InputJsonValue;
  }

  private isUniqueConstraint(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  private isRetryableProviderError(error: unknown) {
    const code = this.errorCode(error);
    return [
      "ThrottlingException",
      "TooManyRequestsException",
      "ProvisionedThroughputExceededException",
      "LimitExceededException",
      "ServiceUnavailableException",
      "InternalServerError",
      "InternalServerException",
    ].includes(code);
  }

  private nextAttemptAt() {
    return new Date(Date.now() + 30_000);
  }

  private errorCode(error: unknown) {
    if (typeof error === "object" && error !== null && "name" in error) {
      return String((error as { name?: unknown }).name ?? "UNKNOWN");
    }
    return "UNKNOWN";
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
