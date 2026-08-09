import type {
  GetTranscriptionJobCommandOutput,
  LanguageCode,
  MediaFormat,
  StartTranscriptionJobCommandOutput,
} from "@aws-sdk/client-transcribe";
import type { ConfigService } from "@nestjs/config";
import { normalizeAwsModerationLabel } from "../submission-moderation.policy.js";
import type { ModerationProviderResult } from "../submission-moderation.types.js";

type TranscribeSender = {
  send(command: unknown): Promise<unknown>;
};

type TranscriptFetch = (url: string) => Promise<unknown>;

export type TranscribeModerationResult = ModerationProviderResult & {
  transcriptText: string | null;
};

export class AwsTranscribeModerationClient {
  private client: TranscribeSender | null;

  constructor(
    private readonly configService: Pick<ConfigService, "get">,
    client?: TranscribeSender,
    private readonly fetchTranscript: TranscriptFetch = fetchTranscriptJson,
  ) {
    this.client = client ?? null;
  }

  async startTranscription(input: {
    jobName: string;
    mediaUri: string;
    mediaFormat?: MediaFormat;
    languageCode?: LanguageCode;
    outputBucketName?: string;
    outputKey?: string;
  }): Promise<{ providerJobId: string | null }> {
    const languageCode = input.languageCode ?? "en-US";
    const { StartTranscriptionJobCommand, ToxicityCategory } = await import(
      "@aws-sdk/client-transcribe"
    );
    const response = (await (
      await this.getClient()
    ).send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: input.jobName,
        LanguageCode: languageCode,
        ...(input.mediaFormat ? { MediaFormat: input.mediaFormat } : {}),
        Media: { MediaFileUri: input.mediaUri },
        ...(input.outputBucketName
          ? { OutputBucketName: input.outputBucketName }
          : {}),
        ...(input.outputKey ? { OutputKey: input.outputKey } : {}),
        ...(languageCode === "en-US"
          ? {
              ToxicityDetection: [
                { ToxicityCategories: [ToxicityCategory.ALL] },
              ],
            }
          : {}),
      }),
    )) as StartTranscriptionJobCommandOutput;

    return {
      providerJobId: response.TranscriptionJob?.TranscriptionJobName ?? null,
    };
  }

  async getTranscriptionResult(
    jobName: string,
  ): Promise<TranscribeModerationResult> {
    const { GetTranscriptionJobCommand } = await import(
      "@aws-sdk/client-transcribe"
    );
    const response = (await (
      await this.getClient()
    ).send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }),
    )) as GetTranscriptionJobCommandOutput;
    const job = response.TranscriptionJob;
    const transcriptUri = job?.Transcript?.TranscriptFileUri ?? null;
    const transcriptJson =
      job?.TranscriptionJobStatus === "COMPLETED" && transcriptUri
        ? await this.fetchTranscript(transcriptUri)
        : null;
    const transcriptText = extractTranscriptText(transcriptJson);
    const categories = extractToxicityCategories(transcriptJson);
    const flags = Object.entries(categories)
      .filter(([, value]) => value >= 0.5)
      .map(([key]) => key);

    return {
      provider: "aws-transcribe",
      providerOperation: "GetTranscriptionJob",
      providerJobId: jobName,
      score: Object.values(categories).reduce(
        (max, value) => Math.max(max, value),
        0,
      ),
      flags,
      categories,
      rawResult: {
        jobStatus: job?.TranscriptionJobStatus,
        failureReason: job?.FailureReason,
        languageCode: job?.LanguageCode,
        toxicityDetection: job?.ToxicityDetection ?? [],
        transcriptFileUri: transcriptUri,
      },
      transcriptText,
    };
  }

  private async getClient(): Promise<TranscribeSender> {
    if (this.client) return this.client;

    const { TranscribeClient } = await import("@aws-sdk/client-transcribe");
    this.client = new TranscribeClient({
      region:
        this.configService.get<string>("MODERATION_AWS_REGION") ?? "us-east-1",
    }) as TranscribeSender;
    return this.client;
  }
}

function extractTranscriptText(value: unknown): string | null {
  const record = asRecord(value);
  const results = asRecord(record.results);
  const transcripts = Array.isArray(results.transcripts)
    ? results.transcripts
    : [];
  const text = transcripts
    .map((entry) => asRecord(entry).transcript)
    .filter((entry): entry is string => typeof entry === "string")
    .join("\n")
    .trim();

  return text || null;
}

function extractToxicityCategories(value: unknown): Record<string, number> {
  const categories: Record<string, number> = {};
  collectToxicityCategories(value, categories);
  return categories;
}

function collectToxicityCategories(
  value: unknown,
  categories: Record<string, number>,
) {
  if (Array.isArray(value)) {
    for (const item of value) collectToxicityCategories(item, categories);
    return;
  }

  const record = asRecord(value);
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === "number") {
      const normalized = normalizeAwsModerationLabel(key);
      if (normalized.includes("toxicity") || normalized.includes("toxic")) {
        categories[normalized] = Math.max(categories[normalized] ?? 0, entry);
      }
      continue;
    }

    if (typeof entry === "object" && entry !== null) {
      collectToxicityCategories(entry, categories);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

async function fetchTranscriptJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Transcribe transcript: ${response.status}`,
    );
  }
  return response.json();
}
