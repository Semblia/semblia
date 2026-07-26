import { ConflictException } from "@nestjs/common";
import * as XLSX from "xlsx";
import type { ImportCandidate } from "./import-normalization.js";

export const SPREADSHEET_MAX_BYTES = 10 * 1024 * 1024;
export const SPREADSHEET_MAX_ROWS = 2_000;
export const SPREADSHEET_MAX_COLUMNS = 100;
export const SPREADSHEET_MAX_CELL_CHARS = 10_000;
const SPREADSHEET_MAX_SHEETS = 20;
const XLSX_MAX_ZIP_ENTRIES = 1_000;
const XLSX_MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const XLSX_MAX_COMPRESSION_RATIO = 100;
const PREVIEW_ROWS = 5;

export type SpreadsheetMapping = {
  sheetName: string;
  text: string;
  authorName?: string;
  authorRole?: string;
  authorCompany?: string;
  ratingValue?: string;
  ratingScale?: string;
  sourceUrl?: string;
  sourceCreatedAt?: string;
  tags?: string;
};

type ParsedSheet = { name: string; headers: string[]; rows: unknown[][] };
type DenseCell = { f?: string };
export type SpreadsheetPreviewSheet =
  | {
      name: string;
      selected: true;
      headers: string[];
      rowCount: number;
      samples: unknown[][];
    }
  | { name: string; selected: false };
export type SpreadsheetPreview = { sheets: SpreadsheetPreviewSheet[] };

export function previewSpreadsheet(
  buffer: Buffer,
  filename: string,
  selectedSheetName?: string,
): SpreadsheetPreview {
  const workbook = loadWorkbook(buffer, filename);
  const selectedName = selectedSheetName ?? workbook.SheetNames[0];
  if (!selectedName || !workbook.SheetNames.includes(selectedName))
    throw new ConflictException("Selected spreadsheet sheet was not found");
  const selected = parseSheet(selectedName, workbook.Sheets[selectedName]!);
  return {
    sheets: workbook.SheetNames.map((name) =>
      name === selectedName
        ? {
            name,
            selected: true,
            headers: selected.headers,
            rowCount: selected.rows.length,
            samples: selected.rows.slice(0, PREVIEW_ROWS),
          }
        : { name, selected: false },
    ),
  };
}

export function rowsFromSpreadsheet(
  buffer: Buffer,
  filename: string,
  mapping: SpreadsheetMapping,
): ImportCandidate[] {
  const workbook = loadWorkbook(buffer, filename);
  const worksheet = workbook.Sheets[mapping.sheetName];
  if (!worksheet)
    throw new ConflictException("Selected spreadsheet sheet was not found");
  const sheet = parseSheet(mapping.sheetName, worksheet);
  const columns = new Map(
    sheet.headers.map((header, index) => [header, index]),
  );
  const indexes = mappingIndexes(columns, mapping);
  return sheet.rows.flatMap((row, index) => {
    const text = asText(row[indexes.text]);
    if (!text) return [];
    return [
      {
        externalId: `${mapping.sheetName}:${index}:${text}`,
        sourceUrl: optionalText(row[indexes.sourceUrl]) ?? null,
        sourceCreatedAt: dateText(row[indexes.sourceCreatedAt]) ?? null,
        text,
        ratingValue: numberValue(row[indexes.ratingValue]),
        ratingScale: numberValue(row[indexes.ratingScale]),
        authorName: optionalText(row[indexes.authorName]) ?? null,
        authorRole: optionalText(row[indexes.authorRole]) ?? null,
        authorCompany: optionalText(row[indexes.authorCompany]) ?? null,
        tags:
          optionalText(row[indexes.tags])
            ?.split(",")
            .map((tag) => tag.trim())
            .filter(Boolean) ?? [],
      },
    ];
  });
}

