"use client";

import * as React from "react";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import type {
  WidgetBehavior,
  WidgetVisibility,
} from "@/lib/widgets/widget-types";
import { TestimonialCard } from "./testimonial-card";

interface RenderCarouselProps {
  items: WidgetTestimonial[];
  visibility: WidgetVisibility;
  behavior: WidgetBehavior;
  /** Disable auto-rotate (used inside the mini-preview). */
  staticMode?: boolean;
  /** Lower-fidelity rendering inside the mini-preview. */
  scale?: "default" | "mini";
}

export const RenderCarousel = React.memo(function RenderCarousel({
  items,
  visibility,
  behavior,
  staticMode = false,
  scale = "default",
}: RenderCarouselProps) {
  const display = items.slice(0, behavior.maxItems);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (staticMode || !behavior.autoRotate || display.length <= 1) return;
    const id = window.setInterval(
      () => {
        setActive((i) => (i + 1) % display.length);
      },
      Math.max(1500, behavior.rotateInterval),
    );
    return () => window.clearInterval(id);
  }, [
    staticMode,
    behavior.autoRotate,
    behavior.rotateInterval,
    display.length,
  ]);

  // Reset active when items change.
  React.useEffect(() => {
    if (active >= display.length) setActive(0);
  }, [display.length, active]);

  if (display.length === 0) return null;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: scale === "mini" ? 6 : 14,
        minWidth: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          minWidth: 0,
        }}
      >
        {display.map((t, i) => (
          <div
            key={t.id}
            aria-hidden={i !== active}
            style={{
              position: i === active ? "relative" : "absolute",
              inset: i === active ? undefined : 0,
              opacity: i === active ? 1 : 0,
              transition: "opacity 360ms cubic-bezier(0.23, 1, 0.32, 1)",
              willChange: "opacity",
              pointerEvents: i === active ? "auto" : "none",
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

      {/* Dots */}
      {display.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: scale === "mini" ? 3 : 6,
          }}
          aria-label="Carousel pagination"
        >
          {display.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === active}
              style={{
                width: scale === "mini" ? 4 : 6,
                height: scale === "mini" ? 4 : 6,
                borderRadius: "50%",
                background:
                  i === active ? "var(--w-accent)" : "var(--w-line-50)",
                border: "none",
                padding: 0,
                cursor: scale === "mini" ? "default" : "pointer",
                transition: "background 200ms ease-out",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
