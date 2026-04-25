"use client";

/**
 * Browser chrome — wraps the wall preview to give the user the visceral sense
 * that this is a standalone page hosted at `tresta.io/wall/[slug]`.
 *
 * Renders entirely with the host UI tokens (Tailwind/zinc) so it never
 * inherits widget design tokens — the chrome is "outside" the widget.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Lock as LockIcon } from "@phosphor-icons/react";

interface BrowserChromeProps {
  url: string;
  /** Resolved theme of the wall content (light | dark) — drives chrome inversion. */
  contentDark?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function BrowserChrome({
  url,
  contentDark = false,
  children,
  className,
}: BrowserChromeProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden",
        className,
      )}
      data-content-dark={contentDark}
    >
      {/* Chrome bar */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b px-4 py-2",
          "border-zinc-200/70 bg-zinc-50/95 text-zinc-500",
          contentDark && "border-zinc-700/60 bg-zinc-900/95 text-zinc-400",
        )}
      >
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="size-[9px] rounded-full bg-rose-400/80" />
          <span className="size-[9px] rounded-full bg-amber-400/80" />
          <span className="size-[9px] rounded-full bg-emerald-400/80" />
        </div>

        <div
          className={cn(
            "flex h-7 flex-1 items-center gap-2 rounded-md border px-3",
            "border-zinc-200/80 bg-white text-zinc-600",
            contentDark && "border-zinc-700/40 bg-zinc-800 text-zinc-300",
          )}
        >
          <LockIcon
            weight="fill"
            className={cn(
              "size-3 text-emerald-500",
              contentDark && "text-emerald-400",
            )}
            aria-hidden
          />
          <span className="truncate font-mono text-[11px] tracking-tight">
            {url}
          </span>
        </div>

        <span
          className={cn(
            "hidden font-mono text-[9px] uppercase tracking-[0.14em] sm:inline",
            "text-zinc-400/80",
            contentDark && "text-zinc-500",
          )}
        >
          Live preview
        </span>
      </div>

      {/* Page content */}
      <div className="relative flex-1 overflow-y-auto" data-slot="browser-body">
        {children}
      </div>
    </div>
  );
}
