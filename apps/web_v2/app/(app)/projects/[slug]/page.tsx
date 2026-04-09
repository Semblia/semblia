import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ExternalLinkIcon,
  RadioIcon,
  StarIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
  MessageSquareTextIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  getProjectBySlug,
  getTestimonialsByProject,
  PROJECT_TYPE_LABELS,
  timeAgo,
  type ModerationStatus,
  type MockTestimonial,
} from "@/lib/mock-data";

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const project = getProjectBySlug(slug);
  return { title: project?.name ?? "Project" };
}

// ── Moderation status badge ────────────────────────────────────────────────────

const statusConfig: Record<
  ModerationStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2Icon,
    className: "text-success bg-success/10",
  },
  PENDING: {
    label: "Pending",
    icon: ClockIcon,
    className: "text-muted-foreground bg-muted",
  },
  FLAGGED: {
    label: "Flagged",
    icon: AlertTriangleIcon,
    className: "text-warning bg-warning/12",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircleIcon,
    className: "text-destructive bg-destructive/10",
  },
};

function StatusPill({ status }: { status: ModerationStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.className}`}
    >
      <cfg.icon className="size-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

// ── Rating stars ───────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          className={`size-2.5 ${
            i < rating
              ? "fill-warning text-warning"
              : "fill-border text-border"
          }`}
        />
      ))}
    </span>
  );
}

// ── Testimonial feed item ──────────────────────────────────────────────────────

function TestimonialFeedItem({
  t,
  projectSlug,
}: {
  t: MockTestimonial;
  projectSlug: string;
}) {
  return (
    <Link
      href={`/projects/${projectSlug}/testimonials/${t.id}`}
      className="group flex gap-3 px-6 py-4 transition-colors hover:bg-muted/40"
    >
      {/* Author avatar */}
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
        {t.authorName[0].toUpperCase()}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {t.authorName}
          </span>
          {t.authorRole && (
            <span className="text-xs text-muted-foreground">
              {t.authorRole}
              {t.authorCompany && `, ${t.authorCompany}`}
            </span>
          )}
          {t.isOAuthVerified && (
            <span
              className="inline-flex items-center"
              aria-label={`Verified via ${t.oauthProvider}`}
            >
              <ShieldCheckIcon className="size-3 shrink-0 text-success" />
            </span>
          )}
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {t.content}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Stars rating={t.rating} />
          <StatusPill status={t.moderationStatus} />
          {t.isPublished ? (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <EyeIcon className="size-3" />
              Published
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <EyeOffIcon className="size-3" />
              Unpublished
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
            {timeAgo(t.createdAt)}
          </span>
        </div>
      </div>

      <ArrowRightIcon className="mt-1 size-3.5 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-5 px-6">
      <span className="label-quiet">{label}</span>
      <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ProjectHubPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const project = getProjectBySlug(slug);

  if (!project) notFound();

  const testimonials = getTestimonialsByProject(project.id);
  const published = testimonials.filter((t) => t.isPublished).length;
  const pending = testimonials.filter(
    (t) => t.moderationStatus === "PENDING" || t.moderationStatus === "FLAGGED"
  ).length;
  const avgRating =
    testimonials.filter((t) => t.rating).length > 0
      ? (
          testimonials.reduce((s, t) => s + (t.rating ?? 0), 0) /
          testimonials.filter((t) => t.rating).length
        ).toFixed(1)
      : null;

  const typeLabel = project.projectType
    ? PROJECT_TYPE_LABELS[project.projectType]
    : null;

  // Recent 5 testimonials, newest first
  const recentTestimonials = [...testimonials]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  // Pending moderation (needs attention)
  const pendingTestimonials = testimonials.filter(
    (t) => t.moderationStatus === "PENDING" || t.moderationStatus === "FLAGGED"
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Project header ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        {/* Breadcrumb strip */}
        <div className="border-b border-border/50 px-6 py-2.5">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/projects" className="text-xs">Projects</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs">{project.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-4 px-6 py-4">
          {/* Project avatar */}
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{
              backgroundColor: project.brandColorPrimary ?? "var(--brand)",
            }}
          >
            {project.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </span>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight">
                {project.name}
              </h1>
              {typeLabel && (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium px-1.5 py-0"
                >
                  {typeLabel}
                </Badge>
              )}
              {!project.isActive && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Inactive
                </Badge>
              )}
            </div>
            {project.shortDescription && (
              <p className="text-xs text-muted-foreground truncate">
                {project.shortDescription}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {project.websiteUrl && (
              <Button variant="ghost" size="icon-sm" asChild>
                <a
                  href={project.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open website"
                >
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </Button>
            )}
            <Button size="sm" className="gap-1.5" asChild>
              <Link href={`/projects/${slug}/collect`}>
                <RadioIcon className="size-3.5" />
                Share form
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex divide-x divide-border border-t border-border">
          <StatTile label="Total" value={testimonials.length} />
          <StatTile
            label="Published"
            value={published}
            sub={`${testimonials.length > 0 ? Math.round((published / testimonials.length) * 100) : 0}%`}
          />
          <StatTile
            label="Pending"
            value={pending}
            sub={pending > 0 ? "need attention" : "all clear"}
          />
          {avgRating && (
            <StatTile
              label="Avg rating"
              value={`${avgRating} ★`}
              sub="out of 5"
            />
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex flex-1 flex-col gap-0 lg:flex-row">
        {/* ── Left: testimonial feed ── */}
        <section className="flex-1 min-w-0">
          {/* Section header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <span className="label-quiet">Recent testimonials</span>
            <Button variant="ghost" size="xs" asChild>
              <Link
                href={`/projects/${slug}/testimonials`}
                className="gap-1 text-xs"
              >
                View all
                <ArrowRightIcon className="size-3" />
              </Link>
            </Button>
          </div>

          {recentTestimonials.length === 0 ? (
            <div className="flex flex-col items-center py-16 px-6 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
                <MessageSquareTextIcon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No testimonials yet</p>
              <p className="mt-1 max-w-[240px] text-xs text-muted-foreground leading-relaxed">
                Share your collection link to start gathering testimonials.
              </p>
              <Button size="sm" variant="outline" className="mt-4 gap-1.5" asChild>
                <Link href={`/projects/${slug}/collect`}>
                  <RadioIcon className="size-3.5" />
                  Get collection link
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTestimonials.map((t) => (
                <TestimonialFeedItem key={t.id} t={t} projectSlug={slug} />
              ))}
            </div>
          )}
        </section>

        {/* ── Divider (desktop only) ── */}
        <Separator orientation="vertical" className="hidden lg:block" />

        {/* ── Right: actions + moderation queue ── */}
        <aside className="w-full lg:w-72 shrink-0">
          {/* Moderation queue */}
          {pendingTestimonials.length > 0 && (
            <div className="px-6 pt-6">
              <span className="label-quiet">Needs attention</span>
              <div className="mt-3 space-y-2">
                {pendingTestimonials.map((t) => (
                  <ModerationQueueItem key={t.id} t={t} projectSlug={slug} />
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          )}

          {/* Quick actions */}
          <div className="px-6 pt-6 pb-6">
            <span className="label-quiet">Quick actions</span>
            <div className="mt-3 space-y-1">
              <QuickActionRow
                icon={RadioIcon}
                label="Collect page link"
                sub={project.collectionFormUrl ?? `tresta.io/t/${project.slug}`}
                href={`/projects/${slug}/collect`}
              />
              <QuickActionRow
                icon={MessageSquareTextIcon}
                label="Testimonials inbox"
                sub={`${testimonials.length} total`}
                href={`/projects/${slug}/testimonials`}
              />
            </div>

            {/* Collection URL box */}
            <div className="mt-5">
              <span className="label-quiet">Collection link</span>
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5">
                <span className="flex-1 truncate font-mono text-[11px] text-muted-foreground">
                  {project.collectionFormUrl ?? `https://tresta.io/t/${project.slug}`}
                </span>
                <CopyButton
                  value={
                    project.collectionFormUrl ??
                    `https://tresta.io/t/${project.slug}`
                  }
                />
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

// ── Moderation queue mini-item ─────────────────────────────────────────────────

function ModerationQueueItem({
  t,
  projectSlug,
}: {
  t: MockTestimonial;
  projectSlug: string;
}) {
  return (
    <Link
      href={`/projects/${projectSlug}/testimonials/${t.id}`}
      className="flex items-start gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
    >
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
        {t.authorName[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{t.authorName}</p>
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {t.content}
        </p>
      </div>
      <StatusPill status={t.moderationStatus} />
    </Link>
  );
}

// ── Quick action row ───────────────────────────────────────────────────────────

function QuickActionRow({
  icon: Icon,
  label,
  sub,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}

