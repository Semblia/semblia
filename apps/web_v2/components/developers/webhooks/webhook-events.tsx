"use client";

/**
 * The outbound webhook event catalog, and the picker over it.
 *
 * Each event has two names and both matter, which is why they are separate
 * fields rather than one string used twice:
 *
 *   `id`     the wire value the receiver switches on. It is the contract, so it
 *            is shown verbatim, in mono, wherever a developer needs to copy it.
 *   `label`  what the event *is*, in words. This is what appears on a delivery
 *            row and anywhere the reader is scanning rather than integrating —
 *            a list of `submission.created` tells a human nothing.
 *
 * The picker groups with a hairline-divided list rather than a bordered box:
 * it lives inside a dialog, and a bordered box inside a dialog is two bounded
 * surfaces stacked.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { humanizeLabel } from "@/lib/format";
import type { V2OutboundWebhookEventType } from "@workspace/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/* ─── Catalog ─────────────────────────────────────────────────────────────── */

export interface WebhookEventSpec {
  id: V2OutboundWebhookEventType;
  /** Human name, used wherever the reader is scanning rather than integrating. */
  label: string;
  description: string;
}

export const WEBHOOK_EVENTS: WebhookEventSpec[] = [
  {
    id: "submission.created",
    label: "Response submitted",
    description: "A new response is submitted to a form.",
  },
  {
    id: "submission.moderated",
    label: "Response moderated",
    description: "A response is approved, rejected, or flagged.",
  },
  {
    id: "export.delivery_failed",
    label: "Export delivery failed",
    description: "An export delivery exhausts its retries.",
  },
  {
    id: "agent.action_created",
    label: "Agent action recorded",
    description: "An agent key performs a tracked action.",
  },
];

const EVENT_LABELS = new Map(WEBHOOK_EVENTS.map((e) => [e.id, e.label]));

/**
 * The human name for an event type. An event the API grows before this app
 * knows it degrades to a readable Title Case label rather than surfacing the
 * raw dotted identifier on a list row.
 */
export function humanizeWebhookEvent(eventType: string): string {
  return (
    EVENT_LABELS.get(eventType as V2OutboundWebhookEventType) ??
    humanizeLabel(eventType)
  );
}

/* ─── Picker ──────────────────────────────────────────────────────────────── */

function EventRow({
  spec,
  checked,
  onToggle,
}: {
  spec: WebhookEventSpec;
  checked: boolean;
  onToggle: () => void;
}) {
  const id = `event-${spec.id}`;
  return (
    <li>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 transition-colors duration-(--duration-base)",
          checked ? "bg-muted/50" : "hover:bg-muted/30",
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-foreground">
            {spec.label}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
            {spec.id}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {spec.description}
          </span>
        </span>
      </label>
    </li>
  );
}

export function EventTypePicker({
  selected,
  onChange,
}: {
  selected: V2OutboundWebhookEventType[];
  onChange: (next: V2OutboundWebhookEventType[]) => void;
}) {
  const allSelected = selected.length === WEBHOOK_EVENTS.length;

  function toggle(event: V2OutboundWebhookEventType) {
    if (selected.includes(event)) {
      onChange(selected.filter((e) => e !== event));
    } else {
      onChange([...selected, event]);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label>
          Events{" "}
          <span className="font-normal tabular-nums text-muted-foreground">
            ({selected.length})
          </span>
        </Label>
        {/* Offered only while it would change something — a "Select all" that
            selects nothing new is an action the state has already refused. */}
        {!allSelected && (
          <button
            type="button"
            onClick={() => onChange(WEBHOOK_EVENTS.map((e) => e.id))}
            className="rounded-md text-[11px] font-medium text-muted-foreground transition-colors duration-(--duration-base) hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            Select all
          </button>
        )}
      </div>

      <ul className="divide-y divide-border/60 border-y border-border/60">
        {WEBHOOK_EVENTS.map((spec) => (
          <EventRow
            key={spec.id}
            spec={spec}
            checked={selected.includes(spec.id)}
            onToggle={() => toggle(spec.id)}
          />
        ))}
      </ul>

      {selected.length === 0 && (
        // Stated where the decision is made, not only when the submit button
        // silently refuses to work.
        <p className="text-[11px] text-muted-foreground">
          Pick at least one event — an endpoint with no subscriptions never
          receives anything.
        </p>
      )}
    </div>
  );
}
