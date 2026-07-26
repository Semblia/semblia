"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import type {
  V2ImportCatalogSourceDTO,
  V2SpreadsheetImportPreviewDTO,
  V2SpreadsheetImportPreviewSheetDTO,
  V2UploadIntentDTO,
} from "@workspace/types";
import {
  useConfirmUpload,
  useCreateUploadIntent,
  useDeleteMediaAsset,
} from "@/hooks/api";
import { useCreateSpreadsheetImport } from "@/hooks/api/use-imports-api";
import { previewSpreadsheetImport } from "@/lib/imports/import-api";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["csv", "xls", "xlsx"] as const;

export const OPTIONAL_SPREADSHEET_FIELDS = [
  ["authorName", "Author name"],
  ["authorRole", "Author role"],
  ["authorCompany", "Author company"],
  ["ratingValue", "Rating value"],
  ["ratingScale", "Rating scale"],
  ["sourceUrl", "Source URL"],
  ["sourceCreatedAt", "Source date"],
  ["tags", "Tags"],
] as const;

export type SpreadsheetMappingField =
  | "text"
  | (typeof OPTIONAL_SPREADSHEET_FIELDS)[number][0];
export type SpreadsheetMapping = Partial<
  Record<SpreadsheetMappingField, string>
> & { text: string };

type SpreadsheetImportDialogControllerInput = {
  slug: string;
  source: Pick<V2ImportCatalogSourceDTO, "key" | "label">;
  onOpenChange: (open: boolean) => void;
};

export function useSpreadsheetImportDialogController(
  input: SpreadsheetImportDialogControllerInput,
) {
  const { getToken } = useAuth();
  const createIntent = useCreateUploadIntent();
  const confirmUpload = useConfirmUpload();
  const deleteAsset = useDeleteMediaAsset();
  const deleteAssetMutationRef = React.useRef(deleteAsset.mutateAsync);
  deleteAssetMutationRef.current = deleteAsset.mutateAsync;
  const createImport = useCreateSpreadsheetImport({ slug: input.slug });
  const uploadedAssetIdRef = React.useRef<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [assetId, setAssetId] = React.useState<string | null>(null);
  const [preview, setPreview] =
    React.useState<V2SpreadsheetImportPreviewDTO | null>(null);
  const [sheet, setSheet] =
    React.useState<V2SpreadsheetImportPreviewSheetDTO | null>(null);
  const [mapping, setMapping] = React.useState<SpreadsheetMapping | null>(null);
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
        projectSlug: input.slug,
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
      const token = await getToken();
      const nextPreview = sheetName
        ? await previewSelectedSheet(token, input.slug, nextAssetId, sheetName)
        : await previewSpreadsheetImport({
            token,
            slug: input.slug,
            assetId: nextAssetId,
          });
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetId) return;
    if (!sheet?.selected) return;
    if (!mapping?.text) return;
    if (!rightsConfirmed) return;
    setError(null);
    setStatus("Starting import.");
    try {
      await createImport.mutateAsync({
        assetId,
        sourceKey: input.source.key,
        mapping: { sheetName: sheet.name, ...withoutEmptyValues(mapping) },
        rightsConfirmed: true,
      });
      uploadedAssetIdRef.current = null;
      setAssetId(null);
      input.onOpenChange(false);
    } catch (cause) {
      const message = errorMessage(cause, "The import could not be started.");
      setError(message);
      setStatus("Import could not be started.");
    }
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
    input.onOpenChange(nextOpen);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) void selectFile(nextFile);
  }

  function handleRightsChange(checked: boolean | "indeterminate") {
    setRightsConfirmed(checked === true);
  }

  function setColumn(field: SpreadsheetMappingField) {
    return (value: string) =>
      setMapping((current) => ({
        ...(current ?? { text: "" }),
        [field]: value,
      }));
  }

  return {
    file,
    assetId,
    preview,
    sheet,
    mapping,
    rightsConfirmed,
    status,
    error,
    isBusy,
    canSubmit,
    isImportPending: createImport.isPending,
    handleOpenChange,
    handleFileChange,
    handleSheetChange: (name: string) => void loadPreview(assetId!, name),
    handleRightsChange,
    handleSubmit,
    setColumn,
  };
}

function defaultMapping(headers: string[]): SpreadsheetMapping {
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

function withoutEmptyValues(mapping: SpreadsheetMapping): SpreadsheetMapping {
  return Object.fromEntries(
    Object.entries(mapping).filter(([, value]) => value),
  ) as SpreadsheetMapping;
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
