"use client";

/**
 * Widget mini-preview — the whole widget, shrunk to fit its frame.
 *
 * Used by WidgetCard (gallery), WidgetRow (list) and the studio rail.
 *
 * A widget is not a page: it is an in-flow element whose height is its
 * content's own business. So it is *contained* — laid out at a fixed logical
 * width, then scaled by whichever axis runs out first and centred in the
 * leftover space. Every preview therefore shows the entire widget: the whole
 * mosaic, the whole carousel, the last row as well as the first.
 *
 * Two earlier versions of this got it wrong in opposite directions. The first
 * handed the renderer the frame's real width, so the composition *reflowed* per
 * frame — the same wall was four columns in a gallery tile and four slivers in
 * a row. The second scaled instead of reflowing, which fixed the proportions,
 * but still fitted width-only and let tall layouts fall off the bottom edge
 * behind a fade. A wall clipped through the middle of its second row reads as a
 * broken widget, and a fade does not make a lie honest.
 *
 * Always static; never animates auto-rotate.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import { useContainerSize } from "@/hooks/use-container-width";
import { WidgetRenderer } from "./preview-renderers/widget-renderer";

/**
 * Logical width every mini preview lays out at before scaling — a desktop
 * width, deliberately far wider than any frame it lands in.
 *
 * The renderer's own `scale="mini"` mode shrinks type to 8px and pins a wall to
 * four columns *at the frame's real width*, which is why a wall preview came
 * out as four slivers of one-word-per-line text. Laying out at a real page
 * width and scaling the result down instead gives a true miniature: the
 * widget's proportions, column rhythm and type hierarchy as they will actually
 * appear, just small.
 */
const VIRTUAL_WIDTH = 820;

interface WidgetCardMiniPreviewProps {
  config: WidgetStudioConfig;
  items: WidgetTestimonial[];
  /** Visual padding inside the preview box, in virtual pixels. */
  padding?: number;
  /** Override the layout width for an unusually wide or narrow frame. */
  virtualWidth?: number;
  className?: string;
  ariaLabel?: string;
}

export const WidgetCardMiniPreview = React.memo(function WidgetCardMiniPreview({
  config,
  items,
  padding = 28,
  virtualWidth = VIRTUAL_WIDTH,
  className,
  ariaLabel,
}: WidgetCardMiniPreviewProps) {
  const [frameRef, frame] = useContainerSize<HTMLDivElement>();
  const [innerRef, inner] = useContainerSize<HTMLDivElement>();

  // Contain: whichever axis runs out first sets the scale, so the entire
  // widget lands inside the frame. Height is only constraining once it has
  // been measured — before that, fit by width so the first paint is close.
  const widthScale = frame.width > 0 ? frame.width / virtualWidth : 0;
  const heightScale = inner.height > 0 ? frame.height / inner.height : Infinity;
  const scale = Math.min(widthScale, heightScale);

  const offsetX = Math.max(0, (frame.width - virtualWidth * scale) / 2);
  const offsetY = Math.max(0, (frame.height - inner.height * scale) / 2);

  return (
    <div
      ref={frameRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      aria-label={ariaLabel ?? "Widget preview"}
      role="img"
    >
      {scale > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 origin-top-left select-none"
          style={{
            width: virtualWidth,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          }}
        >
          {/* Full-fidelity layout, shrunk — not the renderer's `mini` mode,
              which is the thing that produced the slivers. */}
          <div ref={innerRef}>
            <WidgetRenderer
              config={config}
              items={items}
              staticMode
              padding={padding}
            />
          </div>
        </div>
      )}
    </div>
  );
});
