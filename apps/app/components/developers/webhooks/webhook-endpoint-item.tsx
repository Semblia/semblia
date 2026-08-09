"use client";

/**
 * WebhookEndpointRow — one registered receiver.
 *
 * Reworked onto the shared system:
 *   • the bespoke mono-uppercase chip rendering a lowercased enum ("active",
 *     "revoked") is one `StatusBadge` on the canonical tone vocabulary
 *   • `fmtRelative` with no precise value behind it is `timeAgo` with
 *     `fmtDateTime` in the `title`
 *   • a revoked endpoint used to render with *no* actions and no explanation,
 *     which reads as a broken row. It now says why it is inert, in place.
 *   • the edit dialog groups its fields with stack gaps, not with a second
 *     bordered box inside the dialog
 */

import * as React from "react";
import { cn } from "@/lib/utils";
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
import {
  ItemRow,
  ItemActionRow,
  StatusBadge,
  type ItemAction,
  type StatusMeta,
} from "@/components/shared";
import { useUpdateOutboundWebhookEndpoint } from "@/hooks/api";
import { humanizeLabel, timeAgo, fmtDateTime, fmtCount } from "@/lib/format";
import { EventTypePicker } from "./webhook-events";

/* ─── Status ──────────────────────────────────────────────────────────────── */

const ENDPOINT_STATUS: Record<V2OutboundWebhookStatus, StatusMeta> = {
  ACTIVE: { label: "Active", tone: "positive" },
  DISABLED: { label: "Disabled", tone: "attention" },
  REVOKED: { label: "Revoked", tone: "muted" },
};

/** An endpoint status the API grows before this app knows it still reads. */
export function endpointStatusMeta(value: string): StatusMeta {
  return (
    ENDPOINT_STATUS[value as V2OutboundWebhookStatus] ?? {
      label: humanizeLabel(value.toLowerCase()),
      tone: "neutral",
    }
  );
}

/* ─── Edit dialog ─────────────────────────────────────────────────────────── */

function isValidUrl(value: string): boolean {
  return /^https?:\/\/.+/.test(value.trim());
}

