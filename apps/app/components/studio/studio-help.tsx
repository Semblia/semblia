"use client";

/**
 * StudioHelp — a quiet "?" affordance in a studio topbar. Opens a popover that
 * lists the keyboard shortcuts and a one-line working tip, so the studio is
 * self-explanatory without a manual. Shared by the form + widget studios.
 */

import * as React from "react";
import { QuestionIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";

export interface StudioShortcut {
  keys: string[];
  label: string;
}

export function StudioHelp({
  shortcuts,
  tip,
  className,
  open,
  onOpenChange,
}: {
  shortcuts: StudioShortcut[];
  tip?: React.ReactNode;
  className?: string;
  /** Controlled open state, so the "?" hotkey can toggle the popover. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Keyboard shortcuts and tips"
          className={cn(
            "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            className,
          )}
        >
          <QuestionIcon className="size-4" weight="bold" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <PopoverHeader>
          <PopoverTitle className="text-xs">Shortcuts &amp; tips</PopoverTitle>
        </PopoverHeader>
        <ul className="flex flex-col gap-1.5">
          {shortcuts.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
            >
              <span>{s.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        {tip && (
          <p className="border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            {tip}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
