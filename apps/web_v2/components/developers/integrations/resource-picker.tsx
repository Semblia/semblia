"use client";

/**
 * ResourcePicker — choose where an integration delivers.
 *
 * There were two copies of this control, one in the connect dialog and one in
 * the edit dialog, and they had already drifted (different class strings, one
 * with `cn` and one with `.join(" ")`). Both were also a stack of bordered
 * look-alike buttons: a single-select composite with none of a single-select
 * composite's behaviour — no roving focus, no Arrow/Home/End, no `radio`
 * semantics, and a bordered box per option *inside* a dialog, which is two
 * bounded surfaces stacked.
 *
 * One implementation now, built on the Radix radio group, so the keyboard and
 * assistive-technology behaviour comes from the behaviour layer rather than
 * being re-invented. The options group with hairlines and a tint step on the
 * selected row instead of a border each.
 */

import * as React from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { V2IntegrationResourceDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DataState, useDataState } from "@/components/shared";

/** The slice of the resources query this control reads. */
type ResourcesQuery = UseQueryResult<
  { items: V2IntegrationResourceDTO[] } | undefined,
  unknown
>;

export function ResourcePicker({
  label,
  providerLabel,
  resources,
  selectedResourceId,
  query,
  onSelect,
}: {
  /** Visible group label. Also names the radio group for assistive tech. */
  label: string;
  /** Provider name, used in the error and empty copy. */
  providerLabel: string;
  resources: V2IntegrationResourceDTO[];
  selectedResourceId: string | null;
  query: ResourcesQuery;
  onSelect: (resourceId: string) => void;
}) {
  const groupId = React.useId();
  const state = useDataState(query, { count: resources.length });

  return (
    <div className="space-y-1.5">
      <Label id={`${groupId}-label`}>{label}</Label>

      <DataState
        state={state}
        resource={`${providerLabel} destinations`}
        align="start"
        compactError
        skeleton={
          <div aria-hidden className="space-y-2 py-1">
            <Skeleton className="animate-shimmer h-4 w-40" />
            <Skeleton className="animate-shimmer h-4 w-32" />
            <Skeleton className="animate-shimmer h-4 w-44" />
          </div>
        }
        empty={
          <p className="py-2 text-xs leading-relaxed text-muted-foreground">
            {providerLabel} returned no destinations for your account. Make sure
            the account you authorized has access to at least one, then reopen
            this dialog.
          </p>
        }
      >
        <RadioGroup
          aria-labelledby={`${groupId}-label`}
          value={selectedResourceId ?? ""}
          onValueChange={onSelect}
          className="max-h-64 gap-0 divide-y divide-border/60 overflow-y-auto"
        >
          {resources.map((resource) => {
            const id = `${groupId}-${resource.id}`;
            const selected = selectedResourceId === resource.id;
            return (
              <span
                key={resource.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors duration-(--duration-base)",
                  selected ? "bg-muted/50" : "hover:bg-muted/30",
                )}
              >
                <RadioGroupItem id={id} value={resource.id} />
                <Label
                  htmlFor={id}
                  className="min-w-0 flex-1 cursor-pointer truncate text-xs font-normal text-foreground"
                >
                  {resource.label}
                </Label>
              </span>
            );
          })}
        </RadioGroup>
      </DataState>
    </div>
  );
}
