"use client";

/**
 * SearchField — standard search input with leading icon + clear button.
 *
 * Replaces ad-hoc copies in `ProjectsToolbar` and `TestimonialsFilterBar` with
 * one shared shape: 28 px tall (h-7), text-xs, rounded-lg, focus-ring matches
 * the rest of the app. Width is controlled by parent (defaults to fluid).
 */

import * as React from "react";
import {
  MagnifyingGlass as SearchIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface SearchFieldProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "size"
> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible label. */
  ariaLabel?: string;
  /** Width preset. `"fixed"` ≈ max-w-xs (matches existing pages). */
  width?: "fixed" | "fluid";
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  ariaLabel,
  width = "fixed",
  className,
  ...rest
}: SearchFieldProps) {
  return (
    <div
      className={cn(
        "relative flex-1",
        width === "fixed" && "max-w-xs",
        className,
      )}
    >
      <SearchIcon
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-7 pl-8 pr-7 text-xs"
        {...rest}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 size-5 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-3" aria-hidden />
        </Button>
      )}
    </div>
  );
}
