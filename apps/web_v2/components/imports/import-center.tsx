"use client";

/**
 * ImportCenter — bring in proof you already have.
 *
 * The previous build put a second vertical navigation rail inside the page (the
 * app has exactly one, and it is the sidebar), used anchor jumps that
 * intercepted their own clicks to close a dialog, and — worst — replaced the
 * entire page body with the workflow dialog, so the catalog vanished behind the
 * modal and flashed back on close. States were bare sentences: "Loading
 * sources…", red "couldn't load" text with no retry.
 *
 * Restructured onto the shared system:
 *   • one column, grouped by Section; the four method groups are FilterPills,
 *     the same control the rest of the app uses to scope a list
 *   • the catalog and history each own their state ladder via DataState, so a
 *     failed load is an error with a retry, not a sentence
 *   • availability is a StatusBadge on the one canonical vocabulary, and an
 *     unrecognised availability reads as unavailable rather than as its enum
 *   • at most two actions per row; the rest move into the overflow menu
 *   • the workflow dialog opens *over* the page, which stays rendered
 */

import * as React from "react";
import Link from "next/link";
import {
  FileTextIcon,
  LinkIcon,
  PlugIcon,
  UploadSimpleIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import type {
  V2ImportCatalogSourceDTO,
  V2ImportJobDTO,
  V2ImportMode,
  V2ProjectDTO,
} from "@workspace/types";
import { ConnectedImportDialog } from "@/components/imports/connected-import-dialog";
import { DirectImportDialog } from "@/components/imports/direct-import-dialog";
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog";
import {
  PageBody,
  PageHeader,
  Section,
  SectionStack,
  FilterPills,
  SearchField,
  DataState,
  DataList,
  ListSkeleton,
  EmptyState,
  NoResults,
  StatusBadge,
  StatusDot,
  ItemRow,
  ItemActionRow,
  useDataState,
  importAvailabilityMeta,
  importJobMeta,
  type ItemAction,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useImportCatalog, useImportJobs } from "@/hooks/api";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import { responsesPath } from "@/lib/routes";
import { fmtCount, timeAgo, fmtDateTime } from "@/lib/format";

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

const GROUP_BLURB: Record<ImportSectionId, string> = {
  "quick-import":
    "A file you already have, or proof you paste in yourself. Nothing to connect.",
  "connected-sources":
    "Sign in once and Semblia reads new proof on a six-hour schedule.",
  "public-sources":
    "Paste a public link. Only what the source publishes openly is read.",
  migrate:
    "Move a wall you built elsewhere, keeping each testimonial's original author and date.",
};

const OTHER_SECTION_ID = "other-sources";

function groupFor(source: V2ImportCatalogSourceDTO): ImportSectionId | null {
  return CATALOG_GROUP_SECTIONS[source.group] ?? null;
}

export function ImportCenter({ project }: { project: V2ProjectDTO }) {
  const importScope = { slug: project.slug };
  const catalogQuery = useImportCatalog(importScope);
  const jobsQuery = useImportJobs(importScope);

  const [search, setSearch] = React.useState("");
  const [group, setGroup] = React.useState<ImportSectionId | "all">("all");
  const [workflow, setWorkflow] = React.useState<SelectedWorkflow | null>(null);

  const allSources = React.useMemo(
    () => catalogQuery.data ?? [],
    [catalogQuery.data],
  );
  const sources = React.useMemo(
    () => filterSources(allSources, search, group),
    [allSources, search, group],
  );

  const catalogState = useDataState(catalogQuery, {
    count: sources.length,
    filtered: search.trim().length > 0 || group !== "all",
  });

  const jobs = React.useMemo(
    () => jobsQuery.data?.items ?? [],
    [jobsQuery.data],
  );
  const jobsState = useDataState(jobsQuery, { count: jobs.length });

  const start = (
    source: V2ImportCatalogSourceDTO,
    mode: ImportWorkflowMode,
  ) => {
    setWorkflow({ source, mode });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Import proof"
        description={
          catalogQuery.data
            ? `${allSources.length} sources · imports arrive pending review`
            : "Imports arrive pending review"
        }
        toolbar={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <FilterPills
              options={[
                { id: "all", label: "All" },
                ...GROUPS.map((g) => ({ id: g.id, label: g.label })),
              ]}
              value={group}
              onChange={(next) => setGroup(next as ImportSectionId | "all")}
              size="sm"
              aria-label="Import methods"
            />
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search sources"
              ariaLabel="Search import sources"
              width="fixed"
            />
          </div>
        }
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <SectionStack>
            <section
              aria-label="Import catalog"
              aria-busy={catalogState.kind === "loading-initial"}
            >
              <DataState
                state={catalogState}
                resource="import sources"
                align="start"
                skeleton={
                  <ListSkeleton
                    rows={5}
                    leading="square"
                    trailing
                    density="dense"
                  />
                }
                empty={
                  <EmptyState
                    icon={TrayIcon}
                    align="start"
                    title="No import sources available"
                    description="The import service returned an empty catalog. This is usually temporary — try again shortly."
                  />
                }
                filteredEmpty={
                  <NoResults
                    title={
                      search
                        ? `No source matches “${search}”`
                        : "No sources in this method"
                    }
                    description="Try another method, or clear the search to see everything Semblia can import from."
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setSearch("");
                          setGroup("all");
                        }}
                      >
                        Show all sources
                      </Button>
                    }
                  />
                }
              >
                <div className="space-y-8">
                  {GROUPS.filter((g) => group === "all" || group === g.id).map(
                    (g) => (
                      <SourceGroup
                        key={g.id}
                        id={g.id}
                        label={g.label}
                        description={GROUP_BLURB[g.id]}
                        sources={sources.filter((s) => groupFor(s) === g.id)}
                        onStart={start}
                      />
                    ),
                  )}

                  {group === "all" &&
                    sources.some((s) => groupFor(s) === null) && (
                      <SourceGroup
                        id={OTHER_SECTION_ID}
                        label="Other sources"
                        description="Semblia's import service offers these, but this build doesn't yet know which method they belong to. They still work."
                        sources={sources.filter((s) => groupFor(s) === null)}
                        unknownGroup
                        onStart={start}
                      />
                    )}
                </div>
              </DataState>
            </section>

            <Section
              title="Import history"
              description="Every import keeps its exact result, so a partial run stays accountable after the fact."
              divided
              id="import-history"
            >
              <div
                aria-label="Import history"
                aria-busy={jobsState.kind === "loading-initial"}
              >
                <DataState
                  state={jobsState}
                  resource="import history"
                  align="start"
                  skeleton={
                    <ListSkeleton
                      rows={3}
                      leading="none"
                      trailing
                      density="dense"
                    />
                  }
                  empty={
                    <p className="py-6 text-xs text-muted-foreground">
                      No imports yet. Completed jobs stay here with their exact
                      results.
                    </p>
                  }
                >
                  <DataList aria-label="Imports">
                    {jobs.map((job) => (
                      <JobRow key={job.id} job={job} slug={project.slug} />
                    ))}
                  </DataList>
                </DataState>
              </div>
            </Section>
          </SectionStack>
        </div>
      </PageBody>

      {/* Opens over the page. The catalog stays mounted behind it, so closing
          the dialog doesn't rebuild and re-scroll the whole surface. */}
      {workflow && (
        <ActiveImportWorkflow
          slug={project.slug}
          workflow={workflow}
          onClose={() => setWorkflow(null)}
        />
      )}
    </div>
  );
}

