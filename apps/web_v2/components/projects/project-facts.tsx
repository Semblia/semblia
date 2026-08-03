"use client";

/**
 * The facts a project reports — declared once, rendered by both views.
 *
 * The row and the card each used to pick their own: the card always showed a
 * response count, the row showed pending XOR responses. A project with 4
 * pending and 200 responses lost the 200 the moment you switched to list view,
 * so toggling the view changed the *information*, not the layout — and because
 * each row chose its own facts, the list had three different anatomies and
 * nothing to scan down.
 *
 * Rules applied here rather than at each call site:
 *   • a real `0` renders `0`. "No responses yet" and "we couldn't fetch it" are
 *     different facts and must not look the same
 *   • counts carry their unit as text, not as an icon a sighted reader has to
 *     decode from context
 *   • one badge per item. Status is the badge; the project *type* is metadata,
 *     not a second pill competing on the same axis
 */

import type { V2ProjectDTO } from "@workspace/types";
import { StatusBadge, type StatusMeta } from "@/components/shared";
import { fmtCount, humanizeLabel, PROJECT_TYPE_LABELS } from "@/lib/format";

/**
 * The one badge a project row or tile may carry, in priority order: a paused
 * project is the fact that outranks everything, then work waiting for a human.
 * A healthy project with nothing pending carries no badge — a badge that is
 * always present says nothing.
 */
export function projectStatusMeta(project: V2ProjectDTO): StatusMeta | null {
  if (!project.isActive) return { label: "Paused", tone: "muted" };
  const pending = project._count.pendingModeration;
  if (pending > 0) {
    return { label: `${fmtCount(pending)} pending review`, tone: "attention" };
  }
  return null;
}

export function ProjectStatusBadge({ project }: { project: V2ProjectDTO }) {
  const meta = projectStatusMeta(project);
  if (!meta) return null;
  return <StatusBadge {...meta} />;
}

/**
 * Human label for a project type. The map is a display convenience, not the
 * contract: the API can grow `V2ProjectType` before this app learns the pretty
 * name, so an unmapped value is humanized (`SAAS_APP` → `Saas App`) rather than
 * shown raw or dropped. Raw enum values never reach a user's eyes, and a type
 * the app doesn't recognise is still a type the project has.
 */
export function projectTypeLabelFor(type: string): string {
  return PROJECT_TYPE_LABELS[type] ?? humanizeLabel(type);
}

/**
 * Human label for a project's type, or `null` when there is nothing worth
 * saying.
 *
 * `OTHER` is the create form's default, so most projects carry it — and
 * "Other" printed under every project name is a label that distinguishes
 * nothing. An unset type and a type the user never chose read the same to a
 * reader, so they render the same: not at all.
 */
export function projectTypeLabel(project: V2ProjectDTO): string | null {
  if (!project.projectType || project.projectType === "OTHER") return null;
  return projectTypeLabelFor(project.projectType);
}

/**
 * The counted facts, identical in both views. Both are always rendered, so the
 * column reads straight down; a widget-rich project with no responses no longer
 * reads as an empty one.
 */
export function ProjectFacts({ project }: { project: V2ProjectDTO }) {
  const { responses, widgets } = project._count;
  return (
    <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
      <span>
        {fmtCount(responses)} {responses === 1 ? "response" : "responses"}
      </span>
      <span aria-hidden className="text-border">
        ·
      </span>
      <span>
        {fmtCount(widgets)} {widgets === 1 ? "widget" : "widgets"}
      </span>
    </span>
  );
}
