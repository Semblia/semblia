"use client";

/**
 * SectionNav — the canonical route sub-navigation for a section with many
 * destinations (Settings, Developers, ...).
 *
 * Research-backed shape: a section with >6 destinations is navigated by a
 * VERTICAL rail that shows every option at once (NN/g), not a horizontal
 * scroll-tab strip (an anti-pattern past ~6 tabs). On mobile, where a rail
 * costs too much width, it falls back to a horizontal scroll strip.
 *
 * One config drives both presentations. Replaces the two hand-copied `SubTabs`
 * blocks that used to live in `settings-shell` and `developer-shell`.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowSquareOutIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  /** Stable id, matched against `active`. */
  id: string;
  label: string;
  /** Fully-resolved href (slug already injected by the config builder). */
  href: string;
  icon: PhosphorIcon;
  badge?: number | null;
  /** Render as an external link (out-arrow, new tab, never "active"). */
  external?: boolean;
  /** Draw a thin divider above this item (e.g. before destructive actions). */
  dividerBefore?: boolean;
}

export interface SectionNavProps {
  items: SectionNavItem[];
  /** id of the active item. */
  active: string;
  variant?: "vertical" | "horizontal";
  "aria-label"?: string;
  className?: string;
}

export function SectionNav({
  items,
  active,
  variant = "vertical",
  "aria-label": ariaLabel,
  className,
}: SectionNavProps) {
  const horizontal = variant === "horizontal";

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        horizontal
          ? "scrollbar-none flex items-center gap-0 overflow-x-auto"
          : "flex flex-col gap-0.5 p-3",
        className,
      )}
    >
      {items.map((item) => (
        <SectionNavRow
          key={item.id}
          item={item}
          active={!item.external && item.id === active}
          horizontal={horizontal}
        />
      ))}
    </nav>
  );
}

function SectionNavRow({
  item,
  active,
  horizontal,
}: {
  item: SectionNavItem;
  active: boolean;
  horizontal: boolean;
}) {
  const Icon = item.icon;

  // Horizontal: bottom-border indicator (compact strip).
  const horizontalCls = cn(
    "group relative inline-flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-medium",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand",
    "after:absolute after:-bottom-px after:left-0 after:h-[2px] after:w-full after:rounded-full",
    "after:transition-[transform,opacity] after:duration-(--duration-base) after:ease-standard",
    active
      ? "text-foreground after:scale-x-100 after:bg-brand after:opacity-100"
      : "text-muted-foreground after:scale-x-0 after:bg-brand after:opacity-0 hover:text-foreground",
  );

  // Vertical: filled row + left brand bar (matches the account section rail).
  const verticalCls = cn(
    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ring/50",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );

  const iconCls = cn(
    "size-3.5 shrink-0 transition-colors duration-150",
    active
      ? horizontal
        ? "text-brand"
        : "text-foreground"
      : "text-muted-foreground/80 group-hover:text-foreground",
  );

  const inner = (
    <>
      {!horizontal && active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand"
          aria-hidden
        />
      )}
      <Icon weight={active ? "fill" : "regular"} className={iconCls} />
      <span className={cn("truncate", !horizontal && "flex-1")}>
        {item.label}
      </span>
      {item.external && (
        <ArrowSquareOutIcon
          className="size-3 text-muted-foreground/70"
          aria-hidden
        />
      )}
      {item.badge != null && item.badge > 0 && (
        <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-warning">
          {item.badge}
        </span>
      )}
    </>
  );

  const className = horizontal ? horizontalCls : verticalCls;

  // A divider only makes sense in the vertical rail.
  const wrapWithDivider = (node: React.ReactNode) =>
    item.dividerBefore && !horizontal ? (
      <React.Fragment key={item.id}>
        <span className="my-1 h-px bg-border" aria-hidden />
        {node}
      </React.Fragment>
    ) : (
      node
    );

  if (item.external) {
    return wrapWithDivider(
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer noopener"
        className={className}
        style={horizontal ? { transformOrigin: "left" } : undefined}
      >
        {inner}
      </a>,
    );
  }

  return wrapWithDivider(
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={className}
      style={horizontal ? { transformOrigin: "left" } : undefined}
    >
      {inner}
    </Link>,
  );
}