function loadWorkbook(buffer: Buffer, filename: string) {
  if (buffer.byteLength > SPREADSHEET_MAX_BYTES)
    throw new ConflictException("Spreadsheet exceeds 10 MiB limit");
  if (!/\.(csv|xls|xlsx)$/i.test(filename))
    throw new ConflictException("Unsupported spreadsheet extension");
  const isZip = hasZipMagic(buffer);
  if (isZip) assertSafeXlsxZip(buffer);
  if (/\.xlsx$/i.test(filename) && !isZip)
    throw new ConflictException("Spreadsheet content does not match XLSX extension");
  const workbook = XLSX.read(buffer, {
    dense: true,
    cellDates: true,
    raw: true,
    sheetRows: SPREADSHEET_MAX_ROWS + 2,
  });
  if (workbook.SheetNames.length > SPREADSHEET_MAX_SHEETS)
    throw new ConflictException("Spreadsheet exceeds sheet limit");
  if (/\.csv$/i.test(filename) && workbook.SheetNames[0] === "Sheet1") {
    const name = filename.replace(/\.csv$/i, "");
    const csvSheet = workbook.Sheets.Sheet1;
    if (!csvSheet)
      throw new ConflictException("Spreadsheet sheet was not found");
    workbook.Sheets[name] = csvSheet;
    delete workbook.Sheets.Sheet1;
    workbook.SheetNames[0] = name;
  }
  return workbook;
}

function parseSheet(name: string, worksheet: XLSX.WorkSheet): ParsedSheet {
  assertSheetShape(worksheet);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: null,
  });
  overlayFormulaText(rows, worksheet);
  const normalizedRows = rows.map((row) => {
    if (row.length > SPREADSHEET_MAX_COLUMNS)
      throw new ConflictException("Spreadsheet exceeds 100 column limit");
    return row.map(normalizeCell);
  });
  const [headerRow = [], ...dataRows] = normalizedRows;
  const headers = headerRow.map(
    (value, index) => asText(value) || `column_${index + 1}`,
  );
  if (new Set(headers).size !== headers.length)
    throw new ConflictException("Spreadsheet headers must be unique");
  const nonEmpty = dataRows.filter((row) =>
    row.some((value) => value !== null && asText(value) !== ""),
  );
  if (nonEmpty.length > SPREADSHEET_MAX_ROWS)
    throw new ConflictException("Spreadsheet exceeds 2,000 row limit");
  return { name, headers, rows: nonEmpty };
}

