"use client";

/**
 * WidgetPreviewPane — the widget's own design, rendered small.
 *
 * The pane previously had exactly one state: render the real widget, or, if
 * anything at all went wrong upstream, silently substitute a generic layout
 * mock. Both a widget whose saved design is unreadable and a widget whose
 * renderer crashed came out looking like a healthy widget belonging to someone
 * else. Four states now, and each one says which it is:
 *
 *   • loading      — the renderer is client-only (it injects its stylesheet
 *                    into `document.head` and measures its own children), so
 *                    the pane holds a shimmer frame of the final size until it
 *                    has mounted. No blank rectangle during hydration, no shift.
 *   • ready        — the real renderer, driven by this widget's saved config
 *   • schematic    — the saved config didn't parse, so the pane draws the
 *                    layout diagram and labels it as a diagram
 *   • unavailable  — the renderer threw. An empty frame reads as a broken
 *                    widget; this reads as a preview that didn't render.
 *
 * The boundary is a class component because that is the only way React exposes
 * render-error recovery, and a crash in one tile must not take the gallery down.
 */

import * as React from "react";
import { ImageBrokenIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { FALLBACK_TESTIMONIALS } from "@/lib/widgets/widget-fallback-testimonials";
import { WidgetCardMiniPreview } from "./widget-card-mini-preview";
import { WidgetLayoutPreview } from "./widget-layout-preview";

interface WidgetPreviewPaneProps {
  entry: WidgetListEntry;
  /** The widget's parsed config. Absent when the saved config didn't parse. */
  previewConfig?: WidgetStudioConfig;
  className?: string;
}

export function WidgetPreviewPane({
  entry,
  previewConfig,
  className,
}: WidgetPreviewPaneProps) {
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className={cn("h-full w-full", className)} aria-hidden>
        <Skeleton className="size-full rounded-none" />
      </div>
    );
  }

  if (!previewConfig) {
    return (
      <div className={cn("relative h-full w-full", className)}>
        <WidgetLayoutPreview
          layout={entry.layout}
          accent={entry.accent}
          theme={entry.theme}
          inactive={!entry.isActive}
          className="absolute inset-0"
        />
        <PreviewNote>
          Diagram only — couldn&apos;t read this widget&apos;s saved design
        </PreviewNote>
      </div>
    );
  }

  return (
    <PreviewBoundary fallback={<PreviewUnavailable className={className} />}>
      <WidgetCardMiniPreview
        config={previewConfig}
        items={FALLBACK_TESTIMONIALS}
        ariaLabel={`Preview of ${entry.name}`}
        className={cn(className, !entry.isActive && "opacity-50 grayscale")}
      />
    </PreviewBoundary>
  );
}

/**
 * True only after the first client render. The widget renderer touches
 * `document` and measures layout, so it cannot run during SSR.
 */
function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

/** A quiet caption over the preview, on a tint — never a bordered chip. */
function PreviewNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="absolute inset-x-0 bottom-0 bg-background/85 px-2 py-1 text-[10px] leading-tight text-muted-foreground">
      {children}
    </p>
  );
}

function PreviewUnavailable({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-dot-grid flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted/30 px-3 text-center",
        className,
      )}
      role="img"
      aria-label="Preview unavailable"
    >
      <ImageBrokenIcon
        className="size-4 text-muted-foreground/70"
        weight="bold"
        aria-hidden
      />
      <p className="text-[10px] leading-tight text-muted-foreground">
        Couldn&apos;t draw this preview. The widget itself is unaffected — open
        it to check.
      </p>
    </div>
  );
}

// ── Boundary ─────────────────────────────────────────────────────────────────

interface PreviewBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

/**
 * One boundary per tile. The gallery keys its tiles by widget id, so a boundary
 * instance belongs to exactly one widget for its whole life and can latch that
 * widget's failure without ever inheriting a neighbour's.
 */
class PreviewBoundary extends React.Component<
  PreviewBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
