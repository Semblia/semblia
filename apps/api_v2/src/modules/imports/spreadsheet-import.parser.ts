import { createHash } from "node:crypto";
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
type ZipCentralDirectory = {
  entryCount: number;
  offset: number;
  end: number;
};
type ZipEntry = {
  compressed: number;
  uncompressed: number;
  nextOffset: number;
};
type FormulaOverlayContext = {
  rows: unknown[][];
  origin: XLSX.CellAddress;
};
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
  // A single-sheet workbook has only one answer, so a mapping that names the
  // sheet differently is a stale name, not a missing sheet: a CSV's sheet name
  // is synthesised from the file, and a mapping saved before that synthesis
  // changed would otherwise fail an import whose data is perfectly readable.
  const sheetName =
    workbook.Sheets[mapping.sheetName] || workbook.SheetNames.length !== 1
      ? mapping.sheetName
      : workbook.SheetNames[0]!;
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet)
    throw new ConflictException("Selected spreadsheet sheet was not found");
  const sheet = parseSheet(sheetName, worksheet);
  const columns = new Map(
    sheet.headers.map((header, index) => [header, index]),
  );
  const indexes = mappingIndexes(columns, mapping);
  return sheet.rows.flatMap((row) => {
    const text = asText(row[indexes.text]);
    if (!text) return [];
    const candidate = spreadsheetCandidate(row, indexes, text);
    return [
      { ...candidate, externalId: spreadsheetCandidateIdentity(candidate) },
    ];
  });
}

function spreadsheetCandidate(
  row: unknown[],
  indexes: ReturnType<typeof mappingIndexes>,
  text: string,
): Omit<ImportCandidate, "externalId"> {
  return {
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
  };
}

function spreadsheetCandidateIdentity(
  candidate: Omit<ImportCandidate, "externalId">,
) {
  const identityFields = {
    text: candidate.text,
    authorName: candidate.authorName,
    authorRole: candidate.authorRole,
    authorCompany: candidate.authorCompany,
    ratingValue: candidate.ratingValue,
    ratingScale: candidate.ratingScale,
    sourceUrl: candidate.sourceUrl,
    sourceCreatedAt: candidate.sourceCreatedAt,
    tags: [...new Set(candidate.tags)].sort(),
  };
  return `spreadsheet:${createHash("sha256")
    .update(JSON.stringify(identityFields))
    .digest("hex")}`;
}

function loadWorkbook(buffer: Buffer, filename: string) {
  assertWorkbookInput({ buffer, filename });
  const workbook = readWorkbook(buffer);
  if (workbook.SheetNames.length > SPREADSHEET_MAX_SHEETS)
    throw new ConflictException("Spreadsheet exceeds sheet limit");
  renameDefaultCsvSheet(workbook, filename);
  return workbook;
}

function parseSheet(name: string, worksheet: XLSX.WorkSheet): ParsedSheet {
  assertSheetShape(worksheet);
  const rows = sheetRows(worksheet);
  overlayFormulaText(rows, worksheet);
  const normalizedRows = rows.map(normalizeRow);
  const [headerRow = [], ...dataRows] = normalizedRows;
  const headers = spreadsheetHeaders(headerRow);
  if (new Set(headers).size !== headers.length)
    throw new ConflictException("Spreadsheet headers must be unique");
  const nonEmpty = dataRows.filter(isNonEmptyRow);
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
  const range = worksheetRange(worksheet);
  if (!denseRows || !range) return;
  const context = { rows, origin: range.s };
  denseRows.forEach((cells, rowIndex) =>
    overlayFormulaRow(context, cells, rowIndex),
  );
}

function worksheetRange(worksheet: XLSX.WorkSheet) {
  const ref = worksheet["!ref"];
  return ref ? XLSX.utils.decode_range(ref) : undefined;
}

