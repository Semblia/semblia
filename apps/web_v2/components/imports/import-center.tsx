"use client";

import * as React from "react";
import {
  ClockCounterClockwiseIcon,
  FileTextIcon,
  LinkIcon,
  PlugIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import type {
  V2ImportAvailability,
  V2ImportCatalogSourceDTO,
  V2ImportMode,
  V2ImportJobDTO,
  V2ProjectDTO,
} from "@workspace/types";
import { ConnectedImportDialog } from "@/components/imports/connected-import-dialog";
import { DirectImportDialog } from "@/components/imports/direct-import-dialog";
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog";
import {
  PageBody,
  PageHeader,
  SectionNav,
  type SectionNavItem,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useImportCatalog, useImportJobs } from "@/hooks/api";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import { cn } from "@/lib/utils";

const GROUPS = [
  { id: "quick-import", label: "Quick import", icon: UploadSimpleIcon },
  { id: "connected-sources", label: "Connected sources", icon: PlugIcon },
  { id: "public-sources", label: "Public sources", icon: LinkIcon },
  { id: "migrate", label: "Migrate", icon: FileTextIcon },
] as const;

type ImportSectionId = (typeof GROUPS)[number]["id"];
type ImportWorkflowMode = Extract<
  V2ImportMode,
  "SPREADSHEET" | "MANUAL" | "PUBLIC_URL" | "CONNECTED_API" | "MIGRATION"
>;
type SelectedWorkflow = {
  source: V2ImportCatalogSourceDTO;
  mode: ImportWorkflowMode;
};

const CATALOG_GROUP_SECTIONS: Readonly<Record<string, ImportSectionId>> = {
  Files: "quick-import",
  Direct: "quick-import",
  "Manual-only/private": "quick-import",
  "Connected social": "connected-sources",
  "Connected reviews": "connected-sources",
  "Public social/community": "public-sources",
  "Public reviews": "public-sources",
  "Wall migrations": "migrate",
};

const AVAILABILITY: Record<V2ImportAvailability, string> = {
  AVAILABLE: "Available",
  SETUP_REQUIRED: "Setup required",
  MANUAL_ONLY: "Manual only",
  BLOCKED: "Blocked",
};

function importNav(): SectionNavItem[] {
  return GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    href: `#${group.id}`,
    icon: group.icon,
  }));
}

function availabilityLabel(
  availability: V2ImportCatalogSourceDTO["availability"],
) {
  return AVAILABILITY[availability] ?? "Unavailable";
}

function groupFor(source: V2ImportCatalogSourceDTO): ImportSectionId | null {
  return CATALOG_GROUP_SECTIONS[source.group] ?? null;
}

