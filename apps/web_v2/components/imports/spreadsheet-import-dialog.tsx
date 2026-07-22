"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import type {
  V2ImportCatalogSourceDTO,
  V2SpreadsheetImportPreviewDTO,
  V2SpreadsheetImportPreviewSheetDTO,
  V2UploadIntentDTO,
} from "@workspace/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useConfirmUpload,
  useCreateUploadIntent,
  useDeleteMediaAsset,
} from "@/hooks/api";
import { useCreateSpreadsheetImport } from "@/hooks/api/use-imports-api";
import { previewSpreadsheetImport } from "@/lib/semblia-api";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["csv", "xls", "xlsx"] as const;
const OPTIONAL_FIELDS = [
  ["authorName", "Author name"],
  ["authorRole", "Author role"],
  ["authorCompany", "Author company"],
  ["ratingValue", "Rating value"],
  ["ratingScale", "Rating scale"],
  ["sourceUrl", "Source URL"],
  ["sourceCreatedAt", "Source date"],
  ["tags", "Tags"],
] as const;

type MappingField = "text" | (typeof OPTIONAL_FIELDS)[number][0];
type Mapping = Partial<Record<MappingField, string>> & { text: string };

export interface SpreadsheetImportDialogProps {
  slug: string;
  source: Pick<V2ImportCatalogSourceDTO, "key" | "label">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpreadsheetImportDialog({
  slug,
  source,
  open,
  onOpenChange,
}: SpreadsheetImportDialogProps) {
  const { getToken } = useAuth();
  const createIntent = useCreateUploadIntent();
  const confirmUpload = useConfirmUpload();
  const deleteAsset = useDeleteMediaAsset();
  const deleteAssetMutationRef = React.useRef(deleteAsset.mutateAsync);
  deleteAssetMutationRef.current = deleteAsset.mutateAsync;
  const createImport = useCreateSpreadsheetImport(slug);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadedAssetIdRef = React.useRef<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [assetId, setAssetId] = React.useState<string | null>(null);
  const [preview, setPreview] =
    React.useState<V2SpreadsheetImportPreviewDTO | null>(null);
  const [sheet, setSheet] =
    React.useState<V2SpreadsheetImportPreviewSheetDTO | null>(null);
  const [mapping, setMapping] = React.useState<Mapping | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false);
  const [status, setStatus] = React.useState("Choose a spreadsheet to begin.");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

  const isBusy =
    createIntent.isPending ||
    confirmUpload.isPending ||
    deleteAsset.isPending ||
    createImport.isPending ||
    isLoadingPreview;
  const canSubmit = Boolean(
    assetId && sheet?.selected && mapping?.text && rightsConfirmed && !isBusy,
  );

  React.useEffect(() => {
    if (!open) reset();
    // Reset only when the parent closes the controlled dialog.
  }, [open]);

  React.useEffect(
    () => () => {
      const uploadedAssetId = uploadedAssetIdRef.current;
      if (!uploadedAssetId) return;
      uploadedAssetIdRef.current = null;
      void deleteAssetMutationRef
        .current(uploadedAssetId)
        .catch(() => undefined);
    },
    [],
  );

  async function selectFile(nextFile: File) {
    const validationError = validateSpreadsheet(nextFile);
    if (validationError) {
      setError(validationError);
      setStatus("Choose a CSV, XLS, or XLSX file no larger than 10 MiB.");
      return;
    }

    await abandonUploadedAsset();

    setFile(nextFile);
    setAssetId(null);
    setPreview(null);
    setSheet(null);
    setMapping(null);
    setRightsConfirmed(false);
    setError(null);
    setStatus(`Uploading ${nextFile.name}.`);

    try {
      const intent = await createIntent.mutateAsync({
        purpose: "IMPORT_SOURCE",
        projectSlug: slug,
        fileName: nextFile.name,
        contentType: spreadsheetContentType(nextFile),
        byteSize: nextFile.size,
      });
      uploadedAssetIdRef.current = intent.assetId;
      await uploadSpreadsheet(intent, nextFile);
      const asset = await confirmUpload.mutateAsync({
        assetId: intent.assetId,
        body: { byteSize: nextFile.size },
      });
      setAssetId(asset.id);
      setStatus("Reading spreadsheet headers and sample rows.");
      await loadPreview(asset.id);
    } catch (cause) {
      await abandonUploadedAsset();
      const message = errorMessage(
        cause,
        "The spreadsheet could not be uploaded.",
      );
      setError(message);
      setStatus("Upload failed. Choose another file or try again.");
    }
  }

