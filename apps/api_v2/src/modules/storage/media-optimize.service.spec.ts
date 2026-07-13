import { MediaAssetStatus } from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bestDerivativeKey,
  MediaOptimizeService,
} from "./media-optimize.service.js";

const resizeChain = {
  resize: vi.fn(),
  webp: vi.fn(),
  toBuffer: vi.fn(),
  metadata: vi.fn(),
};
resizeChain.resize.mockReturnValue(resizeChain);
resizeChain.webp.mockReturnValue(resizeChain);

vi.mock("sharp", () => ({ default: vi.fn(() => resizeChain) }));

describe("MediaOptimizeService", () => {
  const findUnique = vi.fn();
  const update = vi.fn();
  const getObjectBytes = vi.fn();
  const putObject = vi.fn();
  const queueAdd = vi.fn();

  function createService(withQueue = false) {
    return new MediaOptimizeService(
      { client: { mediaAsset: { findUnique, update } } } as never,
      { getObjectBytes, putObject } as never,
      withQueue ? ({ add: queueAdd } as never) : undefined,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resizeChain.resize.mockReturnValue(resizeChain);
    resizeChain.webp.mockReturnValue(resizeChain);
    update.mockResolvedValue({});
  });

  it("derives only the width tiers below the source width, as WebP", async () => {
    findUnique.mockResolvedValue({
      id: "asset_1",
      status: MediaAssetStatus.ACTIVE,
      optimizedAt: null,
      contentType: "image/jpeg",
      storageKey: "private/projects/p1/submissions/attachments/asset_1.jpg",
    });
    getObjectBytes.mockResolvedValue(Buffer.from("img"));
    resizeChain.metadata.mockResolvedValue({ width: 1000 });
    resizeChain.toBuffer.mockResolvedValue(Buffer.from("webp-bytes"));

    const result = await createService().processAsset("asset_1");

    expect(result).toBe("optimized");
    // 320 and 640 fit under 1000; 1280/2560 must not be generated.
    expect(putObject).toHaveBeenCalledTimes(2);
    expect(putObject).toHaveBeenCalledWith(
      "private/projects/p1/submissions/attachments/asset_1.jpg__w320.webp",
      expect.any(Buffer),
      "image/webp",
    );
    const saved = update.mock.calls[0]![0].data;
    expect(saved.optimizedAt).toBeInstanceOf(Date);
    expect(saved.derivatives.variants).toHaveLength(2);
    expect(saved.derivatives.variants[1].width).toBe(640);
  });

  it("passes video through unoptimized but marks the asset visited", async () => {
    findUnique.mockResolvedValue({
      id: "asset_2",
      status: MediaAssetStatus.ACTIVE,
      optimizedAt: null,
      contentType: "video/mp4",
      storageKey: "private/x/asset_2.mp4",
    });

    const result = await createService().processAsset("asset_2");

    expect(result).toBe("skipped");
    expect(getObjectBytes).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ derivatives: { variants: [] } }),
      }),
    );
  });

  it("is idempotent: an already-optimized asset is a no-op", async () => {
    findUnique.mockResolvedValue({
      id: "asset_3",
      status: MediaAssetStatus.ACTIVE,
      optimizedAt: new Date(),
      contentType: "image/png",
      storageKey: "public/x/asset_3.png",
    });

    expect(await createService().processAsset("asset_3")).toBe("skipped");
    expect(update).not.toHaveBeenCalled();
  });

  it("enqueues with a colon-free deterministic job id and survives queue failures", async () => {
    const service = createService(true);
    await service.enqueueAsset("asset_4");
    expect(queueAdd).toHaveBeenCalledWith(
      "optimize",
      { assetId: "asset_4" },
      expect.objectContaining({ jobId: "media-optimize-asset_4" }),
    );
    expect(
      (queueAdd.mock.calls[0]![2] as { jobId: string }).jobId,
    ).not.toContain(":");

    queueAdd.mockRejectedValueOnce(new Error("redis down"));
    // Must not throw — an optimization hiccup can't fail an upload confirm.
    await expect(service.enqueueAsset("asset_5")).resolves.toBeUndefined();
  });
});

describe("bestDerivativeKey", () => {
  const derivatives = {
    variants: [
      { width: 320, storageKey: "k__w320.webp", byteSize: 1, contentType: "image/webp" },
      { width: 1280, storageKey: "k__w1280.webp", byteSize: 2, contentType: "image/webp" },
    ],
  };

  it("picks the smallest variant covering the target width", () => {
    expect(bestDerivativeKey(derivatives, 300)).toBe("k__w320.webp");
    expect(bestDerivativeKey(derivatives, 700)).toBe("k__w1280.webp");
  });

  it("falls back to the largest variant when nothing covers", () => {
    expect(bestDerivativeKey(derivatives, 4000)).toBe("k__w1280.webp");
  });

  it("returns null for assets without derivatives", () => {
    expect(bestDerivativeKey(null, 640)).toBeNull();
    expect(bestDerivativeKey({}, 640)).toBeNull();
  });
});
