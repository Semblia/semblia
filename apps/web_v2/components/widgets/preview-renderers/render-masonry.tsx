"use client";

import * as React from "react";
import type { MockTestimonial } from "@/lib/mock-data";
import type {
  WidgetBehavior,
  WidgetVisibility,
} from "@/lib/widgets/widget-types";
import { TestimonialCard } from "./testimonial-card";

interface RenderMasonryProps {
  items: MockTestimonial[];
  visibility: WidgetVisibility;
  behavior: WidgetBehavior;
  scale?: "default" | "mini";
}

export const RenderMasonry = React.memo(function RenderMasonry({
  items,
  visibility,
  behavior,
  scale = "default",
}: RenderMasonryProps) {
  const display = items.slice(0, behavior.maxItems);
  if (display.length === 0) return null;

  const cols = scale === "mini" ? 3 : 3;

  return (
    <div
      style={{
        columnCount: cols,
        columnGap: scale === "mini" ? 4 : "var(--w-card-gap)",
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
            scale={scale === "mini" ? "mini" : "default"}
          />
        </div>
      ))}
    </div>
  );
});
