import { DelayedError } from "bullmq";
import { describe, expect, it, vi } from "vitest";

import { ImportsProcessor } from "./imports.processor.js";
import { ImportRetryAfterError } from "./imports.service.js";

describe("ImportsProcessor", () => {
  it("honors a provider Retry-After delay without failing the Bull job", async () => {
    const moveToDelayed = vi.fn().mockResolvedValue(undefined);
    const processor = new ImportsProcessor({
      process: vi.fn().mockRejectedValue(new ImportRetryAfterError(120_000)),
    } as never);
    const before = Date.now();

    await expect(
      processor.process({
        data: { jobId: "job_1" },
        token: "worker-lock",
        moveToDelayed,
      } as never),
    ).rejects.toBeInstanceOf(DelayedError);

    expect(moveToDelayed).toHaveBeenCalledWith(
      expect.any(Number),
      "worker-lock",
    );
    expect(moveToDelayed.mock.calls[0]![0]).toBeGreaterThanOrEqual(
      before + 120_000,
    );
  });
});
