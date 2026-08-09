"use client";

/**
 * What a key has actually done — the chart and the rows behind it.
 *
 * Both detail pages had a version of this. The API-key one drew an area chart
 * straight from the usage feed, which only emits rows for days that saw
 * traffic, so the line ran diagonally across every silent day and invented
 * requests that never happened. The agent one had no chart and a bare
 * three-column `<table>` with no aggregate, so "how many calls this month" was
 * a manual addition.
 *
 * Now: one zero-filled series (see `buildUsageSeries`), one `DataTable` with the
 * total in the column footer where it belongs, and one empty state that says
 * "no requests yet" rather than pretending the data failed to load.
 */

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { V2ApiKeyEventDTO } from "@workspace/types";
import { DataTable, type DataTableSort } from "@/components/shared";
import {
  fmtCount,
  fmtDate,
  fmtDateTime,
  humanizeLabel,
  timeAgo,
} from "@/lib/format";
import type { UsagePoint } from "./key-model";

// ── Chart ────────────────────────────────────────────────────────────────────

export function KeyUsageChart({ points }: { points: UsagePoint[] }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
        >
          <defs>
            <linearGradient id="keyUsageFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => shortDay(value)}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          {/* A count axis that doesn't start at zero exaggerates every change. */}
          <YAxis
            domain={[0, "auto"]}
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => fmtCount(value)}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              fontSize: 11,
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
            }}
            formatter={(value) => [fmtCount(Number(value)), "Requests"]}
            labelFormatter={(label) => fmtDate(String(label))}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Requests"
            stroke="var(--brand)"
            strokeWidth={2}
            fill="url(#keyUsageFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortDay(value: string): string {
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return value;
  const date = new Date(at);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

// ── Daily rows ───────────────────────────────────────────────────────────────

function safeTime(value: string): number {
  const at = Date.parse(value);
  return Number.isFinite(at) ? at : 0;
}

/**
 * The feed returns the whole series in one response — daily aggregates, so a
 * long-lived key is tens of rows, not thousands — and carries no paginated
 * envelope, which is why there is no pagination affordance under the table.
 *
 * A table earns its columns here: every row is a day, requests are comparable
 * straight down the column, and the task is comparison. Alignment, tabular
 * figures, and the footer aggregate come from the column definitions.
 */
export function KeyActivityTable({ events }: { events: V2ApiKeyEventDTO[] }) {
  const [sort, setSort] = React.useState<DataTableSort>({
    columnId: "day",
    direction: "desc",
  });

  const rows = React.useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...events].sort((a, b) => {
      if (sort.columnId === "requests") {
        return (a.requestCount - b.requestCount) * direction;
      }
      return (safeTime(a.occurredAt) - safeTime(b.occurredAt)) * direction;
    });
  }, [events, sort]);

  const total = React.useMemo(
    () =>
      events.reduce(
        (sum, event) =>
          sum + (Number.isFinite(event.requestCount) ? event.requestCount : 0),
        0,
      ),
    [events],
  );

  return (
    <DataTable
      aria-label="Daily activity"
      columns={[
        {
          id: "day",
          header: "Day",
          sortable: true,
          footer: `${fmtCount(events.length)} days`,
          cell: (event) => (
            <span
              className="whitespace-nowrap tabular-nums"
              title={fmtDateTime(event.occurredAt)}
            >
              {timeAgo(event.occurredAt)}
            </span>
          ),
        },
        {
          id: "event",
          header: "Event",
          secondary: true,
          // The feed carries one type today; humanizing it means a type the API
          // grows tomorrow still reads as words rather than as its enum name.
          cell: (event) => humanizeLabel(event.type),
        },
        {
          id: "requests",
          header: "Requests",
          numeric: true,
          sortable: true,
          footer: fmtCount(total),
          cell: (event) => fmtCount(event.requestCount),
        },
      ]}
      rows={rows}
      getKey={(event) => event.id}
      sort={sort}
      onSortChange={setSort}
    />
  );
}
