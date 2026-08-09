"use client";

/**
 * ApiUsageTable — request volume per key.
 *
 * The old card was the fourth competing empty-state dialect in this directory
 * (a bordered box containing one plain sentence), had no container at all in
 * its populated state, hand-rolled its own Active/Inactive pill next to the
 * `ui/badge` it never imported, and carried its "near limit" warning purely in
 * an amber border and an amber progress bar with the threshold stated nowhere.
 *
 * The quota column also conflated two facts: a key with no configured limit and
 * a key whose limit the API failed to return both rendered as a bare number
 * with no bar and no label. "No limit" is now a fact the table states.
 */

import * as React from "react";
import {
  DataTable,
  StatusBadge,
  type DataTableColumn,
  type DataTableSort,
  type StatusMeta,
} from "@/components/shared";
import { ABSENT, fmtCount, fmtDateTime, orDash, timeAgo } from "@/lib/format";
import type { ApiKeyUsageData } from "@/lib/analytics/types";

/** Above this share of quota, a key is called out in words, not in colour. */
export const NEAR_LIMIT_PERCENT = 80;

function usageShare(key: ApiKeyUsageData): number | null {
  if (key.usageLimit === null || key.usageLimit <= 0) return null;
  return Math.min((key.usageCount / key.usageLimit) * 100, 100);
}

/** One badge per row, from the most important thing true of that key. */
function keyMeta(key: ApiKeyUsageData): StatusMeta {
  if (!key.isActive) return { label: "Inactive", tone: "muted" };
  const share = usageShare(key);
  if (share !== null && share >= NEAR_LIMIT_PERCENT) {
    return { label: "Near limit", tone: "attention" };
  }
  return { label: "Active", tone: "positive" };
}

const DEFAULT_SORT: DataTableSort = { columnId: "requests", direction: "desc" };

export function ApiUsageTable({ keys }: { keys: ApiKeyUsageData[] }) {
  const [sort, setSort] = React.useState<DataTableSort>(DEFAULT_SORT);

  const sorted = React.useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    const value = (key: ApiKeyUsageData) =>
      sort.columnId === "lastUsed"
        ? (key.lastUsedAt?.getTime() ?? 0)
        : key.usageCount;
    return [...keys].sort((a, b) => (value(a) - value(b)) * factor);
  }, [keys, sort]);

  const totalRequests = keys.reduce((sum, k) => sum + k.usageCount, 0);

  const columns: DataTableColumn<ApiKeyUsageData>[] = [
    {
      id: "key",
      header: "Key",
      cell: (row) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-foreground">{row.keyName}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {row.keyPrefix}…
          </span>
        </span>
      ),
      footer: `${fmtCount(keys.length)} ${keys.length === 1 ? "key" : "keys"}`,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge {...keyMeta(row)} />,
    },
    {
      id: "requests",
      header: "Requests",
      numeric: true,
      sortable: true,
      cell: (row) => fmtCount(row.usageCount),
      footer: fmtCount(totalRequests),
    },
    {
      id: "quota",
      header: "Quota",
      numeric: true,
      // A key with no quota says so. Rendering nothing would read the same as a
      // quota the API couldn't tell us about.
      cell: (row) =>
        row.usageLimit === null ? (
          <span className="text-muted-foreground">No limit</span>
        ) : (
          fmtCount(row.usageLimit)
        ),
    },
    {
      id: "used",
      header: "Used",
      unit: "%",
      numeric: true,
      cell: (row) => {
        const share = usageShare(row);
        return share === null ? ABSENT : share.toFixed(0);
      },
    },
    {
      id: "lastUsed",
      header: "Last used",
      secondary: true,
      sortable: true,
      cell: (row) => (
        <span title={row.lastUsedAt ? fmtDateTime(row.lastUsedAt) : undefined}>
          {orDash(row.lastUsedAt ? timeAgo(row.lastUsedAt) : null)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      aria-label="API usage by key"
      columns={columns}
      rows={sorted}
      getKey={(row) => row.keyId}
      sort={sort}
      onSortChange={setSort}
    />
  );
}
