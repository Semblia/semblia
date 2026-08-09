import {
  DetectModerationLabelsCommand,
  GetContentModerationCommand,
  StartContentModerationCommand,
  type DetectModerationLabelsCommandOutput,
  type GetContentModerationCommandOutput,
  type StartContentModerationCommandOutput,
} from "@aws-sdk/client-rekognition";
import { describe, expect, it, vi } from "vitest";
import { AwsRekognitionModerationClient } from "./aws-rekognition-moderation.client.js";

describe("AwsRekognitionModerationClient", () => {
  it("constructs image moderation requests with S3 refs and normalizes labels", async () => {
    const send = vi.fn(
      async (
        command: DetectModerationLabelsCommand,
      ): Promise<DetectModerationLabelsCommandOutput> => {
        void command;

        return {
          $metadata: {},
          ModerationModelVersion: "7.0",
          ContentTypes: [{ Name: "Illustrated", Confidence: 91 }],
          ModerationLabels: [
            { Name: "Explicit Nudity", Confidence: 95 },
            { Name: "Violence", Confidence: 72 },
          ],
        };
      },
    );
    const client = new AwsRekognitionModerationClient(
      { get: vi.fn(() => 70) },
      { send } as never,
    );

    const result = await client.moderateImage({
      bucket: "assets",
      key: "submissions/image.png",
      version: "v1",
    });

    const command = send.mock
      .calls[0]?.[0] as unknown as DetectModerationLabelsCommand;
    expect(command).toBeInstanceOf(DetectModerationLabelsCommand);
    expect(command.input).toEqual({
      Image: {
        S3Object: {
          Bucket: "assets",
          Name: "submissions/image.png",
          Version: "v1",
        },
      },
      MinConfidence: 70,
    });
    expect(result).toMatchObject({
      provider: "aws-rekognition",
      providerOperation: "DetectModerationLabels",
      score: 0.95,
      flags: ["explicit_nudity", "violence"],
      categories: {
        explicit_nudity: 0.95,
        violence: 0.72,
      },
      rawResult: {
        moderationModelVersion: "7.0",
        labelCount: 2,
      },
    });
  });

  it("starts and polls video moderation jobs", async () => {
    const send = vi.fn(
      async (
        command:
          | StartContentModerationCommand
          | GetContentModerationCommand,
      ): Promise<
        StartContentModerationCommandOutput | GetContentModerationCommandOutput
      > => {
        if (command instanceof StartContentModerationCommand) {
          return { $metadata: {}, JobId: "rek_job_1" };
        }

        return {
          $metadata: {},
          JobStatus: "SUCCEEDED",
          ModerationModelVersion: "7.0",
          ModerationLabels: [
            {
              ModerationLabel: { Name: "Rude Gestures", Confidence: 88 },
              StartTimestampMillis: 0,
            },
          ],
        };
      },
    );
    const client = new AwsRekognitionModerationClient(
      { get: vi.fn(() => 80) },
      { send } as never,
    );

    await expect(
      client.startVideoModeration({
        bucket: "assets",
        key: "submissions/video.mp4",
        clientRequestToken: "token-1",
        jobTag: "submission-1",
      }),
    ).resolves.toEqual({ providerJobId: "rek_job_1" });
    await expect(client.getVideoModerationResult("rek_job_1")).resolves.toEqual(
      expect.objectContaining({
        providerOperation: "GetContentModeration",
        providerJobId: "rek_job_1",
        score: 0.88,
        flags: ["rude_gestures"],
      }),
    );

    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(
      StartContentModerationCommand,
    );
    expect(
      (send.mock.calls[0]?.[0] as unknown as StartContentModerationCommand)
        .input,
    ).toMatchObject({
        Video: {
          S3Object: {
            Bucket: "assets",
            Name: "submissions/video.mp4",
          },
        },
        MinConfidence: 80,
        ClientRequestToken: "token-1",
        JobTag: "submission-1",
      });
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(GetContentModerationCommand);
    expect(
      (send.mock.calls[1]?.[0] as unknown as GetContentModerationCommand).input,
    ).toEqual({
        JobId: "rek_job_1",
        SortBy: "TIMESTAMP",
      });
  });
});
