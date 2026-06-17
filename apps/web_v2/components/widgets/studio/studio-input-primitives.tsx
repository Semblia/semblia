"use client";

/**
 * The widget studio's small local input toolkit — the text/number/color fields
 * that don't have a shared-vocabulary equivalent. The visual pickers (segmented,
 * option cards, switches, sections) come from the shared inspector vocabulary,
 * re-exported alongside these in `studio-primitives.tsx`.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

/* ─── Label row (used by StudioColorInput) ─────────────────────────────────── */

export function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <div className="label-quiet mb-2 flex justify-between">
        <span>{label}</span>
        {hint != null && (
          <span className="text-foreground normal-case tracking-normal text-[11px]">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function StudioTextInput({
  value,
  onChange,
  className: extraClass,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  [k: string]: unknown;
}) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-8 font-mono text-xs", extraClass)}
      {...rest}
    />
  );
}

/** Decimal places implied by a step, so values never carry float-error tails. */
function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = String(step);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

/** Snap a raw value onto the step grid, clamp to range, drop float noise. */
function snapToStep(
  raw: number,
  min: number,
  max: number,
  step: number,
): number {
  const snapped = Math.round((raw - min) / step) * step + min;
  const clamped = Math.min(max, Math.max(min, snapped));
  return Number(clamped.toFixed(decimalsForStep(step)));
}

export function StudioNumberInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const decimals = decimalsForStep(step);
  const display = (v: number) => v.toFixed(decimals);
  // Local text buffer so the field can hold an in-progress value while typing.
  const [text, setText] = React.useState(() => display(value));
  React.useEffect(() => {
    setText(display(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      const next = snapToStep(parsed, min, max, step);
      onChange(next);
      setText(display(next));
    } else {
      setText(display(value));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(snapToStep(v, min, max, step))}
        className="flex-1"
      />
      <div className="relative shrink-0">
        <Input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            }
          }}
          aria-label="Value"
          className={cn(
            "h-7 w-[68px] px-2 text-right font-mono text-[11px] tabular-nums",
            suffix ? "pr-6" : undefined,
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[10px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function StudioColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isHex = typeof value === "string" && value.startsWith("#");
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <label
          className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border"
          style={{ background: value }}
        >
          {isHex && (
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          )}
        </label>
        <StudioTextInput value={value} onChange={onChange} />
      </div>
    </Row>
  );
}
