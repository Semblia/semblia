import { DetectToxicContentCommand } from "@aws-sdk/client-comprehend";
import type { DetectToxicContentCommandOutput } from "@aws-sdk/client-comprehend";
import { describe, expect, it, vi } from "vitest";
import {
  AwsComprehendModerationClient,
  splitTextSegments,
} from "./aws-comprehend-moderation.client.js";

describe("AwsComprehendModerationClient", () => {
  it("splits text into 1 KB chunks and batches DetectToxicContent requests", async () => {
    const send = vi.fn(
      async (
        command: DetectToxicContentCommand,
      ): Promise<DetectToxicContentCommandOutput> => {
        void command;

        return {
          $metadata: {},
          ResultList: [
            {
              Toxicity: 0.81,
              Labels: [
                { Name: "VIOLENCE_OR_THREAT", Score: 0.77 },
                { Name: "INSULT", Score: 0.2 },
              ],
            },
          ],
        };
      },
    );
    const client = new AwsComprehendModerationClient(
      { get: vi.fn(() => "us-east-1") },
      { send },
    );
    const text = "a".repeat(11_000);

    const result = await client.moderateText(text);

    expect(send).toHaveBeenCalledTimes(2);
    const firstCommand = send.mock
      .calls[0]?.[0] as unknown as DetectToxicContentCommand;
    expect(firstCommand).toBeInstanceOf(DetectToxicContentCommand);
    expect(firstCommand.input).toMatchObject({
      LanguageCode: "en",
    });
    expect(firstCommand.input.TextSegments).toHaveLength(10);
    expect(result).toMatchObject({
      provider: "aws-comprehend",
      providerOperation: "DetectToxicContent",
      score: 0.81,
      flags: ["violence_or_threat"],
      categories: {
        violence_or_threat: 0.77,
        insult: 0.2,
      },
    });
  });

  it("keeps utf-8 chunks under the Comprehend segment byte cap", () => {
    for (const chunk of splitTextSegments("🙂".repeat(400), 1024)) {
      expect(Buffer.byteLength(chunk, "utf8")).toBeLessThanOrEqual(1024);
    }
  });
});
