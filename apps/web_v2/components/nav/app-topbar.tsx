"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  ChevronDownIcon,
  CheckIcon,
  PlusIcon,
  BellIcon,
  UserCircleIcon,
  CreditCardIcon,
  LogOutIcon,
  MenuIcon,
  CircleIcon,
  MessageSquareTextIcon,
  ShieldAlertIcon,
  CircleCheckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ProjectSidebarNav } from "@/components/nav/project-sidebar";
import { cn } from "@/lib/utils";

import {
  MOCK_PROJECTS,
  MOCK_NOTIFICATIONS,
  getProjectBySlug,
  getUnreadNotificationCount,
  timeAgo,
  type MockProject,
  type NotificationType,
} from "@/lib/mock-data";

// ── Helpers ────────────────────────────────────────────────────────────────────

function projectInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function userDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string,
) {
  return [firstName, lastName].filter(Boolean).join(" ") || email;
}

function userInitials(
  firstName: string | null,
  lastName: string | null,
  email: string,
) {
  const initials = [firstName?.[0], lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials || (email[0] ?? "?").toUpperCase();
}

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
    case "api-keys":
      return "API keys";
    case "settings":
      return "Settings";
    default:
      return first.charAt(0).toUpperCase() + first.slice(1);
  }
}

// ── Tresta mark ────────────────────────────────────────────────────────────────

function TrestaMark() {
  return (
    <Link
      href="/projects"
      aria-label="Tresta — back to projects"
      className="group inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="relative flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-foreground text-background">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M7 1L13 4V10L7 13L1 10V4L7 1Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      </span>
      <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
        Tresta
      </span>
    </Link>
  );
}

// ── Project switcher (topbar pill) ─────────────────────────────────────────────

function ProjectSwitcher({ current }: { current: MockProject }) {
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
                <span className="rounded-full bg-warning/12 px-1.5 py-0.5 text-[9px] font-semibold text-warning tabular-nums">
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

// ── Breadcrumb separator (slash) ───────────────────────────────────────────────

function BreadcrumbSlash() {
  return (
    <svg
      className="size-3.5 shrink-0 text-border"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M16.88 3.549L7.12 20.451"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Notification bell ──────────────────────────────────────────────────────────

const notifIcon: Record<
  NotificationType,
  { Icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  NEW_TESTIMONIAL: { Icon: MessageSquareTextIcon, tone: "text-brand bg-brand/12" },
  TESTIMONIAL_FLAGGED: { Icon: ShieldAlertIcon, tone: "text-warning bg-warning/12" },
  TESTIMONIAL_APPROVED: { Icon: CircleCheckIcon, tone: "text-success bg-success/12" },
  TESTIMONIAL_REJECTED: { Icon: ShieldAlertIcon, tone: "text-destructive bg-destructive/10" },
  SECURITY_ALERT: { Icon: ShieldAlertIcon, tone: "text-destructive bg-destructive/10" },
};

function NotificationBell() {
  const unread = getUnreadNotificationCount();
  const recent = [...MOCK_NOTIFICATIONS]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        >
          <BellIcon className="size-4" />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 size-1.5 rounded-full bg-brand ring-2 ring-background"
              aria-hidden
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs font-semibold">Notifications</span>
          {unread > 0 && (
            <span className="rounded-full bg-brand/12 px-1.5 py-0.5 text-[9px] font-semibold text-brand tabular-nums">
              {unread} new
            </span>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {recent.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <ul className="max-h-[360px] divide-y divide-border/60 overflow-y-auto">
            {recent.map((n) => {
              const cfg = notifIcon[n.type];
              return (
                <li key={n.id}>
                  <Link
                    href={n.link ?? "#"}
                    className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                        cfg.tone
                      )}
                    >
                      <cfg.Icon className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-medium">
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-brand"
                            aria-hidden
                          />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground/70">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <DropdownMenuItem asChild className="justify-center text-xs">
            <Link href="/notifications">View all notifications</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── User menu (avatar dropdown) ────────────────────────────────────────────────

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const firstName = user?.firstName ?? null;
  const lastName = user?.lastName ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const avatar = user?.imageUrl ?? undefined;
  const name = userDisplayName(firstName, lastName, email);
  const initials = userInitials(firstName, lastName, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring/60"
          aria-label={`Account menu — ${name}`}
        >
          <Avatar className="size-7">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-brand/15 text-[10px] font-semibold text-brand">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="size-8">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-brand/15 text-[11px] font-semibold text-brand">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="gap-2 text-xs">
            <UserCircleIcon className="size-3.5 text-muted-foreground" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing" className="gap-2 text-xs">
            <CreditCardIcon className="size-3.5 text-muted-foreground" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-xs text-destructive focus:text-destructive"
          onSelect={() => signOut(() => router.push("/sign-in"))}
        >
          <LogOutIcon className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Mobile drawer trigger (project context only) ──────────────────────────────

function MobileNavTrigger({ slug }: { slug: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Auto-close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden text-muted-foreground hover:text-foreground"
        aria-label="Open project navigation"
        onClick={() => setOpen(true)}
      >
        <MenuIcon className="size-4" />
      </Button>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Project navigation</SheetTitle>
        <div className="flex h-full flex-col pt-4">
          <ProjectSidebarNav slug={slug} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
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
        <NotificationBell />
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
