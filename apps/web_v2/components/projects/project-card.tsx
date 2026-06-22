import * as React from "react";
import Link from "next/link";
import { Plus as PlusIcon } from "@phosphor-icons/react";
import type { V2ProjectDTO } from "@workspace/types";
import { Badge } from "@/components/ui/badge";
import { ItemCard } from "@/components/shared";
import { fmtRelative } from "@/lib/format";
import { PROJECT_TYPE_LABELS } from "@/lib/format";
import { ProjectAvatar } from "./project-avatar";

// Entrance stagger is capped so late cells in large grids never wait on a
// long linear delay before appearing.
export function projectStaggerDelay(index: number, step: number) {
  return `${Math.min(index, 6) * step}ms`;
}

// ── Project card (grid view) ───────────────────────────────────────────────────

export function ProjectCard({
  project,
  index,
}: {
  project: V2ProjectDTO;
  index: number;
}) {
  const typeLabel = project.projectType
    ? PROJECT_TYPE_LABELS[project.projectType]
    : null;
  const pending = project._count.pendingModeration;
  const responses = project._count.responses;

  return (
    <ItemCard
      href={`/projects/${project.slug}`}
      aria-label={project.name}
      className="group animate-fade-up"
      style={{
        animationDelay: projectStaggerDelay(index, 60),
        animationFillMode: "both",
      }}
      footer={
        <div className="flex items-center gap-3 border-t border-border/70 px-5 py-3">
          <span className="truncate text-xs text-muted-foreground">
            {responses > 0
              ? `${responses} response${responses === 1 ? "" : "s"}`
              : "No responses yet"}
          </span>
          <span
            className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/80"
            title={new Date(project.updatedAt).toLocaleDateString()}
          >
            {fmtRelative(new Date(project.updatedAt))}
          </span>
        </div>
      }
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <ProjectAvatar
            name={project.name}
            logoUrl={project.logo?.url}
            websiteUrl={project.websiteUrl}
            brandColor={project.brandColorPrimary}
            className="size-10 transition-shadow duration-200 group-hover:shadow-[0_2px_8px_var(--tw-shadow-color)]"
          />

          {pending > 0 && (
            <span className="flex shrink-0 items-center rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
              {pending} pending
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </span>
            {typeLabel && (
              <Badge
                variant="secondary"
                className="shrink-0 px-1.5 py-0 text-[10px] font-medium"
              >
                {typeLabel}
              </Badge>
            )}
          </div>
          {project.shortDescription && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {project.shortDescription}
            </p>
          )}
        </div>
      </div>
    </ItemCard>
  );
}

// ── New-project ghost tile ─────────────────────────────────────────────────────
//
// Last cell of the grid when no search/filter is active. Keeps creation
// discoverable in the canvas itself and gives 1-2 item grids compositional
// balance. Same destination as the header CTA.

export function NewProjectTile({ index }: { index: number }) {
  return (
    <Link
      href="/projects/new"
      className="group/new animate-fade-up flex h-full flex-row items-center justify-center gap-2.5 rounded-xl border border-dashed border-border py-4 text-muted-foreground outline-none transition-[border-color,background-color,color] duration-150 ease-out hover:border-brand/45 hover:bg-brand/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 sm:min-h-[10.5rem] sm:flex-col sm:py-0"
      style={{
        animationDelay: projectStaggerDelay(index, 60),
        animationFillMode: "both",
      }}
    >
      <span className="flex size-7 items-center justify-center rounded-lg border border-dashed border-border transition-colors duration-150 group-hover/new:border-brand/45 group-hover/new:text-brand sm:size-9">
        <PlusIcon className="size-4" aria-hidden />
      </span>
      <span className="text-[13px] font-medium">New project</span>
    </Link>
  );
}
