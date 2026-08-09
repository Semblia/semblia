"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CaretDown as ChevronDownIcon,
  Check as CheckIcon,
  Plus as PlusIcon,
  Circle as CircleIcon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { useProjectsList } from "@/hooks/api";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { homePath, newProjectPath, projectPath } from "@/lib/routes";
import { RefreshingDataBadge } from "@/components/shared";
import type { V2ProjectDTO } from "@workspace/types";

// ── Project switcher (sidebar context row) ─────────────────────────────────────

export function ProjectSwitcher({ current }: { current: V2ProjectDTO }) {
  const router = useRouter();
  const projectsQuery = useProjectsList(
    { pageSize: 100 },
    { freshOnMount: true },
  );
  const liveState = useLiveQueryState(projectsQuery);
  const projects = React.useMemo(() => {
    const items = projectsQuery.data?.items ?? [];
    if (items.some((project) => project.id === current.id)) return items;
    return [current, ...items];
  }, [current, projectsQuery.data?.items]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Project: ${current.name} — switch project`}
          className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ProjectAvatar
            name={current.name}
            logoUrl={current.logo?.url}
            websiteUrl={current.websiteUrl}
            brandColor={current.brandColorPrimary}
            className="size-5 shrink-0"
            rounded="rounded-[4px]"
            textClassName="text-[9px] font-bold"
          />
          <span className="min-w-0 flex-1 truncate">{current.name}</span>
          <ChevronDownIcon
            className="size-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-60">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Switch project</span>
          <RefreshingDataBadge
            show={liveState.isBackgroundRefreshing}
            className="h-5 px-2 normal-case tracking-normal"
          />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((p) => {
          const isCurrent = p.id === current.id;
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => router.push(projectPath(p.slug))}
              className="gap-2 py-1.5"
            >
              <ProjectAvatar
                name={p.name}
                logoUrl={p.logo?.url}
                websiteUrl={p.websiteUrl}
                brandColor={p.brandColorPrimary}
                className="size-5"
                rounded="rounded-[5px]"
                textClassName="text-[9px] font-bold"
              />
              <span className="flex-1 truncate text-xs">{p.name}</span>
              {p._count.pendingModeration > 0 && (
                <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold text-warning tabular-nums">
                  {p._count.pendingModeration}
                </span>
              )}
              {isCurrent && (
                <CheckIcon className="size-3.5 shrink-0 text-brand" />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 py-1.5"
          onSelect={() => router.push(newProjectPath())}
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-dashed border-border text-muted-foreground">
            <PlusIcon className="size-3" />
          </span>
          <span className="flex-1 text-xs">New project</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 py-1.5"
          onSelect={() => router.push(homePath())}
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-muted text-muted-foreground">
            <CircleIcon className="size-2.5" />
          </span>
          <span className="flex-1 text-xs text-muted-foreground">
            See all projects
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
