"use client";

/**
 * Density section — 3 visual cards showing testimonial-card heights at each
 * density level. The visual scale tells the story; no dropdowns needed.
 */

import * as React from "react";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";
import { DENSITY_LABELS, type WidgetDensity } from "@/lib/widgets/widget-types";
import { DENSITY_OPTIONS } from "@/lib/widgets/widget-presets";
import { SectionCollapsible, SwatchButton } from "./studio-primitives";

function DensityPreview({ density }: { density: WidgetDensity }) {
  const padding = density === "compact" ? 6 : density === "cozy" ? 9 : 12;
  return (
    <div className="flex h-full w-full items-center justify-center p-1.5">
      <div
        style={{
          padding,
          width: "100%",
          maxWidth: 64,
          background: "var(--card)",
          border:
            "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
          borderRadius: 4,
        }}
      >
        <div
          style={{
            height: 4,
            width: "55%",
            borderRadius: 2,
            background:
              "color-mix(in srgb, var(--foreground) 25%, transparent)",
            marginBottom: padding * 0.4,
          }}
        />
        <div
          style={{
            height: 3,
            width: "85%",
            borderRadius: 1.5,
            background:
              "color-mix(in srgb, var(--foreground) 14%, transparent)",
            marginBottom: 2,
          }}
        />
        <div
          style={{
            height: 3,
            width: "70%",
            borderRadius: 1.5,
            background:
              "color-mix(in srgb, var(--foreground) 14%, transparent)",
          }}
        />
      </div>
    </div>
  );
}

export function DensitySection({ widgetId }: { widgetId: string }) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const setDensity = useWidgetStudioStore((s) => s.setDensity);
  if (!draft) return null;

  return (
    <SectionCollapsible title="Density" defaultOpen={false}>
      <div className="grid grid-cols-3 gap-1.5">
        {DENSITY_OPTIONS.map((d) => (
          <SwatchButton
            key={d}
            selected={draft.tokens.density === d}
            onClick={() => setDensity(widgetId, d)}
            label={DENSITY_LABELS[d]}
            preview={<DensityPreview density={d} />}
          />
        ))}
      </div>
    </SectionCollapsible>
  );
}
