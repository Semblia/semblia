"use client";

/**
 * AuditClusterRow — one burst of same-actor activity, collapsed to one line.
 *
 * The header is a real `<button>` with `aria-expanded`, not a click-captured
 * surface: it is the block's only control, so button semantics are valid and
 * give the keyboard path for free. Expanded rows render `compact`, because the
 * header already names the actor once for all of them.
 */

import * as React from "react";
import { CaretDownIcon, StackIcon } from "@phosphor-icons/react";
import type { V2ProjectActionAuditDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
import { fmtCount, fmtDateTime, timeAgo } from "@/lib/format";
import { summarizeCluster } from "./audit-cluster";
import { AuditEventRow, actorDisplay } from "./audit-event-item";

export function AuditClusterRow({
  events,
  actorName,
}: {
  /** The burst, newest-first. Always two or more events. */
  events: V2ProjectActionAuditDTO[];
  /** Resolved member display name/email for user actors. */
  actorName?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const newest = events[0];
  const oldest = events[events.length - 1];
  const actor = actorDisplay(newest, actorName);
  const summary = summarizeCluster(events);

  return (
    <div role="listitem" aria-label={`${events.length} changes by ${actor}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left outline-none transition-colors duration-(--duration-fast) hover:bg-muted/40 focus-visible:bg-muted/40 sm:px-6"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
          <StackIcon
            className="size-4 text-muted-foreground"
            weight="regular"
            aria-hidden
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">
            {actor}
            <span className="font-normal text-muted-foreground">
              {" "}
              · {fmtCount(events.length)} changes
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {summary}
          </span>
        </span>
        <span
          className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80"
          title={`${fmtDateTime(oldest.createdAt)} — ${fmtDateTime(newest.createdAt)}`}
        >
          {timeAgo(newest.createdAt)}
        </span>
        <CaretDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast)",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="divide-y divide-border/60 border-t border-border/60 bg-muted/20">
          {events.map((event) => (
            <AuditEventRow
              key={event.id}
              event={event}
              actorName={actorName}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
