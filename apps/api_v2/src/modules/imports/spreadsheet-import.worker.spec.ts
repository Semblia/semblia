import { Prisma } from "@workspace/database/prisma";
import { describe, expect, it, vi } from "vitest";
import { ImportsService } from "./imports.service.js";

const CSV = Buffer.from("quote,name\nFirst,Ada\nSecond,Lin\n");
const JOB = {
  id: "job_1",
  projectId: "project_1",
  sourceKey: "spreadsheet",
  mode: "SPREADSHEET",
  mediaAssetId: "asset_1",
  config: {
    mapping: { sheetName: "feedback", text: "quote", authorName: "name" },
    rightsConfirmed: true,
  },
};

describe("spreadsheet import worker", () => {
  it("persists a bounded FAILED item for a genuine row failure before terminal cleanup", async () => {
    const events: string[] = [];
    const importItemCreate = vi.fn().mockImplementation(async () => undefined);
    const importJobUpdate = vi.fn().mockImplementation(async ({ data }) => {
      if (data.status === "PARTIAL") events.push("terminal");
      return JOB;
    });
    const media = {
      readImportSource: vi.fn().mockResolvedValue({
        asset: { id: "asset_1", storageKey: "feedback.csv" },
        bytes: CSV,
      }),
      cleanupImportSource: vi.fn().mockImplementation(async () => {
        events.push("cleanup");
        return true;
      }),
    };
    const service = spreadsheetService({
      importItemCreate,
      importJobUpdate,
      media,
    });
    vi.spyOn(service, "persistCandidate")
      .mockResolvedValueOnce("IMPORTED")
      .mockRejectedValueOnce(new Error("raw-provider-secret"));

    await expect(service.process("job_1")).resolves.toMatchObject({
      id: "job_1",
    });
    expect(importItemCreate).toHaveBeenCalledWith({
      data: {
        jobId: "job_1",
        rowIndex: 1,
        result: "FAILED",
        sourceUrl: null,
        externalIdHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        errorCode: "ROW_IMPORT_FAILED",
        errorMessage: "This row could not be imported.",
      },
    });
    expect(events).toEqual(["terminal", "cleanup"]);
  });

  it("records an unsafe source URL as a failed row without retaining it", async () => {
    const importItemCreate = vi.fn().mockResolvedValue(undefined);
    const jobWithUrl = {
      ...JOB,
      config: {
        ...JOB.config,
        mapping: { ...JOB.config.mapping, sourceUrl: "url" },
      },
    };
    const service = spreadsheetService({
      importItemCreate,
      importJobUpdate: vi.fn().mockResolvedValue(JOB),
      media: {
        readImportSource: vi.fn().mockResolvedValue({
          asset: { id: "asset_1", storageKey: "feedback.csv" },
          bytes: Buffer.from(
            "quote,name,url\nProof,Ada,file:///private-secret\n",
          ),
        }),
        cleanupImportSource: vi.fn().mockResolvedValue(true),
      },
      job: jobWithUrl,
    });
    const outcome = await service
      .process("job_1")
      .catch((error: unknown) => error);
    expect(outcome).not.toBeInstanceOf(Error);
    expect(importItemCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        result: "FAILED",
        sourceUrl: null,
        errorCode: "ROW_IMPORT_FAILED",
      }),
    });
  });

  it("aborts for an existing IMPORTED item whose moderation replay fails and retains the source", async () => {
    const importItemCreate = vi.fn();
    const cleanupImportSource = vi.fn();
    const importJobUpdate = vi.fn().mockResolvedValue(JOB);
    const service = spreadsheetService({
      importItemCreate,
      importJobUpdate,
      media: {
        readImportSource: vi.fn().mockResolvedValue({
          asset: { id: "asset_1", storageKey: "feedback.csv" },
          bytes: Buffer.from("quote\nFirst\n"),
        }),
        cleanupImportSource,
      },
      importItemFindFirst: vi
        .fn()
        .mockResolvedValue({ result: "IMPORTED", responseId: "response_1" }),
      moderation: {
        enqueueSubmission: vi
          .fn()
          .mockRejectedValue(new Error("moderation down")),
      },
    });

    await expect(service.process("job_1")).rejects.toThrow("Import failed");
    expect(importItemCreate).not.toHaveBeenCalled();
    expect(cleanupImportSource).not.toHaveBeenCalled();
    expect(importJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job_1" },
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("retains the source when the durable terminal update fails", async () => {
    const cleanupImportSource = vi.fn();
    const importJobUpdate = vi
      .fn()
      .mockRejectedValueOnce(new Error("terminal write failed"))
      .mockResolvedValueOnce(JOB);
    const service = spreadsheetService({
      importItemCreate: vi.fn(),
      importJobUpdate,
      media: {
        readImportSource: vi.fn().mockResolvedValue({
          asset: { id: "asset_1", storageKey: "feedback.csv" },
          bytes: Buffer.from("quote\nFirst\n"),
        }),
        cleanupImportSource,
      },
    });
    vi.spyOn(service, "persistCandidate").mockResolvedValue("IMPORTED");
    await expect(service.process("job_1")).rejects.toThrow();
    expect(cleanupImportSource).not.toHaveBeenCalled();
  });

  it("maps the unique asset reservation race to a safe conflict", async () => {
    const race = new Prisma.PrismaClientKnownRequestError("raw constraint", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["mediaAssetId"] },
    });
    const service = new ImportsService(
      { client: { $transaction: vi.fn().mockRejectedValue(race) } } as never,
      {} as never,
      {} as never,
      {} as never,
      {
        readImportSource: vi.fn().mockResolvedValue({
          asset: { id: "asset_1", storageKey: "feedback.csv" },
          bytes: Buffer.from("quote\nProof\n"),
        }),
      } as never,
    );
    await expect(
      service.createSpreadsheetImport(
        "project_1",
        {
          assetId: "asset_1",
          sourceKey: "spreadsheet",
          mapping: { sheetName: "feedback", text: "quote" },
          rightsConfirmed: true,
        },
        null,
      ),
    ).rejects.toThrow("already reserved");
  });
});

function spreadsheetService(input: {
  importItemCreate: ReturnType<typeof vi.fn>;
  importJobUpdate: ReturnType<typeof vi.fn>;
  media: Record<string, unknown>;
  importItemFindFirst?: ReturnType<typeof vi.fn>;
  moderation?: Record<string, unknown>;
  job?: typeof JOB;
}) {
  return new ImportsService(
    {
      client: {
        importJob: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(input.job ?? JOB),
          update: input.importJobUpdate,
          findFirst: vi.fn().mockResolvedValue({ id: "job_1", items: [] }),
        },
        importItem: {
          findFirst:
            input.importItemFindFirst ?? vi.fn().mockResolvedValue(null),
          create: input.importItemCreate,
        },
      },
    } as never,
    {} as never,
    {} as never,
    (input.moderation ?? {}) as never,
    input.media as never,
  );
}
