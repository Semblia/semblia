"use client";

/**
 * The two empty surfaces of the projects home.
 *
 * This file used to be the worst-composed in the slice: it re-implemented the
 * house empty state by hand, re-implemented `NoResults` prop-for-prop under a
 * different name, ran a second ghost-preview engine built from absolutely
 * positioned mock cards with raw `hsl()`/`oklch()` literals, hand-rolled both
 * buttons — so the product's most important CTA was the one filled button
 * without the `ink-raised` material — and wrapped the whole thing in the
 * `max-w-6xl` centred rail that was deleted from the page primitives, making
 * the first screen a new user ever sees the one screen in the app that is not
 * full-bleed.
 *
 * All of it is now `EmptyState` + `GhostList` + `NoResults` + `Button`.
 */

import Link from "next/link";
import { FolderPlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EmptyState, GhostList, NoResults } from "@/components/shared";
import { newProjectPath } from "@/lib/routes";

/**
 * First run: the user has genuinely never had a project. Teaches what a project
 * is for, and offers exactly one action.
 */
export function EmptyProjects() {
  return (
    <EmptyState
      icon={FolderPlusIcon}
      // Dot-paper is the canon texture for a surface where artifacts will sit.
      className="bg-dot-grid"
      title="No projects yet"
      description="A project is one product, service, or brand. It carries a hosted collection link, its own review queue, the widgets you embed, and the public pages your customers see."
      preview={<GhostList rows={3} leading="square" trailingPill />}
      action={
        <Button asChild size="sm">
          <Link href={newProjectPath()}>Create project</Link>
        </Button>
      }
    />
  );
}

/**
 * A filter or search matched nothing. Different fact, different surface: the
 * user has projects, so nothing here creates one — the recovery is to widen the
 * view. The copy names the real cause, because blaming the search while a type
 * filter is what emptied the list sends the user to a control that changes
 * nothing.
 */
export function NoProjectsMatch({
  query,
  typeLabel,
  onClear,
}: {
  query: string;
  /** Active project-type filter label, or null when the filter is "All". */
  typeLabel: string | null;
  onClear: () => void;
}) {
  const title = query
    ? `Nothing matches “${query}”`
    : typeLabel
      ? `No ${typeLabel.toLowerCase()} projects`
      : "No projects match";

  const description = query
    ? typeLabel
      ? `No ${typeLabel.toLowerCase()} project has that in its name, description, or tags.`
      : "Projects match on name, description, and tags."
    : "Nothing in this workspace is filed under that type.";

  return (
    <NoResults
      title={title}
      description={description}
      action={
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={onClear}
        >
          Show all projects
        </Button>
      }
    />
  );
}
