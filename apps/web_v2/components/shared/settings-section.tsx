import * as React from "react";
import { cn } from "@/lib/utils";

// ── Settings section ───────────────────────────────────────────────────────────
//
// One category of a settings surface, on the app's full-bleed grid: sections
// stack with hairlines that run viewport-edge to viewport-edge, and content
// sits inside the app gutter (px-4 sm:px-6) — the same system the list pages
// use. The old floating bordered card is gone: a page of stacked cards made
// every category a box and the page a pile of boxes.
//
// Layout. A field needs a readable measure — a 1300 px text input is not a
// better input — but the old shape got there by capping the *whole section* at
// `max-w-2xl` and stacking the title above it, which on any normal desktop left
// two thirds of the page empty beside a narrow strip of controls. The measure
// is now the body's alone: from `lg` up, the title, description and actions
// move into a rail beside the fields, so the width carries the explanation
// instead of carrying nothing. Below `lg` it stacks exactly as before.
//
// `wide` and `flush` sections opt out of the rail entirely, because their
// content (tables, tile grids, divided row lists) is the thing that wants the
// page; they keep the stacked header band they always had.

export interface SettingsSectionProps {
  id: string;
  title: string;
  /** One-line description under the title — drives the section's hierarchy. */
  description?: React.ReactNode;
  /** Optional right-side header actions (e.g. "Add email" button). */
  actions?: React.ReactNode;
  /** Destructive sections (delete, transfer) render with a danger accent. */
  tone?: "default" | "danger";
  /**
   * Remove the body gutter so children (e.g. a divided list) run full-bleed.
   * Children then own their own row padding (px-4 sm:px-6).
   */
  flush?: boolean;
  /** Let the body span the full width (tables, tile grids). */
  wide?: boolean;
  /** Optional footer band (e.g. an inline note or a scoped action). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  staggerIndex?: number;
}

export function SettingsSection({
  id,
  title,
  description,
  actions,
  tone = "default",
  flush = false,
  wide = false,
  footer,
  children,
  staggerIndex = 0,
}: SettingsSectionProps) {
  const danger = tone === "danger";
  // Only a measured body has a rail to move the heading into; a table or a
  // divided list already spans the page and would leave the rail floating
  // beside content that does not line up with it.
  const railed = !flush && !wide;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="settings-section-enter border-b border-border"
      style={{ animationDelay: `${staggerIndex * 60}ms` }}
    >
      {railed ? (
        <div className="grid gap-x-10 gap-y-4 px-4 pb-6 pt-6 sm:px-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          {/* Below `lg` the rail collapses onto the fields, so actions keep
              their old place beside the title rather than pushing the first
              field a whole button further down a phone screen. From `lg` they
              sit under the description, inside the rail. */}
          <div className="flex min-w-0 items-start justify-between gap-4 lg:block">
            <SettingsSectionHeading
              id={id}
              title={title}
              description={description}
              danger={danger}
            />
            {actions && (
              <div className="shrink-0 lg:mt-4 lg:shrink">{actions}</div>
            )}
          </div>
          <div className="min-w-0 max-w-3xl space-y-5">{children}</div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-6 sm:px-6">
            <SettingsSectionHeading
              id={id}
              title={title}
              description={description}
              danger={danger}
            />
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
          <div className={cn(flush ? "" : "space-y-5 px-4 sm:px-6", "pb-6")}>
            {children}
          </div>
        </>
      )}

      {footer && (
        <div
          className={cn(
            "border-t px-4 py-3 text-xs text-muted-foreground sm:px-6",
            danger
              ? "border-destructive/20 bg-destructive/5"
              : "border-border/60 bg-surface",
          )}
        >
          {footer}
        </div>
      )}
    </section>
  );
}

// Title (danger-tinted for destructive sections) and its one-line description.
function SettingsSectionHeading({
  id,
  title,
  description,
  danger,
}: Pick<SettingsSectionProps, "id" | "title" | "description"> & {
  danger: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <h2
        id={`${id}-heading`}
        className={cn(
          "text-sm font-semibold tracking-tight",
          danger ? "text-destructive" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
