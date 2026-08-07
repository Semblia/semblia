"use client";

import * as React from "react";
import { FileXlsIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import type {
  V2ImportCatalogSourceDTO,
  V2SpreadsheetImportPreviewSheetDTO,
} from "@workspace/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OPTIONAL_SPREADSHEET_FIELDS,
  type SpreadsheetMapping,
  type SpreadsheetMappingField,
  useSpreadsheetImportDialogController,
} from "./spreadsheet-import-dialog-controller";

export interface SpreadsheetImportDialogProps {
  slug: string;
  source: Pick<V2ImportCatalogSourceDTO, "key" | "label">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reports whether a preview has loaded, so the page can advance its rail. */
  onPreviewChange?: (mapping: boolean) => void;
}

export function SpreadsheetImportDialog(props: SpreadsheetImportDialogProps) {
  if (!props.open) return null;
  return <SpreadsheetImportDialogContent {...props} />;
}

function SpreadsheetImportDialogContent({
  slug,
  source,
  onOpenChange,
  onPreviewChange,
}: SpreadsheetImportDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const controller = useSpreadsheetImportDialogController({
    slug,
    source,
    onOpenChange,
  });

  const mapping = Boolean(controller.preview);
  React.useEffect(() => {
    onPreviewChange?.(mapping);
  }, [mapping, onPreviewChange]);

  return (
    // The page owns the title and description (ImportMethodShell); this
    // component is only the flow. It used to carry its own back button and
    // header from its pseudo-dialog days.
    <section aria-label={`Import from ${source.label}`} className="w-full">
      <form
        onSubmit={controller.handleSubmit}
        aria-busy={controller.isBusy}
        className="grid gap-6"
      >
        {/* Before a file: one target, at a size that says "drop here". After
            one: a single line, because the file is now settled and the work
            has moved on to the columns. A full-height drop target parked above
            the mapping step was the loudest thing on a screen whose subject
            had already changed. */}
        {/* The native input lives here rather than inside either branch: both
            the drop zone and "Choose another file" are `<label>`s that activate
            it, and an input that unmounted at step 2 would leave the second one
            pointing at nothing. */}
        <FileInput controller={controller} inputRef={fileInputRef} />
        {mapping ? (
          <ChosenFile controller={controller} />
        ) : (
          <div className="max-w-3xl">
            <FileDropZone controller={controller} />
            <p
              aria-live="polite"
              className="mt-3 text-[13px] text-muted-foreground"
            >
              {controller.status}
            </p>
          </div>
        )}

        {controller.error && (
          <p role="alert" className="text-[13px] text-destructive">
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

/**
 * The settled file, once the columns are the subject: name, what was read from
 * it, and the way to swap it. The `<label>` reaches the same `sr-only` input
 * the drop zone uses, so "Choose another" needs no second control.
 */
function ChosenFile({
  controller,
}: {
  controller: SpreadsheetImportDialogController;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-4">
      <FileXlsIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="text-[13px] font-medium text-foreground">
        {controller.file?.name ?? "Your spreadsheet"}
      </span>
      <span aria-live="polite" className="text-xs text-muted-foreground">
        {controller.status}
      </span>
      <label
        htmlFor="spreadsheet-import-file"
        className={cn(
          "ml-auto cursor-pointer rounded-md px-2 py-1 text-xs text-muted-foreground outline-none",
          "transition-colors hover:bg-muted/40 hover:text-foreground",
          "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/30",
          controller.isBusy && "pointer-events-none opacity-60",
        )}
      >
        Choose another file
      </label>
    </div>
  );
}

type SpreadsheetImportDialogController = ReturnType<
  typeof useSpreadsheetImportDialogController
>;

const SPREADSHEET_ACCEPT =
  ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * The one native file input on the page.
 *
 * A plain `<input>`, not the styled `Input`: that one carries `w-full`, which
 * survives merging with `sr-only` and gives an absolutely positioned element a
 * full-viewport width — the page grew a horizontal scrollbar from a control
 * nobody can see. `peer` + `sr-only` keeps it focusable and operable, with the
 * ring drawn on whichever label is on screen.
 */
function FileInput({
  controller,
  inputRef,
}: {
  controller: SpreadsheetImportDialogController;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <input
      ref={inputRef}
      id="spreadsheet-import-file"
      type="file"
      accept={SPREADSHEET_ACCEPT}
      disabled={controller.isBusy}
      aria-describedby="spreadsheet-import-file-help"
      onChange={controller.handleFileChange}
      className="peer sr-only"
    />
  );
}

/**
 * The file step, as a target you can drop onto.
 *
 * It was a bare `<input type="file">`, which the browser renders as "Choose
 * file / No file chosen" — the least inviting control on the web, and the first
 * thing on a page whose whole job is receiving a file.
 */
function FileDropZone({
  controller,
}: {
  controller: SpreadsheetImportDialogController;
}) {
  const [dragging, setDragging] = React.useState(false);

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (controller.isBusy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void controller.selectFile(file);
  }

  return (
    <label
      htmlFor="spreadsheet-import-file"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-9 text-center",
        "transition-[background,border-color] duration-(--duration-fast)",
        "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/30",
        controller.isBusy && "pointer-events-none opacity-60",
        dragging
          ? "border-foreground/40 bg-muted/50"
          : "border-border bg-surface hover:border-foreground/25 hover:bg-muted/30",
      )}
    >
      <UploadSimpleIcon className="size-5 text-muted-foreground" aria-hidden />
      <span className="text-[13px] font-medium text-foreground">
        {controller.file
          ? controller.file.name
          : "Drop a spreadsheet, or choose one"}
      </span>
      <span
        id="spreadsheet-import-file-help"
        className="text-xs text-muted-foreground"
      >
        CSV, XLS, or XLSX; 10 MiB maximum.
      </span>
    </label>
  );
}

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
      {/* Mapping and preview are one task read two ways — "which column is the
          testimonial?" is answered by looking at the rows. Stacking them made
          the page twice as tall as the screen and put the answer out of sight
          of the question; side by side from `lg`, they are read together. */}
      <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          {controller.preview.sheets.length > 1 && (
            <div className="grid gap-2">
              <label
                htmlFor="spreadsheet-import-sheet"
                className="text-[13px] font-medium"
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

          <fieldset className="grid gap-3">
            <legend className="text-[13px] font-semibold">Match columns</legend>
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
        </div>

        <SampleTable sheet={selectedSheet} mapping={mapping} />
      </div>

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
          className="text-[13px] leading-5"
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

/**
 * The first rows as they actually are, with every mapped column marked.
 *
 * The marking is the point: mapping eight dropdowns and then scanning an
 * unannotated table to check the result is two jobs. A column that is going
 * somewhere says where, so a wrong pick is visible without re-reading the
 * dropdowns above it.
 */
function SampleTable({
  sheet,
  mapping,
}: {
  sheet: Extract<V2SpreadsheetImportPreviewSheetDTO, { selected: true }>;
  mapping: SpreadsheetMapping;
}) {
  const assigned = React.useMemo(() => {
    const byHeader = new Map<string, string>();
    if (mapping.text) byHeader.set(mapping.text, "Testimonial text");
    for (const [field, label] of OPTIONAL_SPREADSHEET_FIELDS) {
      const header = mapping[field];
      if (header) byHeader.set(header, label);
    }
    return byHeader;
  }, [mapping]);

  return (
    <section
      aria-labelledby="spreadsheet-import-sample-heading"
      className="grid min-w-0 gap-2"
    >
      <div>
        <h3
          id="spreadsheet-import-sample-heading"
          className="text-[13px] font-semibold"
        >
          Preview
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The first {sheet.samples.length} rows, as Semblia read them.
          Unassigned columns are not imported.
        </p>
      </div>
      <div className="overflow-x-auto border-y border-border">
        <table className="w-full min-w-max text-left text-xs">
          <thead className="bg-muted/50">
            <tr>
              {sheet.headers.map((header) => {
                const role = assigned.get(header);
                return (
                  <th
                    key={header}
                    scope="col"
                    className={cn(
                      "px-3 pb-1.5 pt-2 align-bottom font-medium",
                      role ? "text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    <span className="block">{header}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[10px] font-normal",
                        role ? "text-brand-ink" : "text-muted-foreground/50",
                      )}
                    >
                      {role ?? "Not imported"}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sheet.samples.map((row, index) => (
              <tr key={index}>
                {sheet.headers.map((header, cellIndex) => (
                  <td
                    key={header}
                    className={cn(
                      "max-w-48 truncate px-3 py-2",
                      assigned.has(header)
                        ? "text-foreground"
                        : "text-muted-foreground/60",
                    )}
                  >
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
