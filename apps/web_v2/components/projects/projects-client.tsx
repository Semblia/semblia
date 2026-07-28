"use client";

/**
 * ProjectsClient — the app's front door.
 *
 * This surface is a *project selector*, not a dashboard: the design canon is
 * explicit that the global view never aggregates vanity metrics. It used to
 * open with "N projects · N responses · N pending review" summed across every
 * project — and summed only over the first 100, because the list was requested
 * with `pageSize: 100` and the envelope's `total` / `hasNext` were discarded.
 * A 140-project workspace was told it had 100, and the pending count, the one
 * number that drives action, silently undercounted. Both the aggregate and the
 * cap are gone: the header reports the server's own `total`, and per-project
 * counts stay on the project they belong to.
 *
 * Restructured onto the shared system:
 *   • `useDataState` owns the ladder, so a failed load can no longer render as
 *     an empty workspace, and a type filter that matches nothing renders the
 *     filtered-empty surface instead of a blank canvas
 *   • rows sit on the page background in a `DataList` — a list is not one of
 *     the three sanctioned bordered containers, so the bordered panel that used
 *     to wrap them is gone
 *   • pagination is rendered from the envelope, in both views
 *   • the create affordance knows the plan limit and refuses in place rather
 *     than letting the API refuse after the form is filled in
 *   • ownership transfers own their own state (see `project-transfers.tsx`)
 */

import * as React from "react";
import Link from "next/link";
import { PlusIcon } from "@phosphor-icons/react";
import type { V2ProjectDTO } from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  DataList,
  DataState,
  FilterPills,
  HeaderSep,
  ListSkeleton,
  PageBody,
  PageHeader,
  RefreshingDataBadge,
  SearchField,
  ViewToggle,
  useDataState,
} from "@/components/shared";
import { useProjectsList } from "@/hooks/api";
import { useViewMode } from "@/hooks/use-view-mode";
import { fmtCount } from "@/lib/format";
import { accountBillingPath, newProjectPath } from "@/lib/routes";

import { ProjectCard } from "./project-card";
import { ProjectRow } from "./project-row";
import { ProjectGridSkeleton } from "./project-skeletons";
import { EmptyProjects, NoProjectsMatch } from "./project-empty-states";
import { projectTypeLabelFor } from "./project-facts";
import { IncomingTransfers } from "./project-transfers";
import { useProjectLimit } from "./project-limit";

/** Divides evenly into the 2 / 3 / 4-column grid breakpoints. */
const PAGE_SIZE = 24;

/**
 * Below this many projects there is nothing worth filtering, so the toolbar is
 * noise. It stays mounted whenever a filter *is* active regardless of count:
 * the old gate dropped the toolbar when a workspace fell below the threshold
 * while a search was live, leaving the user looking at a filtered subset with
 * no visible reason and no control to clear it.
 */
const TOOLBAR_MIN_PROJECTS = 6;

type ProjectFilter = "all" | string;

/**
 * The grid view puts tiles where `DataList` puts hairline-separated rows. The
 * primitive hardcodes the row layout on its inner list element and exposes no
 * grid mode, so the layout is applied through it rather than forking the
 * container — pagination, list semantics, and the accessible name all stay with
 * the primitive.
 */
const GRID_LAYOUT = [
  "[&>[role=list]]:grid [&>[role=list]]:grid-cols-1 [&>[role=list]]:gap-4",
  "[&>[role=list]]:divide-y-0 [&>[role=list]]:px-4 [&>[role=list]]:pt-1 sm:[&>[role=list]]:px-6",
  // Capped at three. Most accounts hold one to three projects, and a
  // four-column grid rendered them as small tiles marooned in two-thirds of an
  // empty page. Wider tiles read as deliberate at the counts that actually occur.
  "sm:[&>[role=list]]:auto-rows-fr sm:[&>[role=list]]:grid-cols-2",
  "lg:[&>[role=list]]:grid-cols-3",
].join(" ");