function overlayFormulaRow(
  context: FormulaOverlayContext,
  cells: DenseCell[] | undefined,
  rowIndex: number,
) {
  cells?.forEach((cell, columnIndex) =>
    overlayFormulaCell({ context, cell, rowIndex, columnIndex }),
  );
}

function overlayFormulaCell(input: {
  context: FormulaOverlayContext;
  cell: DenseCell | undefined;
  rowIndex: number;
  columnIndex: number;
}) {
  const { context, cell, rowIndex, columnIndex } = input;
  const formula = cell?.f;
  const outputRow = rowIndex - context.origin.r;
  const outputColumn = columnIndex - context.origin.c;
  if (!formula) return;
  if (outputRow < 0) return;
  if (outputColumn < 0) return;
  context.rows[outputRow] ??= [];
  context.rows[outputRow]![outputColumn] = `=${formula}`;
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
  const directory = readZipCentralDirectory(buffer);
  let offset = directory.offset;
  let totalUncompressed = 0;
  for (let index = 0; index < directory.entryCount; index++) {
    const entry = readZipEntry(buffer, offset, directory.end);
    totalUncompressed = assertSafeZipEntry(entry, totalUncompressed);
    offset = entry.nextOffset;
  }
}

function readZipCentralDirectory(buffer: Buffer): ZipCentralDirectory {
  const eocd = findZipSignature(buffer, 0x06054b50, true);
  if (eocd < 0 || eocd + 22 > buffer.length) invalidZipMetadata();
  const entryCount = buffer.readUInt16LE(eocd + 10);
  if (entryCount > XLSX_MAX_ZIP_ENTRIES)
    throw new ConflictException("Spreadsheet exceeds ZIP entry limit");
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const end = centralOffset + centralSize;
  if (end > buffer.length) invalidZipMetadata();
  return { entryCount, offset: centralOffset, end };
}

function readZipEntry(buffer: Buffer, offset: number, end: number): ZipEntry {
  if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50)
    invalidZipMetadata();
  const compressed = buffer.readUInt32LE(offset + 20);
  const uncompressed = buffer.readUInt32LE(offset + 24);
  const nextOffset =
    offset +
    46 +
    buffer.readUInt16LE(offset + 28) +
    buffer.readUInt16LE(offset + 30) +
    buffer.readUInt16LE(offset + 32);
  return { compressed, uncompressed, nextOffset };
}

function assertSafeZipEntry(entry: ZipEntry, totalUncompressed: number) {
  const nextTotal = totalUncompressed + entry.uncompressed;
  const ratio = entry.uncompressed / Math.max(1, entry.compressed);
  if (zipEntryExceedsLimits({ entry, nextTotal, ratio }))
    throw new ConflictException("Spreadsheet exceeds ZIP expansion limit");
  return nextTotal;
}

function invalidZipMetadata(): never {
  throw new ConflictException("Spreadsheet ZIP metadata is invalid");
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
  const offsets = zipSignatureOffsets(buffer.length, fromEnd);
  for (
    let offset = offsets.start;
    offsets.matches(offset);
    offset += offsets.step
  )
    if (buffer.readUInt32LE(offset) === signature) return offset;
  return -1;
}

