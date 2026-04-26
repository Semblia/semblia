"use client";

import * as React from "react";
import { apiGetProjects } from "@/lib/api";
import type { MockProject } from "@/lib/mock-data";
import { useViewMode } from "@/hooks/use-view-mode";

/** Fetches projects and exposes loading / search / view state. */
export function useProjects() {
  const [projects, setProjects] = React.useState<MockProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = useViewMode("projects:view", "list");
  const [search, setSearch] = React.useState("");

  // Simulate API fetch
  React.useEffect(() => {
    setLoading(true);
    apiGetProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [projects, search]);

  const totalTestimonials = projects.reduce(
    (s, p) => s + p._count.testimonials,
    0,
  );
  const totalPending = projects.reduce(
    (s, p) => s + p._count.pendingModeration,
    0,
  );

  return {
    projects,
    filtered,
    loading,
    view,
    setView,
    search,
    setSearch,
    totalTestimonials,
    totalPending,
  };
}
