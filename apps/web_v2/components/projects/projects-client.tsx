"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutListIcon,
  LayoutGridIcon,
  PlusIcon,
  SearchIcon,
  MessageSquareTextIcon,
  PuzzleIcon,
  GlobeIcon,
  LockIcon,
  UsersIcon,
  ArrowRightIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGetProjects } from "@/lib/api";
import {
  PROJECT_TYPE_LABELS,
  timeAgo,
  type MockProject,
  type ProjectVisibility,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ── Visibility icons ───────────────────────────────────────────────────────────

const VisibilityIcon: Record<
  ProjectVisibility,
  React.ComponentType<{ className?: string }>
> = {
  PUBLIC: GlobeIcon,
  PRIVATE: LockIcon,
  INVITE_ONLY: UsersIcon,
};

// ── Skeleton states ────────────────────────────────────────────────────────────

function ProjectRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <Skeleton className="size-9 shrink-0 rounded-lg animate-shimmer" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-36 animate-shimmer" />
        <Skeleton className="h-3 w-52 animate-shimmer" />
      </div>
      <div className="hidden items-center gap-5 sm:flex">
        <Skeleton className="h-3 w-12 animate-shimmer" />
        <Skeleton className="h-3 w-8 animate-shimmer" />
        <Skeleton className="h-3 w-8 animate-shimmer" />
        <Skeleton className="h-3 w-14 animate-shimmer" />
      </div>
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl ring-1 ring-foreground/[0.06] overflow-hidden">
      <Skeleton className="h-1 w-full animate-shimmer rounded-none" />
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-lg shrink-0 animate-shimmer" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-24 animate-shimmer" />
            <Skeleton className="h-3 w-40 animate-shimmer" />
          </div>
        </div>
        <div className="pt-3 border-t border-border flex items-center gap-4">
          <Skeleton className="h-3 w-16 animate-shimmer" />
          <Skeleton className="h-3 w-12 animate-shimmer" />
          <Skeleton className="ml-auto h-3 w-10 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

// ── Project row (list view) ────────────────────────────────────────────────────

function ProjectRow({
  project,
  index,
}: {
  project: MockProject;
  index: number;
}) {
  const initials = project.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const typeLabel = project.projectType
    ? PROJECT_TYPE_LABELS[project.projectType]
    : null;

  const VisIcon = VisibilityIcon[project.visibility];

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group tactile flex items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-muted/40 animate-fade-up"
      style={{ animationDelay: `${index * 55}ms`, animationFillMode: "both" }}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white transition-shadow duration-200 group-hover:shadow-[0_2px_8px_var(--tw-shadow-color)]"
        style={{
          backgroundColor: project.brandColorPrimary ?? "var(--brand)",
          "--tw-shadow-color": project.brandColorPrimary ?? "var(--brand)",
        } as React.CSSProperties}
      >
        {initials}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {project.name}
          </span>
          {typeLabel && (
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] font-medium px-1.5 py-0"
            >
              {typeLabel}
            </Badge>
          )}
        </div>
        {project.shortDescription && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {project.shortDescription}
          </p>
        )}
      </div>

      <div className="hidden items-center gap-5 sm:flex">
        {project._count.pendingModeration > 0 && (
          <span className="flex items-center gap-1 rounded-md bg-warning/12 px-2 py-0.5 text-xs font-semibold text-warning">
            {project._count.pendingModeration} pending
          </span>
        )}

        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquareTextIcon className="size-3.5 shrink-0" />
          {project._count.testimonials}
        </span>

        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PuzzleIcon className="size-3.5 shrink-0" />
          {project._count.widgets}
        </span>

        <span
          className="flex items-center text-xs text-muted-foreground"
          title={project.visibility.toLowerCase().replace("_", " ")}
        >
          <VisIcon className="size-3.5 shrink-0" />
        </span>

        <span className="w-[68px] text-right text-xs tabular-nums text-muted-foreground">
          {timeAgo(project.updatedAt)}
        </span>
      </div>

      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/70" />
    </Link>
  );
}

// ── Project card (card view) ───────────────────────────────────────────────────

