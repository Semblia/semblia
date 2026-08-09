import type { ModerationProviderResult } from "../submission-moderation.types.js";

export class NoopModerationClient {
  async moderate(): Promise<ModerationProviderResult> {
    return {
      provider: "local",
      providerOperation: "noop",
      score: 0,
      flags: [],
      categories: {},
      rawResult: { disabled: true },
    };
  }
}
