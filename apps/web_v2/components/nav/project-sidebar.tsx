"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatTextIcon as MessageSquareTextIcon,
  BroadcastIcon as RadioIcon,
  PuzzlePieceIcon as PuzzleIcon,
  ChartBarIcon as BarChart3Icon,
  CodeIcon,
  SlidersHorizontalIcon as SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import type { V2ProjectDTO } from "@workspace/types";

import { cn } from "@/lib/utils";
import { projectInitials } from "@/lib/format";

// ── Nav model ──────────────────────────────────────────────────────────────────

interface ProjectNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
  exact?: boolean;
  description?: string;
}

function buildNav(slug: string, project: V2ProjectDTO): ProjectNavItem[] {
  return [
    {
      label: "Testimonials",
      href: `/projects/${slug}/testimonials`,
      icon: MessageSquareTextIcon,
      badge: project._count.pendingModeration || null,
    },
    {
      label: "Collect",
      href: `/projects/${slug}/collect`,
      icon: RadioIcon,
    },
    {
      label: "Widgets",
      href: `/projects/${slug}/widgets`,
      icon: PuzzleIcon,
    },
    {
      label: "Analytics",
      href: `/projects/${slug}/analytics`,
      icon: BarChart3Icon,
    },
    {
      label: "Developers",
      href: `/projects/${slug}/developers`,
      icon: CodeIcon,
    },
    {
      label: "Settings",
      href: `/projects/${slug}/settings`,
      icon: SlidersHorizontalIcon,
    },
  ];
}

// ── Single nav row ─────────────────────────────────────────────────────────────

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: ProjectNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium outline-none transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-brand" : "text-muted-foreground/70",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span
          className={cn(
            "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
            "bg-warning/15 text-warning",
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// ── Reusable nav (also used by mobile Sheet) ───────────────────────────────────

export function ProjectSidebarNav({
  slug,
  project,
  onNavigate,
}: {
  slug: string;
  project: V2ProjectDTO;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const nav = buildNav(slug, project);

  const isActive = (item: ProjectNavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Project identity header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
            style={{
              backgroundColor: project.brandColorPrimary ?? "var(--brand)",
            }}
          >
            {projectInitials(project.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {project.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {project.visibility === "PUBLIC"
                ? "Public"
                : project.visibility === "PRIVATE"
                  ? "Private"
                  : "Invite only"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Project navigation">
        {nav.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={isActive(item)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-border/50 px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground/50">
          {project.name}
        </p>
      </div>
    </div>
  );
}

// ── Desktop sidebar (used in project layout) ──────────────────────────────────

export function ProjectSidebar({
  slug,
  project,
}: {
  slug: string;
  project: V2ProjectDTO;
}) {
  return (
    <aside
      style={{ top: "3.25rem", height: "calc(100svh - 3.25rem)" }}
      className={cn(
        "fixed left-0 z-20 hidden w-56 overflow-y-auto border-r border-border bg-background lg:flex lg:flex-col",
      )}
      aria-label="Project sidebar"
    >
      <ProjectSidebarNav slug={slug} project={project} />
    </aside>
  );
}