export function ProjectsClient() {
  const [page, setPage] = React.useState(1);
  // Filter, search, and view are component state rather than URL params. The
  // projects list API takes pagination only, so these narrow what is already
  // loaded; keeping them out of the URL is the documented exception to the
  // filters-round-trip rule for this one surface.
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<ProjectFilter>("all");
  const [view, setView] = useViewMode("projects:view", "grid");

  const listQuery = useProjectsList(
    { page, pageSize: PAGE_SIZE },
    { freshOnMount: true },
  );

  const projects = React.useMemo<V2ProjectDTO[]>(
    () => listQuery.data?.items ?? [],
    [listQuery.data],
  );
  const hasFilter = search.trim().length > 0 || typeFilter !== "all";
  const visible = React.useMemo(
    () => filterProjects(projects, search, typeFilter),
    [projects, search, typeFilter],
  );

  const state = useDataState(listQuery, {
    count: visible.length,
    filtered: hasFilter,
  });

  const total = listQuery.data?.total;
  const totalPages = listQuery.data?.totalPages ?? 1;
  const limit = useProjectLimit();
  const typeLabel =
    typeFilter === "all" ? null : projectTypeLabelFor(typeFilter);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
  };

  const showToolbar =
    hasFilter || (total !== undefined && total >= TOOLBAR_MIN_PROJECTS);

  const pagination = listQuery.data
    ? {
        page: listQuery.data.page,
        pageSize: listQuery.data.pageSize,
        total: listQuery.data.total,
        totalPages: listQuery.data.totalPages,
        onPageChange: setPage,
        busy: listQuery.isFetching,
      }
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Projects"
        // Header meta is a *fact*, so it is rendered only once there is one.
        // `total === undefined` covers both the cold load and a failed load, and
        // "Loading…" in the second case contradicts the error surface below it
        // — the header would claim the page was still working while the body
        // said it had given up.
        description={
          total === undefined ? undefined : (
            <>
              {fmtCount(total)} project{total === 1 ? "" : "s"}
              {limit.atLimit && (
                <>
                  <HeaderSep />
                  <Link
                    href={accountBillingPath()}
                    className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    Plan limit reached — upgrade
                  </Link>
                </>
              )}
            </>
          )
        }
        actions={
          <>
            <RefreshingDataBadge show={state.isRefreshing} />
            {/* On the first-run screen the empty state owns the single primary
                action, so the header does not compete with it. */}
            {state.kind !== "empty-first-run" && (
              <NewProjectAction limit={limit} />
            )}
          </>
        }
        toolbar={
          showToolbar ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <FilterPills
                aria-label="Filter projects by type"
                options={typeOptions(projects)}
                value={typeFilter}
                onChange={setTypeFilter}
                size="sm"
              />
              <div className="flex items-center gap-3">
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search projects…"
                  ariaLabel="Search projects"
                  width="fixed"
                />
                <ViewToggle value={view} onChange={setView} />
              </div>
            </div>
          ) : undefined
        }
      />

      <PageBody padding="bare" className="min-h-0 overflow-y-auto">
        <div className="px-4 pt-6 sm:px-6">
          <IncomingTransfers />
        </div>

        {hasFilter && totalPages > 1 && (
          <p className="px-4 pt-4 text-xs text-muted-foreground sm:px-6">
            Filters narrow the {projects.length} projects on this page. Move
            through the pages to search the rest.
          </p>
        )}

        {/* The region's accessible name comes from `DataList` when there are
            rows, and from the empty/error surface's own heading otherwise;
            `DataState` puts `aria-busy` on its wrapper. */}
        <div className="pb-16 pt-4">
          <DataState
            state={state}
            resource="your projects"
            skeleton={
              view === "grid" ? (
                <div className="px-4 sm:px-6">
                  <ProjectGridSkeleton tiles={6} />
                </div>
              ) : (
                <ListSkeleton rows={5} leading="square" trailing />
              )
            }
            empty={<EmptyProjects />}
            filteredEmpty={
              <NoProjectsMatch
                query={search.trim()}
                typeLabel={typeLabel}
                onClear={clearFilters}
              />
            }
          >
            <DataList
              aria-label="Projects"
              pagination={pagination}
              className={view === "grid" ? GRID_LAYOUT : undefined}
            >
              {visible.map((project) =>
                view === "grid" ? (
                  <ProjectCard key={project.id} project={project} />
                ) : (
                  <ProjectRow key={project.id} project={project} />
                ),
              )}
            </DataList>
          </DataState>
        </div>
      </PageBody>
    </div>
  );
}

/**
 * The one create affordance on this page. When the plan is exhausted it is
 * rendered inactive with the reason on a wrapper that still receives hover — a
 * disabled button takes no pointer events, so a `title` on the control itself
 * would be unreachable — plus an `sr-only` twin for assistive technology.
 */
function NewProjectAction({
  limit,
}: {
  limit: ReturnType<typeof useProjectLimit>;
}) {
  if (!limit.atLimit) {
    return (
      <Button size="sm" className="gap-1.5" asChild>
        <Link href={newProjectPath()}>
          <PlusIcon className="size-3.5" weight="bold" aria-hidden />
          New project
        </Link>
      </Button>
    );
  }

  return (
    <span
      className="inline-flex items-center"
      title={limit.reason ?? undefined}
    >
      <Button size="sm" className="gap-1.5" disabled>
        <PlusIcon className="size-3.5" weight="bold" aria-hidden />
        New project
      </Button>
      <span className="sr-only">{limit.reason}</span>
    </span>
  );
}

/**
 * Type pills are built from the page's own projects, so a type with no projects
 * on this page is never offered as a filter that leads to an empty screen.
 */
function typeOptions(projects: V2ProjectDTO[]) {
  const counts = new Map<string, number>();
  for (const project of projects) {
    if (!project.projectType) continue;
    counts.set(project.projectType, (counts.get(project.projectType) ?? 0) + 1);
  }
  return [
    { id: "all", label: "All", count: projects.length },
    ...[...counts.entries()].map(([type, count]) => ({
      id: type,
      label: projectTypeLabelFor(type),
      count,
    })),
  ];
}

/** Matches name, description, and tags — the same three fields the copy names. */
function filterProjects(
  projects: V2ProjectDTO[],
  search: string,
  typeFilter: ProjectFilter,
) {
  const needle = search.trim().toLowerCase();
  return projects.filter((project) => {
    if (typeFilter !== "all" && project.projectType !== typeFilter)
      return false;
    if (!needle) return true;
    return (
      project.name.toLowerCase().includes(needle) ||
      (project.shortDescription?.toLowerCase().includes(needle) ?? false) ||
      project.tags.some((tag) => tag.toLowerCase().includes(needle))
    );
  });
}
