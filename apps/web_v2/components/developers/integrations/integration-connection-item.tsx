"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtRelative } from "@/lib/format";
import type {
  V2IntegrationConnectionDTO,
  V2IntegrationConnectionStatus,
  V2IntegrationResourceDTO,
} from "@workspace/types";
import {
  PencilSimpleIcon,
  PaperPlaneTiltIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  useIntegrationResources,
  useUpdateIntegrationConnection,
} from "@/hooks/api";
import { getProviderSpec } from "./integration-providers";

/* ─── Status chip ─────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  V2IntegrationConnectionStatus,
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

function ConnectionStatusChip({
  status,
}: {
  status: V2IntegrationConnectionStatus;
}) {
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
  const [selectedResourceId, setSelectedResourceId] = React.useState<
    string | null
  >(
    () =>
      resourcesQuery.data?.items.find((resource) =>
        isSameResourceConfig(resource.config, connection.config),
      )?.id ?? null,
  );

  React.useEffect(() => {
    if (!open) return;
    setSelectedResourceId(
      resourcesQuery.data?.items.find((resource) =>
        isSameResourceConfig(resource.config, connection.config),
      )?.id ?? null,
    );
  }, [open, connection.config, resourcesQuery.data?.items]);

  const selectedResource =
    resourcesQuery.data?.items.find(
      (resource) => resource.id === selectedResourceId,
    ) ?? null;

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
            Current destination: {spec.summarize(connection.config) ?? "none"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedResource && !update.isPending) {
              handleSubmit();
            }
          }}
          className="space-y-4"
        >
          <ResourceChoices
            resources={resourcesQuery.data?.items ?? []}
            selectedResourceId={selectedResourceId}
            isLoading={resourcesQuery.isLoading}
            onSelect={setSelectedResourceId}
          />

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
              disabled={!selectedResource || update.isPending}
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResourceChoices({
  resources,
  selectedResourceId,
  isLoading,
  onSelect,
}: {
  resources: V2IntegrationResourceDTO[];
  selectedResourceId: string | null;
  isLoading: boolean;
  onSelect: (resourceId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-9 rounded-md border border-border bg-muted/40" />
        <div className="h-9 rounded-md border border-border bg-muted/20" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        No destinations available.
      </p>
    );
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {resources.map((resource) => {
        const selected = selectedResourceId === resource.id;
        return (
          <button
            key={resource.id}
            type="button"
            onClick={() => onSelect(resource.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
              selected
                ? "border-brand/50 bg-brand/10 text-foreground"
                : "border-border bg-background hover:bg-muted/40",
            )}
          >
            <span className="truncate">{resource.label}</span>
            <span className="ml-3 shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
              {selected ? "selected" : resource.id.slice(0, 8)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function isSameResourceConfig(
  left: Record<string, unknown>,
  right: Record<string, unknown> | null,
) {
  if (!right) return false;
  return Object.entries(left).every(([key, value]) => right[key] === value);
}

/* ─── Row skeleton ────────────────────────────────────────────────────────── */

export function IntegrationConnectionRowSkeleton() {
  return (
    <ItemRow
      accentColor={null}
      padding="default"
      leading={<Skeleton className="size-8 rounded-lg animate-shimmer" />}
      title={<Skeleton className="h-3.5 w-28 animate-shimmer" />}
      subtitle={<Skeleton className="h-3 w-44 animate-shimmer" />}
      trailing={<Skeleton className="h-5 w-14 rounded-md animate-shimmer" />}
    />
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
  }: {
    slug: string;
    connection: V2IntegrationConnectionDTO;
    onSendTest: (connectionId: string) => void;
    onEnable: (connectionId: string) => void;
    onDisable: (connectionId: string) => void;
    onRevoke: (connectionId: string) => void;
    isSendingTest: boolean;
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

    const actions: ItemAction[] = isRevoked
      ? []
      : [
          {
            id: "edit",
            label: "Edit destination",
            icon: PencilSimpleIcon,
            pinned: true,
            onSelect: () => setEditOpen(true),
          },
          ...(isActive
            ? [
                {
                  id: "test",
                  label: isSendingTest ? "Sending…" : "Send test",
                  icon: PaperPlaneTiltIcon,
                  disabled: isSendingTest,
                  onSelect: () => onSendTest(connection.id),
                },
                {
                  id: "disable",
                  label: "Disable",
                  icon: PauseIcon,
                  tone: "warning" as const,
                  onSelect: () => setDisableOpen(true),
                },
              ]
            : []),
          ...(isDisabled
            ? [
                {
                  id: "enable",
                  label: "Enable",
                  icon: PlayIcon,
                  onSelect: () => onEnable(connection.id),
                },
              ]
            : []),
          {
            id: "revoke",
            label: "Revoke",
            icon: TrashIcon,
            tone: "danger" as const,
            onSelect: () => setRevokeOpen(true),
          },
        ];

    return (
      <>
        <ItemRow
          accentColor={isActive ? "var(--brand)" : null}
          inactive={isRevoked}
          padding="default"
          leading={
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground",
                isRevoked && "opacity-40 grayscale",
              )}
            >
              <Icon className="size-4" />
            </div>
          }
          title={
            <span
              className={cn(
                "truncate text-sm font-medium",
                isRevoked && "text-muted-foreground",
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
                <span className="italic">No destination configured</span>
              )}
              {connection.lastCheckedAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    Checked {fmtRelative(new Date(connection.lastCheckedAt))}
                  </span>
                </>
              )}
            </span>
          }
          trailing={<ConnectionStatusChip status={connection.status} />}
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
          title={<>Disable {spec.label} integration?</>}
          description="Exports stop being delivered to this destination. You can reconnect it later."
          cancelLabel="Cancel"
          confirmLabel="Disable"
          onConfirm={() => onDisable(connection.id)}
        />
        <ConfirmationDialog
          open={revokeOpen}
          onOpenChange={setRevokeOpen}
          intent="danger"
          title={<>Revoke {spec.label} integration?</>}
          description="This disconnects the integration from Semblia and stops all future exports through this connection."
          cancelLabel="Cancel"
          confirmLabel="Revoke"
          onConfirm={() => onRevoke(connection.id)}
        />
      </>
    );
  },
);
