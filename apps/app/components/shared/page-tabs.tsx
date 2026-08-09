"use client";

import * as React from "react";
import { type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface PageTabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number | null;
  icon?: PhosphorIcon;
}

export interface PageTabsProps<T extends string = string> {
  options: PageTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  "aria-label"?: string;
}

export function PageTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: PageTabsProps<T>) {
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
              "group relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-medium",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand",
              "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full",
              "after:transition-[transform,opacity] after:duration-(--duration-base) after:ease-standard",
              on
                ? "text-foreground after:scale-x-100 after:bg-brand after:opacity-100"
                : "text-muted-foreground after:scale-x-0 after:bg-brand after:opacity-0 hover:text-foreground",
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
