"use client";

/**
 * WidgetPreviewPane — shared by WidgetCard and WidgetRow. Renders the real
 * scaled widget when we have its config, with the synthetic layout glyph as a
 * defensive fallback.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  WidgetListEntry,
  WidgetStudioConfig,
} from "@/lib/widgets/widget-types";
import { FALLBACK_TESTIMONIALS } from "@/lib/widgets/widget-fallback-testimonials";
import { WidgetCardMiniPreview } from "./widget-card-mini-preview";
import { WidgetLayoutPreview } from "./widget-layout-preview";

export function WidgetPreviewPane({
  entry,
  previewConfig,
  className,
}: {
  entry: WidgetListEntry;
  previewConfig?: WidgetStudioConfig;
  className?: string;
}) {
  if (previewConfig) {
    return (
      <WidgetCardMiniPreview
        config={previewConfig}
        items={FALLBACK_TESTIMONIALS}
        className={cn(className, !entry.isActive && "opacity-50 grayscale")}
      />
    );
  }
  return (
    <WidgetLayoutPreview
      layout={entry.layout}
      kind={entry.kind}
      accent={entry.accent}
      theme={entry.theme}
      inactive={!entry.isActive}
      className={className}
    />
  );
}
