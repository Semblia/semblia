"use client";

/**
 * Row capping with the hidden count in the trigger.
 *
 * The old panels capped silently — countries at 8, sources at 5 in compact
 * mode and uncapped otherwise — with no "+N more", no total, and no statement
 * of the cap. A project with 40 countries saw 8 and was told nothing, which is
 * worse than showing 8 and saying so: the user believes they have seen
 * everything.
 */

import * as React from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { fmtCount } from "@/lib/format";

export function useRowCap<T>(rows: T[], cap: number) {
  const [expanded, setExpanded] = React.useState(false);
  const hidden = Math.max(rows.length - cap, 0);

  return {
    visible: expanded || hidden === 0 ? rows : rows.slice(0, cap),
    hidden,
    expanded,
    toggle: React.useCallback(() => setExpanded((v) => !v), []),
  };
}

export function ShowAllRows({
  hidden,
  expanded,
  onToggle,
  noun,
}: {
  hidden: number;
  expanded: boolean;
  onToggle: () => void;
  /** Plural noun for the hidden rows: "countries", "sources". */
  noun: string;
}) {
  if (hidden === 0) return null;
  const Glyph = expanded ? CaretUp : CaretDown;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors duration-(--duration-base) hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <Glyph className="size-3" weight="bold" aria-hidden />
      {expanded ? "Show fewer" : `Show ${fmtCount(hidden)} more ${noun}`}
    </button>
  );
}