function normalizeCell(value: unknown) {
  const normalized = normalizedCellValue(value);
  assertCellLength(normalized);
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
  if (isBlankCell(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function dateText(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf())
    ? undefined
    : date.toISOString().slice(0, 10);
}

function assertWorkbookInput(input: { buffer: Buffer; filename: string }) {
  const { buffer, filename } = input;
  assertWorkbookSize(buffer);
  assertWorkbookExtension(filename);
  assertWorkbookFormat({ buffer, filename });
}

function assertWorkbookSize(buffer: Buffer) {
  if (buffer.byteLength > SPREADSHEET_MAX_BYTES)
    throw new ConflictException("Spreadsheet exceeds 10 MiB limit");
}

function assertWorkbookExtension(filename: string) {
  if (!/\.(csv|xls|xlsx)$/i.test(filename))
    throw new ConflictException("Unsupported spreadsheet extension");
}

function assertWorkbookFormat(input: { buffer: Buffer; filename: string }) {
  const { buffer, filename } = input;
  const isZip = hasZipMagic(buffer);
  if (isZip) assertSafeXlsxZip(buffer);
  if (/\.xlsx$/i.test(filename) && !isZip)
    throw new ConflictException(
      "Spreadsheet content does not match XLSX extension",
    );
}

function readWorkbook(buffer: Buffer) {
  return XLSX.read(buffer, {
    dense: true,
    cellDates: true,
    raw: true,
    sheetRows: SPREADSHEET_MAX_ROWS + 2,
  });
}

/**
 * A CSV has no sheet names, so SheetJS invents "Sheet1"; this names it after
 * the file instead, which is the name the person who uploaded it recognizes.
 *
 * The basename is load-bearing. `filename` here is the asset's *storage key* —
 * `private/projects/<projectId>/imports/<assetId>.csv` — and using it whole put
 * that path in front of the user ("Ready to map 5 rows from
 * private/projects/cmq…/imports/cms…"), which is both meaningless to them and
 * an internal identifier they were never meant to see.
 */
function renameDefaultCsvSheet(workbook: XLSX.WorkBook, filename: string) {
  if (!/\.csv$/i.test(filename) || workbook.SheetNames[0] !== "Sheet1") return;
  const name = csvSheetName(filename);
  const csvSheet = workbook.Sheets.Sheet1;
  if (!csvSheet) throw new ConflictException("Spreadsheet sheet was not found");
  workbook.Sheets[name] = csvSheet;
  delete workbook.Sheets.Sheet1;
  workbook.SheetNames[0] = name;
}

/** Last path segment, minus the extension. Never empty. */
export function csvSheetName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  return base.replace(/\.csv$/i, "") || "Sheet1";
}

function sheetRows(worksheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: null,
  });
}

function normalizeRow(row: unknown[]) {
  if (row.length > SPREADSHEET_MAX_COLUMNS)
    throw new ConflictException("Spreadsheet exceeds 100 column limit");
  return row.map(normalizeCell);
}

function spreadsheetHeaders(row: unknown[]) {
  return row.map((value, index) => asText(value) || `column_${index + 1}`);
}

function isNonEmptyRow(row: unknown[]) {
  return row.some((value) => value !== null && asText(value) !== "");
}

function zipEntryExceedsLimits(input: {
  entry: ZipEntry;
  nextTotal: number;
  ratio: number;
}) {
  const { entry, nextTotal, ratio } = input;
  return (
    nextTotal > XLSX_MAX_UNCOMPRESSED_BYTES ||
    entry.uncompressed > XLSX_MAX_UNCOMPRESSED_BYTES ||
    ratio > XLSX_MAX_COMPRESSION_RATIO
  );
}

function zipSignatureOffsets(length: number, fromEnd: boolean) {
  const lastOffset = length - 4;
  return fromEnd
    ? { start: lastOffset, step: -1, matches: (offset: number) => offset >= 0 }
    : {
        start: 0,
        step: 1,
        matches: (offset: number) => offset <= lastOffset,
      };
}

function normalizedCellValue(value: unknown) {
  if (value instanceof Date) return dateText(value)!;
  if (isPrimitiveCellValue(value)) return value;
  return String(value);
}

function isPrimitiveCellValue(
  value: unknown,
): value is string | number | boolean | null {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}

function assertCellLength(value: unknown) {
  if (typeof value !== "string" || value.length <= SPREADSHEET_MAX_CELL_CHARS)
    return;
  throw new ConflictException(
    "Spreadsheet cell exceeds 10,000 character limit",
  );
}

function isBlankCell(value: unknown) {
  return value === null || value === undefined || asText(value) === "";
}
