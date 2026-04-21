"use client";

import Link from "next/link";
import { Plus as PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/use-projects";

import { ProjectRowSkeleton, ProjectCardSkeleton } from "./project-skeletons";
import { ProjectRow } from "./project-row";
import { ProjectCard } from "./project-card";
import { EmptySearch, EmptyProjects } from "./project-empty-states";
import { ProjectsToolbar } from "./projects-toolbar";

// ── Main client component ─────────────────────────────────────────────────────

export function ProjectsClient() {
  const {
    projects,
    filtered,
    loading,
    view,
    setView,
    search,
    setSearch,
    totalTestimonials,
    totalPending,
  } = useProjects();

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Page title ── */}
      <div className="flex items-start gap-4 px-6 pt-7 pb-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading
              ? "Loading…"
              : projects.length === 0
                ? "Get started by creating your first project."
                : `${projects.length} project${projects.length !== 1 ? "s" : ""} · ${totalTestimonials} testimonial${totalTestimonials !== 1 ? "s" : ""}${totalPending > 0 ? ` · ${totalPending} pending` : ""}`}
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" asChild>
          <Link href="/projects/new">
            <PlusIcon className="size-3.5" />
            New project
          </Link>
        </Button>
      </div>

      <ProjectsToolbar
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
      />

      {/* ── Content ── */}
      <main className="flex-1">
        {loading ? (
          view === "list" ? (
            <div className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <ProjectRowSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          )
        ) : filtered.length === 0 && search ? (
          <EmptySearch query={search} onClear={() => setSearch("")} />
        ) : projects.length === 0 ? (
          <EmptyProjects />
        ) : view === "list" ? (
          <div className="divide-y divide-border">
            {filtered.map((project, i) => (
              <ProjectRow key={project.id} project={project} index={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
