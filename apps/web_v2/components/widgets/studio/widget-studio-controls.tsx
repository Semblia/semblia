"use client";

/**
 * WidgetInspectorPanel — renders one tab's controls for the active widget.
 *
 * Tab navigation is owned by the shared StudioFrame, so this is panel content
 * only (mirroring the Form Studio's FormInspectorPanel):
 *
 *   layout  → layout preset + layout-coupled behavior
 *   style   → the brand-theme appearance inspector
 *   content → curation (source / hand-pick) · card fields · wall page (wall kind)
 */

import * as React from "react";
import {
  Rows as LayoutIcon,
  PaintBrushBroad as StyleIcon,
  ListBullets as ContentIcon,
} from "@phosphor-icons/react";
import { type StudioTab } from "@/components/studio/studio-frame";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";

import { LayoutSection } from "./controls-layout";
import { AppearanceSection } from "./controls-appearance";
import { ContentSection } from "./controls-content";
import { BehaviorSection } from "./controls-behavior";
import { WallSection } from "./controls-wall";
import { VisibilitySection } from "./controls-visibility";

export type WidgetTabId = "layout" | "style" | "content";

/** Tab model consumed by the shared StudioFrame. */
export const WIDGET_TABS: ReadonlyArray<StudioTab<WidgetTabId>> = [
  { id: "layout", label: "Layout", icon: LayoutIcon },
  { id: "style", label: "Style", icon: StyleIcon },
  { id: "content", label: "Content", icon: ContentIcon },
];

export const WidgetInspectorPanel = React.memo(function WidgetInspectorPanel({
  widgetId,
  tab,
  approved,
}: {
  widgetId: string;
  tab: WidgetTabId;
  /** Real approved testimonials for the content picker (no demo fallback). */
  approved: WidgetTestimonial[];
}) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);

  if (!draft) return null;
  const isWall = draft.kind === "wall";

  return (
    <div className="pb-12">
      {tab === "layout" && (
        <>
          <LayoutSection widgetId={widgetId} />
          <BehaviorSection widgetId={widgetId} />
        </>
      )}
      {tab === "style" && <AppearanceSection widgetId={widgetId} />}
      {tab === "content" && (
        <>
          <ContentSection widgetId={widgetId} approved={approved} />
          <VisibilitySection widgetId={widgetId} />
          {isWall && <WallSection widgetId={widgetId} />}
        </>
      )}
    </div>
  );
});
