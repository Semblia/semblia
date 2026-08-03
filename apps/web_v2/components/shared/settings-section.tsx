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
// Fields keep a readable measure (`max-w-2xl`) without constraining the page;
// sections whose content is genuinely wide (tables, tile grids, row lists)
// opt out with `wide`. `flush` additionally removes the body gutter so a
// divided list inside the section can run truly full-bleed; its rows then own
// the gutter themselves.

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
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="settings-section-enter border-b border-border"
      style={{ animationDelay: `${staggerIndex * 60}ms` }}
    >
      <SettingsSectionHeader
        id={id}
        title={title}
        description={description}
        actions={actions}
        danger={danger}
      />

      <div
        className={cn(
          flush ? "" : "space-y-5 px-4 sm:px-6",
          !flush && !wide && "max-w-2xl",
          footer ? "pb-5" : "pb-6",
        )}
      >
        {children}
      </div>

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

// Header band — title (danger-tinted for destructive sections), one-line
// description, and optional right-side actions.
function SettingsSectionHeader({
  id,
  title,
  description,
  actions,
  danger,
}: Pick<SettingsSectionProps, "id" | "title" | "description" | "actions"> & {
  danger: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-6 sm:px-6">
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
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
