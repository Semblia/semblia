import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  previewSpreadsheet,
  rowsFromSpreadsheet,
} from "./spreadsheet-import.parser.js";

describe("spreadsheet import parser", () => {
  it("discovers headers and safe samples while ignoring empty rows", () => {
    const input = Buffer.from(
      "quote,name,rating,created\nFast and thoughtful,Ada,5,2024-01-02\n,,,\nExcellent support,Lin,4,2024-02-03\n",
    );
    expect(previewSpreadsheet(input, "feedback.csv")).toMatchObject({
      sheets: [
        {
          name: "feedback",
          selected: true,
          headers: ["quote", "name", "rating", "created"],
          rowCount: 2,
          samples: [
            ["Fast and thoughtful", "Ada", "5", "2024-01-02"],
            ["Excellent support", "Lin", "4", "2024-02-03"],
          ],
        },
      ],
    });
  });

  it("uses only the immutable explicit mapping and treats formula-looking CSV as text", () => {
    const rows = rowsFromSpreadsheet(
      Buffer.from('quote,name,rating\n"=SUM(1,2)",Ada,5\n'),
      "feedback.csv",
      {
        sheetName: "feedback",
        text: "quote",
        authorName: "name",
        ratingValue: "rating",
      },
    );
    expect(rows).toEqual([
      expect.objectContaining({
        text: "=SUM(1,2)",
        authorName: "Ada",
        ratingValue: 5,
      }),
    ]);
  });

  it("preserves quoted numeric-looking text without coercing identifiers", () => {
    const rows = rowsFromSpreadsheet(
      Buffer.from('quote,name\n"00123",Ada\n'),
      "feedback.csv",
      { sheetName: "feedback", text: "quote", authorName: "name" },
    );
    expect(rows[0]).toMatchObject({ text: "00123", authorName: "Ada" });
  });

  it("keeps blank ratings unset instead of coercing them to zero", () => {
    const rows = rowsFromSpreadsheet(
      Buffer.from("quote,rating,scale\nProof,, \n"),
      "feedback.csv",
      {
        sheetName: "feedback",
        text: "quote",
        ratingValue: "rating",
        ratingScale: "scale",
      },
    );
    expect(rows[0]).toMatchObject({ ratingValue: null, ratingScale: null });
  });

  it("rejects every missing optional mapped column", () => {
    expect(() =>
      rowsFromSpreadsheet(
        Buffer.from("quote,name\nProof,Ada\n"),
        "feedback.csv",
        { sheetName: "feedback", text: "quote", authorName: "missing" },
      ),
    ).toThrow("Mapped authorName column was not found");
  });

  it.each(["xls", "xlsx"] as const)(
    "parses generated %s with formulas as text and deterministic dates",
    (bookType) => {
      const sheet = XLSX.utils.aoa_to_sheet([
        ["quote", "name", "rating", "created"],
        [null, "Ada", 5, new Date("2024-01-02T00:00:00.000Z")],
      ]);
      sheet.A2 = { t: "n", v: 2, f: "1+1" };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Proof");
      const input = XLSX.write(workbook, { type: "buffer", bookType });
      expect(
        rowsFromSpreadsheet(input, `feedback.${bookType}`, {
          sheetName: "Proof",
          text: "quote",
          authorName: "name",
          ratingValue: "rating",
          sourceCreatedAt: "created",
        })[0],
      ).toMatchObject({
        text: bookType === "xlsx" ? "=1+1" : "2",
        authorName: "Ada",
        ratingValue: 5,
        sourceCreatedAt: "2024-01-02",
      });
    },
  );

  it("returns samples for only the selected sheet", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["quote"], ["First"]]),
      "First",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["quote"], ["Second"]]),
      "Second",
    );
    const preview = previewSpreadsheet(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
      "proof.xlsx",
      "Second",
    );
    expect(preview.sheets[0]).toEqual({ name: "First", selected: false });
    expect(preview.sheets[0]).not.toHaveProperty("samples");
    expect(preview.sheets[1]).toEqual({
      name: "Second",
      selected: true,
      headers: ["quote"],
      rowCount: 1,
      samples: [["Second"]],
    });
  });

  it("rejects too many sheets before parsing them", () => {
    const workbook = XLSX.utils.book_new();
    for (let index = 0; index < 21; index++)
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([["quote"], ["Proof"]]),
        `S${index}`,
      );
    const input = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    expect(() => previewSpreadsheet(input, "many.xlsx")).toThrow("sheet limit");
  });

  it("rejects a wide data row even when the header is narrow", () => {
    const wideRow = ["Proof", ...Array.from({ length: 100 }, () => "x")];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["quote"], wideRow]),
      "Proof",
    );
    const input = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    expect(() => previewSpreadsheet(input, "wide.xlsx")).toThrow(
      "column limit",
    );
  });

  it("rejects data outside the parser row window instead of truncating it", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["quote"], ["First"]]);
    XLSX.utils.sheet_add_aoa(sheet, [["Hidden overflow"]], { origin: "A3002" });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Proof");
    const input = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    expect(() => previewSpreadsheet(input, "overflow.xlsx")).toThrow(
      "row limit",
    );
  });

  it("rejects zip metadata with excessive entries or expansion", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["quote"], ["Proof"]]),
      "Proof",
    );
    const input = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    expect(() =>
      previewSpreadsheet(tamperZipEntries(input, 2_000), "entries.xlsx"),
    ).toThrow("ZIP entry limit");
    expect(() =>
      previewSpreadsheet(
        tamperFirstCentralEntry(input, {
          uncompressedSize: 200 * 1024 * 1024,
          compressedSize: 1,
        }),
        "bomb.xlsx",
      ),
    ).toThrow("ZIP expansion limit");
  });

  it("checks XLSX ZIP limits even when the payload is named .xls", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["quote"], ["Proof"]]),
      "Proof",
    );
    const input = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    expect(() =>
      previewSpreadsheet(tamperZipEntries(input, 2_000), "renamed.xls"),
    ).toThrow("ZIP entry limit");
  });

  it("overlays formulas using the worksheet range origin", () => {
    const sheet: XLSX.WorkSheet = {};
    XLSX.utils.sheet_add_aoa(sheet, [["quote", "name"], [null, "Ada"]], {
      origin: "D4",
    });
    sheet.D5 = { t: "n", v: 2, f: "1+1" };
    sheet["!ref"] = "D4:E5";
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Offset");
    const input = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    expect(
      rowsFromSpreadsheet(input, "offset.xlsx", {
        sheetName: "Offset",
        text: "quote",
        authorName: "name",
      }),
    ).toEqual([
      expect.objectContaining({ text: "=1+1", authorName: "Ada" }),
    ]);
  });

  it.each([
    ["row", Buffer.from(`quote\n${"good\n".repeat(2_001)}`)],
    [
      "column",
      Buffer.from(
        `${Array.from({ length: 101 }, (_, i) => `c${i}`).join(",")}\nvalue\n`,
      ),
    ],
    ["cell", Buffer.from(`quote\n${"x".repeat(10_001)}\n`)],
  ])("rejects the %s limit", (_kind, input) => {
    expect(() => previewSpreadsheet(input, "feedback.csv")).toThrow();
  });
});

function findSignature(buffer: Buffer, signature: number, fromEnd = false) {
  if (fromEnd) {
    for (let offset = buffer.length - 4; offset >= 0; offset--)
      if (buffer.readUInt32LE(offset) === signature) return offset;
  } else {
    for (let offset = 0; offset <= buffer.length - 4; offset++)
      if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  throw new Error("ZIP signature missing");
}

function tamperZipEntries(source: Buffer, count: number) {
  const buffer = Buffer.from(source);
  const eocd = findSignature(buffer, 0x06054b50, true);
  buffer.writeUInt16LE(count, eocd + 8);
  buffer.writeUInt16LE(count, eocd + 10);
  return buffer;
}

function tamperFirstCentralEntry(
  source: Buffer,
  sizes: { compressedSize: number; uncompressedSize: number },
) {
  const buffer = Buffer.from(source);
  const central = findSignature(buffer, 0x02014b50);
  buffer.writeUInt32LE(sizes.compressedSize, central + 20);
  buffer.writeUInt32LE(sizes.uncompressedSize, central + 24);
  return buffer;
}
