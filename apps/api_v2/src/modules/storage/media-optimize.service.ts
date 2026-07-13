import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { MediaAssetStatus, Prisma } from "@workspace/database/prisma";
import { MEDIA_OPTIMIZE_QUEUE } from "../queueing/queueing.constants.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { S3Service } from "./s3.service.js";

export interface MediaOptimizeJob {
  assetId: string;
}

/** Width tiers generated for images. Never upscaled past the source width. */
export const IMAGE_DERIVATIVE_WIDTHS = [320, 640, 1280, 2560] as const;

const WEBP_QUALITY = 78;

export interface MediaDerivativeVariant {
  width: number;
  storageKey: string;
  byteSize: number;
  contentType: string;
}

/**
 * Server-side media optimization (template system rebuild, hard requirement:
 * unoptimized media must never reach a viewer). Enqueued when an asset becomes
 * ACTIVE (owner confirm or public-submit activation); the worker derives
 * width-tiered WebP variants and records them on the asset. Derivative keys
 * extend the original storage key, so they inherit its public/private root
 * and its lifecycle.
 *
 * Only raster images are derived today. Video/audio pass through unoptimized:
 * this method is the seam where poster extraction and transcode plug in.
 * ponytail: image-only pipeline — add an ffmpeg processor branch here when
 * video delivery volume justifies it.
 */
@Injectable()
export class MediaOptimizeService {
  private readonly logger = new Logger(MediaOptimizeService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(S3Service) private readonly s3: S3Service,
    @Optional()
    @InjectQueue(MEDIA_OPTIMIZE_QUEUE)
    private readonly queue?: Queue<MediaOptimizeJob>,
  ) {}

  /** Best-effort enqueue: an optimization hiccup must never fail an upload. */
  async enqueueAsset(assetId: string) {
    if (!this.queue) return;
    try {
      await this.queue.add(
        "optimize",
        { assetId },
        {
          // BullMQ job ids must never contain ":" — cuids are safe.
          jobId: `media-optimize-${assetId}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 15_000 },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue media optimization for ${assetId}: ${String(err)}`,
      );
    }
  }

  async enqueueAssets(assetIds: string[]) {
    for (const id of [...new Set(assetIds.filter(Boolean))]) {
      await this.enqueueAsset(id);
    }
  }

  /** Worker entry. Idempotent: an already-optimized asset is a no-op. */
  async processAsset(assetId: string): Promise<"optimized" | "skipped"> {
    const asset = await this.prisma.client.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset || asset.status !== MediaAssetStatus.ACTIVE) return "skipped";
    if (asset.optimizedAt) return "skipped";

    const type = asset.contentType.toLowerCase();
    // Animated GIFs resize poorly frame-by-frame; leave them as authored.
    if (!type.startsWith("image/") || type === "image/gif") {
      await this.markOptimized(asset.id, []);
      return "skipped";
    }

    const source = await this.s3.getObjectBytes(asset.storageKey);
    const { default: sharp } = await import("sharp");
    const metadata = await sharp(source).metadata();
    const sourceWidth = metadata.width ?? 0;

    const variants: MediaDerivativeVariant[] = [];
    for (const width of IMAGE_DERIVATIVE_WIDTHS) {
      if (sourceWidth > 0 && width >= sourceWidth) break;
      const buffer = await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      const storageKey = `${asset.storageKey}__w${width}.webp`;
      await this.s3.putObject(storageKey, buffer, "image/webp");
      variants.push({
        width,
        storageKey,
        byteSize: buffer.byteLength,
        contentType: "image/webp",
      });
    }

    await this.markOptimized(asset.id, variants);
    return variants.length > 0 ? "optimized" : "skipped";
  }

  private markOptimized(assetId: string, variants: MediaDerivativeVariant[]) {
    return this.prisma.client.mediaAsset.update({
      where: { id: assetId },
      data: {
        derivatives: { variants } as unknown as Prisma.InputJsonValue,
        optimizedAt: new Date(),
      },
    });
  }
}

/**
 * Pick the smallest stored variant that still covers `targetWidth`; null when
 * no derivative fits (serve the original).
 */
export function bestDerivativeKey(
  derivatives: unknown,
  targetWidth: number,
): string | null {
  if (!derivatives || typeof derivatives !== "object") return null;
  const variants = (derivatives as { variants?: unknown }).variants;
  if (!Array.isArray(variants)) return null;
  const usable = variants
    .filter(
      (v): v is MediaDerivativeVariant =>
        !!v &&
        typeof v === "object" &&
        typeof (v as MediaDerivativeVariant).width === "number" &&
        typeof (v as MediaDerivativeVariant).storageKey === "string",
    )
    .sort((a, b) => a.width - b.width);
  if (usable.length === 0) return null;
  const covering = usable.find((v) => v.width >= targetWidth);
  return (covering ?? usable[usable.length - 1]!).storageKey;
}
