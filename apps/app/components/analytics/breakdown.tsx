"use client";

/**
 * The one part-to-whole idiom on this surface: a proportion bar and a labelled
 * list beneath it.
 *
 * It replaces a recharts donut (unlabelled `<PieChart>`, invisible to assistive
 * tech, segments told apart by colour only) and three separately hand-rolled
 * bar-plus-legend blocks that each rounded percentages to a different precision
 * and put half their numbers in the mono face and half not.
 *
 * Rules it enforces so the call sites can't break them again:
 *   • a zero-value segment still renders, at `0` — a status that disappears is
 *     indistinguishable from one the API never returned, and the panel's height
 *     jumping between ranges is the tell
 *   • segment widths come from exact fractions, so the bar always fills its
 *     track instead of landing on 99% or 101% after four independent roundings
 *   • one numeric treatment for every number in the row
 *   • a segment with no destination says why, rather than looking clickable
 */

import * as React from "react";
import Link from "next/link";
import { type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { fmtCount } from "@/lib/format";
import { fmtPercent } from "@/lib/analytics/range";

export interface BreakdownSegment {
  key: string;
  label: string;
  value: number;
  /** A `--color-*` token reference. Never a text token. */
  color: string;
  /** The rows behind this number. Omit when no such view exists. */
  href?: string;
  /** Distinguishing glyph, so the row is not colour-only. */
  icon?: PhosphorIcon;
}

function share(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

export function ProportionBar({
  segments,
  total,
  label,
  className,
}: {
  segments: BreakdownSegment[];
  total: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${label}. ${segments
        .map((s) => `${s.label} ${fmtCount(s.value)}`)
        .join(", ")}.`}
      className={cn(
        "flex h-2 w-full gap-px overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {segments.map((s) => (
        <div
          key={s.key}
          className="h-full transition-[width] duration-(--duration-slow) ease-standard"
          style={{ width: `${share(s.value, total)}%`, background: s.color }}
        />
      ))}
    </div>
  );
}

export function BreakdownList({
  segments,
  total,
  className,
}: {
  segments: BreakdownSegment[];
  total: number;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-0", className)}>
      {segments.map((segment) => (
        <li key={segment.key}>
          <BreakdownRow segment={segment} total={total} />
        </li>
      ))}
    </ul>
  );
}

function BreakdownRow({
  segment,
  total,
}: {
  segment: BreakdownSegment;
  total: number;
}) {
  const Icon = segment.icon;
  const rowShare = share(segment.value, total);
  const body = (
    <>
      {/* The row's share, painted behind it in the segment's own colour at a
          tint — the part-to-whole reads down the list at a glance, the
          Plausible bar-list idiom. The exact numbers stay in text; the tint
          is reinforcement, never the only encoding. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 rounded-r-[3px] transition-[width] duration-(--duration-slow) ease-standard"
        style={{
          width: `${rowShare}%`,
          background: `color-mix(in oklab, ${segment.color} 14%, transparent)`,
        }}
      />
      <span
        aria-hidden
        className="relative size-2 shrink-0 rounded-full"
        style={{ background: segment.color }}
      />
      {Icon && (
        <Icon
          className="relative size-3.5 shrink-0 text-muted-foreground"
          weight="regular"
          aria-hidden
        />
      )}
      <span className="relative min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {segment.label}
      </span>
      <span className="relative w-16 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
        {fmtCount(segment.value)}
      </span>
      <span className="relative w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {fmtPercent(rowShare, 0)}
      </span>
    </>
  );

  const shared =
    "relative flex items-center gap-2 border-b border-border/60 py-2 last:border-b-0";

  if (!segment.href) return <div className={shared}>{body}</div>;

  return (
    <Link
      href={segment.href}
      className={cn(
        shared,
        "px-2 transition-colors duration-(--duration-base) hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/30",
      )}
    >
      {body}
    </Link>
  );
}
