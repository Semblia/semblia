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
  FormModerationArtifactType,
  FormModerationRunStatus,
  FormResponseReviewStatus,
  MediaAssetStatus,
  Prisma,
  type FormModerationRun,
  type FormResponse,
  type MediaAsset,
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

type SubmissionForModeration = FormResponse & {
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
    const response = await this.loadSubmission(input.submissionId);
    if (!response.project.autoModeration) return [];

    const runs: FormModerationRun[] = [];
    const text = this.extractSubmissionText(response);

    if (text) {
      runs.push(
        await this.createRunAndEnqueue({
          response,
          artifactType: FormModerationArtifactType.TEXT,
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

    for (const asset of response.mediaAssets) {
      const artifact = this.artifactForAsset(asset);
      if (!artifact) continue;
      runs.push(
        await this.createRunAndEnqueue({
          response,
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
    const run = await this.prisma.client.formModerationRun.findUnique({
      where: { id: runId },
      include: {
        response: {
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
    if (run.status === FormModerationRunStatus.SUPPRESSED) return run;

    await this.prisma.client.formModerationRun.update({
      where: { id: run.id },
      data: {
        status: FormModerationRunStatus.RUNNING,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    try {
      const result = await this.executeProvider(run);

      if (
        run.artifactType === FormModerationArtifactType.AUDIO ||
        run.artifactType === FormModerationArtifactType.VIDEO
      ) {
        return this.prisma.client.formModerationRun.update({
          where: { id: run.id },
          data: {
            status: FormModerationRunStatus.ENQUEUED,
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
        existingStatus: run.response.reviewStatus,
        verifiedTrust: this.isOAuthVerifiedSubmission(run.response),
        autoApproveVerified: run.response.project.autoApproveVerified,
      });
      const completedAt = new Date();

      const updatedRun = await this.prisma.client.formModerationRun.update({
        where: { id: run.id },
        data: {
          status: FormModerationRunStatus.SUCCEEDED,
          decision: policy.decision,
          score: policy.score,
          flags: policy.flags as unknown as Prisma.InputJsonValue,
          categories: this.toJson(result.categories),
          rawResult: this.toJson(result.rawResult),
          estimatedCostMicros: result.estimatedCostMicros ?? null,
          completedAt,
        },
      });

      if (this.canProviderUpdateSubmission(run.response)) {
        await this.reconcileSubmissionStatus(run, policy, completedAt);
      }

      return updatedRun;
    } catch (error: unknown) {
      await this.prisma.client.formModerationRun.update({
        where: { id: run.id },
        data: {
          status: FormModerationRunStatus.FAILED,
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
      return this.prisma.client.formModerationRun.findUniqueOrThrow({
        where: { id: run.id },
      });
    }
  }

  private async createRunAndEnqueue(input: {
    response: SubmissionForModeration;
    artifactType: FormModerationArtifactType;
    artifactHash: string;
    provider: ModerationProvider;
    providerOperation: string;
    mediaAssetId?: string;
  }) {
    if (this.budgetDisabled(input.provider)) {
      return this.createSuppressedRun(input);
    }

    const data = {
      projectId: input.response.projectId,
      responseId: input.response.id,
      mediaAssetId: input.mediaAssetId ?? null,
      artifactType: input.artifactType,
      artifactHash: input.artifactHash,
      provider: input.provider,
      providerOperation: input.providerOperation,
      status: FormModerationRunStatus.ENQUEUED,
    } satisfies Prisma.FormModerationRunUncheckedCreateInput;

    try {
      const run = await this.prisma.client.formModerationRun.create({ data });
      await this.moderationQueue.add(
        SUBMISSION_MODERATION_QUEUE,
        { runId: run.id },
        {
          jobId: `submission-moderation-${run.id}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
        },
      );
      return run;
    } catch (error: unknown) {
      if (!this.isUniqueConstraint(error)) throw error;
      return this.prisma.client.formModerationRun.findFirstOrThrow({
        where: {
          responseId: input.response.id,
          artifactType: input.artifactType,
          artifactHash: input.artifactHash,
          provider: input.provider,
          providerOperation: input.providerOperation,
        },
      });
    }
  }

  private createSuppressedRun(input: {
    response: SubmissionForModeration;
    artifactType: FormModerationArtifactType;
    artifactHash: string;
    provider: ModerationProvider;
    providerOperation: string;
    mediaAssetId?: string;
  }) {
    return this.prisma.client.formModerationRun.create({
      data: {
        projectId: input.response.projectId,
        responseId: input.response.id,
        mediaAssetId: input.mediaAssetId ?? null,
        artifactType: input.artifactType,
        artifactHash: input.artifactHash,
        provider: input.provider,
        providerOperation: input.providerOperation,
        status: FormModerationRunStatus.SUPPRESSED,
        errorCode: "BUDGET_SUPPRESSED",
        errorMessage: "Moderation provider budget gate suppressed this run.",
      },
    });
  }

  private executeProvider(
    run: FormModerationRun & {
      response: FormResponse;
      mediaAsset: MediaAsset | null;
    },
  ): Promise<ModerationProviderResult> {
    if (run.provider === MODERATION_PROVIDER_LOCAL) {
      return this.noopClient.moderate();
    }

    if (
      run.artifactType === FormModerationArtifactType.TEXT ||
      run.artifactType === FormModerationArtifactType.TRANSCRIPT
    ) {
      const text = this.extractTextFromSubmissionRecord(run.response);
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

    if (run.artifactType === FormModerationArtifactType.IMAGE) {
      return this.rekognitionClient.moderateImage(ref);
    }

    if (run.artifactType === FormModerationArtifactType.AUDIO) {
      return this.transcribeClient
        .startTranscription({
          jobName: `semblia-${run.id}`,
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

    if (run.artifactType === FormModerationArtifactType.VIDEO) {
      return this.rekognitionClient
        .startVideoModeration({
          ...ref,
          clientRequestToken: run.id,
          jobTag: `response-${run.responseId}`,
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
    run: FormModerationRun & {
      response: FormResponse;
    },
    policy: {
      reviewStatus: FormResponseReviewStatus;
      reason: string;
      score: number;
      flags: string[];
    },
    completedAt: Date,
  ) {
    await this.prisma.client.formResponse.update({
      where: { id: run.responseId },
      data: {
        reviewStatus: policy.reviewStatus,
        moderationReason: policy.reason,
        ...(policy.reviewStatus === FormResponseReviewStatus.APPROVED
          ? { moderatedAt: completedAt }
          : {}),
      },
    });
  }

  private async loadSubmission(submissionId: string) {
    const response = await this.prisma.client.formResponse.findUnique({
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

    if (!response) throw new NotFoundException("Submission not found");
    return response as SubmissionForModeration;
  }

  private extractSubmissionText(submission: SubmissionForModeration) {
    return this.extractTextFromSubmissionRecord(submission);
  }

  private extractTextFromSubmissionRecord(
    submission: Pick<FormResponse, "answers">,
  ) {
    const values = [...this.collectStrings(submission.answers)];
    const text = [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .join("\n")
      .trim();
    return text || null;
  }

  private isOAuthVerifiedSubmission(response: Pick<FormResponse, "sourceMetadata">) {
    const metadata = response.sourceMetadata;
    return (
      metadata !== null &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      (metadata as Record<string, unknown>).isOAuthVerified === true
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
        artifactType: FormModerationArtifactType;
        provider: ModerationProvider;
        providerOperation: string;
      }
    | null {
    if (asset.contentType.startsWith("image/")) {
      return {
        artifactType: FormModerationArtifactType.IMAGE,
        provider: MODERATION_PROVIDER_AWS_REKOGNITION,
        providerOperation: MODERATION_OPERATION_DETECT_MODERATION_LABELS,
      };
    }
    if (asset.contentType.startsWith("audio/")) {
      return {
        artifactType: FormModerationArtifactType.AUDIO,
        provider: MODERATION_PROVIDER_AWS_TRANSCRIBE,
        providerOperation: MODERATION_OPERATION_START_TRANSCRIPTION_JOB,
      };
    }
    if (asset.contentType.startsWith("video/")) {
      return {
        artifactType: FormModerationArtifactType.VIDEO,
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
    response: Pick<
      FormResponse,
      "moderatedAt" | "moderatedByActorType" | "reviewStatus"
    >,
  ) {
    if (response.moderatedAt || response.moderatedByActorType) return false;
    return response.reviewStatus === FormResponseReviewStatus.PENDING;
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