  async function loadPreview(nextAssetId: string, sheetName?: string) {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const nextPreview = sheetName
        ? await previewSelectedSheet(
            await getToken(),
            slug,
            nextAssetId,
            sheetName,
          )
        : await previewSpreadsheetImport(await getToken(), slug, nextAssetId);
      const selectedSheet = nextPreview.sheets.find(
        (
          candidate,
        ): candidate is Extract<typeof candidate, { selected: true }> =>
          candidate.selected,
      );
      if (!selectedSheet)
        throw new Error("The spreadsheet did not contain a usable sheet.");
      setPreview(nextPreview);
      setSheet(selectedSheet);
      setMapping(defaultMapping(selectedSheet.headers));
      setStatus(
        `Ready to map ${selectedSheet.rowCount} row${selectedSheet.rowCount === 1 ? "" : "s"} from ${selectedSheet.name}.`,
      );
    } catch (cause) {
      if (!sheetName) await abandonUploadedAsset();
      const message = errorMessage(
        cause,
        "The spreadsheet preview could not be loaded.",
      );
      setError(message);
      setStatus("Spreadsheet preview failed.");
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetId || !sheet?.selected || !mapping?.text || !rightsConfirmed)
      return;
    setError(null);
    setStatus("Starting import.");
    try {
      await createImport.mutateAsync({
        assetId,
        sourceKey: source.key,
        mapping: { sheetName: sheet.name, ...withoutEmptyValues(mapping) },
        rightsConfirmed: true,
      });
      uploadedAssetIdRef.current = null;
      setAssetId(null);
      onOpenChange(false);
    } catch (cause) {
      const message = errorMessage(cause, "The import could not be started.");
      setError(message);
      setStatus("Import could not be started.");
    }
  }

  function reset() {
    setFile(null);
    setAssetId(null);
    setPreview(null);
    setSheet(null);
    setMapping(null);
    setRightsConfirmed(false);
    setStatus("Choose a spreadsheet to begin.");
    setError(null);
    setIsLoadingPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function abandonUploadedAsset() {
    const uploadedAssetId = uploadedAssetIdRef.current;
    if (!uploadedAssetId) return;
    uploadedAssetIdRef.current = null;
    setAssetId(null);
    try {
      await deleteAsset.mutateAsync(uploadedAssetId);
    } catch {
      // The server-side stale source reaper is the durable fallback.
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (isBusy) return;
      void abandonUploadedAsset();
    }
    onOpenChange(nextOpen);
  }

  if (!open) return null;

  return (
    <section
      aria-labelledby="spreadsheet-import-title"
      className="mx-auto w-full max-w-3xl py-2"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 mb-6"
        disabled={isBusy}
        onClick={() => handleOpenChange(false)}
      >
        <ArrowLeftIcon aria-hidden />
        Back to sources
      </Button>
      <header className="border-b border-border pb-5">
        <h2 id="spreadsheet-import-title" className="text-lg font-semibold">
          Import from spreadsheet
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Import {source.label.toLocaleLowerCase()} from a CSV, XLS, or XLSX
          file. The source stays private while Semblia prepares it for review.
        </p>
      </header>

      <form onSubmit={submit} aria-busy={isBusy} className="grid gap-5 pt-6">
        <div className="grid gap-2">
          <label
            htmlFor="spreadsheet-import-file"
            className="text-sm font-medium"
          >
            Spreadsheet
          </label>
          <Input
            ref={fileInputRef}
            id="spreadsheet-import-file"
            type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={isBusy}
            aria-describedby="spreadsheet-import-file-help"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              if (nextFile) void selectFile(nextFile);
            }}
          />
          <p
            id="spreadsheet-import-file-help"
            className="text-xs text-muted-foreground"
          >
            CSV, XLS, or XLSX; 10 MiB maximum.
            {file ? ` Selected: ${file.name}.` : ""}
          </p>
        </div>

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {status}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {preview && sheet?.selected && mapping && (
          <>
            {preview.sheets.length > 1 && (
              <div className="grid gap-2">
                <label
                  htmlFor="spreadsheet-import-sheet"
                  className="text-sm font-medium"
                >
                  Sheet
                </label>
                <Select
                  value={sheet.name}
                  disabled={isBusy}
                  onValueChange={(name) => void loadPreview(assetId!, name)}
                >
                  <SelectTrigger
                    id="spreadsheet-import-sheet"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {preview.sheets.map((candidate) => (
                      <SelectItem key={candidate.name} value={candidate.name}>
                        {candidate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <fieldset className="grid gap-3 border-t border-border pt-5">
              <legend className="text-sm font-semibold">Match columns</legend>
              <p className="-mt-1 text-xs text-muted-foreground">
                Text is required. Leave any other field unassigned when it is
                not present.
              </p>
              <ColumnSelect
                label="Testimonial text"
                field="text"
                headers={sheet.headers}
                value={mapping.text}
                required
                onChange={setColumn("text")}
              />
              {OPTIONAL_FIELDS.map(([field, label]) => (
                <ColumnSelect
                  key={field}
                  label={label}
                  field={field}
                  headers={sheet.headers}
                  value={mapping[field]}
                  onChange={setColumn(field)}
                />
              ))}
            </fieldset>

            <SampleTable sheet={sheet} />

            <div className="flex items-start gap-3 border-t border-border pt-5">
              <Checkbox
                id="spreadsheet-import-rights"
                checked={rightsConfirmed}
                disabled={isBusy}
                onCheckedChange={(checked) =>
                  setRightsConfirmed(checked === true)
                }
                aria-invalid={!rightsConfirmed && Boolean(error)}
              />
              <label
                htmlFor="spreadsheet-import-rights"
                className="text-sm leading-5"
              >
                I have the right to import this proof and its author details
                into this project.
              </label>
            </div>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {createImport.isPending ? "Starting import…" : "Start import"}
          </Button>
        </div>
      </form>
    </section>
  );

  function setColumn(field: MappingField) {
    return (value: string) =>
      setMapping((current) => ({
        ...(current ?? { text: "" }),
        [field]: value,
      }));
  }
}

function ColumnSelect({
  label,
  field,
  headers,
  value,
  required = false,
  onChange,
}: {
  label: string;
  field: MappingField;
  headers: string[];
  value?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const id = `spreadsheet-import-${field}`;
  return (
    <div className="grid gap-1.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <label htmlFor={id} className="text-sm">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <Select
        value={value ?? "__none"}
        onValueChange={(next) => onChange(next === "__none" ? "" : next)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-required={required}
          aria-invalid={required && !value}
        >
          <SelectValue
            placeholder={required ? "Choose a column" : "Not imported"}
          />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="__none">Not imported</SelectItem>}
          {headers.map((header) => (
            <SelectItem key={header} value={header}>
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SampleTable({
  sheet,
}: {
  sheet: Extract<V2SpreadsheetImportPreviewSheetDTO, { selected: true }>;
}) {
  return (
    <section
      aria-labelledby="spreadsheet-import-sample-heading"
      className="grid gap-2 border-t border-border pt-5"
    >
      <div>
        <h3
          id="spreadsheet-import-sample-heading"
          className="text-sm font-semibold"
        >
          Preview
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          First {sheet.samples.length} rows from {sheet.name}.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-max text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {sheet.headers.map((header) => (
                <th key={header} scope="col" className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sheet.samples.map((row, index) => (
              <tr key={index}>
                {sheet.headers.map((header, cellIndex) => (
                  <td key={header} className="max-w-48 truncate px-3 py-2">
                    {displayCell(row[cellIndex])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function defaultMapping(headers: string[]): Mapping {
  const normalized = new Map(
    headers.map((header) => [header.toLocaleLowerCase(), header]),
  );
  const match = (...names: string[]) =>
    names.map((name) => normalized.get(name)).find(Boolean) ?? "";
  return {
    text: match(
      "testimonial",
      "quote",
      "feedback",
      "review",
      "text",
      "comment",
    ),
    authorName: match("author", "author name", "name", "customer"),
    authorRole: match("author role", "role", "title"),
    authorCompany: match("author company", "company", "organization"),
    ratingValue: match("rating", "rating value", "score"),
    ratingScale: match("rating scale", "scale", "out of"),
    sourceUrl: match("source url", "url", "link"),
    sourceCreatedAt: match("source date", "created at", "date"),
    tags: match("tags", "tag"),
  };
}

function validateSpreadsheet(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase();
  if (
    !extension ||
    !ACCEPTED_EXTENSIONS.includes(
      extension as (typeof ACCEPTED_EXTENSIONS)[number],
    )
  )
    return "Choose a CSV, XLS, or XLSX file.";
  if (file.size < 1 || file.size > MAX_FILE_BYTES)
    return "The spreadsheet must be between 1 byte and 10 MiB.";
  return null;
}

function spreadsheetContentType(file: File) {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase();
  return extension === "csv"
    ? "text/csv"
    : extension === "xls"
      ? "application/vnd.ms-excel"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function uploadSpreadsheet(
  intent: V2UploadIntentDTO,
  file: File,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", intent.uploadUrl);
    xhr.timeout = 60_000;
    for (const [key, value] of Object.entries(intent.requiredHeaders ?? {}))
      xhr.setRequestHeader(key, value);
    xhr.addEventListener("load", () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}).`)),
    );
    xhr.addEventListener("error", () =>
      reject(new Error("Network error while uploading the spreadsheet.")),
    );
    xhr.addEventListener("timeout", () =>
      reject(new Error("Spreadsheet upload timed out.")),
    );
    xhr.send(file);
  });
}

async function previewSelectedSheet(
  token: string | null,
  slug: string,
  assetId: string,
  sheetName: string,
): Promise<V2SpreadsheetImportPreviewDTO> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8100"}/v2/projects/${encodeURIComponent(slug)}/imports/spreadsheet/preview`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ assetId, sheetName }),
    },
  );
  if (!response.ok)
    throw new Error(`Spreadsheet preview failed (${response.status}).`);
  const envelope = (await response.json()) as {
    data: V2SpreadsheetImportPreviewDTO;
  };
  return envelope.data;
}

function withoutEmptyValues(mapping: Mapping): Mapping {
  return Object.fromEntries(
    Object.entries(mapping).filter(([, value]) => value),
  ) as Mapping;
}

function displayCell(value: string | number | boolean | null | undefined) {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
