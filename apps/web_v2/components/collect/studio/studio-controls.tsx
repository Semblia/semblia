"use client";

/**
 * Studio control primitives — the visual vocabulary of the inspector.
 *
 * These replace the old wall of `<Select>` dropdowns: choices are made by
 * looking, not by reading a word in a menu. `Segmented` for 2–4 mutually
 * exclusive options, `OptionCardGroup` for choices that deserve a visual
 * preview (themes, layouts, surface/button/radius tiles), `Section`/`Field`
 * for structure, `SwitchRow` for booleans.
 */

import * as React from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

type IconType = React.ComponentType<{ className?: string }>;

// ── Section + Field ───────────────────────────────────────────────────────────

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
    <section className={cn("flex flex-col gap-3.5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
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
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium text-foreground"
        >
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ── Segmented control (icon + label) ──────────────────────────────────────────

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
        "flex items-center gap-1 rounded-lg bg-muted p-1",
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
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Option cards (visual radio group) ─────────────────────────────────────────

export interface OptionCard<T extends string> {
  value: T;
  label: string;
  hint?: string;
  /** Visual preview rendered in the card's media area. */
  preview?: React.ReactNode;
  badge?: string;
}

export function OptionCardGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
  ariaLabel,
  previewClassName,
  className,
}: {
  options: ReadonlyArray<OptionCard<T>>;
  value: T;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
  ariaLabel?: string;
  /** Sizing for each card's media area (e.g. aspect ratio + bg). */
  previewClassName?: string;
  className?: string;
}) {
  const cols =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-2";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid gap-2.5", cols, className)}
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
              "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] duration-150",
              active
                ? "border-brand ring-2 ring-brand/60"
                : "border-border hover:border-foreground/25",
            )}
          >
            {o.preview ? (
              <span
                className={cn(
                  "block w-full overflow-hidden border-b border-border/60",
                  previewClassName ?? "aspect-[16/10]",
                )}
              >
                {o.preview}
              </span>
            ) : null}
            <span className="flex flex-1 flex-col gap-0.5 px-3 py-2.5">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold tracking-tight text-foreground">
                  {o.label}
                </span>
                {o.badge ? (
                  <span className="rounded-full bg-muted px-1.5 py-px text-[9.5px] font-medium uppercase tracking-wide text-muted-foreground">
                    {o.badge}
                  </span>
                ) : null}
              </span>
              {o.hint ? (
                <span className="text-[11px] leading-snug text-muted-foreground">
                  {o.hint}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-sm transition-opacity duration-150",
                active ? "opacity-100" : "opacity-0",
              )}
            >
              <CheckIcon className="size-3" weight="bold" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Switch row ─────────────────────────────────────────────────────────────────

export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

// ── AA contrast badge ──────────────────────────────────────────────────────────

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
