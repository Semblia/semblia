"use client";

/**
 * WidgetStudioControls — orchestrates the section accordion.
 *
 * Section order is intentional:
 *   1. Layout       (highest signal-to-tweak ratio)
 *   2. Style preset (single-tap to reframe everything)
 *   3. Theme        (light/dark/auto)
 *   4. Color
 *   5. Wall         (only for wall-kind widgets)
 *   6. Content      (testimonial picker)
 *   7. Behavior     (auto-rotate, max items, branding)
 *   8. Typography
 *   9. Shape        (radius + card style)
 *   10. Density
 *   11. Visibility (card field toggles)
 */

import * as React from "react";
import {
  findSlugForWidget,
  useWidgetStudioStore,
} from "@/lib/widgets/widget-studio-store";

import { LayoutSection } from "./controls-layout";
import { StyleSection } from "./controls-style";
import { ThemeSection } from "./controls-theme";
import { ColorSection } from "./controls-color";
import { TypographySection } from "./controls-typography";
import { ShapeSection } from "./controls-shape";
import { DensitySection } from "./controls-density";
import { ContentSection } from "./controls-content";
import { BehaviorSection } from "./controls-behavior";
import { WallSection } from "./controls-wall";
import { VisibilitySection } from "./controls-visibility";

type MobileSection = "layout" | "style" | "content";

interface WidgetStudioControlsProps {
  widgetId: string;
  /** When set, only that section group renders (mobile tab views). */
  mobileSection?: MobileSection;
}

export const WidgetStudioControls = React.memo(function WidgetStudioControls({
  widgetId,
  mobileSection,
}: WidgetStudioControlsProps) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const slug = useWidgetStudioStore((s) => findSlugForWidget(s, widgetId));

  if (!draft) return null;
  const isWall = draft.kind === "wall";

  // Mobile: render only the relevant slice for the active tab.
  if (mobileSection === "layout") {
    return (
      <Frame>
        <LayoutSection widgetId={widgetId} />
        <BehaviorSection widgetId={widgetId} />
        {isWall && <WallSection widgetId={widgetId} />}
      </Frame>
    );
  }

  if (mobileSection === "style") {
    return (
      <Frame>
        <StyleSection widgetId={widgetId} />
        <ThemeSection widgetId={widgetId} />
        <ColorSection widgetId={widgetId} />
        <TypographySection widgetId={widgetId} />
        <ShapeSection widgetId={widgetId} />
        <DensitySection widgetId={widgetId} />
      </Frame>
    );
  }

  if (mobileSection === "content") {
    return (
      <Frame>
        {slug && <ContentSection widgetId={widgetId} projectSlug={slug} />}
        <VisibilitySection widgetId={widgetId} />
      </Frame>
    );
  }

  // Desktop: full stack.
  return (
    <Frame>
      <LayoutSection widgetId={widgetId} />
      <StyleSection widgetId={widgetId} />
      <ThemeSection widgetId={widgetId} />
      <ColorSection widgetId={widgetId} />
      {isWall && <WallSection widgetId={widgetId} />}
      {slug && <ContentSection widgetId={widgetId} projectSlug={slug} />}
      <BehaviorSection widgetId={widgetId} />
      <TypographySection widgetId={widgetId} />
      <ShapeSection widgetId={widgetId} />
      <DensitySection widgetId={widgetId} />
      <VisibilitySection widgetId={widgetId} />

      {/* Bottom breathing room */}
      <div className="h-12" />
    </Frame>
  );
});

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-sidebar font-sans">
      <Header />
      {children}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
      <div className="flex size-7 items-center justify-center rounded-lg bg-foreground/95 text-background">
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
          <rect
            x="9"
            y="2"
            width="5"
            height="5"
            rx="1"
            fill="currentColor"
            opacity="0.55"
          />
          <rect
            x="2"
            y="9"
            width="5"
            height="5"
            rx="1"
            fill="currentColor"
            opacity="0.55"
          />
          <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" />
        </svg>
      </div>
      <div>
        <div className="text-[13px] font-bold tracking-tight text-foreground">
          Widget Studio
        </div>
        <div className="mt-px font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          v0.1 · preview
        </div>
      </div>
    </div>
  );
}
