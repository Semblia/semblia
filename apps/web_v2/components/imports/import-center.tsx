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
  V2ImportJobDTO,
  V2ImportMode,
  V2ProjectDTO,
} from "@workspace/types";
import { ConnectedImportDialog } from "@/components/imports/connected-import-dialog";
import { DirectImportDialog } from "@/components/imports/direct-import-dialog";
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog";
import { PageBody, PageHeader } from "@/components/shared";
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

function availabilityLabel(
  availability: V2ImportCatalogSourceDTO["availability"],
) {
  return AVAILABILITY[availability] ?? "Unavailable";
}
function groupFor(source: V2ImportCatalogSourceDTO): ImportSectionId | null {
  return CATALOG_GROUP_SECTIONS[source.group] ?? null;
}

export function ImportCenter({ project }: { project: V2ProjectDTO }) {
  const importScope = { slug: project.slug };
  const catalogQuery = useImportCatalog(importScope);
  const jobsQuery = useImportJobs(importScope);
  const [search, setSearch] = React.useState("");
  const [selectedWorkflow, setSelectedWorkflow] =
    React.useState<SelectedWorkflow | null>(null);
  const sources = filterSources(catalogQuery.data ?? [], search);
  return (
    <ImportCenterLayout
      project={project}
      catalogQuery={catalogQuery}
      jobsQuery={jobsQuery}
      search={search}
      setSearch={setSearch}
      selectedWorkflow={selectedWorkflow}
      setSelectedWorkflow={setSelectedWorkflow}
      sources={sources}
    />
  );
}

function filterSources(sources: V2ImportCatalogSourceDTO[], search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return sources.filter((source) =>
    `${source.label} ${source.group}`
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );
}

function ImportCenterLayout({
  project,
  catalogQuery,
  jobsQuery,
  search,
  setSearch,
  selectedWorkflow,
  setSelectedWorkflow,
  sources,
}: {
  project: V2ProjectDTO;
  catalogQuery: ReturnType<typeof useImportCatalog>;
  jobsQuery: ReturnType<typeof useImportJobs>;
  search: string;
  setSearch: (search: string) => void;
  selectedWorkflow: SelectedWorkflow | null;
  setSelectedWorkflow: (workflow: SelectedWorkflow | null) => void;
  sources: V2ImportCatalogSourceDTO[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Import proof"
        description="Bring in proof you already have. Imported responses stay private and pending review."
      />
      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <div className="grid min-h-full lg:grid-cols-[13rem_minmax(0,1fr)]">
          <ImportSidebar
            selectedWorkflow={selectedWorkflow}
            onClose={() => setSelectedWorkflow(null)}
          />
          <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8">
            <ImportContent
              project={project}
              catalogQuery={catalogQuery}
              jobsQuery={jobsQuery}
              search={search}
              setSearch={setSearch}
              selectedWorkflow={selectedWorkflow}
              setSelectedWorkflow={setSelectedWorkflow}
              sources={sources}
            />
          </main>
        </div>
      </PageBody>
    </div>
  );
}

function ImportSidebar({
  selectedWorkflow,
  onClose,
}: {
  selectedWorkflow: SelectedWorkflow | null;
  onClose: () => void;
}) {
  return (
    <aside
      className="border-b border-border lg:border-b-0 lg:border-r"
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest<HTMLElement>(
          "a[href^='#']",
        );
        if (selectedWorkflow && link) {
          event.preventDefault();
          const sectionId = link.getAttribute("href")?.slice(1);
          onClose();
          requestAnimationFrame(() => {
            if (sectionId)
              document
                .getElementById(sectionId)
                ?.scrollIntoView({ block: "start" });
          });
        }
      }}
    >
      <ImportMethodNav
        active={
          selectedWorkflow
            ? (groupFor(selectedWorkflow.source) ?? "quick-import")
            : "quick-import"
        }
      />
    </aside>
  );
}

