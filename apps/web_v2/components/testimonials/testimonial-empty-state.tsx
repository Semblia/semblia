"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  Check,
  Code,
  Copy,
  Globe,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ModerationStatus } from "@/lib/mock-data";

type StatusFilter = ModerationStatus | "ALL";

// ── Public component ─────────────────────────────────────────────────────────
//
// `ALL` is the high-impact "share to receive your first" hero — the actual
// aha moment for new projects, with a copyable hosted URL.
//
// All other filter values reuse a compact status-specific note since users
// arrive at those filters intentionally and don't need a hero.

interface TestimonialEmptyStateProps {
  filter: StatusFilter;
  /** Public hosted collection URL for the project. Optional for forward compat. */
  collectionUrl?: string;
  /** Project slug for deep-link CTAs. Optional. */
  projectSlug?: string;
}

export function TestimonialEmptyState({
  filter,
  collectionUrl,
  projectSlug,
}: TestimonialEmptyStateProps) {
  if (filter === "ALL" && collectionUrl) {
    return (
      <FirstTestimonialHero
        collectionUrl={collectionUrl}
        projectSlug={projectSlug}
      />
    );
  }

  return <StatusNote filter={filter} />;
}

// ── ALL hero ─────────────────────────────────────────────────────────────────

function FirstTestimonialHero({
  collectionUrl,
  projectSlug,
}: {
  collectionUrl: string;
  projectSlug?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const displayUrl = collectionUrl.replace(/^https?:\/\//, "");

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(collectionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = collectionUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [collectionUrl]);

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden">
      {/* Subtle radial amber wash — top center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% -5%, var(--color-brand) 0%, transparent 70%)",
          opacity: 0.045,
        }}
      />

      <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 items-center gap-10 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
        {/* ── Left: copy + URL card ── */}
        <div className="animate-fade-up max-w-[34rem]">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="block h-px w-5 shrink-0 rounded-full bg-brand"
            />
            <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase">
              Inbox · Awaiting first reply
            </p>
          </div>

          <h2 className="mt-4 text-[1.85rem] leading-[1.07] font-semibold tracking-[-0.025em] text-foreground sm:text-[2.1rem]">
            Your wall is one
            <br />
            <span className="text-muted-foreground/55">share away.</span>
          </h2>

          <p className="mt-4 max-w-[28rem] text-[14px] leading-relaxed text-muted-foreground">
            Send this hosted link to a customer. Replies land here. Approve the
            ones you trust and they&apos;re ready for widgets, embeds, and the
            public wall.
          </p>

          {/* URL card — primary hero interaction */}
          <div
            className={cn(
              "mt-6 overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-300",
              copied
                ? "border-success/40 shadow-[0_0_0_3px_var(--color-success)/8%]"
                : "border-brand/30 shadow-[0_0_0_3px_var(--color-brand)/6%,0_4px_16px_-4px_oklch(0_0_0/10%)]",
            )}
          >
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15">
                  <Check className="size-2.5 text-brand" weight="bold" />
                </span>
                <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/80 uppercase">
                  Collection link · Live
                </p>
              </div>
              <a
                href={collectionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                Open
                <ArrowSquareOut className="size-3" />
              </a>
            </div>

            <div className="flex items-stretch">
              <div className="flex flex-1 items-center overflow-hidden px-4 py-3.5">
                <span className="truncate font-mono text-[12.5px] text-foreground">
                  <span className="text-muted-foreground/50">https://</span>
                  <span className="font-medium">{displayUrl}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "auth-btn flex w-14 shrink-0 items-center justify-center border-l transition-[background-color,color,border-color] duration-200",
                  copied
                    ? "border-success/20 bg-success/8 text-success"
                    : "border-border/50 text-muted-foreground hover:bg-brand/8 hover:text-brand",
                )}
                aria-label={copied ? "Copied" : "Copy link"}
              >
                {copied ? (
                  <Check size={15} weight="bold" className="copy-success" />
                ) : (
                  <Copy size={15} weight="bold" />
                )}
              </button>
            </div>

            {copied && (
              <div className="auth-notice-in border-t border-success/20 bg-success/[0.06] px-4 py-2.5 text-[11.5px] font-medium text-success">
                Copied — paste it into a customer email or DM.
              </div>
            )}
          </div>

          {/* Three quick paths — with icons */}
          <ol className="mt-7 grid grid-cols-1 gap-y-3 sm:grid-cols-3 sm:gap-y-0 sm:gap-x-5">
            <Path
              icon={Globe}
              title="Hosted page"
              text="Use the link above as-is."
            />
            <Path
              icon={Code}
              title="Embedded form"
              text="Drop a form into your site or app."
              href={
                projectSlug ? `/projects/${projectSlug}/collect` : undefined
              }
            />
            <Path
              icon={PaperPlaneTilt}
              title="Direct ask"
              text="Reach out to your most-loved customers."
            />
          </ol>
        </div>

        {/* ── Right: ghostly inbox preview ── */}
        <InboxPreview />
      </div>
    </div>
  );
}

