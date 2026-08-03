"use client";

/**
 * ContentPerformanceTable — which responses are actually being seen.
 *
 * It was called a table, titled "Top performing", and contained no table: a
 * stack of flex `<Link>` rows whose trailing metric cluster was `shrink-0` with
 * no fixed width, and whose star group rendered only when a row happened to
 * have a rating — so the impressions number, the value the panel ranks by, sat
 * at a different x-position on every row. That is the one case `DataTable`
 * exists for: rows share a shape, a column is comparable down the column, and
 * the task is comparison.
 *
 * The other repair is the destination. Every row used to link to the same
 * unfiltered inbox while rendering a hover arrow promising a deep link. There
 * is still no per-response address in the app, but the inbox does search by
 * author — so each row now leads to its own author's responses instead of to
 * the top of an unsorted list.
 */

import * as React from "react";
import Link from "next/link";
import {
  DataTable,
  StatusBadge,
  reviewStatusMeta,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/shared";
import {
  RATING_SCALE,
  type ContentPerformanceRow,
} from "@/lib/analytics/types";
import { responsesPath } from "@/lib/routes";
import { ABSENT, fmtCount, fmtDateTime, orDash, timeAgo } from "@/lib/format";

interface ContentPerformanceTableProps {
  rows: ContentPerformanceRow[];
  projectSlug: string;
}

const DEFAULT_SORT: DataTableSort = {
  columnId: "impressions",
  direction: "desc",
};

function sortValue(row: ContentPerformanceRow, columnId: string): number {
  switch (columnId) {
    case "rating":
      // A row with no rating sorts below every rated one in either direction,
      // rather than being treated as a zero-star review.
      return row.rating ?? -1;
    case "added":
      return row.createdAt.getTime();
    default:
      return row.impressions;
  }
}

export function ContentPerformanceTable({
  rows,
  projectSlug,
}: ContentPerformanceTableProps) {
  const [sort, setSort] = React.useState<DataTableSort>(DEFAULT_SORT);

  const sorted = React.useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort(
      (a, b) =>
        (sortValue(a, sort.columnId) - sortValue(b, sort.columnId)) * factor,
    );
  }, [rows, sort]);

  const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);

  const columns: DataTableColumn<ContentPerformanceRow>[] = [
    {
      id: "response",
      header: "Response",
      cell: (row) => <ResponseCell row={row} projectSlug={projectSlug} />,
      footer: `${fmtCount(rows.length)} ${rows.length === 1 ? "response" : "responses"}`,
    },
    {
      id: "status",
      header: "Status",
      // Status is sacred: a rejected response could previously be ranked #1
      // under a heading that reads "Top performing", with no marker at all.
      cell: (row) => (
        <StatusBadge {...reviewStatusMeta(row.moderationStatus)} />
      ),
    },
    {
      id: "rating",
      header: "Rating",
      unit: `of ${RATING_SCALE}`,
      numeric: true,
      sortable: true,
      cell: (row) => orDash(row.rating),
    },
    {
      id: "impressions",
      header: "Impressions",
      numeric: true,
      sortable: true,
      cell: (row) => fmtCount(row.impressions),
      footer: fmtCount(totalImpressions),
    },
    {
      id: "added",
      header: "Added",
      secondary: true,
      sortable: true,
      cell: (row) => (
        <span title={fmtDateTime(row.createdAt)}>{timeAgo(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <DataTable
      aria-label="Response performance"
      columns={columns}
      rows={sorted}
      getKey={(row) => row.id}
      sort={sort}
      onSortChange={setSort}
    />
  );
}

/**
 * The identity cell. A clamped string always carries its full value in `title`,
 * because the row's link goes to the author's responses, not to this one — so
 * the truncated text has to be readable from here.
 */
function ResponseCell({
  row,
  projectSlug,
}: {
  row: ContentPerformanceRow;
  projectSlug: string;
}) {
  const name = row.authorName.trim();
  const company = row.authorCompany?.trim();
  // Searching for an empty author would land on the unfiltered inbox, so an
  // anonymous row is not offered as a link at all.
  const href = name
    ? `${responsesPath(projectSlug)}?status=all&q=${encodeURIComponent(name)}`
    : null;

  return (
    <div className="min-w-0 max-w-md whitespace-normal">
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        {href ? (
          <Link
            href={href}
            className="font-medium text-foreground underline decoration-border underline-offset-2 transition-colors duration-(--duration-base) hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {name}
          </Link>
        ) : (
          <span className="font-medium text-muted-foreground">
            {ABSENT}
            <span className="sr-only">No author recorded</span>
          </span>
        )}
        {company && (
          <span className="text-[11px] text-muted-foreground" title={company}>
            {company}
          </span>
        )}
      </div>
      <p
        className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground"
        title={row.content}
      >
        {row.content}
      </p>
    </div>
  );
}
