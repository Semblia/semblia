"use client";

/**
 * Widget mini-preview — renders a widget at static, mini scale inside a
 * bounded box. Used inside WidgetCard (gallery) and WidgetStudioRail
 * (sibling thumbnails). Always static, never animates auto-rotate.
 *
 * Hides overflow and padds proportionally so even a "wall" layout reads
 * sensibly at thumbnail scale.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { MockTestimonial } from "@/lib/mock-data";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import { WidgetRenderer } from "./preview-renderers/widget-renderer";

interface WidgetCardMiniPreviewProps {
  config: WidgetStudioConfig;
  items: MockTestimonial[];
  /** Visual padding inside the preview box (tweak per use). Defaults to 10px. */
  padding?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Render a widget at fixed 360x220 logical size, then scale-fit it into the
 * actual container. This keeps the visual proportions consistent across all
 * gallery cards regardless of the card's actual rendered size.
 */
export const WidgetCardMiniPreview = React.memo(function WidgetCardMiniPreview({
  config,
  items,
  padding = 10,
  className,
  ariaLabel,
}: WidgetCardMiniPreviewProps) {
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      aria-label={ariaLabel ?? "Widget preview"}
      role="img"
    >
      <WidgetRenderer
        config={config}
        items={items}
        staticMode
        scale="mini"
        padding={padding}
        style={{
          height: "100%",
          width: "100%",
          overflow: "hidden",
          // Force the renderer to stay within bounds even if content overflows.
          maxHeight: "100%",
        }}
      />
      {/* Fade-out gradient at bottom to soften overflow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 32,
          background:
            "linear-gradient(to bottom, transparent, var(--w-bg, transparent))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
});