/** Draft state for the edit form, with each field's validity beside it. */
function useEndpointDraft(
  endpoint: V2OutboundWebhookEndpointDTO,
  open: boolean,
) {
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

  const nameValid = name.trim().length >= 3;
  const urlValid = isValidUrl(url);
  return {
    name,
    setName,
    url,
    setUrl,
    events,
    setEvents,
    nameValid,
    urlValid,
    valid: nameValid && urlValid && events.length > 0,
  };
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
  const draft = useEndpointDraft(endpoint, open);

  async function handleSubmit() {
    await update.mutateAsync({
      name: draft.name.trim(),
      url: draft.url.trim(),
      subscribedEvents: draft.events,
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
            if (draft.valid && !update.isPending) handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="wh-edit-name">Name</Label>
            <Input
              id="wh-edit-name"
              value={draft.name}
              onChange={(e) => draft.setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Production listener"
              aria-invalid={draft.name.length > 0 && !draft.nameValid}
              aria-describedby="wh-edit-name-hint"
            />
            <p
              id="wh-edit-name-hint"
              className="text-[11px] text-muted-foreground"
            >
              At least 3 characters.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-edit-url">Endpoint URL</Label>
            <Input
              id="wh-edit-url"
              value={draft.url}
              onChange={(e) => draft.setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/semblia"
              aria-invalid={draft.url.length > 0 && !draft.urlValid}
              aria-describedby="wh-edit-url-hint"
            />
            <p
              id="wh-edit-url-hint"
              className="text-[11px] text-muted-foreground"
            >
              Must start with http:// or https://.
            </p>
          </div>
          <EventTypePicker selected={draft.events} onChange={draft.setEvents} />

          {update.isError && (
            <p role="alert" className="text-[11px] text-destructive">
              Couldn&apos;t save the endpoint. Check the URL and try again.
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
              disabled={!draft.valid || update.isPending}
              aria-busy={update.isPending}
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Row ─────────────────────────────────────────────────────────────────── */

/** Management actions for a live endpoint. Revoked rows explain themselves instead. */
function buildEndpointActions({
  isActive,
  busy,
  onEdit,
  onRotate,
  onDisable,
  onRevoke,
}: {
  isActive: boolean;
  busy: boolean;
  onEdit: () => void;
  onRotate: () => void;
  onDisable: () => void;
  onRevoke: () => void;
}): ItemAction[] {
  return [
    {
      id: "edit",
      label: "Edit endpoint",
      icon: PencilSimpleIcon,
      pinned: true,
      disabled: busy,
      onSelect: onEdit,
    },
    {
      id: "rotate",
      label: "Rotate secret",
      icon: ArrowsClockwiseIcon,
      tone: "warning",
      disabled: busy,
      onSelect: onRotate,
    },
    ...(isActive
      ? [
          {
            id: "disable",
            label: "Disable endpoint",
            icon: PauseIcon,
            tone: "warning" as const,
            disabled: busy,
            onSelect: onDisable,
          },
        ]
      : []),
    {
      id: "revoke",
      label: "Revoke endpoint",
      icon: ProhibitIcon,
      tone: "danger",
      pinned: true,
      disabled: busy,
      onSelect: onRevoke,
    },
  ];
}

function EndpointMetrics({
  endpoint,
}: {
  endpoint: V2OutboundWebhookEndpointDTO;
}) {
  // The most recent thing that actually happened to this endpoint. A failure
  // outranks a success because it is the fact that needs acting on.
  const lastEvent = endpoint.lastFailureAt
    ? { label: "Last failure", at: endpoint.lastFailureAt, failed: true }
    : endpoint.lastSuccessAt
      ? { label: "Last delivery", at: endpoint.lastSuccessAt, failed: false }
      : null;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
      <span>
        {fmtCount(endpoint.subscribedEvents.length)}{" "}
        {endpoint.subscribedEvents.length === 1 ? "event" : "events"}
      </span>
      <span aria-hidden className="text-border">
        ·
      </span>
      {lastEvent ? (
        <span
          className={cn(lastEvent.failed && "text-destructive")}
          title={fmtDateTime(lastEvent.at)}
        >
          {lastEvent.label} {timeAgo(lastEvent.at)}
        </span>
      ) : (
        // Nothing has been sent yet — a real fact, not a missing one.
        <span>No deliveries yet</span>
      )}
    </span>
  );
}

/** A row raises one dialog at a time, so they share a single state slot. */
type EndpointDialog = "edit" | "rotate" | "disable" | "revoke";

interface EndpointActionHandlers {
  onRotate: (endpointId: string) => void;
  onDisable: (endpointId: string) => void;
  onRevoke: (endpointId: string) => void;
}

/** The three destructive confirmations a live endpoint can raise. */
function EndpointConfirmations({
  endpoint,
  open,
  onOpenChange,
  onRotate,
  onDisable,
  onRevoke,
}: EndpointActionHandlers & {
  endpoint: V2OutboundWebhookEndpointDTO;
  open: EndpointDialog | null;
  onOpenChange: (dialog: EndpointDialog | null) => void;
}) {
  const toggle = (dialog: EndpointDialog) => (next: boolean) =>
    onOpenChange(next ? dialog : null);

  return (
    <>
      <ConfirmationDialog
        open={open === "rotate"}
        onOpenChange={toggle("rotate")}
        intent="warning"
        title={<>Rotate signing secret?</>}
        description="A new signing secret is generated immediately. The old secret stops validating right away — update your receiver before continuing."
        cancelLabel="Cancel"
        confirmLabel="Rotate secret"
        onConfirm={() => onRotate(endpoint.id)}
      />
      <ConfirmationDialog
        open={open === "disable"}
        onOpenChange={toggle("disable")}
        intent="warning"
        title={<>Disable &ldquo;{endpoint.name}&rdquo;?</>}
        description="Semblia stops delivering events to this endpoint until it's re-enabled."
        cancelLabel="Keep active"
        confirmLabel="Disable endpoint"
        onConfirm={() => onDisable(endpoint.id)}
      />
      <ConfirmationDialog
        open={open === "revoke"}
        onOpenChange={toggle("revoke")}
        intent="danger"
        title={<>Revoke &ldquo;{endpoint.name}&rdquo;?</>}
        description="This permanently retires the endpoint and its signing secret. You can't undo it."
        cancelLabel="Keep endpoint"
        confirmLabel="Revoke endpoint"
        onConfirm={() => onRevoke(endpoint.id)}
      />
    </>
  );
}

export const WebhookEndpointRow = React.memo(function WebhookEndpointRow({
  slug,
  endpoint,
  onRotate,
  onDisable,
  onRevoke,
  busy = false,
}: EndpointActionHandlers & {
  slug: string;
  endpoint: V2OutboundWebhookEndpointDTO;
  /** A mutation on this project is in flight — actions must not double-fire. */
  busy?: boolean;
}) {
  const [dialog, setDialog] = React.useState<EndpointDialog | null>(null);

  const isRevoked = endpoint.status === "REVOKED";
  const isActive = endpoint.status === "ACTIVE";
  const status = endpointStatusMeta(endpoint.status);

  return (
    <>
      <ItemRow
        role="listitem"
        inactive={isRevoked}
        padding="default"
        aria-label={endpoint.name}
        leading={
          <span
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
          </span>
        }
        title={
          <span
            className={cn(
              "truncate text-sm font-medium",
              isRevoked ? "text-muted-foreground" : "text-foreground",
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
        metrics={<EndpointMetrics endpoint={endpoint} />}
        trailing={<StatusBadge {...status} />}
        actions={
          isRevoked ? (
            <p className="text-[11px] text-muted-foreground">
              Revoked endpoints are kept for the record. They can&apos;t be
              edited or restored — register a new endpoint instead.
            </p>
          ) : (
            <ItemActionRow
              actions={buildEndpointActions({
                isActive,
                busy,
                onEdit: () => setDialog("edit"),
                onRotate: () => setDialog("rotate"),
                onDisable: () => setDialog("disable"),
                onRevoke: () => setDialog("revoke"),
              })}
              collapseUnder={480}
              visibleWhenCollapsed={2}
            />
          )
        }
      />

      <EditEndpointDialog
        slug={slug}
        endpoint={endpoint}
        open={dialog === "edit"}
        onOpenChange={(open) => setDialog(open ? "edit" : null)}
      />
      <EndpointConfirmations
        endpoint={endpoint}
        open={dialog}
        onOpenChange={setDialog}
        onRotate={onRotate}
        onDisable={onDisable}
        onRevoke={onRevoke}
      />
    </>
  );
});
