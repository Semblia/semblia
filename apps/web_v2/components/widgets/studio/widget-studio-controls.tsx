"use client";

/**
 * WidgetInspectorPanel — renders one section's controls for the active widget.
 *
 * Section navigation is owned by the shared StudioRail in the shell, so this is
 * panel content only (mirroring the Form Studio's FormInspectorPanel):
 *
 *   setup   → name · kind · placement (walls: the hosted page settings)
 *   layout  → layout preset + layout-coupled behavior (count, rotation)
 *   content → curation (source / hand-pick) · card fields
 *   design  → the brand-theme appearance inspector (visual pickers) + footer
 *   publish → live state · publish action · snippet or public link
 */

import * as React from "react";
import {
  SlidersHorizontal as SetupIcon,
  Rows as LayoutIcon,
  ListBullets as ContentIcon,
  PaintBrushBroad as DesignIcon,
  RocketLaunch as PublishIcon,
} from "@phosphor-icons/react";
import { type StudioSection } from "@/components/studio/studio-rail";
import type { StudioStatus } from "@/components/studio/studio-topbar";
import type { WidgetTestimonial } from "@/lib/widgets/widget-testimonial-type";
import { useWidgetStudioStore } from "@/lib/widgets/widget-studio-store";

import { SetupSection } from "./controls-setup";
import { LayoutSection } from "./controls-layout";
import { AppearanceSection } from "./controls-appearance";
import { ContentSection } from "./controls-content";
import { BehaviorSection } from "./controls-behavior";
import { WallSection } from "./controls-wall";
import { VisibilitySection } from "./controls-visibility";
import { PublishSection } from "./controls-publish";

export type WidgetSectionId =
  | "setup"
  | "layout"
  | "content"
  | "design"
  | "publish";

/** Section model consumed by the shared StudioRail. */
export const WIDGET_SECTIONS: ReadonlyArray<StudioSection<WidgetSectionId>> = [
  { id: "setup", label: "Setup", icon: SetupIcon },
  { id: "layout", label: "Layout", icon: LayoutIcon },
  { id: "content", label: "Content", icon: ContentIcon },
  { id: "design", label: "Design", icon: DesignIcon },
  { id: "publish", label: "Publish", icon: PublishIcon },
];

/** Server-backed studio context the Setup + Content + Publish panels need. */
export interface WidgetStudioContext {
  /** Real approved + published responses (no sample top-up). */
  approved: WidgetTestimonial[];
  status: StudioStatus;
  publishing: boolean;
  onPublish: () => void;
  /** Renames the widget (store + server). */
  onRename: (name: string) => void;
}

export const WidgetInspectorPanel = React.memo(function WidgetInspectorPanel({
  widgetId,
  section,
  studio,
}: {
  widgetId: string;
  section: WidgetSectionId;
  studio: WidgetStudioContext;
}) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);

  if (!draft) return null;
  const isWall = draft.kind === "wall";

  return (
    <div className="divide-y divide-border/60">
      {section === "setup" && (
        <>
          <SetupSection widgetId={widgetId} onRename={studio.onRename} />
          {isWall && <WallSection widgetId={widgetId} />}
        </>
      )}
      {section === "layout" && (
        <>
          <LayoutSection widgetId={widgetId} />
          <BehaviorSection widgetId={widgetId} />
        </>
      )}
      {section === "content" && (
        <>
          <ContentSection widgetId={widgetId} approved={studio.approved} />
          <VisibilitySection widgetId={widgetId} />
        </>
      )}
      {section === "design" && <AppearanceSection widgetId={widgetId} />}
      {section === "publish" && (
        <PublishSection widgetId={widgetId} studio={studio} />
      )}
      <div className="h-12" />
    </div>
  );
});
