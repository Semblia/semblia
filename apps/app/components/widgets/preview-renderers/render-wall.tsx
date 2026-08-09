"use client";

import * as React from "react";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type {
  WallConfig,
  WidgetBehavior,
  WidgetVisibility,
} from "@/lib/widgets/widget-types";
import { TestimonialCard } from "./testimonial-card";

interface RenderWallProps {
  items: WidgetTestimonial[];
  visibility: WidgetVisibility;
  behavior: WidgetBehavior;
  /** Wall hero (only rendered for wall-kind widgets — embed walls skip it). */
  wall?: WallConfig | null;
  scale?: "default" | "mini";
}

export const RenderWall = React.memo(function RenderWall({
  items,
  visibility,
  behavior,
  wall,
  scale = "default",
}: RenderWallProps) {
  const display = items.slice(0, behavior.maxItems);
  if (display.length === 0) return null;

  const cols = scale === "mini" ? 4 : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: scale === "mini" ? 8 : 28,
        width: "100%",
        minWidth: 0,
      }}
    >
      {wall && (
        <header
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: scale === "mini" ? 4 : 10,
            paddingBottom: scale === "mini" ? 4 : 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--w-font-head)",
              fontSize:
                scale === "mini" ? "13px" : "calc(var(--w-fs-head) * 1.3)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--w-text)",
            }}
          >
            {wall.title}
          </h2>
          {wall.subhead && (
            <p
              style={{
                margin: 0,
                fontSize: scale === "mini" ? "8px" : "var(--w-fs-base)",
                color: "var(--w-text-soft)",
                lineHeight: 1.5,
                maxWidth: scale === "mini" ? "100%" : 560,
                marginInline: "auto",
              }}
            >
              {wall.subhead}
            </p>
          )}
        </header>
      )}

      <div
        style={{
          columnCount: cols,
          columnGap: scale === "mini" ? 4 : "var(--w-card-gap)",
          ...(scale === "default"
            ? { columnWidth: "220px" as React.CSSProperties["columnWidth"] }
            : null),
          width: "100%",
        }}
      >
        {display.map((t) => (
          <div
            key={t.id}
            style={{
              breakInside: "avoid",
              marginBottom: scale === "mini" ? 4 : "var(--w-card-gap)",
              display: "block",
            }}
          >
            <TestimonialCard
              testimonial={t}
              visibility={visibility}
              scale={scale === "mini" ? "mini" : "dense"}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
