"use client";

import { useState } from "react";
import { CaretDown, CalendarBlank } from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  RANGE_PRESETS,
  RANGE_LABELS,
  formatRangeLabel,
} from "@/lib/analytics/range";
import type { AnalyticsRange } from "@/lib/analytics/types";
import type { DateRange } from "react-day-picker";

interface RangePickerProps {
  value: AnalyticsRange;
  customFrom?: string;
  customTo?: string;
  onChange: (range: AnalyticsRange, from?: string, to?: string) => void;
}

export function RangePicker({
  value,
  customFrom,
  customTo,
  onChange,
}: RangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(
    customFrom && customTo
      ? { from: new Date(customFrom), to: new Date(customTo) }
      : undefined,
  );
  const [customActive, setCustomActive] = useState(false);

  const label =
    value === "custom" && customFrom && customTo
      ? formatRangeLabel(
          "custom",
          new Date(customFrom),
          new Date(customTo),
        )
      : RANGE_LABELS[value];

  function handlePresetClick(preset: AnalyticsRange) {
    setCustomActive(false);
    setPendingRange(undefined);
    onChange(preset);
    setOpen(false);
  }

  function handleCustomApply() {
    if (!pendingRange?.from || !pendingRange?.to) return;
    onChange(
      "custom",
      pendingRange.from.toISOString().slice(0, 10),
      pendingRange.to.toISOString().slice(0, 10),
    );
    setOpen(false);
    setCustomActive(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-3 text-xs font-medium",
            "border-border/60 bg-card text-foreground",
            "hover:bg-secondary/50 hover:border-border",
            "transition-all duration-150",
          )}
        >
          <CalendarBlank weight="regular" className="size-3.5 text-muted-foreground" />
          <span className="max-w-[120px] truncate">{label}</span>
          <CaretDown
            weight="bold"
            className={cn(
              "size-3 text-muted-foreground transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto p-0 shadow-md"
        onEscapeKeyDown={() => setOpen(false)}
      >
        {!customActive ? (
          <div className="p-1.5">
            <div className="mb-1 px-2 pt-1 pb-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick ranges
              </p>
            </div>
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm",
                  "transition-colors duration-100",
                  "hover:bg-accent hover:text-accent-foreground",
                  value === preset && !customActive
                    ? "bg-brand/10 text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {RANGE_LABELS[preset]}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => setCustomActive(true)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm",
                "transition-colors duration-100",
                "hover:bg-accent hover:text-accent-foreground",
                value === "custom"
                  ? "bg-brand/10 text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              <CalendarBlank weight="regular" className="size-3.5" />
              Custom range
            </button>
          </div>
        ) : (
          <div className="p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Select date range
            </p>
            <Calendar
              mode="range"
              selected={pendingRange}
              onSelect={setPendingRange}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
              initialFocus
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => setCustomActive(false)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Back to presets
              </button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => {
                    setCustomActive(false);
                    setOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  disabled={!pendingRange?.from || !pendingRange?.to}
                  onClick={handleCustomApply}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
