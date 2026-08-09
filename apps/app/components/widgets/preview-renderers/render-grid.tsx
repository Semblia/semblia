"use client";

import * as React from "react";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type {
  WidgetBehavior,
  WidgetVisibility,
} from "@/lib/widgets/widget-types";
import { TestimonialCard } from "./testimonial-card";

interface RenderGridProps {
  items: WidgetTestimonial[];
  visibility: WidgetVisibility;
  behavior: WidgetBehavior;
  scale?: "default" | "mini";
  columns?: 2 | 3;
}

export const RenderGrid = React.memo(function RenderGrid({
  items,
  visibility,
  behavior,
  scale = "default",
  columns = 3,
}: RenderGridProps) {
  const display = items.slice(0, behavior.maxItems);
  if (display.length === 0) return null;

  const minCol = scale === "mini" ? 60 : 220;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          scale === "mini"
            ? `repeat(${columns}, minmax(0, 1fr))`
            : `repeat(auto-fit, minmax(${minCol}px, 1fr))`,
        gap: scale === "mini" ? 4 : "var(--w-card-gap)",
        width: "100%",
        minWidth: 0,
      }}
    >
      {display.map((t) => (
        <TestimonialCard
          key={t.id}
          testimonial={t}
          visibility={visibility}
          scale={scale === "mini" ? "mini" : "default"}
        />
      ))}
    </div>
  );
});
