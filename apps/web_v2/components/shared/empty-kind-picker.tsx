"use client";

import * as React from "react";
import {
  ArrowRight as ArrowRightIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface EmptyKindOption<T extends string = string> {
  id: T;
  title: string;
  pitch: string;
  bullets: string[];
  icon: PhosphorIcon;
  accentClass: string;
}

export interface EmptyKindPickerProps<T extends string = string> {
  /** Short overline label above the heading (e.g. "New widget"). */
  heading: string;
  /** Main h2 prompt text. */
  subheading: string;
  /** Optional footnote below the cards. */
  footnote?: string;
  kinds: EmptyKindOption<T>[];
  onPick: (id: T) => void;
}

function KindCard<T extends string>({
  option,
  onPick,
}: {
  option: EmptyKindOption<T>;
  onPick: (id: T) => void;
}) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={() => onPick(option.id)}
      className={cn(
        "group relative flex flex-col items-stretch gap-4 rounded-2xl border p-6 text-left",
        "border-border bg-card transition-[border-color,transform,box-shadow] duration-200 ease-out",
        "hover:-translate-y-px hover:border-foreground/20 hover:shadow-[0_8px_28px_-12px_rgba(0,0,0,0.12)]",
        "active:translate-y-0 active:shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            option.accentClass,
          )}
        >
          <Icon className="size-4" weight="bold" />
        </span>
        <ArrowRightIcon
          className={cn(
            "size-3.5 text-muted-foreground/50 transition-all duration-200",
            "group-hover:translate-x-0.5 group-hover:text-foreground",
          )}
          weight="bold"
        />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {option.title}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {option.pitch}
        </p>
      </div>

      <ul className="mt-auto space-y-1.5 text-[11px] text-muted-foreground/85">
        {option.bullets.map((b) => (
          <li key={b} className="flex items-start gap-1.5">
            <span
              className="mt-1.5 size-[3px] shrink-0 rounded-full bg-foreground/40"
              aria-hidden
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

export function EmptyKindPicker<T extends string = string>({
  heading,
  subheading,
  footnote,
  kinds,
  onPick,
}: EmptyKindPickerProps<T>) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-14">
      <div className="mb-7 space-y-1.5 text-center">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {heading}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">
          {subheading}
        </h2>
      </div>

      <div
        className={cn(
          "grid gap-3",
          kinds.length === 1
            ? "mx-auto max-w-sm grid-cols-1"
            : "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {kinds.map((option) => (
          <KindCard key={option.id} option={option} onPick={onPick} />
        ))}
      </div>

      {footnote && (
        <p className="mt-5 text-center text-[11px] text-muted-foreground/70">
          {footnote}
        </p>
      )}
    </div>
  );
}
