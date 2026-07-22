import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  MediaAssetPurpose,
  MediaAssetStatus,
} from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";
import { MediaService } from "../storage/media.service.js";

// Keep enough distance from the upload/worker handoff that a delayed Bull retry
// cannot lose its source asset while it is still eligible to run.
const STALE_IMPORT_SOURCE_MAX_AGE_MS = 60 * 60 * 1000;

@Injectable()
export class ImportSourceCleanupService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: "terminal-import-source-cleanup",
    waitForCompletion: true,
  })
  async reapTerminalSources() {
    const staleBefore = new Date(Date.now() - STALE_IMPORT_SOURCE_MAX_AGE_MS);
    const assets = await this.prisma.client.mediaAsset.findMany({
      where: {
        purpose: MediaAssetPurpose.IMPORT_SOURCE,
        OR: [
          // Completed imports no longer need their source asset.
          {
            status: MediaAssetStatus.ACTIVE,
            importSourceFor: {
              is: {
                status: { in: ["SUCCEEDED", "PARTIAL"] },
                completedAt: { not: null },
              },
            },
          },
          // Never-confirmed uploads and orphaned active uploads need a grace
          // period because a queue handoff or retry can legitimately lag.
          {
            status: MediaAssetStatus.PENDING,
            createdAt: { lte: staleBefore },
          },
          {
            status: MediaAssetStatus.ACTIVE,
            createdAt: { lte: staleBefore },
            importSourceFor: { is: null },
          },
          {
            status: MediaAssetStatus.ACTIVE,
            importSourceFor: {
              is: {
                status: "FAILED",
                completedAt: { lte: staleBefore },
              },
            },
          },
        ],
      },
      orderBy: { updatedAt: "asc" },
      select: { id: true },
      take: 100,
    });
    const outcomes = await Promise.all(
      assets.map((asset) => this.media.cleanupImportSource(asset.id)),
    );
    return {
      scanned: assets.length,
      cleaned: outcomes.filter(Boolean).length,
    };
  }
}
