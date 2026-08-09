"use client";

/**
 * IntegrationConnectionRow — one live destination.
 *
 * Reworked onto the shared system:
 *   • the mono-uppercase chip printing a lowercased enum is one `StatusBadge`
 *   • `fmtRelative` is `timeAgo` with `fmtDateTime` in the `title`
 *   • a revoked connection used to render with no actions and no explanation;
 *     it now says why it is inert, in place
 *   • the destination picker inside the edit dialog is a real radio group, so
 *     Arrow/Home/End, roving focus, and screen-reader semantics come from
 *     Radix rather than from a stack of look-alike buttons
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  V2IntegrationConnectionDTO,
  V2IntegrationConnectionStatus,
} from "@workspace/types";
import {
  PencilSimpleIcon,
  PaperPlaneTiltIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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
import {
  useIntegrationResources,
  useUpdateIntegrationConnection,
} from "@/hooks/api";
import { humanizeLabel, timeAgo, fmtDateTime } from "@/lib/format";
import { getProviderSpec } from "./integration-providers";
import { ResourcePicker } from "./resource-picker";

/* ─── Status ──────────────────────────────────────────────────────────────── */

const CONNECTION_STATUS: Record<V2IntegrationConnectionStatus, StatusMeta> = {
  ACTIVE: { label: "Active", tone: "positive" },
  DISABLED: { label: "Disabled", tone: "attention" },
  REVOKED: { label: "Revoked", tone: "muted" },
};

export function connectionStatusMeta(value: string): StatusMeta {
  return (
    CONNECTION_STATUS[value as V2IntegrationConnectionStatus] ?? {
      label: humanizeLabel(value.toLowerCase()),
      tone: "neutral",
    }
  );
}

/* ─── Edit dialog ─────────────────────────────────────────────────────────── */

function isSameResourceConfig(
  left: Record<string, unknown>,
  right: Record<string, unknown> | null,
) {
  if (!right) return false;
  return Object.entries(left).every(([key, value]) => right[key] === value);
}

