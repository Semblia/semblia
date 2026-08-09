"use client";

/**
 * Widget Studio panels (2026-07-17 reorg): CONTENT lives in the LEFT rail
 * (curation, card fields, wall copy), DESIGN lives in the RIGHT inspector
 * (Layout · Style) — mirroring the Form Studio's split, so editing content
 * never displaces the design hub.
 */

import * as React from "react";
import {
  Rows as LayoutIcon,
  PaintBrushBroad as StyleIcon,
} from "@phosphor-icons/react";
import { type StudioTab } from "@/components/studio/studio-frame";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";

import { TemplateSection } from "./controls-layout";
import { AppearanceSection } from "./controls-appearance";
import { ContentSection } from "./controls-content";
import { BehaviorSection } from "./controls-behavior";
import { WallSection } from "./controls-wall";
import { VisibilitySection } from "./controls-visibility";

export type WidgetTabId = "layout" | "style";

/** Tab model consumed by the shared StudioFrame — design only. */
export const WIDGET_TABS: ReadonlyArray<StudioTab<WidgetTabId>> = [
  { id: "layout", label: "Layout", icon: LayoutIcon },
  { id: "style", label: "Style", icon: StyleIcon },
];

/** The LEFT content rail: curation, card fields, and wall copy. */
export const WidgetContentRail = React.memo(function WidgetContentRail({
  widgetId,
  approved,
}: {
  widgetId: string;
  /** Real approved testimonials for the content picker (no demo fallback). */
  approved: WidgetTestimonial[];
}) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);

  if (!draft) return null;
  const isWall = draft.kind === "wall";

  return (
    <div className="pb-12">
      <ContentSection widgetId={widgetId} approved={approved} />
      <VisibilitySection widgetId={widgetId} />
      {isWall && <WallSection widgetId={widgetId} />}
    </div>
  );
});

export const WidgetInspectorPanel = React.memo(function WidgetInspectorPanel({
  widgetId,
  tab,
}: {
  widgetId: string;
  tab: WidgetTabId;
}) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);

  if (!draft) return null;

  return (
    <div className="pb-12">
      {tab === "layout" && (
        <>
          <TemplateSection widgetId={widgetId} />
          <BehaviorSection widgetId={widgetId} />
        </>
      )}
      {tab === "style" && <AppearanceSection widgetId={widgetId} />}
    </div>
  );
});
