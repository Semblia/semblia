"use client";

/**
 * AppSidebar — the app's only navigation surface.
 *
 * Replaces the old stack of AppTopbar + AccountTopbar + ProjectSidebar +
 * AccountSidebar + SettingsShell rail + DeveloperShell rail. Everything a
 * signed-in user can reach is in this one rail, at most one click from
 * wherever they are: sections are always listed, and the active section
 * reveals its sub-destinations inline instead of handing off to a second rail.
 *
 * Three fixed zones, identical in every context:
 *   1. context  — Semblia mark, then the project switcher when in a project
 *   2. nav      — the model from `nav-model.ts`
 *   3. account  — notifications, help, theme, and the user menu
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowSquareOutIcon,
  CaretRightIcon,
  ListIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import type { V2ProjectDTO } from "@workspace/types";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useProject } from "@/hooks/api";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { projectSlugFromPathname } from "@/lib/routes";

import { SembliaMark } from "./semblia-mark";
import { ProjectSwitcher } from "./project-switcher";
import { NotificationBell } from "./notification-bell";
import { HelpDropdown } from "./help-dropdown";
import { UserMenu } from "./user-menu";
import {
  activeChildHref,
  activeLabel,
  buildProjectNav,
  buildWorkspaceNav,
  isHrefActive,
  type NavChild,
  type NavGroup,
  type NavItem,
} from "./nav-model";

export const SIDEBAR_WIDTH = "15rem";

// ── Current context ──────────────────────────────────────────────────────────

/**
 * Resolves the nav model from the URL. The project is fetched here rather than
 * threaded through layouts so that every shell renders the same component with
 * no props.
 */
function useNavContext() {
  const pathname = usePathname();
  const slug = projectSlugFromPathname(pathname);
  const projectQuery = useProject(slug ?? "", { freshOnMount: true });
  const liveState = useLiveQueryState(projectQuery, {
    requireFreshOnMount: true,
  });
  const project =
    slug && !liveState.isWaitingForLiveData
      ? (projectQuery.data ?? null)
      : null;

  const groups = React.useMemo(
    () => (slug ? buildProjectNav(slug) : buildWorkspaceNav()),
    [slug],
  );

  return {
    pathname,
    groups,
    project,
    /** In a project URL, but the project record has not arrived yet. */
    pendingProject: Boolean(slug) && !project,
  };
}

// ── Rows ─────────────────────────────────────────────────────────────────────

const rowBase =
  "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50";

function rowClass(current: boolean, selected: boolean) {
  return cn(
    rowBase,
    selected && "bg-muted",
    current
      ? "font-medium text-foreground"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );
}

function RowIcon({
  icon: Icon,
  current,
}: {
  icon: PhosphorIcon;
  current: boolean;
}) {
  return (
    <Icon
      weight={current ? "fill" : "regular"}
      className={cn(
        "size-4 shrink-0",
        current ? "text-foreground" : "text-muted-foreground",
      )}
    />
  );
}

/** A section that is a destination in its own right. */
function SectionLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const content = (
    <>
      <RowIcon icon={item.icon} current={active} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.external && (
        <ArrowSquareOutIcon
          className="size-3.5 text-muted-foreground"
          aria-hidden
        />
      )}
    </>
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer noopener"
        className={rowClass(false, false)}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={rowClass(active, active)}
    >
      {content}
    </Link>
  );
}

/**
 * A section that only groups other pages. Its route is a prefix, not a
 * destination — `/[project]/developers` just redirects to its first child, and
 * `/[project]/settings` *is* the General child — so the row expands in place
 * rather than navigating somewhere the label did not promise.
 */
function SectionToggle({
  item,
  current,
  expanded,
  panelId,
  onToggle,
}: {
  item: NavItem;
  /** The current page is inside this section. */
  current: boolean;
  expanded: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={panelId}
      className={cn(rowClass(current, false), "w-full text-left")}
    >
      <RowIcon icon={item.icon} current={current} />
      <span className="flex-1 truncate">{item.label}</span>
      <CaretRightIcon
        aria-hidden
        className={cn(
          "size-3 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast) ease-standard",
          expanded && "rotate-90",
        )}
      />
    </button>
  );
}

