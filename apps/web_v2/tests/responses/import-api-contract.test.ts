import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { V2SpreadsheetImportPreviewDTO } from "@workspace/types";
import { previewSpreadsheetImport } from "@/lib/semblia-api";

describe("import API contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the stable bounded spreadsheet preview shape", async () => {
    const preview: V2SpreadsheetImportPreviewDTO = {
      sheets: [
        {
          name: "feedback",
          selected: true,
          headers: ["quote", "rating", "verified"],
          rowCount: 1,
          samples: [["Useful proof", 5, true]],
        },
        {
          name: "archive",
          selected: false,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: preview,
          meta: { timestamp: "2026-07-22T00:00:00.000Z" },
        }),
      } as unknown as Response),
    );

    const result = await previewSpreadsheetImport(
      "session-token",
      "launchpad",
      "asset_1",
    );

    expectTypeOf(result).toEqualTypeOf<V2SpreadsheetImportPreviewDTO>();
    expect(result).toEqual(preview);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/projects/launchpad/imports/spreadsheet/preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ assetId: "asset_1" }),
      }),
    );
  });
});
