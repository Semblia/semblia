"use client";

/**
 * AddIntegrationDialog — the provider directory, as a picker instead of a wall.
 *
 * The catalog used to be a permanent grid of KPI-style tiles on the page, most
 * of them describing providers that cannot be connected yet. The page now
 * leads with what IS connected; the directory appears only when the user asks
 * to add one. Rows, hairlines, no nested boxes (cards-on-cards defect).
 *
 * P6 still holds inside the picker: a provider whose OAuth app is not
 * configured keeps its place, is stated plainly, and carries no control —
 * with the why in place, not behind a tooltip.
 */

import * as React from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fmtCount } from "@/lib/format";
import {
  PROVIDERS,
  providerBlockedReason,
  type ProviderSpec,
} from "./integration-providers";

export function AddIntegrationDialog({
  open,
  onOpenChange,
  connectedCount,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live (non-revoked) connections per provider id. */
  connectedCount: (provider: ProviderSpec["id"]) => number;
  /** Called with a connectable provider; the caller opens the connect flow. */
  onPick: (spec: ProviderSpec) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-5 pb-4 pt-5">
          <DialogTitle>Add an integration</DialogTitle>
          <DialogDescription>
            Authorize a provider once, pick a destination Semblia discovers for
            you, and every new response is delivered there. Delivery is one-way
            — Semblia never reads back from these tools.
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y divide-border/70 border-t border-border/70">
          {PROVIDERS.map((spec) => {
            const blocked = providerBlockedReason(spec);
            const connected = connectedCount(spec.id);
            const Icon = spec.icon;

            const body = (
              <>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface text-foreground",
                    blocked && "opacity-50 grayscale",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "truncate text-[13px] font-medium",
                        blocked ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {spec.label}
                    </span>
                    {connected > 0 && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {fmtCount(connected)} connected
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] leading-relaxed text-muted-foreground">
                    {spec.blurb}
                  </span>
                  {blocked && (
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground/80">
                      {blocked}
                    </span>
                  )}
                </span>
                {!blocked && (
                  <CaretRightIcon
                    className="size-3.5 shrink-0 self-center text-muted-foreground"
                    aria-hidden
                  />
                )}
              </>
            );

            return (
              <li key={spec.id}>
                {blocked ? (
                  <div className="flex items-start gap-3 px-5 py-3.5 opacity-80">
                    {body}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPick(spec)}
                    className="flex w-full items-start gap-3 px-5 py-3.5 text-left outline-none transition-colors duration-(--duration-fast) hover:bg-muted/40 focus-visible:bg-muted/40"
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
