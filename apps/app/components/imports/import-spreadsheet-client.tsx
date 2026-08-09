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
import { ImportMethodShell, MethodAside } from "./method-shell";
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
      steps={STEPS}
      currentStep={mapping ? 1 : 0}
      // The mapping step is a two-column reading task that needs the page; the
      // aside would take the room it uses, so it stands down once a file is in.
      aside={mapping ? undefined : <SpreadsheetAside />}
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

/** What the file needs to contain, before the file is chosen. */
function SpreadsheetAside() {
  return (
    <MethodAside title="What the file needs">
      <p>
        One row per testimonial, with the column names in the first row. Only
        the testimonial text is required.
      </p>
      <p>
        Author name, role, company, rating, source link and date are all
        optional — you match each one to a column in the next step, and anything
        you leave unassigned is simply not imported.
      </p>
      <p>Up to 2,000 rows and 10 MiB. Everything lands pending your review.</p>
    </MethodAside>
  );
}
