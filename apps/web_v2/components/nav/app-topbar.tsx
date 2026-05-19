"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/api";
import { useLiveQueryState } from "@/hooks/use-live-query-state";

import { TrestaMark } from "./tresta-mark";
import { BreadcrumbSlash } from "./breadcrumb-slash";
import { ProjectSwitcher } from "./project-switcher";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { MobileNavTrigger } from "./mobile-nav-trigger";
import { HelpDropdown } from "./help-dropdown";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Infers the current section label from the pathname inside a project. */
function sectionLabelFor(pathname: string, slug: string): string | null {
  const rest = pathname.replace(`/projects/${slug}`, "").replace(/^\/+/, "");
  if (!rest) return null;
  const [first] = rest.split("/");
  switch (first) {
    case "testimonials":
      return "Testimonials";
    case "collect":
      return "Collect";
    case "widgets":
      return "Widgets";
    case "analytics":
      return "Analytics";
    case "developers":
      return "Developers";
    case "settings":
      return "Settings";
    default:
      return first.charAt(0).toUpperCase() + first.slice(1);
  }
}

function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

// ── Main topbar ────────────────────────────────────────────────────────────────

export function AppTopbar() {
  const pathname = usePathname();

  // Detect project context from URL: /projects/[slug]/...
  const slugMatch = pathname.match(/^\/projects\/([^/]+)/);
  const currentSlug = slugMatch?.[1] ? decodeSlug(slugMatch[1]) : null;
  const projectQuery = useProject(currentSlug ?? "", { freshOnMount: true });
  const projectLiveState = useLiveQueryState(projectQuery, {
    requireFreshOnMount: true,
  });
  const currentProject =
    currentSlug && !projectLiveState.isWaitingForLiveData
      ? (projectQuery.data ?? null)
      : null;
  const section = currentProject
    ? sectionLabelFor(pathname, currentSlug!)
    : null;

  return (
    <header className="sticky top-0 z-30 flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-border/80 bg-background/85 px-5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 sm:px-6">
      {/* ── Left cluster ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {currentProject && (
          <MobileNavTrigger slug={currentSlug!} project={currentProject} />
        )}

        <TrestaMark />

        {currentSlug && projectLiveState.isWaitingForLiveData && (
          <>
            <BreadcrumbSlash />
            <TopbarProjectSkeleton />
          </>
        )}

        {currentProject && (
          <>
            <BreadcrumbSlash />
            <ProjectSwitcher current={currentProject} />
          </>
        )}

        {section && (
          <>
            <BreadcrumbSlash />
            <span className="truncate text-xs font-medium text-foreground">
              {section}
            </span>
          </>
        )}
      </div>

      {/* ── Right cluster ── */}
      <div className="flex shrink-0 items-center gap-1">
        <HelpDropdown />
        <NotificationBell />
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        <div
          className="mx-1.5 hidden h-4 w-px bg-border/60 sm:block"
          aria-hidden
        />
        <UserMenu />
      </div>
    </header>
  );
}

function TopbarProjectSkeleton() {
  return (
    <div className="flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-background pl-1 pr-3">
      <Skeleton className="size-5 rounded-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
