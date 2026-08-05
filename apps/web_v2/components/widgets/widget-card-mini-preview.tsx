"use client";

/**
 * Widget mini-preview — the widget rendered small inside a bounded frame.
 * Used by WidgetCard (gallery), WidgetRow (list) and the studio rail.
 *
 * It renders at a fixed logical width and CSS-scales the result to the frame,
 * the same move `FormPreview` makes. Previously the renderer was handed the
 * frame's real width, so the composition *reflowed* per frame: the same wall
 * was four columns in a 1440px gallery tile and four slivers in a 390px one,
 * with the second row sliced through the middle of its cards. Scaling instead
 * of reflowing means every preview shows the same composition at the same
 * proportions, and a phone gets a small true picture rather than a broken one.
 *
 * Tall layouts still overflow a short frame — a wall is a mosaic and the frame
 * is 16:10. That clip is top-anchored and fades out at the bottom edge, so it
 * reads as "there is more of this", which is what a thumbnail should say.
 * Always static; never animates auto-rotate.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import { WidgetRenderer } from "./preview-renderers/widget-renderer";

/**
 * Logical width every mini preview lays out at before scaling — a desktop
 * width, deliberately far wider than any frame it lands in.
 *
 * The renderer's own `scale="mini"` mode shrinks type to 8px and pins a wall to
 * four columns *at the frame's real width*, which is why a wall preview came
 * out as four slivers of one-word-per-line text with the second row sliced
 * through the middle. Laying out at a real page width and scaling the result
 * down instead gives a true miniature: the widget's proportions, column rhythm
 * and type hierarchy as they will actually appear, just small.
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
  const [frameRef, frame] = useElementSize<HTMLDivElement>();
  const [innerRef, inner] = useElementSize<HTMLDivElement>();

  const scale = frame.width > 0 ? frame.width / virtualWidth : 0;
  const scaledHeight = inner.height * scale;
  // Short layouts (a carousel is one row) are centred; tall ones (a wall is a
  // mosaic) start at the top and clip. Centring a tall layout would cut its
  // heading off, and top-anchoring a short one left it floating above a large
  // empty rectangle that read as a broken card.
  const overflows = scaledHeight > frame.height;
  const offsetY = overflows ? 0 : (frame.height - scaledHeight) / 2;

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
            transform: `translateY(${offsetY}px) scale(${scale})`,
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
      {/* Names the clip instead of letting a half-drawn card look like a bug. */}
      {overflows && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background/80 to-transparent"
        />
      )}
    </div>
  );
});

/**
 * Content size of an element, tracked across layout changes.
 *
 * A callback ref rather than `useRef` + `useEffect([])`: the measured element
 * here only mounts once the frame has a width, so an effect that reads
 * `ref.current` on first render would find null and never observe anything.
 */
function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  { width: number; height: number },
] {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const observerRef = React.useRef<ResizeObserver | null>(null);

  React.useEffect(() => () => observerRef.current?.disconnect(), []);

  const ref = React.useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return [ref, size];
}