function ProjectCard({
  project,
  index,
}: {
  project: MockProject;
  index: number;
}) {
  const initials = project.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const typeLabel = project.projectType
    ? PROJECT_TYPE_LABELS[project.projectType]
    : null;

  const brandColor = project.brandColorPrimary ?? "#a8895c";

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group tactile block rounded-xl ring-1 ring-foreground/[0.06] overflow-hidden transition-all duration-200 hover:ring-foreground/[0.14] hover:shadow-[0_6px_20px_oklch(0_0_0/7%)] animate-fade-up"
      style={{ animationDelay: `${index * 65}ms`, animationFillMode: "both" }}
    >
      {/* Brand-tinted gradient header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: `linear-gradient(160deg, ${brandColor}18 0%, transparent 70%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            {initials}
          </span>

          {project._count.pendingModeration > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
              {project._count.pendingModeration} pending
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {project.name}
            </span>
            {typeLabel && (
              <Badge
                variant="secondary"
                className="text-[10px] font-medium px-1.5 py-0"
              >
                {typeLabel}
              </Badge>
            )}
          </div>
          {project.shortDescription && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {project.shortDescription}
            </p>
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div className="flex items-center gap-4 border-t border-border px-5 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquareTextIcon className="size-3.5 shrink-0" />
          {project._count.testimonials}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PuzzleIcon className="size-3.5 shrink-0" />
          {project._count.widgets}
        </span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {timeAgo(project.updatedAt)}
        </span>
        <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/70" />
      </div>
    </Link>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center animate-fade-up">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
        <SearchIcon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No projects match</p>
      <p className="mt-1 text-xs text-muted-foreground">
        No results for <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 gap-1.5 text-xs"
        onClick={onClear}
      >
        <XIcon className="size-3" />
        Clear search
      </Button>
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center py-20 px-6 text-center animate-fade-up">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
        <MessageSquareTextIcon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">No projects yet</h3>
      <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
        Create your first project to start collecting testimonials and building credibility.
      </p>
      <Button size="sm" className="mt-5 gap-1.5" asChild>
        <Link href="/projects/new">
          <PlusIcon className="size-3.5" />
          New project
        </Link>
      </Button>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export function ProjectsClient() {
  const [projects, setProjects] = React.useState<MockProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<"list" | "card">("list");
  const [search, setSearch] = React.useState("");

  // Load + persist view preference
  React.useEffect(() => {
    const saved = localStorage.getItem("tresta:projects:view");
    if (saved === "list" || saved === "card") setView(saved);
  }, []);

  React.useEffect(() => {
    localStorage.setItem("tresta:projects:view", view);
  }, [view]);

  // Simulate API fetch
  React.useEffect(() => {
    setLoading(true);
    apiGetProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [projects, search]);

  const totalTestimonials = projects.reduce(
    (s, p) => s + p._count.testimonials,
    0
  );
  const totalPending = projects.reduce(
    (s, p) => s + p._count.pendingModeration,
    0
  );

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold tracking-tight">Projects</h1>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Loading\u2026"
                : projects.length === 0
                  ? "Get started by creating your first project."
                  : `${projects.length} project${projects.length !== 1 ? "s" : ""} \u00b7 ${totalTestimonials} testimonials${totalPending > 0 ? ` \u00b7 ${totalPending} pending review` : ""}`}
            </p>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" asChild>
            <Link href="/projects/new">
              <PlusIcon className="size-3.5" />
              New project
            </Link>
          </Button>
        </div>

        {/* Search + view toggle bar */}
        <div className="flex items-center gap-3 border-t border-border px-6 py-2.5">
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects\u2026"
              className="h-7 pl-8 text-xs"
              aria-label="Search projects"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="View toggle"
            className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5"
          >
            <button
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "flex size-6 items-center justify-center rounded-md transition-colors duration-150",
                view === "list"
                  ? "bg-background text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List view"
            >
              <LayoutListIcon className="size-3.5" />
            </button>
            <button
              aria-pressed={view === "card"}
              onClick={() => setView("card")}
              className={cn(
                "flex size-6 items-center justify-center rounded-md transition-colors duration-150",
                view === "card"
                  ? "bg-background text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Card view"
            >
              <LayoutGridIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1">
        {loading ? (
          /* Skeleton loading state */
          view === "list" ? (
            <div className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <ProjectRowSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              {[0, 1, 2].map((i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          )
        ) : filtered.length === 0 && search ? (
          <EmptySearch query={search} onClear={() => setSearch("")} />
        ) : projects.length === 0 ? (
          <EmptyProjects />
        ) : view === "list" ? (
          <div className="divide-y divide-border">
            {filtered.map((project, i) => (
              <ProjectRow key={project.id} project={project} index={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