function ChildRow({
  child,
  active,
  onNavigate,
}: {
  child: NavChild;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={child.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-md py-[5px] pl-3 pr-2.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span className="truncate">{child.label}</span>
    </Link>
  );
}

/** A section, plus its sub-destinations when it is a group and is expanded. */
function Section({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const panelId = React.useId();
  const inSection =
    !item.external && isHrefActive(pathname, item.href, item.exact);
  const children = item.children;
  const selectedChild = activeChildHref(pathname, children);

  // Manual expand/collapse wins until the route changes; then the current
  // page decides again, so arriving anywhere always shows you where you are.
  const [override, setOverride] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    setOverride(null);
  }, [pathname]);

  if (!children || children.length === 0) {
    return (
      <SectionLink item={item} active={inSection} onNavigate={onNavigate} />
    );
  }

  const expanded = override ?? inSection;

  return (
    <div>
      <SectionToggle
        item={item}
        current={inSection}
        expanded={expanded}
        panelId={panelId}
        onToggle={() => setOverride(!expanded)}
      />
      <div
        id={panelId}
        className="collapse-grid"
        data-closed={expanded ? undefined : ""}
        // A collapsed 0fr row still leaves its links tabbable and readable.
        inert={!expanded}
      >
        <div className="collapse-grid-inner">
          <div className="ml-[19px] mt-0.5 mb-1 border-l border-border pl-2">
            {children.map((child) => (
              <React.Fragment key={child.href}>
                {child.separated && (
                  <span
                    className="my-1 ml-3 block h-px bg-border"
                    aria-hidden
                  />
                )}
                <ChildRow
                  child={child}
                  active={child.href === selectedChild}
                  onNavigate={onNavigate}
                />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The nav list itself — pure in (groups, pathname), so it is directly testable. */
export function SidebarNav({
  groups,
  pathname,
  onNavigate,
  className,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav aria-label="Main navigation" className={className}>
      {groups.map((group, index) => (
        <div
          key={group.label ?? `group-${index}`}
          className={cn(
            index > 0 &&
              (group.label
                ? "mt-4 border-t border-border pt-4"
                : "mt-1.5 border-t border-border pt-1.5"),
          )}
        >
          {group.label && (
            <p className="mb-1 px-2.5 text-[11px] font-medium text-muted-foreground">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <Section
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ── Sidebar body (shared by the desktop rail and the mobile sheet) ───────────

function SidebarBody({
  groups,
  project,
  pendingProject,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  project: V2ProjectDTO | null;
  pendingProject: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* 1 — context */}
      <div className="flex flex-col gap-2 border-b border-border px-3 py-3">
        <div className="flex h-8 items-center px-0.5">
          <SembliaMark />
        </div>
        {project ? (
          <ProjectSwitcher current={project} />
        ) : pendingProject ? (
          <Skeleton className="h-9 w-full rounded-md" />
        ) : null}
      </div>

      {/* 2 — nav */}
      <SidebarNav
        groups={groups}
        pathname={pathname}
        onNavigate={onNavigate}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      />

      {/* 3 — account */}
      <div className="flex items-center gap-1 border-t border-border px-2 py-2">
        <UserMenu />
        <div className="ml-auto flex items-center">
          <NotificationBell />
          <HelpDropdown />
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>
      </div>
    </div>
  );
}

// ── Desktop rail ─────────────────────────────────────────────────────────────

export function AppSidebar() {
  const ctx = useNavContext();
  return (
    <aside
      style={{ width: SIDEBAR_WIDTH }}
      className="hidden shrink-0 border-r border-border lg:block"
      aria-label="Sidebar"
    >
      <SidebarBody {...ctx} />
    </aside>
  );
}

// ── Mobile bar + drawer ──────────────────────────────────────────────────────

export function AppMobileBar() {
  const ctx = useNavContext();
  const [open, setOpen] = React.useState(false);
  const label = activeLabel(ctx.pathname, ctx.groups);

  React.useEffect(() => {
    setOpen(false);
  }, [ctx.pathname]);

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 lg:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ListIcon className="size-4" />
        </Button>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {ctx.project
            ? `${ctx.project.name}${label ? ` · ${label}` : ""}`
            : label}
        </span>
        <NotificationBell />
        <UserMenu />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[15rem] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody {...ctx} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
