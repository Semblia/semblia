"use client";

/**
 * WidgetStudioControls — a focused, section-switched inspector.
 *
 * One concern at a time, mirroring the Form Studio rebuild. A top section nav
 * (Layout · Style · Content) replaces the old six-deep accordion: each tab shows
 * a small, coherent group of sections beside the live production preview.
 *
 *   Layout  → layout preset + layout-coupled behavior
 *   Style   → the brand-theme appearance inspector (visual pickers)
 *   Content → curation (source / hand-pick) · card fields · wall page (wall kind)
 *
 * On small screens the shell drives the section via `mobileSection` and renders
 * its own bottom tab bar, so the in-panel nav is desktop-only.
 */

import * as React from "react";
import {
  Rows as LayoutIcon,
  PaintBrushBroad as StyleIcon,
  ListBullets as ContentIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { StudioMark } from "@/components/shared";
import {
  findSlugForWidget,
  useWidgetStudioStore,
} from "@/lib/widgets/widget-studio-store";

import { LayoutSection } from "./controls-layout";
import { AppearanceSection } from "./controls-appearance";
import { ContentSection } from "./controls-content";
import { BehaviorSection } from "./controls-behavior";
import { WallSection } from "./controls-wall";
import { VisibilitySection } from "./controls-visibility";

type StudioSection = "layout" | "style" | "content";

const SECTIONS: { id: StudioSection; label: string; Icon: PhosphorIcon }[] = [
  { id: "layout", label: "Layout", Icon: LayoutIcon },
  { id: "style", label: "Style", Icon: StyleIcon },
  { id: "content", label: "Content", Icon: ContentIcon },
];

interface WidgetStudioControlsProps {
  widgetId: string;
  /** When set, only that section group renders (mobile tab views). */
  mobileSection?: StudioSection;
}

export const WidgetStudioControls = React.memo(function WidgetStudioControls({
  widgetId,
  mobileSection,
}: WidgetStudioControlsProps) {
  const draft = useWidgetStudioStore((s) => s.snapshots[widgetId]?.draft);
  const slug = useWidgetStudioStore((s) => findSlugForWidget(s, widgetId));
  const [active, setActive] = React.useState<StudioSection>("layout");

  if (!draft) return null;
  const isWall = draft.kind === "wall";

  // Which section to show: shell-driven on mobile, in-panel nav on desktop.
  const section = mobileSection ?? active;

  const body = (
    <div className="divide-y divide-border/60">
      {section === "layout" && (
        <>
          <LayoutSection widgetId={widgetId} />
          <BehaviorSection widgetId={widgetId} />
        </>
      )}
      {section === "style" && <AppearanceSection widgetId={widgetId} />}
      {section === "content" && (
        <>
          {slug && <ContentSection widgetId={widgetId} projectSlug={slug} />}
          <VisibilitySection widgetId={widgetId} />
          {isWall && <WallSection widgetId={widgetId} />}
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-sidebar font-sans">
      <Header />
      {/* Desktop section nav (mobile uses the shell's bottom tab bar). */}
      {!mobileSection && <SectionNav active={active} onChange={setActive} />}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {body}
        <div className="h-12" />
      </div>
    </div>
  );
});

function SectionNav({
  active,
  onChange,
}: {
  active: StudioSection;
  onChange: (s: StudioSection) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Studio sections"
      className="flex shrink-0 items-stretch gap-1 border-b border-border/60 px-2"
    >
      {SECTIONS.map(({ id, label, Icon }) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[12px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-inset",
              on
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon
              className="size-3.5"
              weight={on ? "bold" : "regular"}
              aria-hidden
            />
            {label}
            {on && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Header() {
  return (
    <StudioMark
      className="px-5 pt-4 pb-3"
      name="Widget Studio"
      status="Design & embed"
      icon={
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
      }
    />
  );
}
