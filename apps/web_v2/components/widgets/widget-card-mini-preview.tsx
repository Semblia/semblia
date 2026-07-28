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
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import { WidgetRenderer } from "./preview-renderers/widget-renderer";

interface WidgetCardMiniPreviewProps {
  config: WidgetStudioConfig;
  items: WidgetTestimonial[];
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
      className={cn(
        // Centred, not top-anchored. Layouts have wildly different natural
        // heights — a carousel is one row, a wall is a mosaic — so pinning
        // them to the top of a fixed 16:10 frame left a short layout sitting
        // above a large grey void while its neighbour filled the same frame.
        // Side by side that reads as a broken card, not as two layouts.
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
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
          maxHeight: "100%",
          width: "100%",
          overflow: "hidden",
        }}
      />
    </div>
  );
});
