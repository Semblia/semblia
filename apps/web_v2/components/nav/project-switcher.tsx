"use client";

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
import { projectInitials } from "@/lib/format";
import { MOCK_PROJECTS, type MockProject } from "@/lib/mock-data";

// ── Project switcher (topbar pill) ─────────────────────────────────────────────

export function ProjectSwitcher({ current }: { current: MockProject }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-background pl-1 pr-2 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{
              backgroundColor: current.brandColorPrimary ?? "var(--brand)",
            }}
          >
            {projectInitials(current.name)}
          </span>
          <span className="max-w-[140px] truncate">{current.name}</span>
          <ChevronDownIcon
            className="size-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Switch project
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MOCK_PROJECTS.map((p) => {
          const isCurrent = p.id === current.id;
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => router.push(`/projects/${p.slug}`)}
              className="gap-2 py-1.5"
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-bold text-white"
                style={{
                  backgroundColor: p.brandColorPrimary ?? "var(--brand)",
                }}
              >
                {projectInitials(p.name)}
              </span>
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
          onSelect={() => router.push("/projects")}
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-dashed border-border text-muted-foreground">
            <PlusIcon className="size-3" />
          </span>
          <span className="flex-1 text-xs">New project</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 py-1.5"
          onSelect={() => router.push("/projects")}
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
