"use client";

/**
 * WidgetRenderer — the single entry point used by the studio preview, the
 * gallery mini-preview, and the rail thumbnails.
 *
 * Responsibilities:
 *   1. Inject `--w-*` token variables on a wrapper div.
 *   2. Pick the correct layout renderer based on `config.layout`.
 *   3. Apply the resolved theme (auto → dark/light at runtime).
 *   4. Pass the curated/real testimonial set down.
 *
 * Does NOT include browser chrome or host-page chrome — those are layered on
 * by the consuming surface (studio preview).
 */

import * as React from "react";
import type { MockTestimonial } from "@/lib/mock-data";
import type { WidgetStudioConfig } from "@/lib/widgets/widget-types";
import {
  widgetTokensToCss,
  getResolvedTheme,
} from "@/lib/widgets/widget-token-css";

import { RenderCarousel } from "./render-carousel";
import { RenderGrid } from "./render-grid";
import { RenderMasonry } from "./render-masonry";
import { RenderList } from "./render-list";
import { RenderWall } from "./render-wall";

/* ─── Motion CSS (layout reflow + card stagger) ───────────────────────────── */

const MOTION_CSS = `
[data-widget-renderer] {
  /* Smooth color/typography crossfades on token mutation */
  transition:
    background-color 280ms cubic-bezier(0.23, 1, 0.32, 1),
    color 280ms cubic-bezier(0.23, 1, 0.32, 1);
}
[data-widget-renderer][data-motion="true"] > * {
  animation: w-layout-fade 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
[data-widget-renderer][data-motion="true"] article {
  animation: w-card-enter 380ms cubic-bezier(0.23, 1, 0.32, 1) both;
  animation-delay: calc(var(--w-card-i, 0) * 36ms);
}
@keyframes w-layout-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes w-card-enter {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  [data-widget-renderer] { transition: none; }
  [data-widget-renderer][data-motion="true"] > *,
  [data-widget-renderer][data-motion="true"] article {
    animation: none;
  }
}
`;

let _motionCssInjected = false;
function ensureMotionCss() {
  if (_motionCssInjected || typeof document === "undefined") return;
  _motionCssInjected = true;
  const el = document.createElement("style");
  el.setAttribute("data-widget-motion", "");
  el.textContent = MOTION_CSS;
  document.head.appendChild(el);
}

/**
 * Sets `--w-card-i` index custom property on each direct article child so the
 * stagger animation cascade works. Done in a layout effect for SSR safety.
 */
function useStaggerIndex(
  ref: React.RefObject<HTMLDivElement | null>,
  layout: WidgetStudioConfig["layout"],
  itemKey: string,
) {
  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cards = root.querySelectorAll<HTMLElement>("article");
    cards.forEach((card, i) => {
      card.style.setProperty("--w-card-i", String(i));
    });
  }, [ref, layout, itemKey]);
}

interface WidgetRendererProps {
  config: WidgetStudioConfig;
  items: MockTestimonial[];
  /** Forces auto-rotate off (mini previews / static thumbnails). */
  staticMode?: boolean;
  /** Lower-fidelity scale used inside ~280px gallery cards & rail dots. */
  scale?: "default" | "mini";
  /** Optional override of resolved theme (used when chrome wants to know). */
  preferDark?: boolean;
  /** Padding to apply inside the rendered widget surface. */
  padding?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const WidgetRenderer = React.memo(function WidgetRenderer({
  config,
  items,
  staticMode = false,
  scale = "default",
  preferDark = false,
  padding,
  className,
  style,
}: WidgetRendererProps) {
  const cssVars = React.useMemo(
    () => widgetTokensToCss(config.tokens, { theme: config.theme, preferDark }),
    [config.tokens, config.theme, preferDark],
  );

  const resolved = React.useMemo(
    () => getResolvedTheme(config.theme, preferDark),
    [config.theme, preferDark],
  );

  React.useEffect(ensureMotionCss, []);

  // Animations only when not in mini/static thumbnails (avoids flashing in cards).
  const motionEnabled = !staticMode && scale !== "mini";

  // Stable key forcing remount on layout switch so the entrance animation
  // re-fires (and on theme switch so cross-fade plays).
  const reflowKey = `${config.layout}::${resolved}`;
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Apply per-card index for the cascade.
  useStaggerIndex(
    containerRef,
    config.layout,
    `${reflowKey}::${items.map((t) => t.id).join(",")}`,
  );

  const renderInner = () => {
    switch (config.layout) {
      case "carousel":
        return (
          <RenderCarousel
            items={items}
            visibility={config.visibility}
            behavior={config.behavior}
            staticMode={staticMode}
            scale={scale}
          />
        );
      case "grid":
        return (
          <RenderGrid
            items={items}
            visibility={config.visibility}
            behavior={config.behavior}
            scale={scale}
            columns={3}
          />
        );
      case "masonry":
        return (
          <RenderMasonry
            items={items}
            visibility={config.visibility}
            behavior={config.behavior}
            scale={scale}
          />
        );
      case "list":
        return (
          <RenderList
            items={items}
            visibility={config.visibility}
            behavior={config.behavior}
            scale={scale}
          />
        );
      case "wall":
        return (
          <RenderWall
            items={items}
            visibility={config.visibility}
            behavior={config.behavior}
            wall={config.kind === "wall" ? config.wall : null}
            scale={scale}
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      key={reflowKey}
      className={className}
      data-widget-renderer
      data-layout={config.layout}
      data-resolved-theme={resolved}
      data-motion={motionEnabled}
      style={{
        ...cssVars,
        background: "var(--w-bg)",
        color: "var(--w-text)",
        fontFamily: "var(--w-font)",
        fontSize: "var(--w-fs-base)",
        padding,
        minHeight: 0,
        width: "100%",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {renderInner()}

      {config.behavior.showBranding && (
        <div
          style={{
            marginTop: scale === "mini" ? 6 : 20,
            display: "flex",
            justifyContent: "center",
            fontFamily: "var(--w-font)",
            fontSize: scale === "mini" ? 7 : "var(--w-fs-xs)",
            color: "var(--w-text-faint)",
            letterSpacing: "0.04em",
          }}
        >
          Powered by Tresta
        </div>
      )}
    </div>
  );
});
