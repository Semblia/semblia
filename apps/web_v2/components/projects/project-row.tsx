import * as React from "react";
import { ChatText as MessageSquareTextIcon } from "@phosphor-icons/react";
import type { V2ProjectDTO } from "@workspace/types";
import { Badge } from "@/components/ui/badge";
import { ItemRow } from "@/components/shared";
import { fmtRelative, projectInitials } from "@/lib/format";
import { PROJECT_TYPE_LABELS } from "@/lib/format";

// ── Project row (list view) ────────────────────────────────────────────────────

export function ProjectRow({
  project,
  index,
}: {
  project: V2ProjectDTO;
  index: number;
}) {
  const initials = projectInitials(project.name);
  const typeLabel = project.projectType
    ? PROJECT_TYPE_LABELS[project.projectType]
    : null;
  const pending = project._count.pendingModeration;
  const responses = project._count.responses;

  return (
    <ItemRow
      href={`/projects/${project.slug}`}
      aria-label={project.name}
      padding="default"
      className="group animate-fade-up"
      style={{ animationDelay: `${index * 55}ms`, animationFillMode: "both" }}
      leading={
        <span
          className="flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white transition-shadow duration-200 group-hover:shadow-[0_2px_8px_var(--tw-shadow-color)]"
          style={
            {
              backgroundColor: project.brandColorPrimary ?? "var(--brand)",
              "--tw-shadow-color": project.brandColorPrimary ?? "var(--brand)",
            } as React.CSSProperties
          }
        >
          {initials}
        </span>
      }
      title={
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
      }
      subtitle={
        project.shortDescription ? (
          <p className="truncate text-xs text-muted-foreground">
            {project.shortDescription}
          </p>
        ) : undefined
      }
      metrics={
        pending > 0 ? (
          <span className="flex items-center gap-1 rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
            {pending} pending
          </span>
        ) : responses > 0 ? (
          <span
            className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"
            aria-label={`${responses} response${responses !== 1 ? "s" : ""}`}
          >
            <MessageSquareTextIcon className="size-3.5 shrink-0" aria-hidden />
            {responses}
          </span>
        ) : undefined
      }
      trailing={
        <span
          className="w-[72px] text-right text-xs tabular-nums text-muted-foreground"
          title={new Date(project.updatedAt).toLocaleDateString()}
        >
          {fmtRelative(new Date(project.updatedAt))}
        </span>
      }
    />
  );
}
