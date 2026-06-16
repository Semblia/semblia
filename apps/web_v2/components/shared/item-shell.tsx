"use client";

/**
 * ItemShell — base building block for every list/grid item in the app.
 *
 * Consolidates the visual patterns previously hand-crafted across
 * ProjectCard / ProjectRow / WidgetCard / FormItem / TestimonialRow:
 *   • consistent border + hover + focus + active behavior
 *   • selected / inactive / dirty visual states
 *   • shape="card"  → rounded-xl, border, can host a preview slot
 *   • shape="row"   → flat, divider-friendly, denser
 *
 * Phase 4 and 5 compose <ItemCard> / <ItemRow> on top of this primitive.
 * In Phase 1 it ships unused except by the /design showcase.
 */

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type ItemShape = "card" | "row";

export interface ItemShellProps {
  /** Visual shape — drives radius, border, hover tint. */
  shape: ItemShape;
  /** Selected (master-detail or single-select) state. */
  selected?: boolean;
  /** Bulk-selected state (testimonials). */
  bulkSelected?: boolean;
  /** Faded / inactive state (paused widgets, paused forms). */
  inactive?: boolean;
  /** Disable interactive affordances entirely. */
  nonInteractive?: boolean;
  /** Make the entire shell a link. */
  href?: string;
  /** Make the entire shell a button. */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  /** ARIA role override (rarely needed). */
  role?: React.AriaRole;
  /** Accessible label, used when shell is interactive. */
  "aria-label"?: string;
  /** Pass-through for keyboard navigation. */
  tabIndex?: number;
  /** Element type override (article, li, etc). */
  as?: "div" | "article" | "li";
  /** Visual data hook for tests / dev tools. */
  "data-testid"?: string;
  /** Inline style — passed straight through to the underlying element. */
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}

export function ItemShell({
  shape,
  selected = false,
  bulkSelected = false,
  inactive = false,
  nonInteractive = false,
  href,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  as = "div",
  className,
  style,
  children,
  ...rest
}: ItemShellProps) {
  const interactive = !nonInteractive && (href || onClick);
  const baseClass = cn(
    // ── shared
    "group/item-shell relative outline-none transition-[background,border-color,box-shadow,transform,opacity] duration-150 ease-out",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0",

    // ── shape: card
    shape === "card" && [
      "flex flex-col overflow-hidden rounded-xl border bg-card",
      "border-border",
      interactive &&
        "hover:border-foreground/20 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]",
    ],

    // ── shape: row
    shape === "row" && [
      "flex w-full items-stretch border-b border-border bg-transparent text-left",
      interactive && "cursor-pointer hover:bg-muted/40",
    ],

    // ── selected (master-detail)
    selected && shape === "row" && "bg-muted/60 hover:bg-muted/60",
    selected && shape === "card" && "border-foreground/30 shadow-sm",

    // ── bulk selected (testimonials)
    bulkSelected && "bg-brand/[0.04]",

    // ── inactive (paused)
    inactive && "opacity-65",

    // ── press affordance for interactive shells
    interactive && "active:scale-[0.997]",

    className,
  );

  // ── Link variant ──
  if (href && !onClick) {
    return (
      <Link
        href={href}
        onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLAnchorElement>}
        aria-current={selected ? "true" : undefined}
        className={baseClass}
        style={style}
        data-shape={shape}
        data-selected={selected || undefined}
        data-bulk-selected={bulkSelected || undefined}
        data-inactive={inactive || undefined}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  // ── Button-like variant (click handler) ──
  if (onClick) {
    return React.createElement(
      as,
      {
        role: role ?? "button",
        tabIndex: tabIndex ?? 0,
        onClick,
        onKeyDown:
          onKeyDown ??
          ((e: React.KeyboardEvent<HTMLElement>) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick(e as unknown as React.MouseEvent<HTMLElement>);
            }
          }),
        "aria-current": selected ? "true" : undefined,
        className: baseClass,
        style,
        "data-shape": shape,
        "data-selected": selected || undefined,
        "data-bulk-selected": bulkSelected || undefined,
        "data-inactive": inactive || undefined,
        ...rest,
      },
      children,
    );
  }

  // ── Plain shell (no interaction) ──
  return React.createElement(
    as,
    {
      role,
      className: baseClass,
      style,
      "data-shape": shape,
      "data-selected": selected || undefined,
      "data-bulk-selected": bulkSelected || undefined,
      "data-inactive": inactive || undefined,
      ...rest,
    },
    children,
  );
}
