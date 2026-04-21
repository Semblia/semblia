"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getProjectBySlug } from "@/lib/mock-data";

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
    case "api-keys":
      return "API Keys";
    case "settings":
      return "Settings";
    default:
      return first.charAt(0).toUpperCase() + first.slice(1);
  }
}

// ── Main topbar ────────────────────────────────────────────────────────────────

export function AppTopbar() {
  const pathname = usePathname();

  // Detect project context from URL: /projects/[slug]/...
  const slugMatch = pathname.match(/^\/projects\/([^/]+)/);
  const currentSlug = slugMatch?.[1] ?? null;
  const currentProject = currentSlug ? getProjectBySlug(currentSlug) : null;
  const section = currentProject
    ? sectionLabelFor(pathname, currentSlug!)
    : null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-5">
      {/* ── Left cluster ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {currentProject && <MobileNavTrigger slug={currentSlug!} />}

        <TrestaMark />

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
      <div className="flex shrink-0 items-center gap-0.5">
        <HelpDropdown />
        <NotificationBell />
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
