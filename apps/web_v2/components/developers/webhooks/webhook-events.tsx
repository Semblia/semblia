"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { humanizeLabel } from "@/lib/format";
import type { V2OutboundWebhookEventType } from "@workspace/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/* ─── Catalog ─────────────────────────────────────────────────────────────── */

export interface WebhookEventSpec {
  id: V2OutboundWebhookEventType;
  label: string;
  description: string;
}

export const WEBHOOK_EVENTS: WebhookEventSpec[] = [
  {
    id: "submission.created",
    label: "submission.created",
    description: "A new response is submitted to a form.",
  },
  {
    id: "submission.moderated",
    label: "submission.moderated",
    description: "A response is approved, rejected, or flagged.",
  },
  {
    id: "export.delivery_failed",
    label: "export.delivery_failed",
    description: "An export delivery exhausts its retries.",
  },
  {
    id: "agent.action_created",
    label: "agent.action_created",
    description: "An agent key performs a tracked action.",
  },
];

const EVENT_LABELS = new Map(WEBHOOK_EVENTS.map((e) => [e.id, e.label]));

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
          "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors",
          checked ? "bg-background" : "hover:bg-background/60",
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-medium text-foreground">
            {spec.label}
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {spec.description}
          </p>
        </div>
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
  function toggle(event: V2OutboundWebhookEventType) {
    if (selected.includes(event)) {
      onChange(selected.filter((e) => e !== event));
    } else {
      onChange([...selected, event]);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>
          Events{" "}
          <span className="font-normal text-muted-foreground">
            ({selected.length})
          </span>
        </Label>
        <button
          type="button"
          onClick={() => onChange(WEBHOOK_EVENTS.map((e) => e.id))}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Select all
        </button>
      </div>

      <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
        <ul className="space-y-1">
          {WEBHOOK_EVENTS.map((spec) => (
            <EventRow
              key={spec.id}
              spec={spec}
              checked={selected.includes(spec.id)}
              onToggle={() => toggle(spec.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
