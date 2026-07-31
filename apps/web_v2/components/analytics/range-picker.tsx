"use client";

/**
 * RangePicker — the control that scopes every number on the page.
 *
 * Two defects, both about the date the user picked not being the date that was
 * sent. `toISOString().slice(0, 10)` on a locally-constructed calendar day
 * sends the *previous* day for anyone at a positive UTC offset — including this
 * repo's own timezone — and `resolveRange` compounded it by parsing the start
 * as UTC midnight and the end with an explicit `T23:59:59.999Z`. Both ends are
 * local calendar days now, formatted by `formatLocalDay`.
 *
 * And the API aggregates at most a year, which the dashboard used to enforce by
 * silently clamping while the trigger went on reading the full span the user
 * chose. The calendar disables what can't be requested instead.
 *
 * The third defect is the one the calendar bounds hid. `GET
 * /analytics/dashboard` takes a day *count* — there is no `since`/`until` — so
 * the only window it can aggregate is one ending now. A custom range ending in
 * the past was sent as a trailing window of the same length, and every number
 * on the page then described the last N days under a trigger reading
 * "Jan 1 – Jan 31". Offering that selection is offering an action the API
 * refuses, so it is inert with the reason stated in place, and the trigger
 * label is derived from the window that was actually requested rather than
 * from the raw query parameters.
 */

import * as React from "react";
import { CalendarBlank, CaretDown } from "@phosphor-icons/react";
import type { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  MAX_RANGE_DAYS,
  RANGE_LABELS,
  RANGE_PRESETS,
  formatLocalDay,
  formatRangeLabel,
  parseLocalDay,
  resolveRange,
} from "@/lib/analytics/range";
import type { AnalyticsRange } from "@/lib/analytics/types";

interface RangePickerProps {
  value: AnalyticsRange;
  customFrom?: string;
  customTo?: string;
  onChange: (range: AnalyticsRange, from?: string, to?: string) => void;
}

function selectedRange(from?: string, to?: string): DateRange | undefined {
  const start = from ? parseLocalDay(from) : null;
  const end = to ? parseLocalDay(to) : null;
  return start && end ? { from: start, to: end } : undefined;
}

export function RangePicker({
  value,
  customFrom,
  customTo,
  onChange,
}: RangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [customActive, setCustomActive] = React.useState(false);
  const [pending, setPending] = React.useState<DateRange | undefined>(() =>
    selectedRange(customFrom, customTo),
  );

  // Reopening the custom pane shows what is actually applied, not a stale
  // selection left over from a pane the user cancelled out of.
  React.useEffect(() => {
    setPending(selectedRange(customFrom, customTo));
  }, [customFrom, customTo]);

  const { earliest, latest } = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const floor = new Date(today);
    floor.setDate(floor.getDate() - MAX_RANGE_DAYS);
    return { earliest: floor, latest: today };
  }, []);

  // The label states the window that will be requested, not the one that was
  // typed into the URL — `resolveRange` is the single authority on both.
  const label =
    value === "custom"
      ? (() => {
          const applied = resolveRange("custom", customFrom, customTo);
          return formatRangeLabel("custom", applied.from, applied.to);
        })()
      : RANGE_LABELS[value];

  /**
   * The endpoint aggregates backwards from now, so a window ending in the past
   * cannot be requested. Rather than accepting it and quietly returning the
   * last N days, the action is inert and says why.
   */
  const endsToday = Boolean(
    pending?.to && formatLocalDay(pending.to) === formatLocalDay(latest),
  );
  const applyBlockedReason = !pending?.from
    ? "Pick the day the range starts."
    : !pending.to
      ? "Pick the day the range ends."
      : !endsToday
        ? "Analytics are aggregated backwards from today, so a custom range has to end today."
        : null;

  function choosePreset(preset: AnalyticsRange) {
    setCustomActive(false);
    onChange(preset);
    setOpen(false);
  }

  function applyCustom() {
    if (!pending?.from || !pending?.to || !endsToday) return;
    onChange(
      "custom",
      formatLocalDay(pending.from),
      formatLocalDay(pending.to),
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
          className="h-8 gap-1.5 px-3 text-xs font-medium"
        >
          <CalendarBlank
            weight="regular"
            className="size-3.5 text-muted-foreground"
            aria-hidden
          />
          <span className="max-w-[140px] truncate">{label}</span>
          <CaretDown
            weight="bold"
            aria-hidden
            className={cn(
              "size-3 text-muted-foreground transition-transform duration-(--duration-base)",
              open && "rotate-180",
            )}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-0">
        {customActive ? (
          <div className="p-3">
            <p className="mb-2 text-xs font-medium text-foreground">
              Select date range
            </p>
            <Calendar
              mode="range"
              selected={pending}
              onSelect={setPending}
              numberOfMonths={2}
              // Offering a date the API can't aggregate would be offering an
              // action the contract refuses.
              disabled={{ before: earliest, after: latest }}
              startMonth={earliest}
              endMonth={latest}
              autoFocus
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Analytics are kept for the last {MAX_RANGE_DAYS} days.
            </p>
            {/* The blocked reason renders in place: `applyCustom` refuses a
                range that doesn't end today, so Apply must not look willing. */}
            {applyBlockedReason !== null && pending?.from && pending?.to && (
              <p className="mt-2 max-w-[24rem] text-[11px] text-warning">
                {applyBlockedReason}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setCustomActive(false)}
              >
                Back to presets
              </Button>
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                disabled={applyBlockedReason !== null}
                onClick={applyCustom}
              >
                Apply range
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="p-1.5"
            role="radiogroup"
            aria-label="Analytics date range"
          >
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={value === preset}
                onClick={() => choosePreset(preset)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm",
                  "transition-colors duration-(--duration-fast)",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  value === preset
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {RANGE_LABELS[preset]}
              </button>
            ))}

            <div className="my-1 border-t border-border" />

            <button
              type="button"
              role="radio"
              aria-checked={value === "custom"}
              onClick={() => setCustomActive(true)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm",
                "transition-colors duration-(--duration-fast)",
                "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                value === "custom"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <CalendarBlank
                weight="regular"
                className="size-3.5"
                aria-hidden
              />
              Custom range
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
