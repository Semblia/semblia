"use client";

/**
 * DataTable — the column law, made structural.
 *
 * A table is not "rows with several fields". It earns its columns only when all
 * three hold: every row shares a shape, at least one column is comparable *down*
 * the column, and the user's task is comparison. Otherwise the right answer is a
 * list row (find-and-act) or a `DefinitionList` (one record's fields). The
 * app's densest "table" was a stack of flex links with no shared column widths,
 * so nothing lined up row to row — the exact failure this replaces.
 *
 * Once it is a table, the column decides its own rules and every cell inherits
 * them — that is why alignment lives on the column definition and not on the
 * cell renderer:
 *
 *   • numeric → right-aligned, `tabular-nums`, constant precision down the column
 *   • text    → left-aligned; nothing is ever centred
 *   • the unit lives in the header, not repeated in every cell
 *   • aggregates go in the column footer, under the numbers they aggregate
 *   • content wraps rather than truncating — a truncated number is a wrong number
 */

import * as React from "react";
import { CaretDown, CaretUp, CaretUpDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  /**
   * Unit or scale, rendered once in the header ("%", "ms", "USD") instead of
   * being repeated in every cell.
   */
  unit?: string;
  /**
   * Numeric columns right-align and get `tabular-nums`, so digits line up
   * vertically and magnitudes are comparable at a glance.
   */
  numeric?: boolean;
  cell: (row: T) => React.ReactNode;
  /** Column-footer aggregate, rendered under the column it summarises. */
  footer?: React.ReactNode;
  /** Enables the sort control in this column's header. */
  sortable?: boolean;
  /** Fixed width so columns don't reflow between pages. */
  width?: string;
  /** Hide below `sm` when the column is genuinely secondary. */
  secondary?: boolean;
}

export interface DataTableSort {
  columnId: string;
  direction: "asc" | "desc";
}

export interface DataTableProps<T> {
  "aria-label": string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getKey: (row: T) => string;
  /**
   * Mouse convenience only: clicking anywhere in the row triggers it.
   *
   * This is deliberately NOT the keyboard or screen-reader path. Overriding a
   * `<tr>`'s role to "link" destroys the table's row/cell semantics, and a
   * `tabIndex` row makes every row a tab stop in a list that may be 50 long.
   * The accessible path is a real link inside the row's primary cell — put one
   * there in that column's `cell` renderer.
   */
  onRowClick?: (row: T) => void;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getKey,
  onRowClick,
  sort,
  onSortChange,
  className,
  ...aria
}: DataTableProps<T>) {
  const hasFooter = columns.some((c) => c.footer != null);

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    const isActive = sort?.columnId === column.id;
    onSortChange({
      columnId: column.id,
      direction: isActive && sort.direction === "desc" ? "asc" : "desc",
    });
  };

  return (
    <Table aria-label={aria["aria-label"]} className={className}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((column) => (
            <TableHead
              key={column.id}
              style={column.width ? { width: column.width } : undefined}
              aria-sort={
                sort?.columnId === column.id
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : column.sortable
                    ? "none"
                    : undefined
              }
              className={cn(
                "text-xs font-medium text-muted-foreground",
                column.numeric && "text-right",
                column.secondary && "hidden sm:table-cell",
              )}
            >
              {column.sortable && onSortChange ? (
                <button
                  type="button"
                  onClick={() => toggleSort(column)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 transition-colors duration-(--duration-base) hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                    column.numeric && "flex-row-reverse",
                  )}
                >
                  <SortGlyph
                    active={sort?.columnId === column.id}
                    direction={sort?.direction}
                  />
                  <HeaderLabel header={column.header} unit={column.unit} />
                </button>
              ) : (
                <HeaderLabel header={column.header} unit={column.unit} />
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={getKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(onRowClick && "cursor-pointer")}
          >
            {columns.map((column) => (
              <TableCell
                key={column.id}
                className={cn(
                  "text-xs",
                  column.numeric
                    ? "text-right tabular-nums text-foreground"
                    : "text-foreground",
                  column.secondary && "hidden sm:table-cell",
                )}
              >
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>

      {hasFooter && (
        <TableFooter className="border-t border-border bg-transparent">
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableCell
                key={column.id}
                className={cn(
                  "text-xs font-medium",
                  column.numeric
                    ? "text-right tabular-nums text-foreground"
                    : "text-muted-foreground",
                  column.secondary && "hidden sm:table-cell",
                )}
              >
                {column.footer}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}

function HeaderLabel({
  header,
  unit,
}: {
  header: React.ReactNode;
  unit?: string;
}) {
  return (
    <span>
      {header}
      {unit && (
        <span className="ml-1 font-normal text-muted-foreground/70">
          ({unit})
        </span>
      )}
    </span>
  );
}

function SortGlyph({
  active,
  direction,
}: {
  active: boolean;
  direction?: "asc" | "desc";
}) {
  if (!active) {
    return (
      <CaretUpDown
        className="size-3 text-muted-foreground/40"
        weight="bold"
        aria-hidden
      />
    );
  }
  const Glyph = direction === "asc" ? CaretUp : CaretDown;
  return <Glyph className="size-3 text-foreground" weight="bold" aria-hidden />;
}
