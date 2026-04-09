"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGridIcon,
  MessageSquareTextIcon,
  RadioIcon,
  PuzzleIcon,
  KeyRoundIcon,
  SlidersHorizontalIcon,
  BellIcon,
  ChevronDownIcon,
  PlusIcon,
  CheckIcon,
  UserCircleIcon,
  CreditCardIcon,
  LogOutIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import {
  MOCK_USER,
  MOCK_PROJECTS,
  getProjectBySlug,
  getUnreadNotificationCount,
  type MockProject,
} from "@/lib/mock-data";

// ── Project Avatar ─────────────────────────────────────────────────────────────

function ProjectAvatar({
  project,
  size = "sm",
}: {
  project: MockProject;
  size?: "sm" | "md";
}) {
  const initials = project.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = size === "sm" ? "size-5 text-[10px]" : "size-7 text-xs";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded font-semibold text-white",
        sizeClass
      )}
      style={{
        backgroundColor: project.brandColorPrimary ?? "var(--brand)",
      }}
    >
      {initials}
    </span>
  );
}

// ── User Initials ──────────────────────────────────────────────────────────────

function UserInitials() {
  const initials = [MOCK_USER.firstName?.[0], MOCK_USER.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials || MOCK_USER.email[0].toUpperCase();
}

// ── Project Nav Items ──────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
  exact?: boolean;
}

function projectNavItems(slug: string, project: MockProject): NavItem[] {
  return [
    {
      label: "Overview",
      href: `/projects/${slug}`,
      icon: LayoutGridIcon,
      exact: true,
    },
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

// ── Project Switcher ───────────────────────────────────────────────────────────

function ProjectSwitcher({ currentProject }: { currentProject: MockProject }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-sidebar-foreground ring-sidebar-ring outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2">
          <ProjectAvatar project={currentProject} size="sm" />
          <span className="min-w-0 flex-1 truncate">{currentProject.name}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-sidebar-foreground/50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Your projects
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MOCK_PROJECTS.map((p) => (
          <DropdownMenuItem
            key={p.id}
            className="gap-2"
            onSelect={() => router.push(`/projects/${p.slug}`)}
          >
            <ProjectAvatar project={p} size="sm" />
            <span className="flex-1 truncate">{p.name}</span>
            {p.id === currentProject.id && (
              <CheckIcon className="size-3.5 text-brand" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" onSelect={() => router.push("/projects")}>
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
            <PlusIcon className="size-3" />
          </span>
          <span>New project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── User Menu ─────────────────────────────────────────────────────────────────

function UserMenu() {
  const unreadCount = getUnreadNotificationCount();
  const displayName =
    [MOCK_USER.firstName, MOCK_USER.lastName].filter(Boolean).join(" ") ||
    MOCK_USER.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ring-sidebar-ring outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2">
          <Avatar className="size-6 shrink-0">
            <AvatarImage src={MOCK_USER.avatar ?? undefined} />
            <AvatarFallback className="bg-brand/15 text-[10px] font-semibold text-brand">
              <UserInitials />
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {displayName}
          </span>
          {unreadCount > 0 && (
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-brand-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52" sideOffset={4}>
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{MOCK_USER.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="gap-2">
            <UserCircleIcon className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing" className="gap-2">
            <CreditCardIcon className="size-4" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="gap-2">
            <BellIcon className="size-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {unreadCount}
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
          <LogOutIcon className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Logo ───────────────────────────────────────────────────────────────────────

function TrestaLogo() {
  return (
    <Link
      href="/projects"
      className="flex items-center gap-2 rounded-md px-2 py-1 ring-sidebar-ring outline-none focus-visible:ring-2"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[5px] bg-foreground">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
        >
          <path
            d="M7 1L13 4V10L7 13L1 10V4L7 1Z"
            fill="var(--background)"
            stroke="var(--background)"
            strokeWidth="0.5"
          />
        </svg>
      </span>
      <span className="text-sm font-semibold tracking-tight text-foreground">
        Tresta
      </span>
    </Link>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname();

  // Detect project context from URL: /projects/[slug]/...
  const projectSlugMatch = pathname.match(/^\/projects\/([^/]+)/);
  const currentSlug = projectSlugMatch?.[1] ?? null;
  const currentProject = currentSlug ? getProjectBySlug(currentSlug) : null;

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      {/* ── Header ── */}
      <SidebarHeader className="px-3 py-3">
        <TrestaLogo />
      </SidebarHeader>

      <SidebarContent>
        {currentProject ? (
          /* ── Project context ── */
          <>
            {/* Project switcher */}
            <SidebarGroup className="px-3 py-2">
              <ProjectSwitcher currentProject={currentProject} />
            </SidebarGroup>

            <SidebarSeparator />

            {/* Project nav */}
            <SidebarGroup>
              <SidebarMenu>
                {projectNavItems(currentSlug!, currentProject).map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item)}>
                      <Link href={item.href} className="gap-2">
                        <item.icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge != null && item.badge > 0 && (
                      <SidebarMenuBadge className="bg-brand/15 font-semibold text-brand">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </>
        ) : (
          /* ── Global context (projects list) ── */
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/projects" || pathname.startsWith("/projects")}>
                  <Link href="/projects" className="gap-2">
                    <LayoutGridIcon className="size-4 shrink-0" />
                    <span>Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <UserMenu />
          </div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
