"use client";

/**
 * MetricValue — a number that explains itself and leads somewhere.
 *
 * Two rules from the metrics contract, both of which the old stat tiles broke:
 *
 *   1. Every metric names itself. A bare gauge is not a metric; it is a number
 *      the reader has to guess at.
 *   2. Every number clicks through to the rows behind it. A count with no way
 *      to see what it counted is a dead end — "12 pending" should land on those
 *      twelve, filtered, not on an unfiltered inbox.
 *
 * And the honesty rule: a legitimate `0` renders as `0`; a count whose source
 * failed or was never fetched renders as an em dash. Those are different facts
 * and must not look the same.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ABSENT, fmtCount } from "@/lib/format";

export interface MetricValueProps {
  /** What the number is. Always rendered — a metric is never label-less. */
  label: string;
  /**
   * The value. `null` / `undefined` means "we don't have this", and renders as
   * an em dash — never as `0`, which would assert something untrue.
   */
  value: number | string | null | undefined;
  /** Unit or qualifier shown after the value at label size ("responses", "%"). */
  unit?: string;
  /** The rows behind the number. Omit only when there is genuinely no such view. */
  href?: string;
  /** One line of context under the value. Not a sentence of prose. */
  hint?: React.ReactNode;
  /** Period-over-period change. Rendered only when the value itself is known. */
  delta?: { value: number; label: string } | null;
  /** Larger treatment for the one headline number on a page. */
  size?: "default" | "lead";
  className?: string;
}

export function MetricValue({
  label,
  value,
  unit,
  href,
  hint,
  delta,
  size = "default",
  className,
}: MetricValueProps) {
  const known = value !== null && value !== undefined;
  const display =
    typeof value === "number" ? fmtCount(value) : known ? value : ABSENT;

  const body = (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {href && (
          <ArrowUpRight
            className="size-3 text-muted-foreground/0 transition-colors duration-(--duration-base) group-hover/metric:text-muted-foreground"
            weight="bold"
            aria-hidden
          />
        )}
      </div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-semibold tabular-nums tracking-tight",
            known ? "text-foreground" : "text-muted-foreground/60",
            size === "lead" ? "text-2xl" : "text-lg",
          )}
        >
          {display}
        </span>
        {unit && known && (
          <span className="text-xs text-muted-foreground">{unit}</span>
        )}
        {known && delta && <DeltaChip {...delta} />}
      </div>

      {hint != null && (
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {!known && hint == null && (
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          Not available right now
        </p>
      )}
    </>
  );

  if (href && known) {
    return (
      <Link
        href={href}
        className={cn(
          "group/metric block rounded-lg outline-none transition-colors duration-(--duration-base) focus-visible:ring-3 focus-visible:ring-ring/30",
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return <div className={cn("group/metric", className)}>{body}</div>;
}

function DeltaChip({ value, label }: { value: number; label: string }) {
  if (!Number.isFinite(value) || value === 0) return null;
  const up = value > 0;
  return (
    <span
      className={cn(
        "text-[11px] font-medium tabular-nums",
        up ? "text-success" : "text-destructive",
      )}
      title={label}
    >
      {up ? "+" : "−"}
      {Math.abs(value)}%
    </span>
  );
}

/**
 * MetricRow — a run of metrics separated by hairlines, not by cards.
 *
 * This is the replacement for the grid of bordered stat tiles. Metrics are
 * siblings in one band; giving each its own container was four containers
 * asserting four unrelated things.
 */
export function MetricRow({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden bg-border",
        cols,
        className,
      )}
    >
      {/* Uniform padding on every cell. A `first:pl-0` flush-left trick only
          reads correctly while the row does not wrap — at one column per row it
          indents every metric but the first, which is worse than a small
          consistent inset. */}
      {React.Children.map(children, (child) => (
        <div className="bg-background px-4 py-3.5 sm:px-5">{child}</div>
      ))}
    </div>
  );
}
