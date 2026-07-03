"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtRelative } from "@/lib/format";
import type {
  V2OutboundWebhookEndpointDTO,
  V2OutboundWebhookEventType,
  V2OutboundWebhookStatus,
} from "@workspace/types";
import {
  WebhooksLogoIcon,
  PencilSimpleIcon,
  ArrowsClockwiseIcon,
  PauseIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ItemRow, ItemActionRow, type ItemAction } from "@/components/shared";
import { useUpdateOutboundWebhookEndpoint } from "@/hooks/api";
import { EventTypePicker } from "./webhook-events";

/* ─── Status chip ─────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  V2OutboundWebhookStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "active",
    className: "border-success/30 bg-success/10 text-success",
  },
  DISABLED: {
    label: "disabled",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  REVOKED: {
    label: "revoked",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

function EndpointStatusChip({ status }: { status: V2OutboundWebhookStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

/* ─── Edit dialog ─────────────────────────────────────────────────────────── */

function isValidUrl(value: string): boolean {
  return /^https?:\/\/.+/.test(value.trim());
}

function EditEndpointDialog({
  slug,
  endpoint,
  open,
  onOpenChange,
}: {
  slug: string;
  endpoint: V2OutboundWebhookEndpointDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateOutboundWebhookEndpoint(slug, endpoint.id);
  const [name, setName] = React.useState(endpoint.name);
  const [url, setUrl] = React.useState(endpoint.url);
  const [events, setEvents] = React.useState<V2OutboundWebhookEventType[]>(
    endpoint.subscribedEvents,
  );

  // Re-seed the draft whenever the dialog (re)opens or the endpoint changes.
  React.useEffect(() => {
    if (open) {
      setName(endpoint.name);
      setUrl(endpoint.url);
      setEvents(endpoint.subscribedEvents);
    }
  }, [open, endpoint]);

  const valid = name.trim().length >= 3 && isValidUrl(url) && events.length > 0;

  async function handleSubmit() {
    await update.mutateAsync({
      name: name.trim(),
      url: url.trim(),
      subscribedEvents: events,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit endpoint</DialogTitle>
          <DialogDescription>
            Update the destination URL and which events Semblia delivers.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !update.isPending) handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="wh-edit-name">Name</Label>
            <Input
              id="wh-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Production listener"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-edit-url">Endpoint URL</Label>
            <Input
              id="wh-edit-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/semblia"
            />
          </div>
          <EventTypePicker selected={events} onChange={setEvents} />

          {update.isError && (
            <p className="text-[11px] text-destructive">
              Could not save changes. Please try again.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!valid || update.isPending}
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Row skeleton ────────────────────────────────────────────────────────── */

export function WebhookEndpointRowSkeleton() {
  return (
    <ItemRow
      padding="default"
      leading={<Skeleton className="size-8 rounded-lg animate-shimmer" />}
      title={<Skeleton className="h-3.5 w-40 animate-shimmer" />}
      subtitle={<Skeleton className="h-3 w-56 animate-shimmer" />}
      trailing={<Skeleton className="h-5 w-14 rounded-md animate-shimmer" />}
    />
  );
}

/* ─── Row ─────────────────────────────────────────────────────────────────── */

export const WebhookEndpointRow = React.memo(function WebhookEndpointRow({
  slug,
  endpoint,
  onRotate,
  onDisable,
  onRevoke,
}: {
  slug: string;
  endpoint: V2OutboundWebhookEndpointDTO;
  onRotate: (endpointId: string) => void;
  onDisable: (endpointId: string) => void;
  onRevoke: (endpointId: string) => void;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [rotateOpen, setRotateOpen] = React.useState(false);
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [revokeOpen, setRevokeOpen] = React.useState(false);

  const isRevoked = endpoint.status === "REVOKED";
  const isActive = endpoint.status === "ACTIVE";

  const lastEvent = endpoint.lastFailureAt
    ? {
        label: "Last failure",
        at: endpoint.lastFailureAt,
        tone: "fail" as const,
      }
    : endpoint.lastSuccessAt
      ? {
          label: "Last delivery",
          at: endpoint.lastSuccessAt,
          tone: "ok" as const,
        }
      : null;

  const actions: ItemAction[] = isRevoked
    ? []
    : [
        {
          id: "edit",
          label: "Edit",
          icon: PencilSimpleIcon,
          pinned: true,
          onSelect: () => setEditOpen(true),
        },
        {
          id: "rotate",
          label: "Rotate secret",
          icon: ArrowsClockwiseIcon,
          tone: "warning",
          onSelect: () => setRotateOpen(true),
        },
        ...(isActive
          ? [
              {
                id: "disable",
                label: "Disable",
                icon: PauseIcon,
                tone: "warning" as const,
                onSelect: () => setDisableOpen(true),
              },
            ]
          : []),
        {
          id: "revoke",
          label: "Revoke",
          icon: ProhibitIcon,
          tone: "danger",
          pinned: true,
          onSelect: () => setRevokeOpen(true),
        },
      ];

  return (
    <>
      <ItemRow
        inactive={isRevoked}
        padding="default"
        leading={
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30",
              isRevoked && "opacity-40",
            )}
          >
            <WebhooksLogoIcon
              className="size-4 text-muted-foreground"
              weight="regular"
              aria-hidden
            />
          </div>
        }
        title={
          <span
            className={cn(
              "truncate text-sm font-medium",
              isRevoked && "text-muted-foreground",
            )}
          >
            {endpoint.name}
          </span>
        }
        subtitle={
          <span className="flex items-center gap-1">
            <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
              {endpoint.url}
            </span>
            <CopyButton value={endpoint.url} label="Copy URL" />
          </span>
        }
        metrics={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            <span>
              {endpoint.subscribedEvents.length}{" "}
              {endpoint.subscribedEvents.length === 1 ? "event" : "events"}
            </span>
            {lastEvent && (
              <>
                <span className="text-border">·</span>
                <span
                  className={cn(
                    lastEvent.tone === "fail" && "text-destructive",
                  )}
                >
                  {lastEvent.label} {fmtRelative(new Date(lastEvent.at))}
                </span>
              </>
            )}
          </div>
        }
        trailing={<EndpointStatusChip status={endpoint.status} />}
        actions={
          actions.length > 0 ? (
            <ItemActionRow
              actions={actions}
              collapseUnder={480}
              visibleWhenCollapsed={2}
            />
          ) : undefined
        }
      />

      <EditEndpointDialog
        slug={slug}
        endpoint={endpoint}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmationDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        intent="warning"
        title={<>Rotate signing secret?</>}
        description="A new signing secret is generated immediately. The old secret stops validating right away — update your receiver before continuing."
        cancelLabel="Cancel"
        confirmLabel="Rotate secret"
        onConfirm={() => onRotate(endpoint.id)}
      />
      <ConfirmationDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        intent="warning"
        title={<>Disable &ldquo;{endpoint.name}&rdquo;?</>}
        description="Semblia stops delivering events to this endpoint until it's re-enabled."
        cancelLabel="Keep active"
        confirmLabel="Disable endpoint"
        onConfirm={() => onDisable(endpoint.id)}
      />
      <ConfirmationDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        intent="danger"
        title={<>Revoke &ldquo;{endpoint.name}&rdquo;?</>}
        description="This permanently retires the endpoint and its signing secret. You can't undo it."
        cancelLabel="Keep endpoint"
        confirmLabel="Revoke endpoint"
        onConfirm={() => onRevoke(endpoint.id)}
      />
    </>
  );
});
