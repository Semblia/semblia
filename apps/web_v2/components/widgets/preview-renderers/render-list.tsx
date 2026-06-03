"use client";

import * as React from "react";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type {
  WidgetBehavior,
  WidgetVisibility,
} from "@/lib/widgets/widget-types";
import { TestimonialCard } from "./testimonial-card";

interface RenderListProps {
  items: WidgetTestimonial[];
  visibility: WidgetVisibility;
  behavior: WidgetBehavior;
  scale?: "default" | "mini";
}

export const RenderList = React.memo(function RenderList({
  items,
  visibility,
  behavior,
  scale = "default",
}: RenderListProps) {
  const display = items.slice(0, behavior.maxItems);
  if (display.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
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
