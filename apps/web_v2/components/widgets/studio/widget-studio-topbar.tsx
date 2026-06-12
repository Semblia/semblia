"use client";

/**
 * Widget studio topbar — back, dirty dot, wall URL pill (wall widgets only),
 * Save / Reset, and the primary Share button.
 *
 * Differs from the Collect studio topbar by:
 *   1. Wall URL pill — clickable to copy.
 *   2. Share button is the rightmost primary action (above Save in psychological weight).
 *   3. Pulses the Share button on `pulseShare` to nudge first-time creators.
 */

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowLeft as ArrowLeftIcon,
  FloppyDisk as SaveIcon,
  ArrowCounterClockwise as ResetIcon,
  Share as ShareIcon,
  Copy as CopyIcon,
  ArrowSquareOut as OpenIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InlineName } from "@/components/collect/inline-name";

interface WidgetStudioTopbarProps {
  name: string;
  onRename: (next: string) => void;
  dirty: boolean;
  isFirstRun: boolean;
  isWall: boolean;
  wallSlug: string;
  shareOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  onSave: () => void;
  onToggleShare: () => void;
}

export function WidgetStudioTopbar({
  name,
  onRename,
  dirty,
  isFirstRun,
  isWall,
  wallSlug,
  shareOpen,
  onClose,
  onReset,
  onSave,
  onToggleShare,
}: WidgetStudioTopbarProps) {
  const wallUrl = `semblia.com/wall/${wallSlug}`;

  const handleCopyWall = async () => {
    try {
      await navigator.clipboard.writeText(`https://${wallUrl}`);
      toast.success("Wall URL copied");
    } catch {
      toast.error("Couldn't copy. Try again.");
    }
  };

  return (
    <div className="relative flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-background px-2 sm:px-4">
      {/* Left: back + name */}
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={onClose}
          aria-label="Back to widgets"
          className="gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" weight="bold" aria-hidden />
          <span className="hidden sm:inline">Back</span>
        </Button>

        <span className="hidden h-4 w-px bg-border/60 sm:block" aria-hidden />

        <div className="hidden min-w-0 flex-1 items-center gap-1.5 sm:flex">
          <InlineName
            value={name}
            muted={false}
            dirty={dirty}
            onCommit={onRename}
          />
        </div>
      </div>

      {/* Center: wall URL pill (wall widgets only) */}
      {isWall && (
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex">
          <button
            type="button"
            onClick={handleCopyWall}
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1",
              "font-mono text-[10.5px] tracking-tight text-foreground",
              "transition-[border-color,background] duration-150",
              "hover:border-foreground/30 hover:bg-muted/60",
            )}
          >
            <span
              className="size-1.5 rounded-full bg-brand ring-2 ring-brand/20"
              aria-hidden
            />
            <span className="text-muted-foreground">semblia.com/wall/</span>
            <span className="font-semibold">{wallSlug}</span>
            <CopyIcon
              className="size-3 text-muted-foreground/70 transition-colors group-hover:text-foreground"
              weight="bold"
              aria-hidden
            />
          </button>
          <a
            href={`https://${wallUrl}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            aria-label="Open wall in new tab"
          >
            <OpenIcon className="size-3" weight="bold" aria-hidden />
          </a>
        </div>
      )}

      <div className="flex-1" />

      {/* Right: reset / save / share */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <Button
          variant="ghost"
          size="xs"
          onClick={onReset}
          disabled={!dirty}
          className="gap-1 text-xs text-muted-foreground"
          aria-label="Reset draft to last saved"
        >
          <ResetIcon className="size-3.5" weight="bold" aria-hidden />
          <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={onSave}
          disabled={!dirty}
          className="gap-1 text-xs"
        >
          <SaveIcon className="size-3.5" weight="bold" aria-hidden />
          Save
        </Button>
        <Button
          size="xs"
          variant={shareOpen ? "secondary" : "default"}
          onClick={onToggleShare}
          className={cn("gap-1 text-xs", isFirstRun && "widget-share-pulse")}
          aria-pressed={shareOpen}
        >
          <ShareIcon className="size-3.5" weight="bold" aria-hidden />
          Share
        </Button>
      </div>

      <style jsx>{`
        @keyframes widget-share-pulse {
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
        :global(.widget-share-pulse) {
          animation: widget-share-pulse 2s cubic-bezier(0.23, 1, 0.32, 1)
            infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.widget-share-pulse) {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
