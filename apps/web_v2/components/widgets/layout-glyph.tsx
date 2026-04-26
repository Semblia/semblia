"use client";

/**
 * LayoutGlyph — stylized SVG shapes representing each layout type.
 * Used in:
 *   1. WidgetKindPicker (step 2 — pick starting layout)
 *   2. WidgetStudioControls (Layout section visual cards)
 *
 * Currentcolor + token-friendly so the glyph adapts to its surface.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WidgetLayout } from "@/lib/widgets/widget-types";

interface LayoutGlyphProps {
  layout: WidgetLayout;
  className?: string;
  /** Highlight the central element (used when card is selected). */
  highlighted?: boolean;
}

export function LayoutGlyph({
  layout,
  className,
  highlighted = false,
}: LayoutGlyphProps) {
  const accent = highlighted ? "var(--brand)" : "currentColor";

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center text-muted-foreground/60",
        highlighted && "text-foreground/85",
        className,
      )}
      aria-hidden
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 60"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        {layout === "carousel" && <CarouselGlyph accent={accent} />}
        {layout === "grid" && <GridGlyph accent={accent} />}
        {layout === "masonry" && <MasonryGlyph accent={accent} />}
        {layout === "list" && <ListGlyph accent={accent} />}
        {layout === "wall" && <WallGlyph accent={accent} />}
      </svg>
    </div>
  );
}

const PANEL_FILL = "currentColor";
const PANEL_OPACITY = 0.18;
const ACCENT_OPACITY = 0.85;

function CarouselGlyph({ accent }: { accent: string }) {
  return (
    <g>
      <rect
        x="6"
        y="14"
        width="22"
        height="32"
        rx="3"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY * 0.6}
      />
      <rect
        x="38"
        y="11"
        width="24"
        height="38"
        rx="3"
        fill={accent}
        opacity={ACCENT_OPACITY}
      />
      <rect
        x="72"
        y="14"
        width="22"
        height="32"
        rx="3"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY * 0.6}
      />
      {/* Dots */}
      <g opacity={0.6}>
        <circle cx="44" cy="55" r="1.4" fill={PANEL_FILL} />
        <circle cx="50" cy="55" r="1.4" fill={accent} opacity={1} />
        <circle cx="56" cy="55" r="1.4" fill={PANEL_FILL} />
      </g>
    </g>
  );
}

function GridGlyph({ accent }: { accent: string }) {
  const cells: { x: number; y: number; accent?: boolean }[] = [
    { x: 8, y: 10 },
    { x: 38, y: 10, accent: true },
    { x: 68, y: 10 },
    { x: 8, y: 32 },
    { x: 38, y: 32 },
    { x: 68, y: 32 },
  ];
  return (
    <g>
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width="24"
          height="18"
          rx="2.5"
          fill={c.accent ? accent : PANEL_FILL}
          opacity={c.accent ? ACCENT_OPACITY : PANEL_OPACITY}
        />
      ))}
    </g>
  );
}

function MasonryGlyph({ accent }: { accent: string }) {
  return (
    <g>
      <rect
        x="8"
        y="10"
        width="24"
        height="18"
        rx="2.5"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="8"
        y="32"
        width="24"
        height="18"
        rx="2.5"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="38"
        y="10"
        width="24"
        height="32"
        rx="2.5"
        fill={accent}
        opacity={ACCENT_OPACITY}
      />
      <rect
        x="38"
        y="46"
        width="24"
        height="6"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="68"
        y="10"
        width="24"
        height="12"
        rx="2.5"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="68"
        y="26"
        width="24"
        height="24"
        rx="2.5"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
    </g>
  );
}

function ListGlyph({ accent }: { accent: string }) {
  return (
    <g>
      <rect
        x="14"
        y="8"
        width="72"
        height="12"
        rx="2.5"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="14"
        y="24"
        width="72"
        height="12"
        rx="2.5"
        fill={accent}
        opacity={ACCENT_OPACITY}
      />
      <rect
        x="14"
        y="40"
        width="72"
        height="12"
        rx="2.5"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
    </g>
  );
}

function WallGlyph({ accent }: { accent: string }) {
  // Dense scattered grid — 4 cols × 3 rows with varying widths
  return (
    <g>
      <rect
        x="6"
        y="6"
        width="20"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="30"
        y="6"
        width="14"
        height="14"
        rx="2"
        fill={accent}
        opacity={ACCENT_OPACITY}
      />
      <rect
        x="48"
        y="6"
        width="20"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="72"
        y="6"
        width="22"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />

      <rect
        x="6"
        y="24"
        width="14"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="24"
        y="24"
        width="22"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="50"
        y="24"
        width="14"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="68"
        y="24"
        width="26"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />

      <rect
        x="6"
        y="42"
        width="22"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="32"
        y="42"
        width="14"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="50"
        y="42"
        width="22"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
      <rect
        x="76"
        y="42"
        width="18"
        height="14"
        rx="2"
        fill={PANEL_FILL}
        opacity={PANEL_OPACITY}
      />
    </g>
  );
}
