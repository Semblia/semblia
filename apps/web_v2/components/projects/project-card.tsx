import {
  ChatText as MessageSquareTextIcon,
  PuzzlePiece as PuzzleIcon,
  ArrowRight as ArrowRightIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { ItemShell } from "@/components/shared";
import { projectInitials } from "@/lib/format";
import {
  PROJECT_TYPE_LABELS,
  timeAgo,
  type MockProject,
} from "@/lib/mock-data";

// ── Project card (card view) ───────────────────────────────────────────────────

export function ProjectCard({
  project,
  index,
}: {
  project: MockProject;
  index: number;
}) {
  const initials = projectInitials(project.name);
  const typeLabel = project.projectType
    ? PROJECT_TYPE_LABELS[project.projectType]
    : null;
  const brandColor = project.brandColorPrimary ?? "#a8895c";

  return (
    <ItemShell
      shape="card"
      href={`/projects/${project.slug}`}
      aria-label={project.name}
      className="group animate-fade-up"
      style={{ animationDelay: `${index * 65}ms`, animationFillMode: "both" }}
    >
      {/* Brand-tinted gradient header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: `linear-gradient(160deg, ${brandColor}18 0%, transparent 70%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            {initials}
          </span>

          {project._count.pendingModeration > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
              {project._count.pendingModeration} pending
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {project.name}
            </span>
            {typeLabel && (
              <Badge
                variant="secondary"
                className="text-[10px] font-medium px-1.5 py-0"
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

      {/* Stats footer */}
      <div className="flex items-center gap-4 border-t border-border px-5 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquareTextIcon className="size-3.5 shrink-0" />
          {project._count.testimonials}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PuzzleIcon className="size-3.5 shrink-0" />
          {project._count.widgets}
        </span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {timeAgo(project.updatedAt)}
        </span>
        <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/70" />
      </div>
    </ItemShell>
  );
}