export function ImportCenter({ project }: { project: V2ProjectDTO }) {
  const catalogQuery = useImportCatalog(project.slug);
  const jobsQuery = useImportJobs(project.slug);
  const [search, setSearch] = React.useState("");
  const [selectedWorkflow, setSelectedWorkflow] =
    React.useState<SelectedWorkflow | null>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const sources = (catalogQuery.data ?? []).filter((source) =>
    `${source.label} ${source.group}`
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Import proof"
        description="Bring in proof you already have. Imported responses stay private and pending review."
      />
      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <div className="grid min-h-full lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside
            className="border-b border-border lg:border-b-0 lg:border-r"
            onClickCapture={(event) => {
              const link = (event.target as HTMLElement).closest<HTMLElement>(
                "a[href^='#']",
              );
              if (selectedWorkflow && link) {
                event.preventDefault();
                const sectionId = link.getAttribute("href")?.slice(1);
                setSelectedWorkflow(null);
                requestAnimationFrame(() => {
                  if (sectionId)
                    document
                      .getElementById(sectionId)
                      ?.scrollIntoView({ block: "start" });
                });
              }
            }}
          >
            <SectionNav
              items={importNav()}
              active={
                selectedWorkflow
                  ? (groupFor(selectedWorkflow.source) ?? "quick-import")
                  : "quick-import"
              }
              aria-label="Import methods"
            />
          </aside>
          <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8">
            {selectedWorkflow ? (
              <ActiveImportWorkflow
                slug={project.slug}
                workflow={selectedWorkflow}
                onClose={() => setSelectedWorkflow(null)}
              />
            ) : (
              <>
                <section
                  aria-labelledby="import-intro-title"
                  className="border-b border-border pb-8"
                >
                  <div className="max-w-2xl">
                    <h2
                      id="import-intro-title"
                      className="text-base font-semibold tracking-tight"
                    >
                      Start with proof you can account for
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Select a source to see what Semblia can import. Workflow
                      forms appear only when their server-side path is ready.
                    </p>
                  </div>
                </section>

                <section
                  aria-label="Import catalog"
                  aria-busy={catalogQuery.isPending}
                  className="py-7"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">Sources</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Availability and limitations come from the import
                        service.
                      </p>
                    </div>
                    <label className="block sm:w-64">
                      <span className="sr-only">Search import sources</span>
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search sources"
                        className="h-9"
                      />
                    </label>
                  </div>

                  {catalogQuery.isPending ? (
                    <p className="mt-5 text-sm text-muted-foreground">
                      Loading sources…
                    </p>
                  ) : catalogQuery.isError ? (
                    <p className="mt-5 text-sm text-destructive">
                      Import sources couldn&apos;t load. Try again.
                    </p>
                  ) : sources.length === 0 ? (
                    <p className="mt-5 text-sm text-muted-foreground">
                      No import sources match that search.
                    </p>
                  ) : (
                    <div className="mt-5 divide-y divide-border border-y border-border">
                      {GROUPS.map((group) => {
                        const groupSources = sources.filter(
                          (source) => groupFor(source) === group.id,
                        );
                        return (
                          <SourceGroup
                            key={group.id}
                            id={group.id}
                            group={group.label}
                            sources={groupSources}
                            onStart={(source, mode) =>
                              setSelectedWorkflow({ source, mode })
                            }
                          />
                        );
                      })}
                      {sources.some((source) => groupFor(source) === null) && (
                        <SourceGroup
                          id="other-sources"
                          group="Other sources"
                          sources={sources.filter(
                            (source) => groupFor(source) === null,
                          )}
                          unknownGroup
                          onStart={(source, mode) =>
                            setSelectedWorkflow({ source, mode })
                          }
                        />
                      )}
                    </div>
                  )}
                </section>

                <ImportHistory query={jobsQuery} />
              </>
            )}
          </main>
        </div>
      </PageBody>
    </div>
  );
}

function ActiveImportWorkflow({
  slug,
  workflow,
  onClose,
}: {
  slug: string;
  workflow: SelectedWorkflow;
  onClose: () => void;
}) {
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  if (workflow.mode === "SPREADSHEET")
    return (
      <SpreadsheetImportDialog
        slug={slug}
        source={workflow.source}
        open
        onOpenChange={onOpenChange}
      />
    );
  if (workflow.mode === "CONNECTED_API")
    return (
      <ConnectedImportDialog
        slug={slug}
        source={workflow.source}
        open
        onOpenChange={onOpenChange}
      />
    );
  return (
    <DirectImportDialog
      slug={slug}
      source={workflow.source}
      mode={workflow.mode}
      open
      onOpenChange={onOpenChange}
    />
  );
}

function SourceGroup({
  id,
  group,
  sources,
  unknownGroup = false,
  onStart,
}: {
  id: string;
  group: string;
  sources: V2ImportCatalogSourceDTO[];
  unknownGroup?: boolean;
  onStart: (source: V2ImportCatalogSourceDTO, mode: ImportWorkflowMode) => void;
}) {
  return (
    <section id={id} aria-label={group} className="py-4 first:pt-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {group}
      </h3>
      <div className="divide-y divide-border/70">
        {sources.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">
            No matching sources in this section.
          </p>
        ) : (
          sources.map((source) => (
            <SourceRow
              key={source.key}
              source={source}
              unknownGroup={unknownGroup}
              onStart={onStart}
            />
          ))
        )}
      </div>
    </section>
  );
}