function Path({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  href?: string;
}) {
  const inner = (
    <div className="flex flex-col gap-1.5 border-l border-border/60 pl-3 sm:border-l-0 sm:border-t sm:pt-3 sm:pl-0">
      <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-card">
        <Icon className="size-3 text-muted-foreground" weight="bold" />
      </div>
      <p className="flex items-center gap-1 text-[12.5px] font-semibold tracking-tight text-foreground">
        {title}
        {href && (
          <ArrowRight
            className="size-3 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
            weight="bold"
          />
        )}
      </p>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );

  if (href) {
    return (
      <li>
        <Link href={href} className="group block">
          {inner}
        </Link>
      </li>
    );
  }
  return <li>{inner}</li>;
}

// ── Ghost inbox preview ──────────────────────────────────────────────────────

function InboxPreview() {
  return (
    <div
      aria-hidden
      className="relative hidden h-[24rem] lg:block"
      style={{ perspective: "900px" }}
    >
      <div
        className="absolute top-1/2 left-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand) 0%, transparent 62%)",
          opacity: 0.08,
        }}
      />

      {/* Stacked rows — back to front, decreasing opacity */}
      <div className="absolute inset-x-0 top-0 space-y-2">
        <SkeletonRow status="new" accentHue={28} rotate="-0.4deg" />
        <SkeletonRow
          status="approved"
          accentHue={155}
          rotate="0.4deg"
          opacity={0.8}
        />
        <SkeletonRow
          status="pending"
          accentHue={40}
          rotate="-0.2deg"
          opacity={0.6}
        />
        <SkeletonRow
          status="approved"
          accentHue={220}
          rotate="0.3deg"
          opacity={0.4}
        />
        <SkeletonRow
          status="pending"
          accentHue={340}
          rotate="-0.1deg"
          opacity={0.2}
        />
      </div>
    </div>
  );
}

function SkeletonRow({
  rotate,
  opacity = 1,
  status,
  accentHue = 30,
}: {
  rotate: string;
  opacity?: number;
  status: "new" | "approved" | "pending";
  accentHue?: number;
}) {
  return (
    <div
      className="rounded-xl border border-border/70 bg-card p-3.5 shadow-[0_1px_2px_oklch(0_0_0/4%)]"
      style={{ transform: `rotate(${rotate})`, opacity }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="size-7 shrink-0 rounded-full"
          style={{ backgroundColor: `hsl(${accentHue} 30% 72% / 0.45)` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-24 rounded-full bg-muted/70" />
            <StatusPill status={status} />
          </div>
          <div className="mt-1.5 h-2 w-36 rounded-full bg-muted/45" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="h-2 w-6 rounded-full bg-muted/40" />
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="size-2 rounded-sm"
                style={{ backgroundColor: `oklch(0.7 0.12 55 / 0.22)` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "new" | "approved" | "pending" }) {
  const styles = {
    new: "bg-brand/15 text-brand",
    approved: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
  } as const;
  const labels = {
    new: "new",
    approved: "approved",
    pending: "pending",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-px font-mono text-[8.5px] font-semibold tracking-[0.12em] uppercase",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

// ── Status-specific small notes ──────────────────────────────────────────────

const STATUS_MESSAGES: Record<
  StatusFilter,
  { ordinal: string; title: string; desc: string }
> = {
  ALL: {
    ordinal: "Inbox",
    title: "Nothing yet",
    desc: "Share your collection link to start gathering testimonials.",
  },
  PENDING: {
    ordinal: "Pending",
    title: "Inbox zero",
    desc: "Every testimonial has been reviewed. Nice work.",
  },
  FLAGGED: {
    ordinal: "Flagged",
    title: "All clear",
    desc: "Auto-moderation hasn't flagged anything recently.",
  },
  APPROVED: {
    ordinal: "Approved",
    title: "Nothing approved yet",
    desc: "Approve testimonials to publish them to your widgets.",
  },
  REJECTED: {
    ordinal: "Rejected",
    title: "Nothing rejected",
    desc: "Rejected testimonials will collect here for reference.",
  },
};

function StatusNote({ filter }: { filter: StatusFilter }) {
  const m = STATUS_MESSAGES[filter];
  return (
    <div className="animate-fade-up flex flex-col items-center px-6 py-20 text-center">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="block h-px w-5 shrink-0 rounded-full bg-brand"
        />
        <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase">
          {m.ordinal}
        </p>
      </div>
      <p className="mt-3 text-[15px] font-semibold tracking-tight text-foreground">
        {m.title}
      </p>
      <p className="mt-1.5 max-w-[26ch] text-[12.5px] leading-relaxed text-muted-foreground/85">
        {m.desc}
      </p>
    </div>
  );
}
