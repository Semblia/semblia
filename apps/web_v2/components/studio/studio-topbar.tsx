"use client";

/**
 * StudioTopbar — the single topbar every Semblia Studio wears.
 *
 * Unifies the two divergent topbars (forms had status + Publish; widgets had a
 * wall pill + Share + Reset and no publish) into one bar with a consistent
 * anatomy:
 *
 *   [← back] · Name(inline) · status · autosave        [center] · help · 2ndary · Publish · Share
 *
 * Every studio publishes (confident moment, primary action); Share is the
 * secondary "now show it off" action. Slots keep it surface-agnostic.
 */

import * as React from "react";
import {
  CloudCheckIcon,
  CloudArrowUpIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineName } from "@/components/studio/inline-name";
import { StudioHelp } from "@/components/studio/studio-help";

export type StudioStatusTone =
  | "live"
  | "changes"
  | "draft"
  | "closed"
  | "archived";

export interface StudioStatus {
  label: string;
  tone: StudioStatusTone;
}

export type SaveState = "saving" | "unsaved" | "saved";

interface StudioTopbarProps {
  backLabel: string;
  onBack: () => void;
  name: string;
  onRename: (next: string) => void;
  dirty: boolean;
  status?: StudioStatus;
  saveState: SaveState;
  help?: {
    shortcuts: { keys: string[]; label: string }[];
    tip: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  };
  /** Centered slot (e.g. the wall URL pill). */
  center?: React.ReactNode;
  /** Extra ghost/outline actions left of Publish (e.g. View, Reset). */
  secondaryActions?: React.ReactNode;
  publish: { onPublish: () => void; publishing: boolean; label: string };
  share?: { onShare: () => void; active: boolean; pulse?: boolean };
}

const STATUS_CLASS: Record<StudioStatusTone, string> = {
  live: "border-transparent bg-success/10 text-success",
  changes: "border-brand/30 bg-brand/10 text-brand",
  closed: "border-warning/30 bg-warning/5 text-warning",
  draft: "text-muted-foreground",
  archived: "text-muted-foreground",
};

export function StudioTopbar({
  backLabel,
  onBack,
  name,
  onRename,
  dirty,
  status,
  saveState,
  help,
  center,
  secondaryActions,
  publish,
  share,
}: StudioTopbarProps) {
  return (
    <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      {/* Left: back + name + status + autosave */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-1 shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-3.5" weight="bold" aria-hidden />
          <span className="hidden sm:inline">{backLabel}</span>
        </Button>

        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />

        <div className="min-w-0 max-w-[14rem]">
          <InlineName
            value={name}
            muted={false}
            dirty={false}
            onCommit={onRename}
          />
        </div>

        {status && (
          <Badge
            variant="outline"
            className={cn(
              "hidden shrink-0 text-[10px] font-medium sm:inline-flex",
              STATUS_CLASS[status.tone],
            )}
          >
            {status.label}
          </Badge>
        )}

        <SaveStateIndicator state={saveState} dirty={dirty} />
      </div>

      {/* Center slot (absolute so it stays centered regardless of side widths) */}
      {center && (
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          {center}
        </div>
      )}

      {/* Right: help · secondary · Publish · Share */}
      <div className="flex shrink-0 items-center gap-1.5">
        {help && (
          <StudioHelp
            shortcuts={help.shortcuts}
            tip={help.tip}
            open={help.open}
            onOpenChange={help.onOpenChange}
          />
        )}
        {secondaryActions}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={publish.onPublish}
          disabled={publish.publishing}
        >
          <CloudArrowUpIcon className="size-3.5" weight="bold" aria-hidden />
          {publish.publishing ? "Publishing…" : publish.label}
        </Button>
        {share && (
          <Button
            size="sm"
            variant={share.active ? "secondary" : "default"}
            className={cn(
              "gap-1.5 text-xs",
              share.pulse && "studio-share-pulse",
            )}
            onClick={share.onShare}
            aria-pressed={share.active}
          >
            <ShareGlyph />
            Share
          </Button>
        )}
      </div>

      {share?.pulse && (
        <style jsx>{`
          @keyframes studio-share-pulse {
            0%,
            100% {
              box-shadow: 0 0 0 0
                color-mix(in oklch, var(--brand) 0%, transparent);
            }
            50% {
              box-shadow: 0 0 0 6px
                color-mix(in oklch, var(--brand) 35%, transparent);
            }
          }
          :global(.studio-share-pulse) {
            animation: studio-share-pulse 2s cubic-bezier(0.23, 1, 0.32, 1)
              infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            :global(.studio-share-pulse) {
              animation: none;
            }
          }
        `}</style>
      )}
    </header>
  );
}

function SaveStateIndicator({
  state,
  dirty,
}: {
  state: SaveState;
  dirty: boolean;
}) {
  if (state === "saving") {
    return (
      <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
        <CloudArrowUpIcon className="size-3 animate-pulse" aria-hidden />
        Saving…
      </span>
    );
  }
  if (state === "unsaved" || dirty) {
    return (
      <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
        Unsaved changes
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1 text-[11px] text-muted-foreground/70 sm:flex">
      <CloudCheckIcon className="size-3" aria-hidden />
      Saved
    </span>
  );
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
      <circle cx="12" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m10.2 4.6-4.4 2.3m0 2 4.4 2.3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
