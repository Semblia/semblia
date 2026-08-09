import type {
  DetectModerationLabelsCommandOutput,
  GetContentModerationCommandOutput,
  StartContentModerationCommandOutput,
} from "@aws-sdk/client-rekognition";
import type { ConfigService } from "@nestjs/config";
import { normalizeAwsModerationLabel } from "../submission-moderation.policy.js";
import type { ModerationProviderResult } from "../submission-moderation.types.js";

type RekognitionSender = {
  send(command: unknown): Promise<unknown>;
};

type S3ObjectRef = {
  bucket: string;
  key: string;
  version?: string | null;
};

export class AwsRekognitionModerationClient {
  private client: RekognitionSender | null;

  constructor(
    private readonly configService: Pick<ConfigService, "get">,
    client?: RekognitionSender,
  ) {
    this.client = client ?? null;
  }

  async moderateImage(ref: S3ObjectRef): Promise<ModerationProviderResult> {
    const { DetectModerationLabelsCommand } = await import(
      "@aws-sdk/client-rekognition"
    );
    const response = (await (
      await this.getClient()
    ).send(
      new DetectModerationLabelsCommand({
        Image: { S3Object: this.toS3Object(ref) },
        MinConfidence: this.minConfidence,
      }),
    )) as DetectModerationLabelsCommandOutput;

    const normalized = normalizeModerationLabels(
      response.ModerationLabels ?? [],
    );

    return {
      provider: "aws-rekognition",
      providerOperation: "DetectModerationLabels",
      score: normalized.score,
      flags: normalized.flags,
      categories: normalized.categories,
      rawResult: {
        moderationModelVersion: response.ModerationModelVersion,
        contentTypes: response.ContentTypes ?? [],
        labelCount: response.ModerationLabels?.length ?? 0,
      },
    };
  }

  async startVideoModeration(
    ref: S3ObjectRef & { clientRequestToken?: string; jobTag?: string },
  ): Promise<{ providerJobId: string | null }> {
    const { StartContentModerationCommand } = await import(
      "@aws-sdk/client-rekognition"
    );
    const response = (await (
      await this.getClient()
    ).send(
      new StartContentModerationCommand({
        Video: { S3Object: this.toS3Object(ref) },
        MinConfidence: this.minConfidence,
        ...(ref.clientRequestToken
          ? { ClientRequestToken: ref.clientRequestToken }
          : {}),
        ...(ref.jobTag ? { JobTag: ref.jobTag } : {}),
      }),
    )) as StartContentModerationCommandOutput;

    return { providerJobId: response.JobId ?? null };
  }

  async getVideoModerationResult(
    providerJobId: string,
  ): Promise<ModerationProviderResult> {
    const { GetContentModerationCommand } = await import(
      "@aws-sdk/client-rekognition"
    );
    const response = (await (
      await this.getClient()
    ).send(
      new GetContentModerationCommand({
        JobId: providerJobId,
        SortBy: "TIMESTAMP",
      }),
    )) as GetContentModerationCommandOutput;
    const labels = (response.ModerationLabels ?? [])
      .map((entry) => entry.ModerationLabel)
      .filter((label): label is NonNullable<typeof label> => Boolean(label));
    const normalized = normalizeModerationLabels(labels);

    return {
      provider: "aws-rekognition",
      providerOperation: "GetContentModeration",
      providerJobId,
      score: normalized.score,
      flags: normalized.flags,
      categories: normalized.categories,
      rawResult: {
        jobStatus: response.JobStatus,
        statusMessage: response.StatusMessage,
        moderationModelVersion: response.ModerationModelVersion,
        videoMetadata: response.VideoMetadata ?? null,
        labelCount: response.ModerationLabels?.length ?? 0,
      },
    };
  }

  private async getClient(): Promise<RekognitionSender> {
    if (this.client) return this.client;

    const { RekognitionClient } = await import("@aws-sdk/client-rekognition");
    this.client = new RekognitionClient({
      region:
        this.configService.get<string>("MODERATION_AWS_REGION") ?? "us-east-1",
    }) as RekognitionSender;
    return this.client;
  }

  private get minConfidence() {
    return (
      this.configService.get<number>("MODERATION_IMAGE_MIN_CONFIDENCE") ?? 70
    );
  }

  private toS3Object(ref: S3ObjectRef) {
    return {
      Bucket: ref.bucket,
      Name: ref.key,
      ...(ref.version ? { Version: ref.version } : {}),
    };
  }
}

function normalizeModerationLabels(
  labels: Array<{ Name?: string; Confidence?: number }>,
) {
  const flags = new Set<string>();
  const categories: Record<string, number> = {};
  let score = 0;

  for (const label of labels) {
    const name = normalizeAwsModerationLabel(label.Name ?? "");
    if (!name) continue;
    const normalizedScore = (label.Confidence ?? 0) / 100;
    score = Math.max(score, normalizedScore);
    categories[name] = Math.max(categories[name] ?? 0, normalizedScore);
    flags.add(name);
  }

  return { score, flags: [...flags], categories };
}
