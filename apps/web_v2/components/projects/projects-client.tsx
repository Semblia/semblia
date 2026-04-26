"use client";

import Link from "next/link";
import { Plus as PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageHeader, HeaderSep, PageBody } from "@/components/shared";
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

  const description = loading ? (
    "Loading…"
  ) : projects.length === 0 ? (
    "Get started by creating your first project."
  ) : (
    <>
      <span>
        {projects.length} project{projects.length !== 1 ? "s" : ""}
      </span>
      <HeaderSep />
      <span>
        {totalTestimonials} testimonial{totalTestimonials !== 1 ? "s" : ""}
      </span>
      {totalPending > 0 && (
        <>
          <HeaderSep />
          <span className="text-warning">{totalPending} pending</span>
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Projects"
        description={description}
        actions={
          <Button size="sm" className="gap-1.5 shrink-0" asChild>
            <Link href="/projects/new">
              <PlusIcon className="size-3.5" />
              New project
            </Link>
          </Button>
        }
        borderless
      />

      <ProjectsToolbar
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
      />

      {/* ── Content ── */}
      <PageBody padding="bare" className="flex-1 overflow-y-auto">
        {loading ? (
          view === "list" ? (
            <div className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <ProjectRowSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className="grid auto-rows-fr grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </PageBody>
    </div>
  );
}
