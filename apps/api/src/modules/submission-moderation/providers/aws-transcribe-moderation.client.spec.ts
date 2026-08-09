import {
  GetTranscriptionJobCommand,
  StartTranscriptionJobCommand,
  type GetTranscriptionJobCommandOutput,
  type StartTranscriptionJobCommandOutput,
} from "@aws-sdk/client-transcribe";
import { describe, expect, it, vi } from "vitest";
import { AwsTranscribeModerationClient } from "./aws-transcribe-moderation.client.js";

describe("AwsTranscribeModerationClient", () => {
  it("starts US English transcription jobs with toxicity detection enabled", async () => {
    const send = vi.fn(
      async (
        command: StartTranscriptionJobCommand,
      ): Promise<StartTranscriptionJobCommandOutput> => {
        void command;

        return {
          $metadata: {},
          TranscriptionJob: { TranscriptionJobName: "job_1" },
        };
      },
    );
    const client = new AwsTranscribeModerationClient(
      { get: vi.fn(() => "us-east-1") },
      { send } as never,
    );

    await expect(
      client.startTranscription({
        jobName: "job_1",
        mediaUri: "s3://assets/submissions/audio.mp3",
        mediaFormat: "mp3",
        outputBucketName: "moderation-results",
        outputKey: "job_1.json",
      }),
    ).resolves.toEqual({ providerJobId: "job_1" });

    const command = send.mock
      .calls[0]?.[0] as unknown as StartTranscriptionJobCommand;
    expect(command).toBeInstanceOf(StartTranscriptionJobCommand);
    expect(command.input).toEqual({
      TranscriptionJobName: "job_1",
      LanguageCode: "en-US",
      MediaFormat: "mp3",
      Media: { MediaFileUri: "s3://assets/submissions/audio.mp3" },
      OutputBucketName: "moderation-results",
      OutputKey: "job_1.json",
      ToxicityDetection: [{ ToxicityCategories: ["ALL"] }],
    });
  });

  it("does not enable toxicity detection for non-US-English jobs", async () => {
    const send = vi.fn(
      async (
        command: StartTranscriptionJobCommand,
      ): Promise<StartTranscriptionJobCommandOutput> => {
        void command;

        return {
          $metadata: {},
          TranscriptionJob: { TranscriptionJobName: "job_2" },
        };
      },
    );
    const client = new AwsTranscribeModerationClient(
      { get: vi.fn(() => "us-east-1") },
      { send } as never,
    );

    await client.startTranscription({
      jobName: "job_2",
      mediaUri: "s3://assets/submissions/audio.wav",
      languageCode: "en-IN",
    });

    const command = send.mock
      .calls[0]?.[0] as unknown as StartTranscriptionJobCommand;
    expect(command.input).not.toHaveProperty("ToxicityDetection");
  });

  it("polls completed transcription jobs and emits transcript artifacts", async () => {
    const send = vi.fn(
      async (
        command: GetTranscriptionJobCommand,
      ): Promise<GetTranscriptionJobCommandOutput> => {
        void command;

        return {
          $metadata: {},
          TranscriptionJob: {
            TranscriptionJobName: "job_1",
            TranscriptionJobStatus: "COMPLETED",
            LanguageCode: "en-US",
            ToxicityDetection: [{ ToxicityCategories: ["ALL"] }],
            Transcript: { TranscriptFileUri: "https://example.com/job_1.json" },
          },
        };
      },
    );
    const fetchTranscript = vi.fn(async () => ({
      results: {
        transcripts: [{ transcript: "hello world" }],
        toxicity_detection: [{ toxicity: 0.73 }],
      },
    }));
    const client = new AwsTranscribeModerationClient(
      { get: vi.fn(() => "us-east-1") },
      { send } as never,
      fetchTranscript,
    );

    const result = await client.getTranscriptionResult("job_1");

    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetTranscriptionJobCommand);
    expect(
      (send.mock.calls[0]?.[0] as unknown as GetTranscriptionJobCommand).input,
    ).toEqual({
      TranscriptionJobName: "job_1",
    });
    expect(fetchTranscript).toHaveBeenCalledWith(
      "https://example.com/job_1.json",
    );
    expect(result).toMatchObject({
      provider: "aws-transcribe",
      providerOperation: "GetTranscriptionJob",
      providerJobId: "job_1",
      score: 0.73,
      flags: ["toxicity"],
      categories: { toxicity: 0.73 },
      transcriptText: "hello world",
    });
  });
});
