"use client";

/**
 * BulkActionBar — appears on the first selection, and only then.
 *
 * It states the scope in words ("4 of 30 pending responses") rather than a bare
 * count, because a bulk action is the one moment where the difference between
 * "what I selected" and "what this will touch" matters. Cancel is explicit and
 * always present; destructive actions sit last, behind a separator.
 */

import * as React from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface BulkAction {
  id: string;
  label: string;
  onClick: () => void;
  tone?: "default" | "destructive";
  disabled?: boolean;
  /** Why the action is unavailable. Shown in place — never a bare disabled control. */
  disabledReason?: string;
}

export interface BulkActionBarProps {
  count: number;
  /** What the selection is drawn from — "pending responses", "widgets". */
  scopeLabel: string;
  /** Total currently listed, so the bar can say "4 of 30". */
  scopeTotal?: number;
  actions: BulkAction[];
  onClear: () => void;
  busy?: boolean;
  className?: string;
}

export function BulkActionBar({
  count,
  scopeLabel,
  scopeTotal,
  actions,
  onClear,
  busy = false,
  className,
}: BulkActionBarProps) {
  if (count === 0) return null;

  const primary = actions.filter((a) => a.tone !== "destructive");
  const destructive = actions.filter((a) => a.tone === "destructive");

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className={cn(
        "ink-rise sticky bottom-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-card px-4 py-2.5 sm:px-6",
        className,
      )}
    >
      <p className="text-xs font-medium tabular-nums text-foreground">
        {count} {scopeTotal !== undefined ? `of ${scopeTotal} ` : ""}
        {scopeLabel} selected
      </p>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {primary.map((action) => (
          <BulkButton key={action.id} action={action} busy={busy} />
        ))}

        {destructive.length > 0 && (
          <>
            <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
            {destructive.map((action) => (
              <BulkButton key={action.id} action={action} busy={busy} />
            ))}
          </>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onClear}
          disabled={busy}
        >
          <X className="size-3" weight="bold" aria-hidden />
          Cancel
        </Button>
      </div>
    </div>
  );
}

function BulkButton({ action, busy }: { action: BulkAction; busy: boolean }) {
  const disabled = busy || action.disabled;
  return (
    <Button
      size="sm"
      variant={action.tone === "destructive" ? "ghost" : "outline"}
      className={cn(
        "h-7 px-2.5 text-xs",
        action.tone === "destructive" &&
          "text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
      disabled={disabled}
      onClick={action.onClick}
      title={action.disabled ? action.disabledReason : undefined}
      aria-describedby={
        action.disabled && action.disabledReason
          ? `${action.id}-reason`
          : undefined
      }
    >
      {action.label}
      {action.disabled && action.disabledReason && (
        <span id={`${action.id}-reason`} className="sr-only">
          {action.disabledReason}
        </span>
      )}
    </Button>
  );
}

/**
 * SelectionCheckbox — hover-revealed, keyboard-reachable.
 *
 * Visible when the row is hovered, highlighted, or selected; otherwise it stays
 * out of the way so an unselected list reads as content, not as a form. It is
 * never hidden from the tab order, only from sight.
 */
export function SelectionCheckbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (event: React.MouseEvent) => void;
  /** Names the row, so "Select Ada Lovelace" not "Select". */
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onClick={onChange}
        onChange={() => {
          /* click handler owns the range-extend modifier */
        }}
        className={cn(
          "size-3.5 cursor-pointer rounded-[4px] border-border accent-brand transition-opacity duration-(--duration-base)",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          checked
            ? "opacity-100"
            : "opacity-0 group-hover/item-shell:opacity-100 group-data-[highlighted]/item-shell:opacity-100 focus-visible:opacity-100",
        )}
      />
    </span>
  );
}
