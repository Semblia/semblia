"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtRelative } from "@/lib/format";
import type {
  V2IntegrationConnectionDTO,
  V2IntegrationConnectionStatus,
} from "@workspace/types";
import {
  PencilSimpleIcon,
  PaperPlaneTiltIcon,
  PauseIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useUpdateIntegrationConnection } from "@/hooks/api";
import {
  getProviderSpec,
  isProviderConfigValid,
  cleanConfig,
  type ProviderSpec,
} from "./integration-providers";

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

/* ─── Config fields editor (shared by connect + edit) ─────────────────────── */

export function ProviderConfigFields({
  spec,
  config,
  onChange,
  idPrefix,
}: {
  spec: ProviderSpec;
  config: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      {spec.fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${field.key}`}>{field.label}</Label>
          <Input
            id={`${idPrefix}-${field.key}`}
            value={config[field.key] ?? ""}
            onChange={(e) =>
              onChange({ ...config, [field.key]: e.target.value })
            }
            placeholder={field.placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          {field.helper && (
            <p className="text-[11px] text-muted-foreground">{field.helper}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Edit dialog ─────────────────────────────────────────────────────────── */

function configToDraft(
  spec: ProviderSpec,
  config: Record<string, unknown> | null,
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const field of spec.fields) {
    const value = config?.[field.key];
    draft[field.key] = typeof value === "string" ? value : "";
  }
  return draft;
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
  const [draft, setDraft] = React.useState<Record<string, string>>(() =>
    configToDraft(spec, connection.config),
  );

  React.useEffect(() => {
    if (open) setDraft(configToDraft(spec, connection.config));
  }, [open, connection, spec]);

  const valid = isProviderConfigValid(spec, draft);

  async function handleSubmit() {
    await update.mutateAsync({ config: cleanConfig(draft) });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {spec.label} destination</DialogTitle>
          <DialogDescription>
            Update where this integration delivers exports.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !update.isPending) handleSubmit();
          }}
          className="space-y-4"
        >
          <ProviderConfigFields
            spec={spec}
            config={draft}
            onChange={setDraft}
            idPrefix={`int-edit-${connection.id}`}
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
    onDisable,
    isSendingTest,
  }: {
    slug: string;
    connection: V2IntegrationConnectionDTO;
    onSendTest: (connectionId: string) => void;
    onDisable: (connectionId: string) => void;
    isSendingTest: boolean;
  }) {
    const spec = getProviderSpec(connection.provider);
    const Icon = spec.icon;
    const [editOpen, setEditOpen] = React.useState(false);
    const [disableOpen, setDisableOpen] = React.useState(false);

    const isActive = connection.status === "ACTIVE";
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
      </>
    );
  },
);
