"use client";

/**
 * TopCountriesTable — where widget impressions happen.
 *
 * The old list leaked raw API values as country names (a hand-kept table of 13
 * codes, so real traffic from Italy or Poland read as "IT" and "PL" beside
 * "United States"), capped at 8 rows with no affordance and no total, ranked
 * the API's catch-all "Unknown" bucket as if it were a place, and left a
 * dangling divider under the last visible row from an off-by-one against the
 * unsliced length.
 *
 * Names now come from `Intl.DisplayNames` in the adapter, the cap states its
 * own hidden count, and the unknown bucket is marked as what it is.
 */

import * as React from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/shared";
import { fmtCount, orDash } from "@/lib/format";
import type { CountryEntry } from "@/lib/analytics/types";
import { ShowAllRows, useRowCap } from "./row-cap";

const VISIBLE_ROWS = 8;

const DEFAULT_SORT: DataTableSort = {
  columnId: "impressions",
  direction: "desc",
};

export function TopCountriesTable({
  countries,
}: {
  countries: CountryEntry[];
}) {
  const [sort, setSort] = React.useState<DataTableSort>(DEFAULT_SORT);

  const sorted = React.useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...countries].sort(
      (a, b) => (a.impressions - b.impressions) * factor,
    );
  }, [countries, sort]);

  const cap = useRowCap(sorted, VISIBLE_ROWS);
  const total = countries.reduce((sum, c) => sum + c.impressions, 0);

  const columns: DataTableColumn<CountryEntry>[] = [
    {
      id: "country",
      header: "Country",
      cell: (row) =>
        row.isUnknown ? (
          <span className="text-muted-foreground">
            Unknown
            <span className="ml-1.5 text-[11px]">(no region reported)</span>
          </span>
        ) : (
          row.countryName
        ),
      footer: `${fmtCount(countries.length)} ${countries.length === 1 ? "region" : "regions"}`,
    },
    {
      id: "impressions",
      header: "Impressions",
      numeric: true,
      sortable: true,
      cell: (row) => fmtCount(row.impressions),
      footer: fmtCount(total),
    },
    {
      id: "share",
      header: "Share",
      unit: "%",
      numeric: true,
      cell: (row) =>
        orDash(total > 0 ? ((row.impressions / total) * 100).toFixed(1) : null),
      footer: total > 0 ? "100.0" : orDash(null),
    },
  ];

  return (
    <div>
      <DataTable
        aria-label="Impressions by country"
        columns={columns}
        rows={cap.visible}
        getKey={(row) => row.countryCode}
        sort={sort}
        onSortChange={setSort}
      />
      <ShowAllRows
        hidden={cap.hidden}
        expanded={cap.expanded}
        onToggle={cap.toggle}
        noun="countries"
      />
    </div>
  );
}
