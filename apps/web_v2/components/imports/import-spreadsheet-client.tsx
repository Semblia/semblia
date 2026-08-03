"use client";

/**
 * Upload a spreadsheet — the existing preview → map → import flow, now on a
 * page with room to breathe instead of a pseudo-dialog over the catalog.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataState, ListSkeleton } from "@/components/shared";
import { importPath } from "@/lib/routes";
import { ImportMethodShell } from "./method-shell";
import { SpreadsheetImportDialog } from "./spreadsheet-import-dialog";
import { useMethodSources } from "./use-method-sources";

export function ImportSpreadsheetClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { sources, state } = useMethodSources(slug, "SPREADSHEET");
  // The catalog's canonical spreadsheet source; platform-export sources also
  // carry SPREADSHEET mode, but the generic one owns this page.
  const source =
    sources.find((s) => s.key === "spreadsheet") ?? sources[0] ?? null;

  return (
    <ImportMethodShell
      slug={slug}
      title="Upload a spreadsheet"
      description="CSV, XLS, or XLSX — map the columns once and Semblia reads the rows."
      wide
    >
      <DataState
        state={state}
        resource="the spreadsheet importer"
        align="start"
        skeleton={<ListSkeleton rows={3} leading="none" density="dense" />}
      >
        {source && (
          <SpreadsheetImportDialog
            slug={slug}
            source={source}
            open
            onOpenChange={(open) => {
              if (!open) router.push(importPath(slug));
            }}
          />
        )}
      </DataState>
    </ImportMethodShell>
  );
}
