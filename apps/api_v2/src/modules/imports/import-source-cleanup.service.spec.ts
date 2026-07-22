import {
  MediaAssetPurpose,
  MediaAssetStatus,
} from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import { ImportSourceCleanupService } from "./import-source-cleanup.service.js";

describe("ImportSourceCleanupService", () => {
  it("retries a bounded batch of terminal import source cleanup", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([{ id: "asset_1" }, { id: "asset_2" }]);
    const cleanupImportSource = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const service = new ImportSourceCleanupService(
      { client: { mediaAsset: { findMany } } } as never,
      { cleanupImportSource } as never,
    );
    await expect(service.reapTerminalSources()).resolves.toEqual({
      scanned: 2,
      cleaned: 1,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        purpose: MediaAssetPurpose.IMPORT_SOURCE,
        status: MediaAssetStatus.ACTIVE,
        importSourceFor: {
          is: {
            status: { in: ["SUCCEEDED", "PARTIAL"] },
            completedAt: { not: null },
          },
        },
      },
      orderBy: { updatedAt: "asc" },
      select: { id: true },
      take: 100,
    });
  });
});
