"use client";

import * as React from "react";
import type {
  V2ImportCatalogSourceDTO,
  V2SpreadsheetImportPreviewSheetDTO,
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
  OPTIONAL_SPREADSHEET_FIELDS,
  type SpreadsheetMappingField,
  useSpreadsheetImportDialogController,
} from "./spreadsheet-import-dialog-controller";

export interface SpreadsheetImportDialogProps {
  slug: string;
  source: Pick<V2ImportCatalogSourceDTO, "key" | "label">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpreadsheetImportDialog(props: SpreadsheetImportDialogProps) {
  if (!props.open) return null;
  return <SpreadsheetImportDialogContent {...props} />;
}

function SpreadsheetImportDialogContent({
  slug,
  source,
  onOpenChange,
}: SpreadsheetImportDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const controller = useSpreadsheetImportDialogController({
    slug,
    source,
    onOpenChange,
  });

  return (
    // The page owns the title and description (ImportMethodShell); this
    // component is only the flow. It used to carry its own back button and
    // header from its pseudo-dialog days.
    <section aria-label={`Import from ${source.label}`} className="w-full">
      <form
        onSubmit={controller.handleSubmit}
        aria-busy={controller.isBusy}
        className="grid gap-5"
      >
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
            disabled={controller.isBusy}
            aria-describedby="spreadsheet-import-file-help"
            onChange={controller.handleFileChange}
          />
          <p
            id="spreadsheet-import-file-help"
            className="text-xs text-muted-foreground"
          >
            CSV, XLS, or XLSX; 10 MiB maximum.
            {controller.file ? ` Selected: ${controller.file.name}.` : ""}
          </p>
        </div>

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {controller.status}
        </p>
        {controller.error && (
          <p role="alert" className="text-sm text-destructive">
            {controller.error}
          </p>
        )}

        <SpreadsheetPreviewFields controller={controller} />

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={controller.isBusy}
            onClick={() => controller.handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!controller.canSubmit}>
            {controller.isImportPending ? "Starting import…" : "Start import"}
          </Button>
        </div>
      </form>
    </section>
  );
}

type SpreadsheetImportDialogController = ReturnType<
  typeof useSpreadsheetImportDialogController
>;

function SpreadsheetPreviewFields({
  controller,
}: {
  controller: SpreadsheetImportDialogController;
}) {
  const selectedSheet = controller.sheet?.selected ? controller.sheet : null;
  const mapping = controller.mapping;
  if (!controller.preview) return null;
  if (!selectedSheet) return null;
  if (!mapping) return null;

  return (
    <>
      {controller.preview.sheets.length > 1 && (
        <div className="grid gap-2">
          <label
            htmlFor="spreadsheet-import-sheet"
            className="text-sm font-medium"
          >
            Sheet
          </label>
          <Select
            value={selectedSheet.name}
            disabled={controller.isBusy}
            onValueChange={controller.handleSheetChange}
          >
            <SelectTrigger id="spreadsheet-import-sheet" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {controller.preview.sheets.map((candidate) => (
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
          Text is required. Leave any other field unassigned when it is not
          present.
        </p>
        <ColumnSelect
          label="Testimonial text"
          field="text"
          headers={selectedSheet.headers}
          value={mapping.text}
          required
          onChange={controller.setColumn("text")}
        />
        {OPTIONAL_SPREADSHEET_FIELDS.map(([field, label]) => (
          <ColumnSelect
            key={field}
            label={label}
            field={field}
            headers={selectedSheet.headers}
            value={mapping[field]}
            onChange={controller.setColumn(field)}
          />
        ))}
      </fieldset>

      <SampleTable sheet={selectedSheet} />

      <div className="flex items-start gap-3 border-t border-border pt-5">
        <Checkbox
          id="spreadsheet-import-rights"
          checked={controller.rightsConfirmed}
          disabled={controller.isBusy}
          onCheckedChange={controller.handleRightsChange}
          aria-invalid={
            !controller.rightsConfirmed && Boolean(controller.error)
          }
        />
        <label
          htmlFor="spreadsheet-import-rights"
          className="text-sm leading-5"
        >
          I have the right to import this proof and its author details into this
          project.
        </label>
      </div>
    </>
  );
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
  field: SpreadsheetMappingField;
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
      <div className="overflow-x-auto border-y border-border">
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

function displayCell(value: string | number | boolean | null | undefined) {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}