function ImportMethodNav({ active }: { active: ImportSectionId }) {
  return (
    <nav aria-label="Import methods" className="p-2 lg:p-3">
      <div className="flex gap-1 overflow-x-auto lg:flex-col">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          const isActive = group.id === active;
          return (
            <a
              key={group.id}
              href={`#${group.id}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                isActive && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              <span>{group.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function ImportContent({
  project,
  catalogQuery,
  jobsQuery,
  search,
  setSearch,
  selectedWorkflow,
  setSelectedWorkflow,
  sources,
}: {
  project: V2ProjectDTO;
  catalogQuery: ReturnType<typeof useImportCatalog>;
  jobsQuery: ReturnType<typeof useImportJobs>;
  search: string;
  setSearch: (search: string) => void;
  selectedWorkflow: SelectedWorkflow | null;
  setSelectedWorkflow: (workflow: SelectedWorkflow | null) => void;
  sources: V2ImportCatalogSourceDTO[];
}) {
  if (selectedWorkflow)
    return (
      <ActiveImportWorkflow
        slug={project.slug}
        workflow={selectedWorkflow}
        onClose={() => setSelectedWorkflow(null)}
      />
    );
  return (
    <>
      <CatalogIntro />
      <ImportCatalog
        query={catalogQuery}
        search={search}
        onSearchChange={setSearch}
        sources={sources}
        onStart={(source, mode) => setSelectedWorkflow({ source, mode })}
      />
      <ImportHistory query={jobsQuery} />
    </>
  );
}

function CatalogIntro() {
  return (
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
          Select a source to see what Semblia can import. Workflow forms appear
          only when their server-side path is ready.
        </p>
      </div>
    </section>
  );
}

function ImportCatalog({
  query,
  search,
  onSearchChange,
  sources,
  onStart,
}: {
  query: ReturnType<typeof useImportCatalog>;
  search: string;
  onSearchChange: (search: string) => void;
  sources: V2ImportCatalogSourceDTO[];
  onStart: (source: V2ImportCatalogSourceDTO, mode: ImportWorkflowMode) => void;
}) {
  return (
    <section
      aria-label="Import catalog"
      aria-busy={query.isPending}
      className="py-7"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Sources</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Availability and limitations come from the import service.
          </p>
        </div>
        <label className="block sm:w-64">
          <span className="sr-only">Search import sources</span>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search sources"
            className="h-9"
          />
        </label>
      </div>
      <CatalogState query={query} sources={sources} onStart={onStart} />
    </section>
  );
}

function CatalogState({
  query,
  sources,
  onStart,
}: {
  query: ReturnType<typeof useImportCatalog>;
  sources: V2ImportCatalogSourceDTO[];
  onStart: (source: V2ImportCatalogSourceDTO, mode: ImportWorkflowMode) => void;
}) {
  if (query.isPending)
    return (
      <p className="mt-5 text-sm text-muted-foreground">Loading sources…</p>
    );
  if (query.isError)
    return (
      <p className="mt-5 text-sm text-destructive">
        Import sources couldn&apos;t load. Try again.
      </p>
    );
  if (sources.length === 0)
    return (
      <p className="mt-5 text-sm text-muted-foreground">
        No import sources match that search.
      </p>
    );
  return (
    <div className="mt-5 divide-y divide-border border-y border-border">
      {GROUPS.map((group) => (
        <SourceGroup
          key={group.id}
          id={group.id}
          group={group.label}
          sources={sources.filter((source) => groupFor(source) === group.id)}
          onStart={onStart}
        />
      ))}
      {sources.some((source) => groupFor(source) === null) ? (
        <SourceGroup
          id="other-sources"
          group="Other sources"
          sources={sources.filter((source) => groupFor(source) === null)}
          unknownGroup
          onStart={onStart}
        />
      ) : null}
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
        {reason ? (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {reason}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <AvailabilityBadge availability={source.availability} status={status} />
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

function AvailabilityBadge({
  availability,
  status,
}: {
  availability: V2ImportCatalogSourceDTO["availability"];
  status: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        availability === "AVAILABLE"
          ? "border-success/30 bg-success/10 text-success"
          : availability === "BLOCKED"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-warning/30 bg-warning/10 text-warning",
      )}
    >
      {status}
    </span>
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
      <ImportHistoryState query={query} />
    </section>
  );
}
function ImportHistoryState({
  query,
}: {
  query: ReturnType<typeof useImportJobs>;
}) {
  if (query.isPending)
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Loading import history…
      </p>
    );
  if (query.isError)
    return (
      <p className="mt-4 text-sm text-destructive">
        Import history couldn&apos;t load.
      </p>
    );
  if (query.data?.items.length === 0)
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No imports yet. Completed jobs will remain here with their exact
        results.
      </p>
    );
  return (
    <div className="mt-4 divide-y divide-border border-y border-border">
      {query.data?.items.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </div>
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
        {job.errorMessage ? (
          <p className="mt-1 text-xs text-destructive">{job.errorMessage}</p>
        ) : null}
      </div>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">
        {statusLabel}
      </span>
    </article>
  );
}
