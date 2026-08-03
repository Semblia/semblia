"use client";

/**
 * TopSourcesTable — where submissions come from, and how many of each survive
 * review.
 *
 * The old list showed "100% approved" beside a count of 1 with the two visually
 * detached, changed container shape between its empty and populated states (so
 * the empty box lost its own title), and rendered a hover arrow on every row
 * pointing at the unfiltered inbox. A percentage now sits in the column beside
 * its own denominator, and no row promises a destination: the Responses inbox
 * has no `?source=` filter — it was deliberately deferred over a PII boundary —
 * so nothing here is offered as a link.
 */

import * as React from "react";
import {
  DataTable,
  StatusBadge,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/shared";
import { fmtCount, orDash } from "@/lib/format";
import type { SourceEntry } from "@/lib/analytics/types";
import { ShowAllRows, useRowCap } from "./row-cap";

const VISIBLE_ROWS = 8;

const DEFAULT_SORT: DataTableSort = { columnId: "count", direction: "desc" };

interface TopSourcesTableProps {
  sources: SourceEntry[];
}

export function TopSourcesTable({ sources }: TopSourcesTableProps) {
  const [sort, setSort] = React.useState<DataTableSort>(DEFAULT_SORT);

  const sorted = React.useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    const value = (row: SourceEntry) =>
      sort.columnId === "approvalRate" ? row.approvalRate : row.count;
    return [...sources].sort((a, b) => (value(a) - value(b)) * factor);
  }, [sources, sort]);

  const cap = useRowCap(sorted, VISIBLE_ROWS);

  const totalCount = sources.reduce((sum, s) => sum + s.count, 0);
  // The overall rate is weighted by volume: averaging four per-source
  // percentages would let a source with one submission outvote one with a
  // thousand.
  const overallRate =
    totalCount > 0
      ? (sources.reduce((sum, s) => sum + (s.count * s.approvalRate) / 100, 0) /
          totalCount) *
        100
      : null;

  const columns: DataTableColumn<SourceEntry>[] = [
    {
      id: "source",
      header: "Source",
      cell: (row) => (
        <span className="flex items-center gap-2">
          {row.label}
          {row.oauthVerified && (
            <StatusBadge label="Identity verified" tone="positive" />
          )}
        </span>
      ),
      footer: `${fmtCount(sources.length)} ${sources.length === 1 ? "source" : "sources"}`,
    },
    {
      id: "count",
      header: "Submissions",
      numeric: true,
      sortable: true,
      cell: (row) => fmtCount(row.count),
      footer: fmtCount(totalCount),
    },
    {
      // The unit lives in the header, at one precision down the whole column.
      id: "approvalRate",
      header: "Approved",
      unit: "%",
      numeric: true,
      sortable: true,
      cell: (row) => row.approvalRate.toFixed(0),
      footer: orDash(overallRate === null ? null : overallRate.toFixed(0)),
    },
  ];

  return (
    <div>
      <DataTable
        aria-label="Submission sources"
        columns={columns}
        rows={cap.visible}
        getKey={(row) => row.source}
        sort={sort}
        onSortChange={setSort}
      />
      <ShowAllRows
        hidden={cap.hidden}
        expanded={cap.expanded}
        onToggle={cap.toggle}
        noun="sources"
      />
    </div>
  );
}
