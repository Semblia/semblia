"use client";

import * as React from "react";
import type { V2ProjectDTO, V2ProjectType } from "@workspace/types";
import { useProjectsList } from "@/hooks/api";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { useViewMode } from "@/hooks/use-view-mode";

export type ProjectFilter = "all" | V2ProjectType;

/** Fetches projects and exposes loading / search / view state. */
export function useProjects() {
  const projectsQuery = useProjectsList(
    { pageSize: 100 },
    { freshOnMount: true },
  );
  const liveState = useLiveQueryState(projectsQuery);
  const projects = React.useMemo<V2ProjectDTO[]>(
    () => projectsQuery.data?.items ?? [],
    [projectsQuery.data?.items],
  );
  const [view, setView] = useViewMode("projects:view", "list");
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<ProjectFilter>("all");

  const filtered = React.useMemo(() => {
    let result = projects;
    if (typeFilter !== "all") {
      result = result.filter((p) => p.projectType === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [projects, search, typeFilter]);

  const typeCounts = React.useMemo(() => {
    const counts = new Map<ProjectFilter, number>();
    counts.set("all", projects.length);
    for (const p of projects) {
      if (p.projectType) {
        counts.set(p.projectType, (counts.get(p.projectType) ?? 0) + 1);
      }
    }
    return counts;
  }, [projects]);

  const totalResponses = projects.reduce((s, p) => s + p._count.responses, 0);
  const totalPending = projects.reduce(
    (s, p) => s + p._count.pendingModeration,
    0,
  );

  return {
    projects,
    filtered,
    loading: projectsQuery.isLoading && !liveState.hasData,
    refreshing: liveState.isBackgroundRefreshing,
    error: projectsQuery.error,
    view,
    setView,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    typeCounts,
    totalResponses,
    totalPending,
  };
}
