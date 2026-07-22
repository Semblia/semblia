import { describe, expect, it, vi } from "vitest";

const { fetchPublicImport } = vi.hoisted(() => ({
  fetchPublicImport: vi.fn(),
}));

vi.mock("./safe-public-import-fetch.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./safe-public-import-fetch.js")>();
  return { ...original, fetchPublicImport };
});

import { ImportsService } from "./imports.service.js";

describe("public import worker", () => {
  it("fetches an allowlisted URL and persists extracted proof", async () => {
    fetchPublicImport.mockResolvedValue({
      url: "https://play.google.com/store/apps/details?id=com.example",
      contentType: "json",
      body: JSON.stringify({
        "@type": "Review",
        "@id": "review-1",
        reviewBody: "A reliable product that made our workflow much easier.",
        author: { name: "Ada" },
        reviewRating: { ratingValue: 5, bestRating: 5 },
      }),
    });
    const importJob = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "job_1",
        projectId: "project_1",
        sourceKey: "google-play",
        mode: "PUBLIC_URL",
        mediaAssetId: null,
        config: {
          sourceUrl:
            "https://play.google.com/store/apps/details?id=com.example",
          rightsConfirmed: true,
        },
      }),
      update: vi.fn().mockResolvedValue(undefined),
      findFirst: vi.fn().mockResolvedValue({
        id: "job_1",
        projectId: "project_1",
        sourceKey: "google-play",
        mode: "PUBLIC_URL",
        status: "SUCCEEDED",
        items: [],
      }),
    };
    const tx = {
      formResponse: {
        create: vi.fn().mockResolvedValue({ id: "response_1" }),
      },
      responseImportIdentity: { create: vi.fn().mockResolvedValue(undefined) },
      importItem: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
      client: {
        importJob,
        importItem: { findFirst: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn(
          async (callback: (writer: typeof tx) => Promise<unknown>) =>
            callback(tx),
        ),
      },
    };
    const moderation = { enqueueSubmission: vi.fn().mockResolvedValue(null) };
    const service = new ImportsService(
      prisma as never,
      { add: vi.fn() } as never,
      {} as never,
      moderation as never,
    );

    await service.process("job_1");

    expect(fetchPublicImport).toHaveBeenCalledWith(
      "https://play.google.com/store/apps/details?id=com.example",
      expect.objectContaining({
        sourceKey: "google-play",
        exactHosts: ["play.google.com"],
      }),
    );
    expect(tx.formResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origin: "IMPORT",
          authorName: "Ada",
          sourceMetadata: expect.objectContaining({
            source: "google-play",
            sourceUrl:
              "https://play.google.com/store/apps/details?id=com.example",
          }),
        }),
      }),
    );
    expect(moderation.enqueueSubmission).toHaveBeenCalledWith({
      submissionId: "response_1",
    });
    expect(importJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "SUCCEEDED",
        totalCount: 1,
        importedCount: 1,
        failedCount: 0,
      }),
    });
  });

  it("rejects a URL outside the selected source policy before persistence", async () => {
    const service = new ImportsService(
      { client: {} } as never,
      { add: vi.fn() } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createPublicImport(
        "project_1",
        {
          sourceKey: "google-play",
          sourceUrl: "https://example.com/reviews?id=com.example",
          rightsConfirmed: true,
        },
        "PUBLIC_URL",
        null,
      ),
    ).rejects.toThrow("Public import URL is not allowed");
    await expect(
      service.createPublicImport(
        "project_1",
        {
          sourceKey: "google-play",
          sourceUrl:
            "https://attacker.play.google.com/reviews?id=com.example",
          rightsConfirmed: true,
        },
        "PUBLIC_URL",
        null,
      ),
    ).rejects.toThrow("Public import URL is not allowed");
    await expect(
      service.createPublicImport(
        "project_1",
        {
          sourceKey: "google-play",
          sourceUrl: "http://play.google.com/reviews?id=com.example",
          rightsConfirmed: true,
        },
        "PUBLIC_URL",
        null,
      ),
    ).rejects.toThrow();
  });
});