function EditConnectionDialog({
  slug,
  connection,
  open,
  onOpenChange,
}: {
  slug: string;
  connection: V2IntegrationConnectionDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const spec = getProviderSpec(connection.provider);
  const update = useUpdateIntegrationConnection(slug, connection.id);
  const resourcesQuery = useIntegrationResources(
    slug,
    connection.provider,
    undefined,
    { enabled: open },
  );
  const resources = React.useMemo(
    () => resourcesQuery.data?.items ?? [],
    [resourcesQuery.data],
  );

  const [selectedResourceId, setSelectedResourceId] = React.useState<
    string | null
  >(null);

  // Re-seed the selection from the connection's current config whenever the
  // dialog opens or the discovered destinations change.
  React.useEffect(() => {
    if (!open) return;
    setSelectedResourceId(
      resources.find((resource) =>
        isSameResourceConfig(resource.config, connection.config),
      )?.id ?? null,
    );
  }, [open, connection.config, resources]);

  const selectedResource =
    resources.find((resource) => resource.id === selectedResourceId) ?? null;

  async function handleSubmit() {
    if (!selectedResource) return;
    await update.mutateAsync({ config: selectedResource.config });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {spec.label} destination</DialogTitle>
          <DialogDescription>
            Delivering to{" "}
            {spec.summarize(connection.config) ?? "no destination"}. Pick
            another to move future deliveries.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedResource && !update.isPending) handleSubmit();
          }}
          className="space-y-4"
        >
          <ResourcePicker
            label={`${spec.label} destinations`}
            resources={resources}
            selectedResourceId={selectedResourceId}
            query={resourcesQuery}
            providerLabel={spec.label}
            onSelect={setSelectedResourceId}
          />

          {update.isError && (
            <p role="alert" className="text-[11px] text-destructive">
              Couldn&apos;t save the destination. Pick one and try again.
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
              disabled={!selectedResource || update.isPending}
              aria-busy={update.isPending}
            >
              {update.isPending ? "Saving…" : "Save destination"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Row ─────────────────────────────────────────────────────────────────── */

export const IntegrationConnectionRow = React.memo(
  function IntegrationConnectionRow({
    slug,
    connection,
    onSendTest,
    onEnable,
    onDisable,
    onRevoke,
    isSendingTest,
    busy = false,
  }: {
    slug: string;
    connection: V2IntegrationConnectionDTO;
    onSendTest: (connectionId: string) => void;
    onEnable: (connectionId: string) => void;
    onDisable: (connectionId: string) => void;
    onRevoke: (connectionId: string) => void;
    isSendingTest: boolean;
    /** A mutation on this project is in flight — actions must not double-fire. */
    busy?: boolean;
  }) {
    const spec = getProviderSpec(connection.provider);
    const Icon = spec.icon;
    const [editOpen, setEditOpen] = React.useState(false);
    const [disableOpen, setDisableOpen] = React.useState(false);
    const [revokeOpen, setRevokeOpen] = React.useState(false);

    const isActive = connection.status === "ACTIVE";
    const isDisabled = connection.status === "DISABLED";
    const isRevoked = connection.status === "REVOKED";
    const destination = spec.summarize(connection.config);
    const status = connectionStatusMeta(connection.status);

    // A test delivery needs somewhere to land: without a destination the API
    // has nowhere to send it, so the control is inactive with the reason in
    // place rather than enabled and doomed.
    const testAction: ItemAction = {
      id: "test",
      label: isSendingTest ? "Sending…" : "Send test",
      icon: PaperPlaneTiltIcon,
      disabled: isSendingTest || busy || !destination,
      disabledReason: destination
        ? undefined
        : "Pick a destination first — there is nowhere to send a test.",
      onSelect: () => onSendTest(connection.id),
    };

    const actions: ItemAction[] = isRevoked
      ? []
      : [
          {
            id: "edit",
            label: "Edit destination",
            icon: PencilSimpleIcon,
            pinned: true,
            disabled: busy,
            onSelect: () => setEditOpen(true),
          },
          ...(isActive
            ? [
                testAction,
                {
                  id: "disable",
                  label: "Disable connection",
                  icon: PauseIcon,
                  tone: "warning" as const,
                  disabled: busy,
                  onSelect: () => setDisableOpen(true),
                },
              ]
            : []),
          ...(isDisabled
            ? [
                {
                  id: "enable",
                  label: "Enable connection",
                  icon: PlayIcon,
                  disabled: busy,
                  onSelect: () => onEnable(connection.id),
                },
              ]
            : []),
          {
            id: "revoke",
            label: "Revoke connection",
            icon: TrashIcon,
            tone: "danger" as const,
            pinned: true,
            disabled: busy,
            onSelect: () => setRevokeOpen(true),
          },
        ];

    return (
      <>
        <ItemRow
          role="listitem"
          inactive={isRevoked}
          padding="default"
          aria-label={`${spec.label} integration`}
          leading={
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground",
                isRevoked && "opacity-40 grayscale",
              )}
            >
              <Icon className="size-4" />
            </span>
          }
          title={
            <span
              className={cn(
                "truncate text-sm font-medium",
                isRevoked ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {spec.label}
            </span>
          }
          subtitle={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {destination ? (
                <span className="font-mono text-[11px]">{destination}</span>
              ) : (
                // Absent, and stated as absent — not styled as if it were set.
                <span>No destination configured</span>
              )}
              {connection.lastCheckedAt && (
                <>
                  <span aria-hidden>·</span>
                  <span
                    className="tabular-nums"
                    title={fmtDateTime(connection.lastCheckedAt)}
                  >
                    Checked {timeAgo(connection.lastCheckedAt)}
                  </span>
                </>
              )}
            </span>
          }
          trailing={<StatusBadge {...status} />}
          actions={
            isRevoked ? (
              <p className="text-[11px] text-muted-foreground">
                Revoked connections are kept for the record. Connect{" "}
                {spec.label} again to resume delivery.
              </p>
            ) : (
              <ItemActionRow
                actions={actions}
                collapseUnder={480}
                visibleWhenCollapsed={2}
              />
            )
          }
        />

        <EditConnectionDialog
          slug={slug}
          connection={connection}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
        <ConfirmationDialog
          open={disableOpen}
          onOpenChange={setDisableOpen}
          intent="warning"
          title={<>Disable the {spec.label} connection?</>}
          description="Responses stop being delivered to this destination. The destination is kept, so you can enable it again at any time."
          cancelLabel="Keep delivering"
          confirmLabel="Disable connection"
          onConfirm={() => onDisable(connection.id)}
        />
        <ConfirmationDialog
          open={revokeOpen}
          onOpenChange={setRevokeOpen}
          intent="danger"
          title={<>Revoke the {spec.label} connection?</>}
          description="This disconnects Semblia from this destination and stops every future delivery through it. You can't undo it."
          cancelLabel="Keep connection"
          confirmLabel="Revoke connection"
          onConfirm={() => onRevoke(connection.id)}
        />
      </>
    );
  },
);
