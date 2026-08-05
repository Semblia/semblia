"use client";

/**
 * Upload a spreadsheet — choose a file, then match its columns.
 *
 * There is no source to pick here (the file *is* the source), so this page's
 * progression is the one the flow already had and never showed: the mapping
 * fields simply appeared once a preview came back. The rail names both steps up
 * front, so a page that opens as a single drop target no longer implies the
 * whole job is one click.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataState, ListSkeleton } from "@/components/shared";
import { importPath } from "@/lib/routes";
import { ImportMethodShell } from "./method-shell";
import { SpreadsheetImportDialog } from "./spreadsheet-import-dialog";
import { useMethodSources } from "./use-method-sources";

const STEPS = ["Choose a file", "Match the columns"] as const;

export function ImportSpreadsheetClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { sources, state } = useMethodSources(slug, "SPREADSHEET");
  const [mapping, setMapping] = React.useState(false);
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
      steps={STEPS}
      currentStep={mapping ? 1 : 0}
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
            onPreviewChange={setMapping}
            onOpenChange={(open) => {
              if (!open) router.push(importPath(slug));
            }}
          />
        )}
      </DataState>
    </ImportMethodShell>
  );
}
