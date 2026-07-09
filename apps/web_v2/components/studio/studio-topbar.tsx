"use client";

/**
 * StudioTopbar — the single topbar every Semblia Studio wears.
 *
 *   [← back] · Name(inline) · status · save-whisper   [center]   ? · 2ndary · Preview↗ · Share · Publish
 *
 * Publish is the only filled button (the confident moment); everything else
 * is ghost/icon weight. Save state is ambient — a muted word, not a control.
 */

import * as React from "react";
import { ArrowLeftIcon, PlayIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  /** Extra ghost actions left of Preview. */
  secondaryActions?: React.ReactNode;
  /** True full preview — opens the draft in its own tab. */
  preview?: { href: string; onBeforeOpen?: () => void };
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
  preview,
  publish,
  share,
}: StudioTopbarProps) {
  return (
    <header className="relative flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-2.5">
      {/* Left: back + name + status + save whisper */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-3.5" weight="bold" aria-hidden />
          <span className="hidden sm:inline">{backLabel}</span>
        </Button>

        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

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

        <SaveWhisper state={saveState} dirty={dirty} />
      </div>

      {/* Center slot (absolute so it stays centered regardless of sides) */}
      {center && (
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          {center}
        </div>
      )}

      {/* Right: help · secondary · preview · share · Publish */}
      <div className="flex shrink-0 items-center gap-1">
        {help && (
          <StudioHelp
            shortcuts={help.shortcuts}
            tip={help.tip}
            open={help.open}
            onOpenChange={help.onOpenChange}
          />
        )}
        {secondaryActions}
        {preview && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <a
                  href={preview.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={preview.onBeforeOpen}
                >
                  <PlayIcon className="size-3.5" weight="fill" aria-hidden />
                  <span className="hidden md:inline">Preview</span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              Open a full preview in a new tab
            </TooltipContent>
          </Tooltip>
        )}
        {share && (
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground",
              share.active && "bg-muted text-foreground",
              share.pulse && "studio-share-pulse",
            )}
            onClick={share.onShare}
            aria-pressed={share.active}
          >
            <ShareGlyph />
            Share
          </Button>
        )}
        <Button
          size="sm"
          className="ml-1 text-xs"
          onClick={publish.onPublish}
          disabled={publish.publishing}
        >
          {publish.publishing ? "Publishing…" : publish.label}
        </Button>
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

function SaveWhisper({ state, dirty }: { state: SaveState; dirty: boolean }) {
  const label =
    state === "saving" ? "Saving…" : state === "unsaved" || dirty ? "Unsaved" : "Saved";
  return (
    <span
      className="hidden items-center gap-1.5 text-[11px] text-muted-foreground/70 sm:flex"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full transition-colors duration-300",
          state === "saving"
            ? "animate-pulse bg-brand"
            : state === "unsaved" || dirty
              ? "bg-warning"
              : "bg-success/70",
        )}
      />
      {label}
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
