"use client";

import * as React from "react";
import {
  ArrowSquareOut,
  Check,
  Copy,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { V2ModerationStatus } from "@workspace/types";

type StatusFilter = V2ModerationStatus | "ALL";

// ── Public component ─────────────────────────────────────────────────────────
//
// `ALL` is the primary empty state — a focused, centered layout with a single
// CTA: copy the hosted collection URL. No ghost previews, no multi-column
// hero. Just hierarchy: overline → heading → description → URL → hint.
//
// All other filter values reuse a compact status-specific note since users
// arrive at those filters intentionally and don't need a hero.

interface ResponseEmptyStateProps {
  filter: StatusFilter;
  /** Public hosted collection URL for the project. Optional for forward compat. */
  collectionUrl?: string;
  /** Project slug for deep-link CTAs. Optional. */
  projectSlug?: string;
}

export function ResponseEmptyState({
  filter,
  collectionUrl,
  projectSlug,
}: ResponseEmptyStateProps) {
  if (filter === "ALL" && collectionUrl) {
    return (
      <FirstResponseEmpty
        collectionUrl={collectionUrl}
        projectSlug={projectSlug}
      />
    );
  }

  return <StatusNote filter={filter} />;
}

// ── ALL empty state ──────────────────────────────────────────────────────────

function FirstResponseEmpty({
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
    <div className="animate-fade-up flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {/* Overline */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="block h-px w-5 shrink-0 rounded-full bg-brand"
        />
        <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase">
          Inbox · No responses yet
        </p>
      </div>

      {/* Heading */}
      <h2 className="mt-4 text-[1.35rem] leading-tight font-semibold tracking-[-0.02em] text-foreground sm:text-[1.5rem]">
        Share your link to get started
      </h2>

      {/* Description */}
      <p className="mt-2.5 max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground">
        Send this hosted URL to a customer. Their reply will appear here for you
        to review.
      </p>

      {/* URL copy bar — the single primary action */}
      <div
        className={cn(
          "mt-6 flex w-full max-w-md items-stretch overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-200",
          copied
            ? "border-success/40 ring-2 ring-success/10"
            : "border-border bg-card shadow-xs",
        )}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden px-3.5 py-2.5">
          <LinkIcon
            className="size-3.5 shrink-0 text-muted-foreground/50"
            weight="bold"
          />
          <span className="truncate font-mono text-[12px] text-foreground/90">
            {displayUrl}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex shrink-0 items-center gap-1.5 border-l px-3.5 text-[12px] font-medium transition-[background-color,color,border-color] duration-150",
            copied
              ? "border-success/20 bg-success/8 text-success"
              : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
          aria-label={copied ? "Copied" : "Copy link"}
        >
          {copied ? (
            <>
              <Check size={13} weight="bold" className="copy-success" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} weight="bold" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Contextual hint after copy */}
      {copied && (
        <p className="auth-notice-in mt-2.5 text-[11px] font-medium text-success">
          Paste it into a customer email, DM, or invoice.
        </p>
      )}

      {/* Secondary actions — quiet, below the fold */}
      <div className="mt-5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
        <a
          href={collectionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-foreground"
        >
          Preview page
          <ArrowSquareOut className="size-3" />
        </a>
        {projectSlug && (
          <>
            <span className="text-border">·</span>
            <Link
              href={`/projects/${projectSlug}/collect`}
              className="transition-colors duration-150 hover:text-foreground"
            >
              Embed a form instead
            </Link>
          </>
        )}
      </div>
    </div>
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
    desc: "Share your collection link to start gathering responses.",
  },
  PENDING: {
    ordinal: "Pending",
    title: "Inbox zero",
    desc: "Every response has been reviewed. Nice work.",
  },
  FLAGGED: {
    ordinal: "Flagged",
    title: "All clear",
    desc: "Auto-moderation hasn't flagged anything recently.",
  },
  APPROVED: {
    ordinal: "Approved",
    title: "Nothing approved yet",
    desc: "Approve responses to publish them to your widgets.",
  },
  REJECTED: {
    ordinal: "Rejected",
    title: "Nothing rejected",
    desc: "Rejected responses will collect here for reference.",
  },
};

function StatusNote({ filter }: { filter: StatusFilter }) {
  const m = STATUS_MESSAGES[filter];
  return (
    <div className="animate-fade-up flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
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
