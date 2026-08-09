"use client";

/**
 * WidgetEngagementTable — how each widget is performing.
 *
 * This was a grid of bordered cards, each containing two filled sub-panels: a
 * card inside a card inside a page section, lifting on hover with a border that
 * faded as it lifted. Four numbers per widget, none of them comparable across
 * widgets because every card measured its own column widths.
 *
 * Four honesty repairs travel with the structure:
 *   • "slow" was carried entirely by amber — an amber border, tile, icon and
 *     number — with no label and no statement of the threshold. It is a status
 *     word now, and the threshold is named in the panel description.
 *   • a widget that has never loaded reported a perfect `0ms`; the adapter
 *     nulls that, and the column shows an em dash.
 *   • `impressions` was fetched, promised by the subtitle "Load & impressions",
 *     and never rendered. It has a column.
 *   • the layout and type fallbacks were the raw enum, so the first value the
 *     API grows would ship to users as `WALL_OF_LOVE`.
 */

import * as React from "react";
import Link from "next/link";
import {
  DataTable,
  StatusBadge,
  type DataTableColumn,
  type DataTableSort,
  type StatusMeta,
} from "@/components/shared";
import {
  fmtCount,
  fmtDateTime,
  humanizeLabel,
  orDash,
  timeAgo,
} from "@/lib/format";
import { widgetStudioPath } from "@/lib/routes";
import type { WidgetEngagementData } from "@/lib/analytics/types";

/** Above this, a widget's average load is called out rather than left to colour. */
export const SLOW_LOAD_MS = 400;

const LAYOUT_LABELS: Record<string, string> = {
  CAROUSEL: "Carousel",
  GRID: "Grid",
  MASONRY: "Masonry",
  LIST: "List",
  WALL: "Wall",
};

const TYPE_LABELS: Record<string, string> = {
  EMBED: "Embed",
  WALL_OF_LOVE: "Wall of Love",
};

/** An unmapped enum is humanised, never printed as the enum. */
function displayEnum(value: string, map: Record<string, string>): string {
  return map[value] ?? (humanizeLabel(value.toLowerCase()) || value);
}

/**
 * One badge per row, from the worst thing true of that widget. Errors outrank a
 * slow load, which outranks a widget nobody has loaded yet.
 */
function healthMeta(widget: WidgetEngagementData): StatusMeta {
  if (widget.errorCount > 0) {
    return {
      label: `${fmtCount(widget.errorCount)} ${widget.errorCount === 1 ? "error" : "errors"}`,
      tone: "critical",
    };
  }
  if (widget.totalLoads === 0) return { label: "No loads yet", tone: "muted" };
  if ((widget.avgLoadMs ?? 0) > SLOW_LOAD_MS) {
    return { label: "Slow", tone: "attention" };
  }
  return { label: "Healthy", tone: "positive" };
}

const DEFAULT_SORT: DataTableSort = { columnId: "loads", direction: "desc" };

function sortValue(row: WidgetEngagementData, columnId: string): number {
  switch (columnId) {
    case "impressions":
      return row.impressions;
    case "avgLoad":
      // Never-loaded widgets sort last rather than posing as the fastest.
      return row.avgLoadMs ?? Number.POSITIVE_INFINITY;
    case "lastLoad":
      return row.lastLoadAt?.getTime() ?? 0;
    default:
      return row.totalLoads;
  }
}

export function WidgetEngagementTable({
  widgets,
  projectSlug,
}: {
  widgets: WidgetEngagementData[];
  projectSlug: string;
}) {
  const [sort, setSort] = React.useState<DataTableSort>(DEFAULT_SORT);

  const sorted = React.useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...widgets].sort(
      (a, b) =>
        (sortValue(a, sort.columnId) - sortValue(b, sort.columnId)) * factor,
    );
  }, [widgets, sort]);

  const totalLoads = widgets.reduce((sum, w) => sum + w.totalLoads, 0);
  const totalImpressions = widgets.reduce((sum, w) => sum + w.impressions, 0);

  const columns: DataTableColumn<WidgetEngagementData>[] = [
    {
      id: "widget",
      header: "Widget",
      cell: (row) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={widgetStudioPath(projectSlug, row.widgetId)}
            className="font-medium text-foreground underline decoration-border underline-offset-2 transition-colors duration-(--duration-base) hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {row.widgetName}
          </Link>
          <span className="text-[11px] text-muted-foreground">
            {displayEnum(row.widgetType, TYPE_LABELS)} ·{" "}
            {displayEnum(row.layoutType, LAYOUT_LABELS)}
          </span>
        </span>
      ),
      footer: `${fmtCount(widgets.length)} ${widgets.length === 1 ? "widget" : "widgets"}`,
    },
    {
      id: "health",
      header: "Status",
      cell: (row) => <StatusBadge {...healthMeta(row)} />,
    },
    {
      id: "loads",
      header: "Loads",
      numeric: true,
      sortable: true,
      cell: (row) => fmtCount(row.totalLoads),
      footer: fmtCount(totalLoads),
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
      id: "avgLoad",
      header: "Avg load",
      unit: "ms",
      numeric: true,
      sortable: true,
      cell: (row) =>
        orDash(row.avgLoadMs === null ? null : Math.round(row.avgLoadMs)),
    },
    {
      id: "lastLoad",
      header: "Last load",
      secondary: true,
      sortable: true,
      cell: (row) => (
        <span title={row.lastLoadAt ? fmtDateTime(row.lastLoadAt) : undefined}>
          {timeAgo(row.lastLoadAt)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      aria-label="Widget performance"
      columns={columns}
      rows={sorted}
      getKey={(row) => row.widgetId}
      sort={sort}
      onSortChange={setSort}
    />
  );
}
