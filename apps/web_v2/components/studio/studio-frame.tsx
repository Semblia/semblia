"use client";

/**
 * StudioFrame — the full-screen frame every Semblia Studio lives in.
 * (Rebuilt 2026-07-10 per docs/ui-rework/2026-07-10-studios-rebuild/.)
 *
 * Desktop (≥ lg):  Topbar + ( Outline? | Canvas-hero | Inspector )
 * Mobile  (< lg):  Topbar + ( Canvas or active panel ) + bottom tab bar
 *
 * Structure lives on the left (forms outline), configuration on the right —
 * the Figma/Typeform split. The inspector's section navigation is a compact
 * text tab strip at the top of the panel; a contextual view (e.g. a selected
 * field's editor) can replace the tabbed content entirely via `override`.
 */

import * as React from "react";
import { EyeIcon, RowsIcon, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-is-desktop";

export interface StudioTab<Id extends string = string> {
  id: Id;
  label: string;
  icon: PhosphorIcon;
}

type MobileView = "canvas" | "outline" | "panel";

interface StudioFrameProps<Id extends string> {
  ariaLabel: string;
  rootRef?: React.Ref<HTMLDivElement>;
  topbar: React.ReactNode;
  /** Optional left structure panel (the forms outline). */
  outline?: React.ReactNode;
  outlineLabel?: string;
  tabs: ReadonlyArray<StudioTab<Id>>;
  activeTab: Id;
  onTabChange: (id: Id) => void;
  /** Inspector body for the active tab. */
  renderInspector: (id: Id) => React.ReactNode;
  /**
   * Contextual override: when set, replaces the tab strip + tab content
   * (e.g. the selected field's editor). Provide your own back affordance.
   */
  override?: React.ReactNode;
  /** Key that identifies the override content (drives the crossfade). */
  overrideKey?: string;
  canvas: React.ReactNode;
}

export function StudioFrame<Id extends string>({
  ariaLabel,
  rootRef,
  topbar,
  outline,
  outlineLabel = "Fields",
  tabs,
  activeTab,
  onTabChange,
  renderInspector,
  override,
  overrideKey,
  canvas,
}: StudioFrameProps<Id>) {
  const isDesktop = useIsDesktop();
  const [mobileView, setMobileView] = React.useState<MobileView>("canvas");

  const inspectorBody = override ? (
    <div key={`ovr-${overrideKey ?? ""}`} className="tf-fade-in">
      {override}
    </div>
  ) : (
    <div key={activeTab} className="tf-fade-in">
      {renderInspector(activeTab)}
    </div>
  );

  const tabStrip = !override && (
    <div
      role="tablist"
      aria-label={`${ariaLabel} sections`}
      className="flex shrink-0 items-center gap-0.5 border-b border-border/60 px-2 pb-0 pt-1.5"
    >
      {tabs.map((t) => {
        const on = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`studio-tab-${t.id}`}
            aria-selected={on}
            aria-controls="studio-inspector-panel"
            onClick={() => onTabChange(t.id)}
            className={cn(
              "relative rounded-t px-2.5 pb-2 pt-1 text-xs transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              on
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground transition-opacity duration-100",
                on ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );

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
          {outline ? (
            <aside
              aria-label={outlineLabel}
              className="flex w-[240px] min-w-0 shrink-0 flex-col border-r border-border/80 bg-sidebar"
            >
              <div className="min-h-0 flex-1 overflow-y-auto">{outline}</div>
            </aside>
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Canvas">
            {canvas}
          </main>

          <aside
            aria-label="Inspector"
            className="flex w-[290px] shrink-0 flex-col border-l border-border/80 bg-sidebar"
          >
            {tabStrip}
            <div
              id="studio-inspector-panel"
              role={override ? undefined : "tabpanel"}
              aria-labelledby={override ? undefined : `studio-tab-${activeTab}`}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            >
              {inspectorBody}
            </div>
          </aside>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className={cn(
                "absolute inset-0 flex flex-col",
                mobileView === "canvas" ? "flex" : "hidden",
              )}
            >
              {canvas}
            </div>
            {outline ? (
              <div
                className={cn(
                  "absolute inset-0 overflow-y-auto bg-sidebar",
                  mobileView === "outline" ? "tf-fade-in block" : "hidden",
                )}
              >
                {outline}
              </div>
            ) : null}
            <div
              className={cn(
                "absolute inset-0 flex flex-col bg-sidebar",
                mobileView === "panel" ? "tf-fade-in flex" : "hidden",
              )}
            >
              {tabStrip}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {inspectorBody}
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Studio panels"
            className="flex h-12 shrink-0 border-t border-border bg-background"
          >
            <MobileTab
              icon={EyeIcon}
              label="Preview"
              active={mobileView === "canvas"}
              onClick={() => setMobileView("canvas")}
            />
            {outline ? (
              <MobileTab
                icon={RowsIcon}
                label={outlineLabel}
                active={mobileView === "outline"}
                onClick={() => setMobileView("outline")}
              />
            ) : null}
            {tabs.map((t) => (
              <MobileTab
                key={t.id}
                icon={t.icon}
                label={t.label}
                active={mobileView === "panel" && activeTab === t.id}
                onClick={() => {
                  onTabChange(t.id);
                  setMobileView("panel");
                }}
              />
            ))}
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
      <Icon className="size-4" weight={active ? "fill" : "regular"} aria-hidden />
      {label}
    </button>
  );
}
