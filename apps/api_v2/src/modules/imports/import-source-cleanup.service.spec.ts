import {
  MediaAssetPurpose,
  MediaAssetStatus,
} from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import { ImportSourceCleanupService } from "./import-source-cleanup.service.js";

describe("ImportSourceCleanupService", () => {
  it("reaps completed import sources immediately in a bounded batch", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:00:00.000Z"));
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
        OR: [
          {
            status: MediaAssetStatus.ACTIVE,
            importSourceFor: {
              is: {
                status: { in: ["SUCCEEDED", "PARTIAL"] },
                completedAt: { not: null },
              },
            },
          },
          {
            status: MediaAssetStatus.PENDING,
            createdAt: { lte: new Date("2026-07-22T09:00:00.000Z") },
          },
          {
            status: MediaAssetStatus.ACTIVE,
            createdAt: { lte: new Date("2026-07-22T09:00:00.000Z") },
            importSourceFor: { is: null },
          },
          {
            status: MediaAssetStatus.ACTIVE,
            importSourceFor: {
              is: {
                status: "FAILED",
                completedAt: { lte: new Date("2026-07-22T09:00:00.000Z") },
              },
            },
          },
        ],
      },
      orderBy: { updatedAt: "asc" },
      select: { id: true },
      take: 100,
    });
    expect(cleanupImportSource).toHaveBeenNthCalledWith(1, "asset_1");
    expect(cleanupImportSource).toHaveBeenNthCalledWith(2, "asset_2");
    vi.useRealTimers();
  });

  it("reports all stale pending, orphaned, and terminal-failed cleanup outcomes", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        { id: "pending" },
        { id: "orphan" },
        { id: "failed" },
      ]);
    const cleanupImportSource = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const service = new ImportSourceCleanupService(
      { client: { mediaAsset: { findMany } } } as never,
      { cleanupImportSource } as never,
    );

    await expect(service.reapTerminalSources()).resolves.toEqual({
      scanned: 3,
      cleaned: 2,
    });
    expect(cleanupImportSource).toHaveBeenNthCalledWith(1, "pending");
    expect(cleanupImportSource).toHaveBeenNthCalledWith(2, "orphan");
    expect(cleanupImportSource).toHaveBeenNthCalledWith(3, "failed");
  });
});
