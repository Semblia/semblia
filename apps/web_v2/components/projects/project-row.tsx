"use client";

/**
 * ProjectRow — one project in the list view.
 *
 * Row anatomy, identical for every project:
 *   [avatar] name                    N responses · N widgets   [badge]  time
 *            Type · description
 *
 * Three fixes carried here:
 *
 *  1. **No `aria-label` on the link.** It used to pass the project name to
 *     `ItemShell`, which puts it on the `<Link>` — and an `aria-label` on a link
 *     overrides its whole subtree as the accessible name. A screen-reader user
 *     heard "Acme, link" and never received the pending count, the response
 *     count, or the type. The name is already the first thing in the row.
 *  2. **One badge.** The project type was a second `Badge` beside the status
 *     chip; it is metadata, not status, so it moved into the subtitle line.
 *  3. **No entrance stagger.** The per-item animation delay re-fired across the
 *     whole list on every filter change, animating the canvas in each time a
 *     pill was clicked.
 */

import type { V2ProjectDTO } from "@workspace/types";
import { ItemRow } from "@/components/shared";
import { timeAgo, fmtDateTime } from "@/lib/format";
import { projectPath } from "@/lib/routes";
import { ProjectAvatar } from "./project-avatar";
import {
  ProjectFacts,
  ProjectStatusBadge,
  projectTypeLabel,
} from "./project-facts";

export function ProjectRow({ project }: { project: V2ProjectDTO }) {
  const typeLabel = projectTypeLabel(project);
  const description = project.shortDescription?.trim() || null;

  return (
    <ItemRow
      href={projectPath(project.slug)}
      // Matches ListSkeleton's default density exactly, so the cold-load swap
      // causes no shift.
      padding="default"
      className="px-4 sm:px-6"
      leading={
        <ProjectAvatar
          name={project.name}
          logoUrl={project.logo?.url}
          websiteUrl={project.websiteUrl}
          brandColor={project.brandColorPrimary}
          className="size-9"
        />
      }
      title={
        <span className="truncate text-sm font-medium text-foreground">
          {project.name}
        </span>
      }
      subtitle={
        typeLabel || description ? (
          <p
            className="truncate text-xs text-muted-foreground"
            // Truncation with no way to read the full value is a dead end.
            title={description ?? undefined}
          >
            {typeLabel}
            {typeLabel && description && (
              <span aria-hidden className="mx-1.5 text-border">
                ·
              </span>
            )}
            {description}
          </p>
        ) : undefined
      }
      metrics={<ProjectFacts project={project} />}
      trailing={
        <div className="flex items-center gap-2">
          <ProjectStatusBadge project={project} />
          <span
            className="hidden text-xs tabular-nums text-muted-foreground sm:block"
            title={fmtDateTime(project.updatedAt)}
          >
            {timeAgo(project.updatedAt)}
          </span>
        </div>
      }
    />
  );
}
