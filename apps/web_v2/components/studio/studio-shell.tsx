"use client";

/**
 * StudioShell — the shared full-screen frame every Semblia Studio lives in.
 *
 * One skeleton, two surfaces. Replaces the divergent forms (2-pane) and widget
 * (3-pane) layouts with a single responsive shell:
 *
 *   Desktop (≥ lg):  Topbar + ( Rail | Inspector | Preview-canvas )
 *   Mobile  (< lg):  Topbar + ( active panel ) + bottom tab bar
 *
 * The shell owns layout + section navigation; consumers own the topbar, the
 * per-section inspector content, and the preview. The preview is the hero — it
 * takes all remaining space.
 */

import * as React from "react";
import { EyeIcon, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { StudioRail, type StudioSection } from "./studio-rail";

type MobileView = "panel" | "preview";

interface StudioShellProps<Id extends string> {
  ariaLabel: string;
  rootRef?: React.Ref<HTMLDivElement>;
  topbar: React.ReactNode;
  sections: ReadonlyArray<StudioSection<Id>>;
  activeSection: Id;
  onSectionChange: (id: Id) => void;
  /** Renders the inspector body for the active section. */
  renderInspector: (id: Id) => React.ReactNode;
  preview: React.ReactNode;
  /** Width of the inspector column on desktop. */
  inspectorWidthClass?: string;
}

export function StudioShell<Id extends string>({
  ariaLabel,
  rootRef,
  topbar,
  sections,
  activeSection,
  onSectionChange,
  renderInspector,
  preview,
  inspectorWidthClass = "w-[340px]",
}: StudioShellProps<Id>) {
  const isDesktop = useIsDesktop();
  const [mobileView, setMobileView] = React.useState<MobileView>("preview");

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      {topbar}

      {isDesktop ? (
        <div className="flex min-h-0 flex-1">
          <StudioRail
            sections={sections}
            active={activeSection}
            onChange={onSectionChange}
          />
          <aside
            className={cn(
              "flex min-h-0 shrink-0 flex-col border-r border-border bg-sidebar",
              inspectorWidthClass,
            )}
            aria-label="Inspector"
          >
            <div
              id="studio-inspector-panel"
              role="tabpanel"
              aria-labelledby={`studio-rail-${activeSection}`}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {renderInspector(activeSection)}
            </div>
          </aside>
          <main className="flex min-h-0 flex-1 flex-col" aria-label="Preview">
            {preview}
          </main>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className={cn(
                "absolute inset-0 overflow-y-auto",
                mobileView === "panel" ? "block" : "hidden",
              )}
            >
              {renderInspector(activeSection)}
            </div>
            <div
              className={cn(
                "absolute inset-0",
                mobileView === "preview" ? "block" : "hidden",
              )}
            >
              {preview}
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Studio panels"
            className="flex h-12 shrink-0 border-t border-border bg-background"
          >
            {sections.map((s) => (
              <MobileTab
                key={s.id}
                icon={s.icon}
                label={s.label}
                active={mobileView === "panel" && activeSection === s.id}
                onClick={() => {
                  onSectionChange(s.id);
                  setMobileView("panel");
                }}
              />
            ))}
            <MobileTab
              icon={EyeIcon}
              label="Preview"
              active={mobileView === "preview"}
              onClick={() => setMobileView("preview")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MobileTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: PhosphorIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon
        className="size-4"
        weight={active ? "fill" : "regular"}
        aria-hidden
      />
      {label}
    </button>
  );
}
