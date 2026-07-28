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
import { timeAgo, fmtDateTime } from "@/lib/format";
import { projectPath } from "@/lib/routes";
import { ProjectAvatar } from "./project-avatar";
import {
  ProjectFacts,
  ProjectStatusBadge,
  projectTypeLabel,
} from "./project-facts";

export function ProjectCard({ project }: { project: V2ProjectDTO }) {
  const typeLabel = projectTypeLabel(project);
  const description = project.shortDescription?.trim() || null;

  return (
    <ItemCard
      href={projectPath(project.slug)}
      className="group"
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
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <ProjectAvatar
            name={project.name}
            logoUrl={project.logo?.url}
            websiteUrl={project.websiteUrl}
            brandColor={project.brandColorPrimary}
            className="size-10"
          />
          <ProjectStatusBadge project={project} />
        </div>

        <div className="mt-3 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {project.name}
          </p>
          {typeLabel && (
            <p className="mt-0.5 text-xs text-muted-foreground">{typeLabel}</p>
          )}
          {description && (
            <p
              className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
              title={description}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </ItemCard>
  );
}
