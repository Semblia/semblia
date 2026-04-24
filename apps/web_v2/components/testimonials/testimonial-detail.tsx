"use client";

import * as React from "react";
import {
  CheckCircle as CheckCircle2Icon,
  XCircle as XCircleIcon,
  ShieldCheck as ShieldCheckIcon,
  Eye as EyeIcon,
  EyeSlash as EyeOffIcon,
  X as XIcon,
  Envelope as MailIcon,
  Calendar as CalendarIcon,
  Globe as GlobeIcon,
  Tag as TagIcon,
  ShieldWarning as ShieldAlertIcon,
  ArrowLeft as ArrowLeftIcon,
  Quotes as QuoteIcon,
} from "@phosphor-icons/react";

import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Kbd } from "@/components/kbd-shortcuts-dialog";
import { cn } from "@/lib/utils";
import { type MockTestimonial } from "@/lib/mock-data";
import { Stars, STATUS_CONFIG } from "@/components/testimonials/shared";
import {
  DetailEmpty,
  DetailBodySkeleton,
  MetaRow,
} from "@/components/testimonials/detail-parts";

// ── Main detail component ─────────────────────────────────────────────────────

interface TestimonialDetailProps {
  testimonial: MockTestimonial | null;
  loading?: boolean;
  onClose?: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onTogglePublish?: (id: string, published: boolean) => void;
  showBack?: boolean;
  onBack?: () => void;
  variant?: "panel" | "page";
}

export function TestimonialDetail({
  testimonial,
  loading,
  onClose,
  onApprove,
  onReject,
  onTogglePublish,
  showBack,
  onBack,
  variant = "panel",
}: TestimonialDetailProps) {
  const isPage = variant === "page";
  const t = testimonial;
  const cfg = t ? STATUS_CONFIG[t.moderationStatus] : null;
  const isActionable = t
    ? t.moderationStatus === "PENDING" || t.moderationStatus === "FLAGGED"
    : false;

  // Empty state — no header needed
  if (!loading && !t) return <DetailEmpty />;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header bar — always visible, never part of skeleton */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border shrink-0",
          isPage ? "px-6 h-12" : "px-5 h-11",
        )}
      >
        {showBack && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onBack}
            aria-label="Back to list"
            className="mr-1"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        )}
        <span className="flex-1 text-xs font-semibold text-foreground truncate">
          Testimonial
        </span>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Close detail panel"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Loading skeleton — only the body */}
      {loading && <DetailBodySkeleton isPage={isPage} />}

      {/* Scrollable body — only when we have data */}
      {t && cfg && (
        <ScrollArea className="flex-1">
          <div key={t.id} className="detail-content-enter">
            <div className={cn(isPage ? "px-6" : "px-5")}>
              {/* ── Author ── */}
              <div
                className="py-5 detail-section-enter"
                style={{ animationDelay: "0ms" }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background select-none">
                    {t.authorName[0].toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {t.authorName}
                      </span>
                      {t.isOAuthVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success shrink-0">
                          <ShieldCheckIcon className="size-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    {(t.authorRole || t.authorCompany) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[t.authorRole, t.authorCompany]
                          .filter(Boolean)
                          .join(" at ")}
                      </p>
                    )}
                    {t.authorEmail && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MailIcon className="size-3 shrink-0" />
                        {t.authorEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Rating ── */}
              {t.rating != null && (
                <div
                  className="pb-4 detail-section-enter"
                  style={{ animationDelay: "30ms" }}
                >
                  <Stars rating={t.rating} size="lg" />
                </div>
              )}

              {/* ── Content (blockquote accent) ── */}
              <div
                className="pb-5 detail-section-enter"
                style={{ animationDelay: "60ms" }}
              >
                <div className="relative rounded-lg bg-muted/40 p-4">
                  <QuoteIcon className="absolute top-3 right-3 size-5 text-muted-foreground/15" />
                  <p className="text-sm leading-relaxed text-foreground pr-6">
                    {t.content}
                  </p>
                </div>
              </div>

              {/* ── Status + metadata ── */}
              <div
                className="border-t border-border py-5 space-y-4 detail-section-enter"
                style={{ animationDelay: "90ms" }}
              >
                {/* Status pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      cfg.pill,
                    )}
                  >
                    <cfg.icon className="size-3.5 shrink-0" />
                    {cfg.label}
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                      t.isPublished
                        ? "text-success bg-success/10"
                        : "text-muted-foreground bg-muted",
                    )}
                  >
                    {t.isPublished ? (
                      <EyeIcon className="size-3" />
                    ) : (
                      <EyeOffIcon className="size-3" />
                    )}
                    {t.isPublished ? "Published" : "Unpublished"}
                  </span>
                </div>

                {/* Tags */}
                {t.tags.length > 0 && (
                  <div className="flex items-start gap-2">
                    <TagIcon className="size-3.5 mt-0.5 text-muted-foreground/60 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {t.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-brand-muted px-2 py-0.5 text-[10px] font-medium text-brand"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Moderation flags */}
                {t.moderationFlags && t.moderationFlags.length > 0 && (
                  <div className="rounded-lg bg-destructive/5 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldAlertIcon className="size-3.5 text-destructive" />
                      <span className="text-[11px] font-semibold text-destructive">
                        Moderation flags
                      </span>
                      {t.moderationScore != null && (
                        <span className="ml-auto text-[10px] tabular-nums text-destructive/70">
                          Score: {(t.moderationScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.moderationFlags.map((flag) => (
                        <span
                          key={flag}
                          className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                        >
                          {flag.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Metadata grid ── */}
              <div
                className="border-t border-border py-4 detail-section-enter"
                style={{ animationDelay: "120ms" }}
              >
                <MetaRow
                  icon={CalendarIcon}
                  label="Submitted"
                  value={t.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
                {t.source && (
                  <MetaRow icon={GlobeIcon} label="Source" value={t.source} />
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}

      {/* ── Sticky action footer ── */}
      {t && ((isActionable && (onApprove || onReject)) || onTogglePublish) && (
        <div
          className={cn(
            "shrink-0 border-t border-border bg-background/95 backdrop-blur-sm",
            isPage ? "px-6 py-4" : "px-5 py-3",
          )}
        >
          <div className="flex items-center gap-2">
            {isActionable && onApprove && (
              <ActionButton
                size="sm"
                tone="success"
                className="flex-1 gap-1.5"
                onClick={() => onApprove(t.id)}
              >
                <CheckCircle2Icon className="size-3.5" />
                Approve
                {!isPage && <Kbd className="ml-auto">a</Kbd>}
              </ActionButton>
            )}
            {isActionable && onReject && (
              <ActionButton
                size="sm"
                tone="danger"
                className="flex-1 gap-1.5"
                onClick={() => onReject(t.id)}
              >
                <XCircleIcon className="size-3.5" />
                Reject
                {!isPage && <Kbd className="ml-auto">r</Kbd>}
              </ActionButton>
            )}
            {onTogglePublish && (
              <Button
                size="sm"
                variant={isActionable ? "ghost" : "outline"}
                className={cn(
                  "gap-1.5 active:scale-[0.97]",
                  isActionable
                    ? "text-muted-foreground hover:text-foreground"
                    : "flex-1",
                )}
                onClick={() => onTogglePublish(t.id, !t.isPublished)}
              >
                {t.isPublished ? (
                  <>
                    <EyeOffIcon className="size-3.5" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <EyeIcon className="size-3.5" />
                    Publish
                  </>
                )}
                {!isPage && <Kbd className="ml-auto">p</Kbd>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
