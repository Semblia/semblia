import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPublicImport } = vi.hoisted(() => ({
  fetchPublicImport: vi.fn(),
}));

vi.mock("./safe-public-import-fetch.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./safe-public-import-fetch.js")>();
  return { ...original, fetchPublicImport };
});

import { ImportRetryAfterError, ImportsService } from "./imports.service.js";
import { ImportProviderError } from "./providers/official-import-providers.js";

function importJobRepository(input: {
  id: string;
  sourceKey: string;
  sourceUrl: string;
}) {
  return {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({
      id: input.id,
      projectId: "project_1",
      sourceKey: input.sourceKey,
      mode: "PUBLIC_URL",
      mediaAssetId: null,
      config: { sourceUrl: input.sourceUrl, rightsConfirmed: true },
    }),
    update: vi.fn().mockResolvedValue(undefined),
    findFirst: vi.fn().mockResolvedValue({
      id: input.id,
      projectId: "project_1",
      sourceKey: input.sourceKey,
      mode: "PUBLIC_URL",
      status: "SUCCEEDED",
      items: [],
    }),
  };
}

function persistingService(input: {
  importJob: ReturnType<typeof importJobRepository>;
  provider?: { fetchCandidates: ReturnType<typeof vi.fn> };
}) {
  const tx = {
    formResponse: {
      create: vi.fn().mockResolvedValue({ id: "response_1" }),
    },
    responseImportIdentity: { create: vi.fn().mockResolvedValue(undefined) },
    importItem: { create: vi.fn().mockResolvedValue(undefined) },
  };
  const moderation = { enqueueSubmission: vi.fn().mockResolvedValue(null) };
  const service = new ImportsService(
    {
      client: {
        importJob: input.importJob,
        importItem: { findFirst: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn(
          async (callback: (writer: typeof tx) => Promise<unknown>) =>
            callback(tx),
        ),
      },
    } as never,
    { add: vi.fn() } as never,
    {} as never,
    moderation as never,
    undefined,
    undefined,
    undefined,
    input.provider
      ? ({ get: vi.fn().mockReturnValue(input.provider) } as never)
      : undefined,
  );
  return { moderation, service, tx };
}

describe("public import worker", () => {
  beforeEach(() => {
    fetchPublicImport.mockReset();
  });

  it("fetches an allowlisted URL and persists extracted proof", async () => {
    fetchPublicImport.mockResolvedValue({
      url: "https://customer.wordpress.com/wp-json/wp/v2/comments?post=42&per_page=20",
      contentType: "json",
      body: JSON.stringify([
        {
          id: 7,
          date: "2026-01-02T03:04:05Z",
          content: {
            rendered:
              "<p>A reliable product that made our workflow much easier.</p>",
          },
          author_name: "Ada",
        },
      ]),
    });
    const importJob = importJobRepository({
      id: "job_1",
      sourceKey: "wordpress",
      sourceUrl:
        "https://customer.wordpress.com/wp-json/wp/v2/comments?post=42&per_page=20",
    });
    const { moderation, service, tx } = persistingService({ importJob });

    await service.process("job_1");

    expect(fetchPublicImport).toHaveBeenCalledWith(
      "https://customer.wordpress.com/wp-json/wp/v2/comments?post=42&per_page=20",
      expect.objectContaining({
        sourceKey: "wordpress",
        exactHosts: ["wordpress.com", "www.wordpress.com"],
        suffixHosts: ["wordpress.com"],
      }),
    );
    expect(tx.formResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origin: "IMPORT",
          authorName: "Ada",
          sourceMetadata: expect.objectContaining({
            source: "wordpress",
            sourceUrl:
              "https://customer.wordpress.com/wp-json/wp/v2/comments?per_page=20&post=42",
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
      service.createPublicImport({
        projectId: "project_1",
        body: {
          sourceKey: "wordpress",
          sourceUrl: "https://example.com/reviews",
          rightsConfirmed: true,
        },
        mode: "PUBLIC_URL",
        actor: null,
      }),
    ).rejects.toThrow("Public import URL is not allowed");
    await expect(
      service.createPublicImport({
        projectId: "project_1",
        body: {
          sourceKey: "wordpress",
          sourceUrl: "https://evilwordpress.com/reviews",
          rightsConfirmed: true,
        },
        mode: "PUBLIC_URL",
        actor: null,
      }),
    ).rejects.toThrow("Public import URL is not allowed");
    await expect(
      service.createPublicImport({
        projectId: "project_1",
        body: {
          sourceKey: "wordpress",
          sourceUrl: "http://wordpress.com/reviews",
          rightsConfirmed: true,
        },
        mode: "PUBLIC_URL",
        actor: null,
      }),
    ).rejects.toThrow();
  });

  it("maps malformed public import URLs to the same safe conflict", async () => {
    const service = new ImportsService(
      { client: {} } as never,
      { add: vi.fn() } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createPublicImport({
        projectId: "project_1",
        body: {
          sourceKey: "wordpress",
          sourceUrl: "file:///private",
          rightsConfirmed: true,
        } as never,
        mode: "PUBLIC_URL",
        actor: null,
      }),
    ).rejects.toThrow("Public import URL is not allowed");
  });

  it("records a stable no-proof error instead of manufacturing content", async () => {
    fetchPublicImport.mockResolvedValue({
      url: "https://wordpress.com/marketing",
      contentType: "html",
      body: "<html><head><title>Marketing page</title></head><body>Buy now</body></html>",
    });
    const importJob = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "job_empty",
        projectId: "project_1",
        sourceKey: "wordpress",
        mode: "PUBLIC_URL",
        mediaAssetId: null,
        connectionId: null,
        config: {
          sourceUrl: "https://wordpress.com/marketing",
          rightsConfirmed: true,
        },
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ImportsService(
      { client: { importJob } } as never,
      { add: vi.fn() } as never,
      {} as never,
      {} as never,
    );

    await expect(service.process("job_empty")).rejects.toThrow("Import failed");
    expect(importJob.update).toHaveBeenCalledWith({
      where: { id: "job_empty" },
      data: expect.objectContaining({
        status: "FAILED",
        errorCode: "NO_IMPORTABLE_PROOF",
      }),
    });
    const failureUpdate = importJob.update.mock.calls[0];
    expect(failureUpdate).toBeDefined();
    const data = failureUpdate![0].data as Record<string, unknown>;
    for (const field of [
      "totalCount",
      "importedCount",
      "duplicateCount",
      "skippedCount",
      "failedCount",
    ])
      expect(data).not.toHaveProperty(field);
  });

  it("dispatches Vimeo locators to the official provider before the generic scraper", async () => {
    const importJob = importJobRepository({
      id: "job_vimeo",
      sourceKey: "vimeo",
      sourceUrl: "https://vimeo.com/123",
    });
    const provider = {
      fetchCandidates: vi.fn().mockResolvedValue([
        {
          externalId: "vimeo:/videos/123/comments/456",
          sourceUrl: "https://vimeo.com/123",
          sourceCreatedAt: null,
          text: "Official API comment",
          ratingValue: null,
          ratingScale: null,
          authorName: "Ada",
          authorRole: null,
          authorCompany: null,
          tags: ["vimeo"],
        },
      ]),
    };
    const { service, tx } = persistingService({ importJob, provider });

    fetchPublicImport.mockClear();
    await service.process("job_vimeo");

    expect(provider.fetchCandidates).toHaveBeenCalledWith(
      "https://vimeo.com/123",
      20,
    );
    expect(fetchPublicImport).not.toHaveBeenCalled();
    expect(tx.formResponse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorName: "Ada" }),
      }),
    );
  });

  it("delays an official public import by the provider Retry-After", async () => {
    const importJob = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "job_vimeo",
        projectId: "project_1",
        sourceKey: "vimeo",
        mode: "PUBLIC_URL",
        mediaAssetId: null,
        config: { sourceUrl: "https://vimeo.com/123", rightsConfirmed: true },
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const provider = {
      fetchCandidates: vi
        .fn()
        .mockRejectedValue(
          new ImportProviderError(
            "PROVIDER_RATE_LIMITED",
            "Provider rate limit reached.",
            120_000,
          ),
        ),
    };
    const service = new ImportsService(
      { client: { importJob } } as never,
      { add: vi.fn() } as never,
      {} as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      { get: vi.fn().mockReturnValue(provider) } as never,
    );

    await expect(service.process("job_vimeo")).rejects.toEqual(
      new ImportRetryAfterError(120_000),
    );
    expect(importJob.update).toHaveBeenCalledWith({
      where: { id: "job_vimeo" },
      data: expect.objectContaining({ status: "FAILED" }),
    });
  });
});
