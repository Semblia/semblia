import type {
  DetectToxicContentCommand,
  DetectToxicContentCommandOutput,
  LanguageCode,
} from "@aws-sdk/client-comprehend";
import type { ConfigService } from "@nestjs/config";
import { normalizeAwsModerationLabel } from "../submission-moderation.policy.js";
import type { ModerationProviderResult } from "../submission-moderation.types.js";

type ComprehendSender = {
  send(
    command: DetectToxicContentCommand,
  ): Promise<DetectToxicContentCommandOutput>;
};

export class AwsComprehendModerationClient {
  private client: ComprehendSender | null;

  constructor(
    private readonly configService: Pick<ConfigService, "get">,
    client?: ComprehendSender,
  ) {
    this.client = client ?? null;
  }

  async moderateText(
    text: string,
    languageCode: LanguageCode = "en",
  ): Promise<ModerationProviderResult> {
    const chunks = splitTextSegments(text);
    const categories: Record<string, number> = {};
    const flags = new Set<string>();
    let score = 0;
    let resultCount = 0;
    const errors: Array<Record<string, unknown>> = [];
    const { DetectToxicContentCommand } = await import(
      "@aws-sdk/client-comprehend"
    );
    const client = await this.getClient();

    for (const batch of chunkArray(chunks, 10)) {
      const response = await client.send(
        new DetectToxicContentCommand({
          TextSegments: batch.map((segment) => ({ Text: segment })),
          LanguageCode: languageCode,
        }),
      );

      for (const result of response.ResultList ?? []) {
        resultCount += 1;
        score = Math.max(score, result.Toxicity ?? 0);

        for (const label of result.Labels ?? []) {
          const name = normalizeAwsModerationLabel(label.Name ?? "");
          if (!name) continue;
          const labelScore = label.Score ?? 0;
          categories[name] = Math.max(categories[name] ?? 0, labelScore);
          if (labelScore >= 0.5) flags.add(name);
        }
      }
    }

    return {
      provider: "aws-comprehend",
      providerOperation: "DetectToxicContent",
      score,
      flags: [...flags],
      categories,
      rawResult: {
        resultCount,
        errors,
      },
    };
  }

  private async getClient(): Promise<ComprehendSender> {
    if (this.client) return this.client;

    const { ComprehendClient } = await import("@aws-sdk/client-comprehend");
    this.client = new ComprehendClient({
      region:
        this.configService.get<string>("MODERATION_AWS_REGION") ?? "us-east-1",
    }) as ComprehendSender;
    return this.client;
  }
}

export function splitTextSegments(text: string, maxBytes = 1024): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const char of text) {
    const next = `${current}${char}`;
    if (Buffer.byteLength(next, "utf8") > maxBytes && current) {
      chunks.push(current);
      current = char;
      continue;
    }

    current = next;
  }

  if (current) chunks.push(current);
  return chunks;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
