"use client";

/**
 * Widget mini-preview — the real widget, shrunk to fit its frame.
 *
 * Used by WidgetCard (gallery), WidgetRow (list) and the studio rail.
 *
 * **It renders the shipped artifact.** It used to drive a second, React-side
 * widget renderer that lived only in this app, and that renderer had drifted
 * into a different design: 220px masonry columns against the real 330px, bare
 * left-rule items against real bordered cards, no masthead rules. A list of
 * thumbnails was therefore a list of widgets nobody would ever be served. It
 * now goes through `renderStudioFragment` — the same publish + SSR path as the
 * studio canvas and the live page — so a thumbnail is the widget.
 *
 * A widget is not a page: it is an in-flow element whose height is its
 * content's business. So it is *contained* — laid out at a fixed logical
 * width, scaled by whichever axis runs out first, and centred in the leftover
 * space. Every preview shows the entire widget: the whole mosaic, the whole
 * carousel, the last row as well as the first. A wall is the exception and is
 * a page, so it gets the same `WallShell` its visitors get.
 *
 * Always static; never animates auto-rotate.
 *
 * ponytail: publishes + derives a theme per visible widget. Fine for normal
 * list sizes; memoize across tiles or virtualize if a project ever holds
 * hundreds.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import { useContainerSize } from "@/hooks/use-container-width";
import {
  renderStudioFragment,
  useWallShellDark,
  wallStatsFor,
  ShadowWidgetFragment,
} from "./studio/widget-canvas";
import { WallShell, wallToneFromTheme } from "@/components/walls/wall-shell";

/**
 * Logical width every mini preview lays out at before scaling — a desktop
 * width, matching what `FormPreview` composes at.
 *
 * `.sw-root` is an inline-size container, so the widget's own CSS adapts to
 * this width rather than the viewport: laying out at a real page width and
 * scaling the result down gives a true miniature — the widget's column rhythm,
 * proportions and type hierarchy as they will actually appear, just small.
 */
const VIRTUAL_WIDTH = 1180;

interface WidgetCardMiniPreviewProps {
  widgetId: string;
  config: WidgetStudioConfig;
  items: WidgetTestimonial[];
  /** Eyebrow above a wall's title, as the live page shows it. */
  projectName?: string;
  /** Override the layout width for an unusually wide or narrow frame. */
  virtualWidth?: number;
  className?: string;
  ariaLabel?: string;
}

export const WidgetCardMiniPreview = React.memo(function WidgetCardMiniPreview({
  widgetId,
  config,
  items,
  projectName,
  virtualWidth = VIRTUAL_WIDTH,
  className,
  ariaLabel,
}: WidgetCardMiniPreviewProps) {
  const [frameRef, frame] = useContainerSize<HTMLDivElement>();
  const [innerRef, inner] = useContainerSize<HTMLDivElement>();
  const wallShellDark = useWallShellDark(config.theme);

  const rendered = React.useMemo(
    () => renderStudioFragment({ widgetId, draft: config, items }),
    [widgetId, config, items],
  );

  // Contain: whichever axis runs out first sets the scale, so the entire
  // widget lands inside the frame. Height only constrains once measured —
  // before that, fit by width so the first paint is close.
  const widthScale = frame.width > 0 ? frame.width / virtualWidth : 0;
  const heightScale = inner.height > 0 ? frame.height / inner.height : Infinity;
  const scale = Math.min(widthScale, heightScale);

  const offsetX = Math.max(0, (frame.width - virtualWidth * scale) / 2);
  const offsetY = Math.max(0, (frame.height - inner.height * scale) / 2);

  const isWall = config.kind === "wall";
  const fragment = (
    <ShadowWidgetFragment html={rendered.html} className="w-full" frozen />
  );

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
          <div ref={innerRef}>
            {isWall ? (
              <WallShell
                tone={wallToneFromTheme(rendered.themeSnapshot, wallShellDark)}
                eyebrow={projectName}
                title={config.wall.title}
                subhead={config.wall.subhead}
                stats={wallStatsFor(items)}
                fillViewport={false}
              >
                {fragment}
              </WallShell>
            ) : (
              fragment
            )}
          </div>
        </div>
      )}
    </div>
  );
});
