"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatText as MessageSquareTextIcon,
  Broadcast as RadioIcon,
  PuzzlePiece as PuzzleIcon,
  ChartBar as BarChart3Icon,
  Key as KeyRoundIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
} from "@phosphor-icons/react";

import { getProjectBySlug, type MockProject } from "@/lib/mock-data";
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

function buildNav(slug: string, project: MockProject): ProjectNavItem[] {
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
      label: "API Keys",
      href: `/projects/${slug}/api-keys`,
      icon: KeyRoundIcon,
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
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand"
          aria-hidden
        />
      )}
      <Icon
        className={cn(
          "size-3.5 shrink-0 transition-colors",
          active ? "text-foreground" : "text-muted-foreground/80"
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span
          className={cn(
            "inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums",
            "bg-warning/15 text-warning"
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
  onNavigate,
}: {
  slug: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const project = getProjectBySlug(slug);
  if (!project) return null;

  const nav = buildNav(slug, project);

  const isActive = (item: ProjectNavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Project identity header */}
      <div className="px-3 pt-5 pb-3">
        <div className="flex items-center gap-2 px-1.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
            style={{
              backgroundColor: project.brandColorPrimary ?? "var(--brand)",
            }}
          >
            {projectInitials(project.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {project.name}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {project.visibility === "PUBLIC"
                ? "Public project"
                : project.visibility === "PRIVATE"
                  ? "Private project"
                  : "Invite only"}
            </p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          Workspace
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2" aria-label="Project navigation">
        {nav.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={isActive(item)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer hint */}
      <div className="mt-auto border-t border-border/60 px-4 py-3">
        <p className="text-[10px] leading-snug text-muted-foreground">
          Scoped to{" "}
          <span className="font-semibold text-foreground">{project.name}</span>
          . Switch projects from the topbar.
        </p>
      </div>
    </div>
  );
}

// ── Desktop sidebar (used in project layout) ──────────────────────────────────

export function ProjectSidebar({ slug }: { slug: string }) {
  return (
    <aside
      style={{ top: "3.5rem", height: "calc(100svh - 3.5rem)" }}
      className={cn(
        "fixed left-0 z-20 hidden w-56 overflow-y-auto border-r border-border bg-background lg:flex lg:flex-col"
      )}
      aria-label="Project sidebar"
    >
      <ProjectSidebarNav slug={slug} />
    </aside>
  );
}