function SourceRow({
  source,
  unknownGroup,
  onStart,
}: {
  source: V2ImportCatalogSourceDTO;
  unknownGroup: boolean;
  onStart: (source: V2ImportCatalogSourceDTO, mode: ImportWorkflowMode) => void;
}) {
  const status = availabilityLabel(source.availability);
  const reason = unknownGroup
    ? `Unrecognized source group: ${source.group}${source.reason ? ` · ${source.reason}` : ""}`
    : source.reason;
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{source.label}</p>
        {reason && (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {reason}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
            source.availability === "AVAILABLE"
              ? "border-success/30 bg-success/10 text-success"
              : source.availability === "BLOCKED"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-warning/30 bg-warning/10 text-warning",
          )}
        >
          {status}
        </span>
        {workflowActions(source).map((action) => (
          <Button
            key={action.mode}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onStart(source, action.mode)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function workflowActions(source: V2ImportCatalogSourceDTO) {
  if (source.availability === "BLOCKED") return [];
  const labels: Partial<Record<ImportWorkflowMode, string>> = {
    SPREADSHEET: source.key === "spreadsheet" ? "Choose file" : "Upload export",
    MANUAL: "Add manually",
    PUBLIC_URL: "Import URL",
    CONNECTED_API: "Connect",
    MIGRATION: "Migrate URL",
  };
  const orderedModes: ImportWorkflowMode[] = [
    "CONNECTED_API",
    "MIGRATION",
    "PUBLIC_URL",
    "MANUAL",
    "SPREADSHEET",
  ];
  return orderedModes.flatMap((mode) =>
    source.modes.includes(mode) && modeReadyForUser(source, mode)
      ? [{ mode, label: labels[mode] ?? "Import" }]
      : [],
  );
}

function modeReadyForUser(
  source: V2ImportCatalogSourceDTO,
  mode: ImportWorkflowMode,
) {
  if (source.availability !== "SETUP_REQUIRED") return true;
  if (mode === "MANUAL" || mode === "SPREADSHEET") return true;
  return (
    mode === "CONNECTED_API" && source.reasonCode === "PROVIDER_SETUP_REQUIRED"
  );
}

function ImportHistory({ query }: { query: ReturnType<typeof useImportJobs> }) {
  return (
    <section
      aria-label="Import history"
      aria-busy={query.isPending}
      className="border-t border-border py-7"
    >
      <div className="flex items-center gap-2">
        <ClockCounterClockwiseIcon
          className="size-4 text-muted-foreground"
          aria-hidden
        />
        <h2 className="text-sm font-semibold">Import history</h2>
      </div>
      {query.isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading import history…
        </p>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-destructive">
          Import history couldn&apos;t load.
        </p>
      ) : query.data?.items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No imports yet. Completed jobs will remain here with their exact
          results.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {query.data?.items.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}

function JobRow({ job }: { job: V2ImportJobDTO }) {
  const statusLabel =
    {
      QUEUED: "Queued",
      RUNNING: "Running",
      SUCCEEDED: "Completed",
      PARTIAL: "Partially completed",
      FAILED: "Failed",
    }[job.status] ?? "Unknown status";
  return (
    <article className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        <p className="text-sm font-medium">
          {formatImportSourceLabel(job.sourceKey)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {job.status === "QUEUED" || job.status === "RUNNING"
            ? "Import in progress"
            : `${job.importedCount} imported · ${job.duplicateCount} duplicate · ${job.failedCount} failed`}
        </p>
        {job.errorMessage && (
          <p className="mt-1 text-xs text-destructive">{job.errorMessage}</p>
        )}
      </div>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">
        {statusLabel}
      </span>
    </article>
  );
}
