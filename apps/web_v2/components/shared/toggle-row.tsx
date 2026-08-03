"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

// ── Settings toggle row ──────────────────────────────────────────────────────
//
// A disabled toggle previously dimmed the whole row to 50% and set
// `pointer-events-none`, which made the explanation of *why* it was disabled
// unreadable and unselectable — the control and its reason vanished together.
// Now only the switch is inert; the label and its reason stay legible.

export interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /**
   * Why the toggle can't be used. Rendered in place, in the flow — a control
   * the user can't act on must say so where they are looking, not in a tooltip
   * on an element that takes no pointer events.
   */
  disabledReason?: string;
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  disabledReason,
}: ToggleRowProps) {
  const id = React.useId();
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 py-4 transition-colors duration-(--duration-base)",
        !disabled && "hover:bg-muted/40",
      )}
    >
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium",
            disabled
              ? "text-muted-foreground"
              : "cursor-pointer text-foreground",
          )}
        >
          {title}
        </label>
        <p
          id={`${id}-desc`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {disabled && disabledReason ? disabledReason : description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-describedby={`${id}-desc`}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}
