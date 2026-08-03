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
  /**
   * Mouse-only convenience: clicking anywhere in the shell activates it, but
   * the shell keeps its plain semantics.
   *
   * Use this instead of `onClick` whenever the row *contains* its own controls.
   * `onClick` makes the shell a `role="button"`, and a button containing a
   * checkbox and three more buttons is invalid to assistive technology — the
   * inner controls become unreachable as independent targets. The keyboard path
   * for these rows is a real control inside the row plus the list's own
   * `useListSelection` shortcuts.
   */
  onSurfaceClick?: (event: React.MouseEvent<HTMLElement>) => void;
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

/** Visual state shared by the class builders and data hooks below. */
interface ShellVisualState {
  shape: ItemShape;
  selected: boolean;
  bulkSelected: boolean;
  inactive: boolean;
  interactive: boolean;
}

/** Shape-specific chrome — radius, border, hover tint. */
function shellShapeClasses({ shape, interactive }: ShellVisualState) {
  return cn(
    // ── shape: card
    shape === "card" && [
      "flex flex-col overflow-hidden rounded-xl border bg-card",
      "border-border",
      interactive && "hover:border-foreground/25 hover:bg-muted/30",
    ],

    // ── shape: row
    shape === "row" && [
      "flex w-full items-stretch border-b border-border bg-transparent text-left",
      interactive && "cursor-pointer hover:bg-muted/40",
    ],
  );
}

/** State overlays layered on top of the shape chrome. */
function shellStateClasses({
  shape,
  selected,
  bulkSelected,
  inactive,
  interactive,
}: ShellVisualState) {
  return cn(
    // ── selected (master-detail)
    selected && shape === "row" && "bg-muted/60 hover:bg-muted/60",
    selected && shape === "card" && "border-foreground/30 shadow-sm",

    // ── bulk selected (testimonials)
    bulkSelected && "bg-brand/[0.04]",

    // ── inactive (paused)
    inactive && "opacity-65",

    // ── press affordance for interactive shells
    interactive && "active:scale-[0.997]",
  );
}

/** Visual data hooks for tests / dev tools, shared by every variant. */
function shellDataAttrs({
  shape,
  selected,
  bulkSelected,
  inactive,
}: ShellVisualState) {
  return {
    "data-shape": shape,
    "data-selected": selected || undefined,
    "data-bulk-selected": bulkSelected || undefined,
    "data-inactive": inactive || undefined,
  };
}

/** Default keyboard activation for the button-like variant. */
function activateOnKey(
  onClick: NonNullable<ItemShellProps["onClick"]>,
): (event: React.KeyboardEvent<HTMLElement>) => void {
  return (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e as unknown as React.MouseEvent<HTMLElement>);
    }
  };
}

export function ItemShell({
  shape,
  selected = false,
  bulkSelected = false,
  inactive = false,
  nonInteractive = false,
  href,
  onClick,
  onSurfaceClick,
  onKeyDown,
  role,
  tabIndex,
  as = "div",
  className,
  style,
  children,
  ...rest
}: ItemShellProps) {
  const interactive =
    !nonInteractive && Boolean(href || onClick || onSurfaceClick);
  const state: ShellVisualState = {
    shape,
    selected,
    bulkSelected,
    inactive,
    interactive,
  };
  const baseClass = cn(
    // ── shared
    "group/item-shell relative outline-none transition-[background,border-color,box-shadow,transform,opacity] duration-150 ease-out",
    "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0",
    shellShapeClasses(state),
    shellStateClasses(state),
    className,
  );
  const dataAttrs = shellDataAttrs(state);

  // ── Link variant ──
  if (href && !onClick) {
    return (
      <Link
        href={href}
        onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLAnchorElement>}
        aria-current={selected ? "true" : undefined}
        className={baseClass}
        style={style}
        {...dataAttrs}
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
        onKeyDown: onKeyDown ?? activateOnKey(onClick),
        "aria-current": selected ? "true" : undefined,
        className: baseClass,
        style,
        ...dataAttrs,
        ...rest,
      },
      children,
    );
  }

  // ── Plain shell — optionally click-activated for the mouse only ──
  return React.createElement(
    as,
    {
      role,
      onClick: onSurfaceClick,
      className: baseClass,
      style,
      ...dataAttrs,
      ...rest,
    },
    children,
  );
}
