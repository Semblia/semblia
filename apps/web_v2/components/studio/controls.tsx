"use client";

/**
 * Studio control primitives — the inspector's vocabulary.
 *
 * The row is the unit: label left, compact control right. Controls whisper,
 * the canvas shouts — segments are monochrome glyphs, selects are small,
 * visual tiles exist only for genuinely visual choices and stay line-art.
 * (Rebuilt 2026-07-10 per docs/ui-rework/2026-07-10-studios-rebuild/.)
 *
 * Design-system-generic (no feature coupling). Shared by both studios.
 */

import * as React from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type IconType = React.ComponentType<{ className?: string }>;

/** Shared keyboard focus ring for the studio's hand-rolled controls. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55";

// ── Sections ─────────────────────────────────────────────────────────────────

/** Plain (non-collapsible) group: quiet title row + content. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * PanelSection — a collapsible inspector section (the Figma pattern).
 * Header is a full-width toggle; body animates open/closed via grid rows.
 */
export function PanelSection({
  title,
  action,
  defaultOpen = true,
  children,
  className,
}: {
  title: string;
  /** Trailing affordance (e.g. an add button). Clicks don't toggle. */
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className={cn("border-b border-border/60", className)}>
      <div className="flex h-9 items-center justify-between gap-2 pl-4 pr-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "-ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left",
            FOCUS_RING,
          )}
        >
          {open ? (
            <CaretDownIcon
              className="size-2.5 shrink-0 text-muted-foreground/70"
              weight="bold"
              aria-hidden
            />
          ) : (
            <CaretRightIcon
              className="size-2.5 shrink-0 text-muted-foreground/70"
              weight="bold"
              aria-hidden
            />
          )}
          <span className="truncate text-xs font-semibold tracking-tight text-foreground">
            {title}
          </span>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div
        className="tf-panel-section grid"
        data-state={open ? "open" : "closed"}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2.5 px-4 pb-4 pt-0.5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Rows ─────────────────────────────────────────────────────────────────────

/** Label left, compact control right — the fundamental inspector unit. */
export function Row({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-2",
        className,
      )}
    >
      <label
        htmlFor={htmlFor}
        className="truncate text-xs text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex min-w-0 items-center justify-end">{children}</div>
    </div>
  );
}

/** Label above a full-width control (inputs, textareas, wide segments). */
export function Field({
  label,
  htmlFor,
  hint,
  trailing,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ── Segmented control (text, compact) ────────────────────────────────────────

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconType;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-0.5 rounded-md bg-muted p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-6 flex-1 items-center justify-center gap-1 rounded-[5px] px-2 text-[11px] font-medium transition-colors duration-100",
              FOCUS_RING,
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Icon segment (glyph-only, tooltip labels) ────────────────────────────────

export interface IconSegmentOption<T extends string> {
  value: T;
  label: string;
  icon: IconType;
}

export function IconSegment<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: ReadonlyArray<IconSegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-0.5 rounded-md bg-muted p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <Tooltip key={o.value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={o.label}
                onClick={() => onChange(o.value)}
                className={cn(
                  "flex size-6 items-center justify-center rounded-[5px] transition-colors duration-100",
                  FOCUS_RING,
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">
              {o.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ── Glyph tiles (the only visual-tile control) ───────────────────────────────

export interface GlyphTile<T extends string> {
  value: T;
  label: string;
  /** Small line-art glyph (monochrome; currentColor). */
  glyph: React.ReactNode;
}

/**
 * GlyphTileGroup — small monochrome tiles for genuinely visual choices
 * (layout presets, variations, schemes). Line-art only: no color previews,
 * no hints, no badges. Active = brand ring; the live canvas is the preview.
 */
export function GlyphTileGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
  ariaLabel,
  className,
}: {
  options: ReadonlyArray<GlyphTile<T>>;
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
  ariaLabel?: string;
  className?: string;
}) {
  const cols =
    columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid gap-1.5", cols, className)}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "group flex flex-col items-center gap-1 rounded-lg border px-1 pb-1.5 pt-2 transition-[border-color,background-color] duration-100",
              FOCUS_RING,
              active
                ? "border-brand/70 bg-brand/[0.04] ring-1 ring-brand/70"
                : "border-border/70 hover:border-foreground/25",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-9 w-full items-center justify-center transition-colors duration-100",
                active
                  ? "text-foreground"
                  : "text-muted-foreground/80 group-hover:text-foreground",
              )}
            >
              {o.glyph}
            </span>
            <span
              className={cn(
                "text-[10.5px] leading-none",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Switch row ───────────────────────────────────────────────────────────────

export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex min-h-7 items-center justify-between gap-3",
        disabled ? "opacity-55" : "cursor-pointer",
      )}
    >
      <span className="min-w-0">
        <span className="block text-xs text-foreground">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="scale-90"
      />
    </label>
  );
}

// ── Compact select ───────────────────────────────────────────────────────────

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        aria-label={ariaLabel}
        size="sm"
        className={cn("h-7 w-full text-xs", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Stepper (numeric − / value / +) ──────────────────────────────────────────

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  ariaLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ariaLabel: string;
  className?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div
      className={cn(
        "flex h-7 items-center rounded-md border border-border/80",
        className,
      )}
    >
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className={cn(
          "flex h-full w-6 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
          FOCUS_RING,
        )}
      >
        −
      </button>
      <span
        aria-label={ariaLabel}
        className="min-w-9 border-x border-border/60 px-1.5 text-center text-[11px] tabular-nums text-foreground"
      >
        {value}
        {unit ? (
          <span className="ml-px text-muted-foreground/70">{unit}</span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label={`Increase ${ariaLabel}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className={cn(
          "flex h-full w-6 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
          FOCUS_RING,
        )}
      >
        +
      </button>
    </div>
  );
}

// ── AA contrast badge ────────────────────────────────────────────────────────

export function AaBadge({ ratio }: { ratio: number }) {
  const aa = ratio >= 4.5;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        aa ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
      )}
    >
      {aa ? "AA" : "Low"} · {ratio.toFixed(1)}:1
    </span>
  );
}