function filterSources(
  sources: V2ImportCatalogSourceDTO[],
  search: string,
  group: ImportSectionId | "all",
) {
  const needle = search.trim().toLocaleLowerCase();
  return sources.filter((source) => {
    if (group !== "all" && groupFor(source) !== group) return false;
    if (!needle) return true;
    return `${source.label} ${source.group}`
      .toLocaleLowerCase()
      .includes(needle);
  });
}

function SourceGroup({
  id,
  label,
  description,
  sources,
  unknownGroup = false,
  onStart,
}: {
  id: string;
  label: string;
  description: string;
  sources: V2ImportCatalogSourceDTO[];
  unknownGroup?: boolean;
  onStart: (source: V2ImportCatalogSourceDTO, mode: ImportWorkflowMode) => void;
}) {
  return (
    <section id={id} aria-label={label} className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {label}
        </h2>
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {sources.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">
          Nothing here matches the current search.
        </p>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {sources.map((source) => (
            <SourceRow
              key={source.key}
              source={source}
              unknownGroup={unknownGroup}
              onStart={onStart}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * P6 — a source that can't be used says so in plain language instead of
 * appearing as an inviting logo. The reason comes from the import service, so
 * what the user reads is the actual policy, not a guess.
 */
function SourceRow({
  source,
  unknownGroup,
  onStart,
}: {
  source: V2ImportCatalogSourceDTO;
  unknownGroup: boolean;
  onStart: (source: V2ImportCatalogSourceDTO, mode: ImportWorkflowMode) => void;
}) {
  const availability = importAvailabilityMeta(source.availability);
  const reason = unknownGroup
    ? `Unrecognized source group: ${source.group}${source.reason ? ` · ${source.reason}` : ""}`
    : source.reason;

  const actions: ItemAction[] = workflowActions(source).map((action, i) => ({
    id: action.mode,
    label: action.label,
    pinned: i < 2,
    onSelect: () => onStart(source, action.mode),
  }));

  return (
    <ItemRow
      padding="dense"
      aria-label={source.label}
      title={
        <span className="text-sm font-medium text-foreground">
          {source.label}
        </span>
      }
      subtitle={
        reason ? (
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {reason}
          </p>
        ) : undefined
      }
      trailing={<StatusBadge {...availability} />}
      actions={
        actions.length > 0 ? (
          <ItemActionRow
            actions={actions}
            collapseUnder={420}
            visibleWhenCollapsed={2}
            size="sm"
          />
        ) : undefined
      }
    />
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

/**
 * A finished job's counts are the whole point of the record: a partial import
 * that reports only "Partially completed" leaves the owner unable to tell what
 * landed. Zeroes are shown, because "0 failed" is a fact worth reading.
 */
function JobRow({ job, slug }: { job: V2ImportJobDTO; slug: string }) {
  const meta = importJobMeta(job.status);
  const running = job.status === "QUEUED" || job.status === "RUNNING";
  const finishedAt = job.completedAt ?? job.startedAt ?? job.createdAt;

  return (
    <ItemRow
      padding="dense"
      aria-label={`${formatImportSourceLabel(job.sourceKey)} import`}
      title={
        <span className="text-sm font-medium text-foreground">
          {formatImportSourceLabel(job.sourceKey)}
        </span>
      }
      subtitle={
        running ? (
          <p className="text-xs text-muted-foreground">
            {job.totalCount > 0
              ? `Reading ${fmtCount(job.totalCount)} records…`
              : "Import in progress"}
          </p>
        ) : (
          <p className="text-xs tabular-nums text-muted-foreground">
            {job.importedCount} imported · {job.duplicateCount} duplicate ·{" "}
            {job.failedCount} failed
          </p>
        )
      }
      trailing={
        <div className="flex items-center gap-3">
          <StatusDot
            label={meta.label}
            tone={meta.tone}
            transitional={meta.transitional}
          />
          <span
            className="hidden text-xs tabular-nums text-muted-foreground sm:block"
            title={fmtDateTime(finishedAt)}
          >
            {timeAgo(finishedAt)}
          </span>
        </div>
      }
      actions={
        job.errorMessage || job.importedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {job.errorMessage ? (
              <p className="min-w-0 text-xs text-destructive">
                {job.errorMessage}
              </p>
            ) : (
              <span />
            )}
            {job.importedCount > 0 && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-xs"
              >
                {/* Every number leads to the rows behind it. */}
                <Link href={`${responsesPath(slug)}?status=pending`}>
                  Review what arrived
                </Link>
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
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

  if (workflow.mode === "SPREADSHEET") {
    return (
      <SpreadsheetImportDialog
        slug={slug}
        source={workflow.source}
        open
        onOpenChange={onOpenChange}
      />
    );
  }
  if (workflow.mode === "CONNECTED_API") {
    return (
      <ConnectedImportDialog
        slug={slug}
        source={workflow.source}
        open
        onOpenChange={onOpenChange}
      />
    );
  }
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
