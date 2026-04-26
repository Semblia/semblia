"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle as CheckCircle2Icon,
  Clock as ClockIcon,
  Warning as AlertTriangleIcon,
  XCircle as XCircleIcon,
  ShieldCheck as ShieldCheckIcon,
  Star as StarIcon,
  Eye as EyeIcon,
  EyeSlash as EyeOffIcon,
  ArrowRight as ArrowRightIcon,
  Check as CheckIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  timeAgo,
  type MockTestimonial,
  type ModerationStatus,
} from "@/lib/mock-data";
import { ActionButton } from "@/components/ui/action-button";

// ── Status config (single source of truth) ────────────────────────────────────

export const STATUS_CONFIG: Record<
  ModerationStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    pill: string;
  }
> = {
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2Icon,
    pill: "text-success bg-success/10",
  },
  PENDING: {
    label: "Pending",
    icon: ClockIcon,
    pill: "text-muted-foreground bg-muted",
  },
  FLAGGED: {
    label: "Flagged",
    icon: AlertTriangleIcon,
    pill: "text-warning bg-warning/15",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircleIcon,
    pill: "text-destructive bg-destructive/10",
  },
};

// ── StatusPill ────────────────────────────────────────────────────────────────

export function StatusPill({ status }: { status: ModerationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        cfg.pill,
      )}
    >
      <cfg.icon className="size-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

// ── Stars ────────────────────────────────────────────────────────────────────

export function Stars({
  rating,
  size = "sm",
}: {
  rating: number | null;
  size?: "sm" | "md" | "lg";
}) {
  if (!rating) return null;
  const iconSize =
    size === "lg" ? "size-4" : size === "md" ? "size-4" : "size-2.5";
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex items-center gap-0.5"
        aria-label={`${rating} out of 5 stars`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon
            key={i}
            className={cn(
              iconSize,
              i < rating
                ? "fill-warning text-warning"
                : "fill-muted text-muted",
            )}
          />
        ))}
      </span>
      {size === "lg" && (
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {rating}.0
        </span>
      )}
    </div>
  );
}

// ── FeedRow — testimonial list row used on overview + testimonials page ──────

export interface FeedRowProps {
  t: MockTestimonial;
  slug: string;
  index: number;
  animate?: boolean;
}

export function FeedRow({ t, slug, index, animate = true }: FeedRowProps) {
  return (
    <Link
      href={`/projects/${slug}/testimonials/${t.id}`}
      className={cn(
        "group tactile flex gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-muted/40",
        animate && "animate-fade-up",
      )}
      style={
        animate
          ? {
              animationDelay: `${100 + index * 50}ms`,
              animationFillMode: "both",
            }
          : undefined
      }
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
        {t.authorName[0].toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">
            {t.authorName}
          </span>
          {t.authorRole && (
            <span className="text-[11px] text-muted-foreground">
              {t.authorRole}
              {t.authorCompany && ` at ${t.authorCompany}`}
            </span>
          )}
          {t.isOAuthVerified && (
            <ShieldCheckIcon className="size-3 shrink-0 text-success" />
          )}
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {t.content}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2.5">
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
              Draft
            </span>
          )}
          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
            {timeAgo(t.createdAt)}
          </span>
        </div>
      </div>

      <ArrowRightIcon className="mt-1 size-3.5 shrink-0 text-muted-foreground/20 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/60" />
    </Link>
  );
}

// ── ModerationItem — inline approve/reject row ──────────────────────────────

export interface ModerationItemProps {
  t: MockTestimonial;
  slug: string;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  resolving: Set<string>;
}

export function ModerationItem({
  t,
  slug,
  index,
  onApprove,
  onReject,
  resolving,
}: ModerationItemProps) {
  const isResolving = resolving.has(t.id);

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-all duration-200 animate-fade-up",
        isResolving && "opacity-40 pointer-events-none",
      )}
      style={{
        animationDelay: `${80 + index * 60}ms`,
        animationFillMode: "both",
      }}
    >
      <Link
        href={`/projects/${slug}/testimonials/${t.id}`}
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/80"
      >
        {t.authorName[0].toUpperCase()}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/projects/${slug}/testimonials/${t.id}`}
          className="group block"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{t.authorName}</span>
            <StatusPill status={t.moderationStatus} />
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            {t.content}
          </p>
        </Link>

        {t.moderationFlags && t.moderationFlags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {t.moderationFlags.map((flag) => (
              <span
                key={flag}
                className="rounded bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium text-warning"
              >
                {flag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <ActionButton
            onClick={() => onApprove(t.id)}
            disabled={isResolving}
            tone="success"
            size="xs"
            className="gap-1 text-[10px]"
          >
            <CheckIcon className="size-3" />
            Approve
          </ActionButton>
          <ActionButton
            onClick={() => onReject(t.id)}
            disabled={isResolving}
            tone="danger"
            size="xs"
            className="gap-1 text-[10px]"
          >
            <XIcon className="size-3" />
            Reject
          </ActionButton>
          <span className="ml-auto text-[9px] tabular-nums text-muted-foreground">
            {timeAgo(t.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Number formatting helper ─────────────────────────────────────────────────

export function fmtNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}