function assertSheetShape(worksheet: XLSX.WorkSheet) {
  const fullRef = (worksheet as XLSX.WorkSheet & { "!fullref"?: string })[
    "!fullref"
  ];
  const ref = fullRef ?? worksheet["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  if (range.e.r - range.s.r > SPREADSHEET_MAX_ROWS)
    throw new ConflictException("Spreadsheet exceeds 2,000 row limit");
  if (range.e.c - range.s.c + 1 > SPREADSHEET_MAX_COLUMNS)
    throw new ConflictException("Spreadsheet exceeds 100 column limit");
}

function overlayFormulaText(rows: unknown[][], worksheet: XLSX.WorkSheet) {
  const denseRows = (worksheet as XLSX.WorkSheet & { "!data"?: DenseCell[][] })[
    "!data"
  ];
  const ref = worksheet["!ref"];
  if (!denseRows || !ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (const [rowIndex, cells] of denseRows.entries()) {
    if (!cells) continue;
    for (const [columnIndex, cell] of cells.entries()) {
      if (cell?.f) {
        const outputRow = rowIndex - range.s.r;
        const outputColumn = columnIndex - range.s.c;
        if (outputRow < 0 || outputColumn < 0) continue;
        rows[outputRow] ??= [];
        rows[outputRow]![outputColumn] = `=${cell.f}`;
      }
    }
  }
}

function mappingIndexes(
  columns: Map<string, number>,
  mapping: SpreadsheetMapping,
) {
  return {
    text: columnIndex(columns, mapping.text, "text"),
    authorName: columnIndex(columns, mapping.authorName, "authorName"),
    authorRole: columnIndex(columns, mapping.authorRole, "authorRole"),
    authorCompany: columnIndex(columns, mapping.authorCompany, "authorCompany"),
    ratingValue: columnIndex(columns, mapping.ratingValue, "ratingValue"),
    ratingScale: columnIndex(columns, mapping.ratingScale, "ratingScale"),
    sourceUrl: columnIndex(columns, mapping.sourceUrl, "sourceUrl"),
    sourceCreatedAt: columnIndex(
      columns,
      mapping.sourceCreatedAt,
      "sourceCreatedAt",
    ),
    tags: columnIndex(columns, mapping.tags, "tags"),
  };
}

function columnIndex(
  columns: Map<string, number>,
  name: string | undefined,
  field: string,
) {
  if (!name) return -1;
  const index = columns.get(name);
  if (index === undefined)
    throw new ConflictException(`Mapped ${field} column was not found`);
  return index;
}

function assertSafeXlsxZip(buffer: Buffer) {
  const eocd = findZipSignature(buffer, 0x06054b50, true);
  if (eocd < 0 || eocd + 22 > buffer.length)
    throw new ConflictException("Spreadsheet ZIP metadata is invalid");
  const entryCount = buffer.readUInt16LE(eocd + 10);
  if (entryCount > XLSX_MAX_ZIP_ENTRIES)
    throw new ConflictException("Spreadsheet exceeds ZIP entry limit");
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (centralOffset + centralSize > buffer.length)
    throw new ConflictException("Spreadsheet ZIP metadata is invalid");

  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index++) {
    if (
      offset + 46 > centralOffset + centralSize ||
      buffer.readUInt32LE(offset) !== 0x02014b50
    )
      throw new ConflictException("Spreadsheet ZIP metadata is invalid");
    const compressed = buffer.readUInt32LE(offset + 20);
    const uncompressed = buffer.readUInt32LE(offset + 24);
    totalUncompressed += uncompressed;
    const ratio = uncompressed / Math.max(1, compressed);
    if (
      totalUncompressed > XLSX_MAX_UNCOMPRESSED_BYTES ||
      uncompressed > XLSX_MAX_UNCOMPRESSED_BYTES ||
      ratio > XLSX_MAX_COMPRESSION_RATIO
    )
      throw new ConflictException("Spreadsheet exceeds ZIP expansion limit");
    offset +=
      46 +
      buffer.readUInt16LE(offset + 28) +
      buffer.readUInt16LE(offset + 30) +
      buffer.readUInt16LE(offset + 32);
  }
}

function hasZipMagic(buffer: Buffer) {
  return (
    buffer.length >= 4 &&
    (buffer.readUInt32LE(0) === 0x04034b50 ||
      buffer.readUInt32LE(0) === 0x06054b50 ||
      buffer.readUInt32LE(0) === 0x08074b50)
  );
}

function findZipSignature(buffer: Buffer, signature: number, fromEnd: boolean) {
  if (fromEnd) {
    for (let offset = buffer.length - 4; offset >= 0; offset--)
      if (buffer.readUInt32LE(offset) === signature) return offset;
  } else {
    for (let offset = 0; offset <= buffer.length - 4; offset++)
      if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  return -1;
}

function normalizeCell(value: unknown) {
  const normalized =
    value instanceof Date
      ? dateText(value)!
      : typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null
        ? value
        : String(value);
  if (
    typeof normalized === "string" &&
    normalized.length > SPREADSHEET_MAX_CELL_CHARS
  )
    throw new ConflictException(
      "Spreadsheet cell exceeds 10,000 character limit",
    );
  return normalized;
}

function asText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dateText(value)!;
  return String(value).trim();
}

function optionalText(value: unknown) {
  const text = asText(value);
  return text || undefined;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || asText(value) === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function dateText(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf())
    ? undefined
    : date.toISOString().slice(0, 10);
}
