import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  MediaAssetPurpose,
  MediaAssetStatus,
} from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";
import { MediaService } from "../storage/media.service.js";

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
    const assets = await this.prisma.client.mediaAsset.findMany({
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
    const outcomes = await Promise.all(
      assets.map((asset) => this.media.cleanupImportSource(asset.id)),
    );
    return {
      scanned: assets.length,
      cleaned: outcomes.filter(Boolean).length,
    };
  }
}
