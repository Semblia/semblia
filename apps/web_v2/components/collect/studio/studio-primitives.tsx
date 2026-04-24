"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

/* ─── Shared small primitives ─────────────────────────────────────────────── */

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

export function SectionCollapsible({
  title,
  children,
  defaultOpen = true,
  tag,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tag?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-t border-border px-5 py-4.5">
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-auto w-full items-center justify-between p-0 text-[13px] font-semibold text-foreground tracking-tight hover:bg-transparent",
          "transition-[margin-bottom] duration-200",
          open ? "mb-3.5" : "mb-0",
        )}
      >
        <span className="flex items-center gap-2">
          {title}
          {tag && (
            <Badge
              variant="default"
              className="rounded-sm px-1.5 py-px font-mono text-[9px] font-semibold tracking-wider"
            >
              {tag}
            </Badge>
          )}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] text-muted-foreground transition-transform duration-150",
            open && "rotate-90",
          )}
        >
          ▸
        </span>
      </Button>
      <div
        className="studio-collapse"
        {...(!open ? { "data-closed": "" } : {})}
      >
        <div className="studio-collapse-inner">{children}</div>
      </div>
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
  return (
    <div className="flex items-center gap-3">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span className="min-w-[52px] text-right font-mono text-[11px] text-foreground">
        {value}
        {suffix || ""}
      </span>
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

export function StudioSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="h-8 w-full text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Button
            key={o.value}
            variant="ghost"
            onClick={() => onChange(o.value)}
            className={cn(
              "h-auto flex-1 min-w-0 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium whitespace-nowrap",
              "transition-[background,color,box-shadow] duration-150",
              on
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
