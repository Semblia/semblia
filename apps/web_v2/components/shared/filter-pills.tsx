"use client";

/**
 * FilterPills — segmented pill group used as a primary filter affordance.
 *
 * Replaces three near-identical implementations: WidgetList's filter pills,
 * Testimonials' status tabs (visually divergent — bottom-bar instead of pills),
 * and Projects' view-toggle. Two visual styles ship: the canonical "pill"
 * group (rounded chip with shadow on active) and a "tabs" variant for
 * section-style navigation rows like Analytics.
 */

import * as React from "react";
import { type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface FilterPillOption<T extends string = string> {
  /** Stable key used for value identity. */
  id: T;
  /** Visible label. */
  label: string;
  /** Optional inline count rendered after the label. */
  count?: number | null;
  /** Optional Phosphor icon component. */
  icon?: PhosphorIcon;
}

export interface FilterPillsProps<T extends string = string> {
  options: FilterPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * @deprecated `variant="tabs"` is superseded by `PageTabs` from `@/components/shared`.
   * Use `PageTabs` for all page-level section navigation. `variant="pill"` remains supported.
   */
  variant?: "pill" | "tabs";
  /** Smaller height. Used when the group sits inside a tight toolbar. */
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

export function FilterPills<T extends string = string>({
  options,
  value,
  onChange,
  variant = "pill",
  size = "md",
  className,
  "aria-label": ariaLabel,
}: FilterPillsProps<T>) {
  if (variant === "tabs") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "scrollbar-none flex min-w-0 items-center gap-0 overflow-x-auto",
          className,
        )}
      >
        {options.map((opt) => {
          const on = value === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(opt.id)}
              className={cn(
                "group relative inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium shrink-0",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand",
                "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full",
                "after:transition-[transform,opacity] after:duration-150 after:ease-standard",
                on
                  ? "text-foreground after:bg-brand after:scale-x-100 after:opacity-100"
                  : "text-muted-foreground hover:text-foreground after:bg-brand after:scale-x-0 after:opacity-0",
              )}
              style={{ transformOrigin: "left" }}
            >
              {Icon && (
                <Icon
                  weight={on ? "fill" : "regular"}
                  className={cn(
                    "size-3.5 transition-colors duration-150",
                    on
                      ? "text-brand"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
              )}
              {opt.label}
              {opt.count != null && opt.count > 0 && (
                <span className="font-mono text-[10px] tabular-nums opacity-60">
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: pill group
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border/70 bg-muted/40 p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const on = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 font-medium",
              size === "sm" ? "h-6 text-[11px]" : "h-7 text-[11.5px]",
              "transition-[background,color,box-shadow] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              on
                ? "bg-background text-foreground shadow-sm ring-1 ring-brand/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && (
              <Icon
                weight={on ? "fill" : "bold"}
                className={cn(
                  "size-3.5",
                  on ? "text-foreground" : "text-muted-foreground",
                )}
              />
            )}
            <span>{opt.label}</span>
            {opt.count != null && (
              <span className="font-mono text-[10px] opacity-60 tabular-nums">
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
