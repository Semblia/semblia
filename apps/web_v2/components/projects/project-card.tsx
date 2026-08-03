"use client";

/**
 * ProjectCard — one project in the grid view.
 *
 * A grid tile where the tile *is* the entity is one of the three sanctioned
 * bordered containers, so this composes `ItemCard` and adds no chrome of its
 * own. It reports exactly the facts `ProjectRow` reports, from the same
 * component, so switching views changes the layout and nothing else.
 *
 * The dashed "New project" ghost tile that used to live here is gone: it was a
 * third create affordance alongside the header CTA and the empty-state CTA, on
 * a page whose single primary action is creating a project.
 */

import type { V2ProjectDTO } from "@workspace/types";
import { ItemCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { timeAgo, fmtDateTime } from "@/lib/format";
import { projectPath } from "@/lib/routes";
import { ProjectAvatar } from "./project-avatar";
import {
  ProjectFacts,
  ProjectStatusBadge,
  projectStatusMeta,
  projectTypeLabel,
} from "./project-facts";

export function ProjectCard({
  project,
  className,
}: {
  project: V2ProjectDTO;
  className?: string;
}) {
  const typeLabel = projectTypeLabel(project);
  const description = project.shortDescription?.trim() || null;
  const hasMetaLine = projectStatusMeta(project) !== null || typeLabel !== null;

  return (
    <ItemCard
      href={projectPath(project.slug)}
      className={cn("group", className)}
      footer={
        <div className="flex items-center gap-3 border-t border-border/70 px-5 py-3">
          <ProjectFacts project={project} />
          <span
            className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
            title={fmtDateTime(project.updatedAt)}
          >
            {timeAgo(project.updatedAt)}
          </span>
        </div>
      }
    >
      {/* One left-anchored block: identity beside a stacked title + meta.
          Nothing is pinned to the right edge, so there is no void to cross. */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3.5">
          <ProjectAvatar
            name={project.name}
            logoUrl={project.logo?.url}
            websiteUrl={project.websiteUrl}
            brandColor={project.brandColorPrimary}
            className="size-10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </p>
            {hasMetaLine && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <ProjectStatusBadge project={project} />
                {typeLabel && (
                  <span className="text-xs text-muted-foreground">
                    {typeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {description && (
          <p
            className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
            title={description}
          >
            {description}
          </p>
        )}
      </div>
    </ItemCard>
  );
}
